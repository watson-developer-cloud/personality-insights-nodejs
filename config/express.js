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
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var morgan = require('morgan');

module.exports = (app) => {
  app.set('view engine', 'ejs');
  require('ejs').delimiter = '$';
  app.enable('trust proxy');
  app.use(morgan('dev'));

  app.use(cookieParser());
  app.use(expressSession({
    secret: 'demo-' + Math.floor(Math.random() * 2000),
    resave: true,
    saveUninitialized: true
  }));

  // Configure Express
  app.use(bodyParser.urlencoded({extended: true, limit: '15mb'}));
  app.use(bodyParser.json({limit: '15mb'}));
  app.use(express.static(__dirname + '/../public'));
  // make things in node_modules available (basically a replacement for unpkg.com)
  app.use('/vendor', express.static(__dirname + '/../node_modules'));

  require('./i18n')(app);

  // When running in Bluemix add rate-limitation
  // and some other features around security
  if (process.env.VCAP_APPLICATION) {
    require('./security')(app);
  }
  require('./passport')(app);
};
