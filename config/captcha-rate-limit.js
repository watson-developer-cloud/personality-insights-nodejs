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

// Module dependencies
var rateLimit  = require('./rate-limit');
var request  = require('request');

module.exports = function (app) {
  // enable rate limiting in bluemix
  app.enable('trust proxy');

  // Rate limiter configuration
  // 2 requests per minute per IP
  var limiter = rateLimit({
    windowMs: 60 * 1000,
    delayMs: 0,
    max: 4,
    global: false
  });

  var captchaKeys = {
    site: '<captcha-site-key>',
    secret: '<captcha-secret-key>'
  };

  return {
    // check the captcha and reset the rate-limit if is needed
    check: function checkCaptcha(req, res, next) {
      if (req.body.recaptcha) {
        request({
          url: 'https://www.google.com/recaptcha/api/siteverify',
          method: 'POST',
          form: {
            secret: captchaKeys.secret,
            response: req.body.recaptcha,
            remoteip: req.ip
          },
          json: true
        }, function (error, response, body) {
          if (body.success)
            limiter.reset(req, res, next);
          else
            res.status(409).json({error:'Wrong captcha'});
        });
      } else
        next();
    },
    limit: limiter.limit
  };
};