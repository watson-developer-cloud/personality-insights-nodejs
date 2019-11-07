/**
 * Copyright 2015-2020 IBM Corp. All Rights Reserved.
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

const PersonalityInsightsV3 = require('ibm-watson/personality-insights/v3');
const { IamAuthenticator } = require('ibm-watson/auth');

const personalityInsights = new PersonalityInsightsV3({
  version: '2019-10-13',
  authenticator: new IamAuthenticator({
    apikey: process.env.PERSONALITY_INSIGHTS_IAM_APIKEY,
  }),
  url: process.env.PERSONALITY_INSIGHTS_URL,
});

const parentId = function(tweet) {
  if (tweet.in_reply_to_screen_name != null) {
    return tweet.in_reply_to_user_id;
  } else if (tweet.retweeted && (tweet.current_user_retweet != null)) {
    return tweet.current_user_retweet.id_str;
  }
};

const toContentItem = (tweet) => {
  return {
    id: tweet.id_str,
    language: tweet.lang,
    contenttype: 'text/plain',
    content: tweet.text.replace('[^(\\x20-\\x7F)]*',''),
    created: Date.parse(tweet.created_at),
    reply: tweet.in_reply_to_screen_name != null,
    parentid: parentId(tweet)
  };
};

const getProfile = (params) => {
  return personalityInsights.profile(params);
};

const profileFromTweets = (params) => (tweets) => {
  params.content = { contentItems: tweets.map(toContentItem)};
  return personalityInsights.profile(params);
};

module.exports = {
  profileFromText: getProfile,
  profileFromTweets,
};
