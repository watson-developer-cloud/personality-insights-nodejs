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
  _ = require('underscore'),
  extend = _.extend,
  pick   = _.pick;

let router = express.Router();

let sunburstPayload = (req) => pick(req.body, ['profile', 'image']);

router.post('/', (req, res) => res.render('sunburst', { ct: '', twitterUser: {}, sunburst: sunburstPayload(req)}));


module.exports = router;
