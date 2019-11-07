/**
 * Copyright 2015-2020 IBM Corp. All Rights Reserved.
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

describe('express', ()  => {
  it('load home page when GET /', () =>
    request(app).get('/').expect(200)
  );

  it('load terms of use when GET /terms-of-use', () =>
    request(app).get('/terms-of-use').expect(200)
  );

  it('load sunburst when GET /sunburst', () =>
    request(app).post('/sunburst').expect(200)
  );

  it('return 404 for not found pages', () =>
    request(app).get('/not-found').expect(404)
  );
});
