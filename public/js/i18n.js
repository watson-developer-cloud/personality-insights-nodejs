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
 * Creates translators
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
var i18nTranslatorFactory = (function () {

  var self = {

    /**
     * Get the value for the given key from the dictionary.
     *
     * @param dictionary A dictionary with String keys and String values.
     * @param key A key. Can contain '.' to indicate key's present in sub-dictionaries.
     *                   For example 'application.name' looks up for the 'application' key
     *                   in the dictionary and, with it's value, looks up for the 'name' key.
     * @param defaultValue A value to return if the key is not in the dictionary.
     * @returns The value from the dictionary.
     */
    getKey : function (dictionary, key, defaultValue) {
      var parts = key.split('.');
      var value = dictionary;
      for (var i = 0; i < parts.length; i++) {
        value = value[parts[i]];
        if (!value) {
          value = defaultValue;
          break;
        }
      }
      return value;
    },

    /**
     * Creates a translation function given a dictionary of translations
     * and an optional backup dictionary if the key is no present in the
     * first one. The key is returned if not found in the dictionaries.
     * @param translations A translation dictionary.
     * @param defaults A translation dictionary.
     * @returns {Function} A translator.
     */
    createTranslator : function (translations, defaults) {
      defaults = defaults || {};
      var _this = this;
      return function (key) {
        var value = self.getKey(translations, key, null)
        if (value == null) {
          console.log(format('Pending translation for: %s', key));
          value = _this.getKey(defaults, key, key);
        }
        return value;
      };
    }
  };

  return self;

})();


/**
 * Provide files according to user's locale
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
var i18nProvider = (function(locale) {

  var self = {
    locale : 'en'
  };

  /**
   * Sets the locale.
   * @param locale A locale string (format: ll-CC).
   */
  self.setLocale = function (locale) {
    this.locale = locale;
  };

  /**
   * Initializes the provider.
   * @param locale A locale string (format: ll-CC).
   */
  self.init = function (locale) {
    this.setLocale(locale);
  };

  /**
   * Given the name of a json file, return all the lookup names
   * for the current locale. For example, a 'es-AR' locale and
   * a given 'traits' json name will output:
   * ['traits_es-AR.json', 'traits_es.json', 'traits.json']
   *
   * @param jsonName The name of the json file.
   * @param locale A locale (format: ll-CC)
   * @returns {Array} An array of the possible names for the json file.
   */
  self.getJsonOptions = function (jsonName, locale) {
    var localeParts = locale.split('-');
    var options = [];
    options.push(jsonName + '_' + locale.replace('-', '_') + '.json');
    if (localeParts.length === 2) {
      options.push(jsonName + '_' + localeParts[0] + '.json');
    }
    options.push(jsonName + '.json');
    return options;
  };

  /**
   * Get the appropiate json file for user's locale.
   * @param path The path where the json file is hold.
   * @param jsonName The name of the json file (without extension).
   * @param successCallback(response)
   * @param errorCallback(request, status, error)
   */
  self.getJson = function (path, jsonName, successCallback, errorCallback) {
    self.getJsonRecursive(path, this.getJsonOptions(jsonName, this.locale), successCallback, errorCallback);
  };

  /**
   * (Private) Try to get each json name. If one found, the successCallback
   * is invoked with the result. If not, the errorCallback is invoked.
   * @param path The path where the json files are hold.
   * @param jsonNames A list of json file names to try to get.
   * @param successCallback(response)
   * @param errorCallback(request, status, error)
   */
  self.getJsonRecursive = function (path, jsonNames, successCallback, errorCallback) {
    errorCallback = errorCallback || function (){};

    $.ajax({
      dataType: 'json',
      type: 'GET',
      contentType: 'application/json',
      url: path + '/' + jsonNames[0],
      success: function(data) {
        console.log('Obtained \'' + jsonNames[0] + '\' file.');
        successCallback(data);
      },
      error: function (request, status, error) {
        if (jsonNames.length == 0) {
          console.log('Error: Could not get \'' + jsonNames[0] + '\' file.', error);
          console.error(error);
          errorCallback(request, status, error);
        } else {
          console.log('Could not get \'' + jsonNames[0] + '\' file. Trying another one.', error);

          self.getJsonRecursive(path, jsonNames.slice(1, jsonNames.length), successCallback, errorCallback);
        }
      }
    });
  };

  self.init(locale);

  return self;

})($('html').attr('lang'));


