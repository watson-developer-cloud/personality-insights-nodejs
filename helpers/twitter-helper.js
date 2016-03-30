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
  _ = require('underscore'),
  isArray = _.isArray,
  TwitterCrawler = require('nodejs-twitter-crawler'),
  session = require('express-session');


const TWITTER_DIR = __dirname + '/../public/data/twitter';

let _credentials;


let
  tweetsFileFor = (twitterHandle) => `${TWITTER_DIR}/${twitterHandle}_tweets.json`,

  tweetsFor = (twitterHandle) => require(tweetsFileFor(twitterHandle)),

  getLocalTweets = (twitterHandle) =>
    new Promise((resolve, reject) => resolve(tweetsFor(twitterHandle)));


let
  validCredential = (credential) =>
    credential &&
    credential.consumer_key &&
    credential.consumer_secret &&
    credential.access_token_key &&
    credential.access_token_secret,

  validCredentials = (credentials) =>
    credentials.reduce((acc, c) => acc && validCredential(c), true),

  sanitizeCredentials = (credentials) => {
    const e = new Error('You must provide valid credentials');
    if (!credentials) throw e;
    credentials = isArray(credentials) ? credentials : [credentials];
    if (!validCredentials(credentials)) throw e;
    return credentials;
  };


let getCrawler = (credentials) => new TwitterCrawler(sanitizeCredentials(credentials), {debug:true});

module.exports = {
  getLocalTweets : getLocalTweets,
  getCrawler : getCrawler
};
