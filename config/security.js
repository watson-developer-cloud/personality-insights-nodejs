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

// security.js
var rateLimit  = require('express-rate-limit'),
    helmet     = require('helmet'),
    request    = require('request');

module.exports = function (app) {
  // 1. helmet with defaults
  // app.use(helmet());

  // 2. allow iframes
  // disable iframe restriction
  // app.use(helmet.frameguard('allow-from', 'https://example-app-name.mybluemix.net'));

  // 3. rate limiting
  var limiter = rateLimit({
    windowMs: 30 * 1000, // seconds
    delayMs: 0,
    max: 3,
    message: JSON.stringify({
      error:'Too many requests, please try again in 30 seconds.',
      code: 429
    }),
  });

  app.use('/api/', limiter);
};
