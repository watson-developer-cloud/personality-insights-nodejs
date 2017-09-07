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

const pick = require('object.pick');
const passport = require('passport');

const twitterHelper = require('./helpers/twitter-helper');
const personalityHelper = require('./helpers/personality-insights');
const profileFromTweets = personalityHelper.profileFromTweets;
const profileFromText = personalityHelper.profileFromText;

module.exports = (app) => {
  // personality profile from text
  app.post('/api/profile/text', (req, res, next) =>
    profileFromText(req.body)
      .then(res.json.bind(res))
      .catch(next)
  );

  // personality profile from tweets
  app.post('/api/profile/twitter', (req, res, next) => {
    if (!req.body.userId) {
      return next({ code: 400, error: 'Missing required parameters: userId' });
    }

    const user = {
      credentials : req.user ? req.user.credentials : null,
      userId: req.body.userId,
    };

    return twitterHelper.getTweets(user)
      .then(profileFromTweets(req.body))
      .then(res.json.bind(res))
      .catch(next);
  });

  // twitter oauth
  app.get('/auth/twitter', passport.authenticate('twitter'));
  app.get('/auth/twitter/callback', passport.authenticate('twitter', {
    failureRedirect: '/#error',
    successRedirect: '/?source=myself'
  }));

  // home page
  app.get('/', (req, res) =>
    res.render('index', {
      twitterUser: req.query.source ==='myself' && req.user ? req.user.profile : {},
      showTwitterButton: !!process.env.TWITTER_CONSUMER_KEY,
      bluemixAnalytics: !!process.env.BLUEMIX_ANALYTICS
    })
  );

  // sunburst
  app.post('/sunburst', (req, res) =>
    res.render('sunburst', {
      sunburst: pick(req.body, ['profile', 'image'])
    })
  );

  // terms of use
  app.get('/terms-of-use', (req, res) => res.render('terms-of-use'));
};
