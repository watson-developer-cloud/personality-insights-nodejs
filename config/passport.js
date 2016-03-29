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


let
  passport = require('passport'),
  credentials = require('../credentials').twitter,
  app_info = require('./app-info'),
  Strategy = require('passport-twitter').Strategy,
  TwitterHelper = require('../helpers/twitter-helper'),
  logger = require('winston');


const
  strategy_options = {
      consumerKey: credentials.consumer_key,
      consumerSecret: credentials.consumer_secret,
      callbackURL: app_info.url + '/auth/twitter/callback'
    },
  strategy = new Strategy(
    strategy_options,
    (token, tokenSecret, profile, done) => {

      credentials = {
         consumer_key: credentials.consumer_key,
         consumer_secret: credentials.consumer_secret,
         access_token_key:   token,
         access_token_secret: tokenSecret,
      };

      logger.info(`User @${profile.username} authenticated.`);
      done(null, {
          credentials: credentials,
          profile: profile
        });
    }
  );


module.exports = (app) => {

  passport.use(strategy);

  passport.serializeUser((user, next)  => next(null, user));

  passport.deserializeUser((obj, next) => next(null, obj));

  app.use(passport.initialize());

  app.use(passport.session()); // persistent login sessions
}
