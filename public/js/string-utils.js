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

/**
 * Given a template string to format and serveral strings
 * to fill the template, it returns the formatted string.
 * @param template This is a string containing zero, one or
 *                 more occurrences of "%s".
 * @param ...strings
 * @returns The formattted template.
 */
function format() {
  var replaces = Array.prototype.slice.apply(arguments, [1, arguments.length]);
  var subject = arguments[0];
  var parts = null;
  if ((subject.match(/%s/g) === null && replaces.length > 0) || replaces.length !== subject.match(/%s/g).length) {
    throw 'Format error: The string count to replace do not matches the argument count. Subject: ' + subject + '. Replaces: ' + replaces;
  }

  var output = subject;
  for (var i = 1; i < arguments.length; i++) {
    parts = output.split('%s');
    output = parts[0] + arguments[i] + parts.slice(1,parts.length).join('%s');
  }

  return output;
}