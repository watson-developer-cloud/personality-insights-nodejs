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

var _ = require('underscore'),
    partial = _.partial,
    bind = _.bind,
    isString = _.isString,
    extend = _.extend,
    pi_input = require('personality-insights-input'),
    personality_insights = require('../../../helpers/personality-insights'),
    profileFromTweets = personality_insights.profile_from_tweets,
    TwitterHelper = require('../../../helpers/twitter-helper');

function validateParameters(req, res, next) {
  if (!isString(req.body.userId)) throw new Error({
    code: 400,
    error: 'Missing required parameters: userId'
  });else next();
}

var getProfileFromTwitter = function getProfileFromTwitter(req, res, next) {
  var tweets;
  if (req.body.live_crawling) tweets = TwitterHelper.getCrawler(req.user.credentials).getTweets(req.body.userId, { limit: 250, min_tweets: 0 });else tweets = TwitterHelper.getLocalTweets(req.body.userId);

  tweets.then(profileFromTweets(req.body)).then(bind(res.json, res)).catch(next);
};

module.exports = function (router) {
  router.post('/profile/twitter', validateParameters);
  router.post('/profile/twitter', getProfileFromTwitter);
};
