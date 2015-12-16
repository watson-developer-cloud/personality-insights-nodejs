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


window.$Q = (function() {

  var _module = {};

  _module.ajax = function (settings) {
    var deferred = Q.defer();
    settings.success = deferred.resolve;
    settings.error   = deferred.reject;

    $.ajax(settings);

    return deferred.promise;
  };

  _module.get = function (urlOrSettings, data, dataType) {
    if (typeof urlOrSettings === 'object') {
      return _module.ajax(urlOrSettings);
    } else {
      return _module.ajax({
        url: urlOrSettings,
        data: data,
        dataType: dataType
      });
    }
  };

  _module.post = function (urlOrSettings, data, dataType) {
    if (typeof urlOrSettings === 'object') {
      urlOrSettings.method = 'POST';
      return _module.ajax(urlOrSettings);
    } else {
      return _module.ajax({
        method: 'POST',
        url: urlOrSettings,
        data: data,
        dataType: dataType
      });
    }
  };

  _module.json = {};

  /**
   * Obtain a JSON file via GET returning a promise.
   * @param url The URL to request the JSON file.
   * @param data Some payload data for the request.
   * @return A promise.
   */
  _module.json.get = function (url, data) {
    return _module.get(url, data, 'json');
  };

  /**
   * Obtain a JSON file via POST returning a promise.
   * @param url The URL to request the JSON file.
   * @param data Some payload data for the request.
   * @return A promise.
   */
  _module.json.post = function (url, data) {
    return _module.post(url, data, 'json');
  };

  return _module;

}());
