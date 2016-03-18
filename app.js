/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'),
  app = express(),
  util = require('util'),
  extend = util._extend,
  watson = require('watson-developer-cloud'),
  Q = require('q'),
  isString = function(x) {
    return typeof x === 'string';
  };


// Bootstrap application settings
require('./config/express')(app);

var personalityInsights = watson.personality_insights({
  username: '<username>',
  password: '<password>',
  version: 'v2',
  headers: {
    'X-Watson-Learning-Opt-Out': 1
  }
});

// Creates a promise-returning function from a Node.js-style function
var getProfile = Q.denodeify(personalityInsights.profile.bind(personalityInsights));

function tweetToContentItem(tweet) {
  return {
    id: tweet.id_str,
    userid: tweet.user.id_str,
    sourceid: 'twitter',
    language: tweet.lang,
    contenttype: 'text/plain',
    content: tweet.text.replace('[^(\\x20-\\x7F)]*', ''),
    created: Date.parse(tweet.created_at)
  };
}

app.get('/', function(req, res) {
  res.render('index', {
    ct: req._csrfToken
  });
});

app.post('/sunburst', function(req, res) {
  var jsonString = req.body.data;
  res.render('sunburst', {
    profile: jsonString
  });
});

app.post('/api/profile/text', function(req, res, next) {
  getProfile(extend(req.body, {
      text: req.body.text.replace(/[\s]+/g, ' ')
    }))
    .then(function(response) {
      res.json(response[0]);
    })
    .catch(next)
    .done();
});

app.post('/api/profile/twitter', function(req, res, next) {
  if (!isString(req.body.userId))
    next({
      code: 400,
      error: 'Missing required parameters: userId'
    });

  var tweets = require('./public/data/twitter/' + req.body.userId + '_tweets.json');

  getProfile(extend(req.body, {
      contentItems: tweets.map(tweetToContentItem)
    }))
    .then(function(response) {
      res.json(response[0]);
    })
    .catch(next)
    .done();

});

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);
