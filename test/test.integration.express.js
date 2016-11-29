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

// load default variables for testing
require('dotenv').config();

const request = require('supertest');
const fs = require('fs');
const path = require('path');

const app = require('../app');
const filePath = path.join(__dirname, '..', '/public/data/text/sample1.txt');
const sampleText = fs.readFileSync(filePath, 'utf-8');

describe('integration-express', function() {
  this.timeout(10000);

  it('Generate profile from valid text', () =>
    request(app).post('/api/profile/text')
    .type('form')
    .send({
      language: 'en',
      source_type: 'text',
      accept_language: 'en',
      include_raw: false,
      text: sampleText
    }).expect(200)
  );

  it('Generate error if insufficient text', () =>
    request(app).post('/api/profile/text')
    .type('form')
    .send({
      language: 'en',
      source_type: 'text',
      accept_language: 'en',
      include_raw: false,
      text: sampleText.substring(0, 100)
    }).expect(400)
  );

  it('Generate profile if only text is specified', () =>
    request(app).post('/api/profile/text')
    .type('form')
    .send({
      text: sampleText
    }).expect(200)
  );

  it('Generate profile from static tweets', () =>
    request(app).post('/api/profile/twitter')
    .type('form')
    .send({
      source_type: 'twitter',
      accept_language: 'en',
      include_raw: false,
      userId: 'Oprah',
    }).expect(200)
  );

  it('Generate profile from Twitter tweets', () =>
    request(app).post('/api/profile/twitter')
    .type('form')
    .send({
      source_type: 'twitter',
      accept_language: 'en',
      include_raw: false,
      userId: 'germanatt',
    }).expect(200)
  );
});
