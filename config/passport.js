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
  Strategy = require('passport-twitter').Strategy,
  twitter  = require('twitter');


module.exports = (app) => {

  var TWITTER_CONSUMER_KEY='<KEY>';
  var TWITTER_CONSUMER_SECRET='<SECRET>';
  var APP_NAME='127.0.0.1:3000';

  passport.use(new Strategy({
      consumerKey: TWITTER_CONSUMER_KEY,
      consumerSecret: TWITTER_CONSUMER_SECRET,
      callbackURL: 'http://' + APP_NAME + '/auth/twitter/callback'
    },
    function(token, tokenSecret, profile, cb) {
      var twitter = new Twitter(
      {
         consumer_key: TWITTER_CONSUMER_KEY,
         consumer_secret: TWITTER_CONSUMER_SECRET,
         access_token_key:   token,
         access_token_secret: tokenSecret,
      }
    );
    var params = {
      screen_name : profile.displayName,
      count : '200',
      include_rts : 'false'
    };

    twitter
     .get(
       'statuses/user_timeline',
       params,
       function(error, tweets) {
          if(error) console.log(JSON.stringify(error));
          else
          {
            console.log(tweets.length);
            //TODO
         }
       });
      }
   )
  );

  passport.serializeUser((user, next)  => next(null, user));

  passport.deserializeUser((obj, next) => next(null, obj));

  app.use(passport.initialize());
  app.use(passport.session()); // persistent login sessions
}
