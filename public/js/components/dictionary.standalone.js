!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Dictionary=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

/*
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

/*
 * Build a dictionary from any object that will allow you to access items by
 * using the full path to the element. You can also obtain a node from a path
 * that is also a dictionary.
 */
var Dictionary;

Dictionary = (function () {
  function Dictionary(value) {
    this.value = value;
  }

  /*
   * Get the value for the given key from the dictionary.
   *
   * @param key A key. Can contain '.' to indicate key's present in sub-dictionaries.
   *                   For example 'application.name' looks up for the 'application' key
   *                   in the dictionary and, with it's value, looks up for the 'name' key.
   * @param defaultValue A value to return if the key is not in the dictionary.
   * @returns The value from the dictionary.
   */

  Dictionary.prototype.get = function (key, defaultValue) {
    var i, parts, value;
    parts = key.split('.');
    value = this.value;
    i = 0;
    while (i < parts.length) {
      value = value[parts[i]];
      if (!value) {
        value = defaultValue;
        break;
      }
      i = i + 1;
    }
    return value;
  };

  /*
   * Get the node for the given key from the dictionary.
   *
   * @param key A key. Can contain '.' to indicate key's present in sub-dictionaries.
   *                   For example 'application.name' looks up for the 'application' key
   *                   in the dictionary and, with it's value, looks up for the 'name' key.
   * @returns The node.
   */

  Dictionary.prototype.getNode = function (key) {
    var value;
    value = this.get(key);
    if (value) {
      return new Dictionary(value);
    }
  };

  Dictionary.prototype.getValue = function () {
    return this.value;
  };

  Dictionary.prototype.keys = function () {
    var _keys;
    _keys = function (o) {
      var ks;
      ks = [];
      if (typeof o === 'object') {
        Object.keys(o).forEach(function (key) {
          return ks = ks.concat([key], _keys(o[key]).map(function (k2) {
            return key + '.' + k2;
          }));
        });
      }
      return ks;
    };
    return _keys(this.value);
  };

  return Dictionary;
})();

module.exports = Dictionary;

},{}]},{},[1])
(1)
});