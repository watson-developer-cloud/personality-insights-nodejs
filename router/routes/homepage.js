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


let express = require('express'),
  url = require('url');


let router = express.Router();


let twitterUser = (req) => (req.user && req.user.profile)
  ? { handle: req.user.profile.username, image: (req.user.profile.photos[0] ? req.user.profile.photos[0].value.replace('_normal', '_400x400') : undefined) }
  : {};

let query = (req) => url.parse(req.url, true).query;

let selfAnalysis = (req) => query(req).source == 'myself';

router.get('/', (req, res) => {
  let t = selfAnalysis(req) ? twitterUser(req) : {};
  console.log();
  res.render('index', { ct: req._csrfToken, twitterUser : t });
});


module.exports = router;
