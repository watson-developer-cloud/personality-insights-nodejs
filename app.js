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

var express  = require('express'),
  app        = express(),
  bluemix    = require('./config/bluemix'),
  watson     = require('watson-developer-cloud'),
  extend     = require('util')._extend,
  fs         = require('fs'),
  dummy_text = fs.readFileSync('mobydick.txt'),
  rateLimit = require('./config/captcha-rate-limit')(app);


// Bootstrap application settings
require('./config/express')(app);

// if bluemix credentials exists, then override local
var credentials = extend({
  version: 'v2',
  url: '<url>',
  username: '<username>',
  password: '<password>'
}, bluemix.getServiceCreds('personality_insights')); // VCAP_SERVICES

// Create the service wrapper
var personalityInsights = watson.personality_insights(credentials);

// render index page
app.get('/', function(req, res) {
  res.render('index', { content: dummy_text });
});

// 1. Check if we have a captcha and reset the limit
// 2. pass the request to the rate limit
app.post('/', rateLimit.check, rateLimit.limit,
  function(req, res, next) {
    personalityInsights.profile({ text: req.body.text }, function(err, profile) {
      if (err)
        return next(err);
      else
        return res.json(profile);
    });
});

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);
