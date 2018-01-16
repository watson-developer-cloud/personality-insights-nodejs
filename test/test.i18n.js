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

const path = require('path');
// load default variables for testing
require('dotenv').config({ path: path.join(__dirname, '../.env'), silent: true });
require('dotenv').config({ path: path.join(__dirname, '../.env.example') });


const app = require('../app');
const request = require('supertest');

describe('i18n-en', function() {
  it('English localized page should contain specific text when GET /', () =>
    request(app)
      .get('/')
      .set('Accept-language', 'en')
      .expect(200)
      .expect(function containsString(res) {
        if (res.text.indexOf('Try the service') == -1)
          throw new Error('Invalid translation string');
      })
  );
});

describe('i18n-es', function() {
  it('Spanish localized page should contain specific text when GET /', () =>
    request(app)
      .get('/')
      .set('Accept-language', 'es')
      .expect(200)
      .expect(function containsString(res) {
        if (res.text.indexOf('Pruebe el servicio') == -1)
          throw new Error('Invalid translation string');
      })
  );
});

describe('i18n-ja', function() {
  it('Japanese localized page should contain specific text when GET /', () =>
    request(app)
      .get('/')
      .set('Accept-language', 'ja')
      .expect(200)
      .expect(function containsString(res) {
        if (res.text.indexOf('実際に試してみましょう！') == -1)
          throw new Error('Invalid translation string');
      })
  );
});

describe('i18n-ko', function() {
  it('Korean localized page should contain specific text when GET /', () =>
    request(app)
      .get('/')
      .set('Accept-language', 'ko')
      .expect(200)
      .expect(function containsString(res) {
        if (res.text.indexOf('서비스를 시도해 보십시오.') == -1)
          throw new Error('Invalid translation string');
      })
  );
});
