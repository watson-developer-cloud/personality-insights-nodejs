/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var extend = require('util')._extend;

function RateLimit(options) {

  // this is shared by all endpoints that use this instance
  var hits = {};
  var timeouts = {};

  options = extend({}, options, {
    windowMs: 60 * 1000, // miliseconds - how long to keep records of requests in memory
    delayMs: 0, // milliseconds - base delay applied to the response - multiplied by number of recent hits from user's IP
    max: 3, // max number of recent connections during `window` miliseconds before sending a 400 response
    global: false // if true, IP address is ignored and setting is applied equally to all requests
  });

  return {
    limit: function limit(req, res, next) {
      var ip = options.global ? 'global' : req.ip;

      if (typeof hits[ip] !== 'number' || isNaN(hits[ip])) {
        hits[ip] = 0; // first one's free ;)
      } else {
        hits[ip]++;
      }

      clearTimeout(timeouts[ip]);
      timeouts[ip] = setTimeout(function() {
        // cleanup
        hits[ip]--;
        if (hits[ip] <=0 ) {
          delete hits[ip];
        }
      }, options.windowMs);

      if (hits[ip] >= options.max) {
        // 429 status = Too Many Requests (RFC 6585)
        return res.status(429).json({
          error: 'Too many requests, please try again later.',
          code: 429
        });
      } else {
        var delay = hits[ip] * options.delayMs;
        setTimeout(next, delay);
      }
    },

    reset: function reset(req, res, next) {
      var ip = options.global ? 'global' : req.ip;

      clearTimeout(timeouts[ip]);

      delete hits[ip];
      delete timeouts[ip];

      next();
    }
  };
}

module.exports = RateLimit;