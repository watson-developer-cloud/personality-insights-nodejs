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

var i18n = require('i18n');

const initializeI18n = (app) => {
  i18n.configure({
    locales: [
      'en', 'es', 'ja','ko'
    ],
    fallbacks: {
      'en-US': 'en',
      'es-AR': 'es',
      'es-BO': 'es',
      'es-CL': 'es',
      'es-CO': 'es',
      'es-CR': 'es',
      'es-DO': 'es',
      'es-EC': 'es',
      'es-SV': 'es',
      'es-GT': 'es',
      'es-HN': 'es',
      'es-MX': 'es',
      'es-NI': 'es',
      'es-PA': 'es',
      'es-PY': 'es',
      'es-PE': 'es',
      'es-PR': 'es',
      'es-ES': 'es',
      'es-UY': 'es',
      'es-VE': 'es',
      'ja-JP': 'ja',
      'ko-KR': 'ko'
    },
    directory: __dirname + '/../i18n',
    defaultLocale: 'en'
  });

  app.use(i18n.init);
  // eslint-disable-next-line
  console.log('i18n module initialized. Default locale: ' + i18n.getLocale());
};

module.exports = initializeI18n;
