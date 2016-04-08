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
var express  = require('express'),
  bodyParser = require('body-parser'),
  session    = require('express-session'),
  cookieParser = require('cookie-parser'),
  logger     = require('winston');

module.exports = function (app) {
  app.set('view engine', 'ejs');
  require('ejs').delimiter = '$';
  app.enable('trust proxy');

  // Configure Express
  app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' }));
  app.use(bodyParser.json({ limit: '15mb' }));
  app.use(express.static(__dirname + '/../public'));

  var secret = Math.random().toString(36).substring(7);
  app.use(cookieParser(secret));
  app.use(session({ secret:secret }));

  if (process.env.SECURE_EXPRESS) {
    logger.info('Server is secure.')
    require('./security')(app);
  } else {
    logger.info('Server is unsecure.')
  }

  require('./passport')(app);
};
