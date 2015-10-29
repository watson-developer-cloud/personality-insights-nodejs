/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

'use strict';

var i18n = require('i18next');

var i18nOptions = {
  debug : false,

  preload : ['en'],

  resSetPath : 'i18n/__lng__.json',
  resGetPath : 'i18n/__lng__.json',

  sendMissingTo : 'fallback',
  saveMissing   : true,
  fallbackLng   : 'en',

  detectLngFromHeaders : true,
  useCookie : false,

  dynamicLoad : true
};

module.exports = function(app) {

  i18n.init(i18nOptions, function(err) {
    if (err)
      console.warn('error initializing i18n module');
    else
      console.log('i18n module initialized');
  });

  app.use(i18n.handle);
  i18n.registerAppHelper(app);
};
