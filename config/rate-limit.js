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

  options = extend({}, options, {
    // window, delay, and max apply per-ip unless global is set to true
    windowMs: 60 * 1000, // miliseconds - how long to keep records of requests in memory
    delayMs: 1000, // milliseconds - base delay applied to the response - multiplied by number of recent hits from user's IP
    max: 5, // max number of recent connections during `window` miliseconds before sending a 400 response
    global: false // if true, IP address is ignored and setting is applied equally to all requests
  });

  return {
    limit: function limit(req, res, next) {
      var ip = options.global ? 'global' : req.ip;

      if (typeof hits[ip] !== 'number') {
        hits[ip] = 0; // first one's free ;)
      } else {
        hits[ip]++;
      }

      setTimeout(function() {
        // cleanup
        hits[ip]--;
        if (hits[ip] <=0 ) {
          delete hits[ip];
        }
      }, options.windowMs);

      if (hits[ip] >= options.max) {
        // 429 status = Too Many Requests (RFC 6585)
        return res.status(429).end('Too many requests, please try again later.');
      }

      var delay = hits[ip] * options.delayMs;
      setTimeout(next, delay);
    },

    reset: function reset(req, res, next) {
      var ip = options.global ? 'global' : req.ip;
      delete hits[ip];
      next();
    }
  };
}

module.exports = RateLimit;