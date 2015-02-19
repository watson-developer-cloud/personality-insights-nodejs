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

/**
 * if VCAP_SERVICES exists then returns username, password and url
 * for the first service that stars with given name or {} otherwise
 * @param  String name, service name
 * @return [Object] the service credentials
 */
module.exports.getServiceCreds = function(name) {
  if (process.env.VCAP_SERVICES) {
    var services = JSON.parse(process.env.VCAP_SERVICES);
    for (var service_name in services) {
      if (service_name.indexOf(name) === 0) {
        var service = services[service_name][0];
        return {
          url: service.credentials.url,
          username: service.credentials.username,
          password: service.credentials.password
        };
      }
    }
  }
  return {};
};