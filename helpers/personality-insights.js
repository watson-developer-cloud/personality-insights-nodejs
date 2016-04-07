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
  credentials = require('../credentials.json').personality_insights,
  watson      = require('watson-developer-cloud'),
  _           = require('underscore'),
  extend      = _.extend,
  to_promise  = require('../utilities/promises/callback-to-promise'),
  pi_input    = require('personality-insights-input');


var
  personality_insights = watson.personality_insights(credentials),
  getProfile = function (parameters) {
    return to_promise(function(callback) { personality_insights.profile(sanitize(parameters), callback)});
  };


var sanitize = function (parameters) {
  return extend(parameters, {
      text: parameters.text ? parameters.text.replace(/[\s]+/g, ' ') : undefined
    });
  };

var profileFromTweets = function (parameters) {
    return function (tweets) {
      return getProfile(extend(parameters, pi_input.fromTweets(tweets)));
    };
  };

module.exports = {
  profile : getProfile,
  profile_from_tweets : profileFromTweets
};
