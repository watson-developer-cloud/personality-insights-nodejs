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

const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();

const callbackURL = process.env.CF_APP_URL || (appEnv.isLocal ? 'http://localhost:3000' : appEnv.url);

const strategyOptions = {
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: `${callbackURL}/auth/twitter/callback`
};

const strategy = new TwitterStrategy(strategyOptions, (token, tokenSecret, profile, done) => {
  const photo = profile.photos ? profile.photos[0] : undefined;
  const userProfile = {
    handle: profile.username,
    image: photo ? photo.value.replace('_normal', '_400x400') : undefined
  };

  done(null, {
    credentials: {
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: token,
      access_token_secret: tokenSecret
    },
    profile: userProfile
  });
});

module.exports = (app) => {
  passport.use(strategy);
  passport.serializeUser((user, next)  => next(null, user));
  passport.deserializeUser((obj, next) => next(null, obj));

  app.use(passport.initialize());
  app.use(passport.session()); // persistent login sessions
};
