/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
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

var request = require('request');

/**
 * Check if the service/request have error and try to format them.
 * @param  {Function} cb the request callback
 */
function formatErrorIfExists(cb) {
  return function(error, response, body) {

    // If we have an error return it.
    if (error) {
      cb(error, body, response);
      return;
    }

    try {
      body = JSON.parse(body);
    } catch (e) {}

    // If we have a response and it contains an error
    if (body && (body.error)) {
      error = body;
      body = null;
    }

    // If we still don't have an error and there was an error...
    if (!error && (response.statusCode < 200 || response.statusCode >= 300)) {
      error = { code: response.statusCode, error: body };
      if (error.code === 401 || error.code === 403)
        error.error= 'Unauthorized: Access is denied due to invalid credentials';
      else if (error.code === 429)
        error.error= 'To many request';
      body = null;
    }
    cb(error, body, response);
  };
}

/**
 * Personality Insights API Wrapper
 *
 * @param {[type]} options the context where 'auth' and 'url' are
 */
function PersonalityInsights(options) {
  this._options = options || {};
  this.url = options.url.replace(/\/$/, '');
  this.auth = 'Basic ' + new Buffer(options.username + ':' + options.password).toString('base64');
}

PersonalityInsights.prototype.profile = function(params, callback) {
  var options = {
    method: 'POST',
    url: this.url + '/v2/profile',
    body: params.text || undefined,
    json: true,
    headers: {
      'Authorization': this.auth,
      'Content-type': 'text/plain'
    }
  };

  return request(options, formatErrorIfExists(callback));
};

module.exports = PersonalityInsights;