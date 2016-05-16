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


var logger = require('winston');


var error  = function (status_code, message) {
  var e = new Error(message);
  e.code = status_code;
  e.message = message;
  return e;
};


function friendlyError(req, err) {
  var errorMapping = {
    '400' : {
      'minimum number of words required for analysis' : 'error-400-minimum'
    },
    '401' : {
      'invalid credentials' : 'error-401-credentials'
    },
    '500' : {
      'missing required parameters' : 'error-500-params',
      'Not enough tweets for user' : 'error-500-enoughtweets',
      'Review your credentials' : 'error-500-credentials'
    }
  };

  var message = err.error;
  if (errorMapping[err.code]) {
    Object.keys(errorMapping[err.code]).forEach(
      function (errorString) {
        if (inString(errorString, err.error)) {
          message = errorMapping[err.code][errorString];
        }
      }
    );
  }
  return { code : err.code, error: req.__(message) };
}


module.exports = function (app) {

  // catch 404 and forward to error handler
  app.use(function(_, __, next) { return next(error(404, 'Not Found')); } );

  // error handler
  app.use(function (err, req, res, next) {
    var error = {
        code: err.code || 500,
        error: err.error || err.message
      };

    if (error.code != 404)
      logger.error(error, 'url:', req.url, 'Error:', err);

    if (err.code === 'EBADCSRFTOKEN') {
      error = {
          code: 403,
          error: 'http://goo.gl/mGOksD'
        };
    }

    res.status(error.code)
      .json(friendlyError(req, error));
  });

};
