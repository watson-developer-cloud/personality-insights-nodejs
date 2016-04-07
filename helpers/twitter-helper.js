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
  _ = require('underscore'),
  isArray = _.isArray,
  TwitterCrawler = require('nodejs-twitter-crawler'),
  session = require('express-session');


var TWITTER_DIR = __dirname + '/../public/data/twitter';

var _credentials;


function tweetsFileFor(twitterHandle) {
  return TWITTER_DIR + '/' + twitterHandle + '_tweets.json';
}

function tweetsFor(twitterHandle) {
  return require(tweetsFileFor(twitterHandle));
}

function getLocalTweets(twitterHandle) {
  return new Promise(function (resolve, reject) {
    return resolve(tweetsFor(twitterHandle));
  });
}


function validCredential(credential) {
  return credential &&
  credential.consumer_key &&
  credential.consumer_secret &&
  credential.access_token_key &&
  credential.access_token_secret;
}

function validCredentials(credentials) {
  return credentials.reduce(function (acc, c) { return acc && validCredential(c); }, true);
}

function sanitizeCredentials(credentials) {
  var e = new Error('You must provide valid credentials');
  if (!credentials) throw e;
  credentials = isArray(credentials) ? credentials : [credentials];
  if (!validCredentials(credentials)) throw e;
  return credentials;
};


function getCrawler (credentials) {
  return new TwitterCrawler(sanitizeCredentials(credentials));
}

module.exports = {
  getLocalTweets : getLocalTweets,
  getCrawler : getCrawler
};
