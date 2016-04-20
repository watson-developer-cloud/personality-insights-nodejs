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


var
  passport = require('passport'),
  twitter_credentials = require('../credentials').twitter,
  app_info = require('./app-info'),
  TwitterStrategy = require('passport-twitter').Strategy,
  TwitterHelper = require('../helpers/twitter-helper'),
  logger = require('winston'),
  twitter_app = twitter_credentials.application,
  more_credentials = twitter_credentials.credentials;


var strategy_options = {
      consumerKey: process.env.TWITTER_CONSUMER_KEY || twitter_app.consumer_key,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET || twitter_app.consumer_secret,
      callbackURL: app_info.url + '/auth/twitter/callback'
    };

var strategy = new TwitterStrategy(
    strategy_options,
    function (token, tokenSecret, profile, done) {
      var user_credential = {
         consumer_key: process.env.TWITTER_CONSUMER_KEY || twitter_app.consumer_key,
         consumer_secret: process.env.TWITTER_CONSUMER_SECRET || twitter_app.consumer_secret,
         access_token_key:   token,
         access_token_secret: tokenSecret,
      };

      return done(null, {
          credentials: [user_credential].concat(more_credentials),
          profile: profile
        });
    }
  );


module.exports = function (app) {
  passport.use(strategy);
  passport.serializeUser(function(user, next) { return next(null, user); });
  passport.deserializeUser(function(obj, next) { return next(null, obj); });
  app.use(passport.initialize());
  app.use(passport.session()); // persistent login sessions
}
