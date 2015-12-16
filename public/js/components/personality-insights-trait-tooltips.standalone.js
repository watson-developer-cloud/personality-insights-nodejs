!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.PITooltips=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

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
var Dictionary,
    PITooltips,
    tooltips,
    extend = function (child, parent) {
  for (var key in parent) {
    if (hasProp.call(parent, key)) child[key] = parent[key];
  }function ctor() {
    this.constructor = child;
  }ctor.prototype = parent.prototype;child.prototype = new ctor();child.__super__ = parent.prototype;return child;
},
    hasProp = ({}).hasOwnProperty;

Dictionary = _dereq_('dictionary');

tooltips = _dereq_('./tooltips');

PITooltips = (function (superClass) {
  extend(PITooltips, superClass);

  function PITooltips() {
    return PITooltips.__super__.constructor.apply(this, arguments);
  }

  PITooltips.prototype.big5 = function () {
    return this.getNode('big5');
  };

  PITooltips.prototype.needs = function () {
    return this.getNode('needs');
  };

  PITooltips.prototype.values = function () {
    return this.getNode('values');
  };

  return PITooltips;
})(Dictionary);

module.exports = new PITooltips(tooltips);

},{"./tooltips":2,"dictionary":3}],2:[function(_dereq_,module,exports){

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
module.exports = {
  big5: {
    'Openness': 'Openness to experience. Higher: Intellectually curious, emotionally-aware, sensitive to beauty and willing to try new things.\nLower: Preferring the plain, straightforward, and obvious over the complex, ambiguous, and subtle.',
    'Conscientiousness': 'Higher: More self-disciplined, dutiful, or aiming for achievement against measures or outside expectations.\nLower: More likely to prefer the spontaneous over the planned.',
    'Introversion/Extraversion': 'Higher: More energetic and pronounced engagement with the external world. Likes high group visibility, talking, and asserting themselves.\nLower: Needs less stimulation and are more independent of their social world. It does not mean they are shy, un-friendly, or antisocial.',
    'Agreeableness': 'Higher: Value getting along with others. They have a more optimistic view of human nature.\nLower: Value self interests over others. They are more skeptical of others\' motives.',
    'Emotional range': '**This demo cannot diagnose a mental illness.** Higher: More likely to have negative emotions or get upset. It could mean they are going through a tough time.\nLower: More calm and less likely to get upset. It does not mean they are positive, or happy people.',
    'Adventurousness': 'Eagerness to trying new activities and experiencing new things.',
    'Artistic interests': 'Appreciation for art and beauty, both man-made and in nature.',
    'Emotionality': 'Emotional availability; awareness of own feelings.',
    'Imagination': 'Openness to creating an inner world of fantasy.',
    'Intellect': 'Intellectual curiosity; openness to new ideas.',
    'Authority-challenging': 'Openness to re-examine own values and traditions; readiness to challenge authority.',
    'Achievement-striving': 'The need for personal achievement and sense of direction.',
    'Cautiousness': 'Tendency to think things through before acting or speaking.',
    'Dutifulness': 'Sense of duty; amount of emphasis placed on fulfilling obligations.',
    'Orderliness': 'Personal organization, tidiness, neatness.',
    'Self-discipline': 'Will-power; the capacity to begin tasks and follow through to completion in spite of boredom or distractions.',
    'Self-efficacy': 'Belief in one\'s own competence.',
    'Activity level': 'Pace of living; level of busyness.',
    'Assertiveness': 'Forcefulness of expression; pursuit of leadership and social ascendancy; desire to direct the activities of others.',
    'Cheerfulness': 'Tendency to experience or express positive emotions.',
    'Excitement-seeking': 'A need for environmental stimulation.',
    'Warmth': 'Interest in and friendliness towards others; socially confident.',
    'Gregariousness': 'Fondness for the company of others; sociability.',
    'Altruism': 'Active and genuine concern for the welfare of others.',
    'Cooperation': 'Dislike of confrontations. Responding to interpersonal conflict with a willingness to compromise.',
    'Modesty': 'Tendency to be unassuming and play down own achievements; humility.',
    'Straightforwardness': 'Frank and genuine in expression; candid, blunt.',
    'Sympathy': 'Attitude of compassion for others; kindness.',
    'Trust': 'Level of belief in the sincerity and good intentions of others.',
    'Fiery': 'Tendency to experience–but not necessarily express–anger or frustration.',
    'Prone to worry': 'Tendency to dwell on difficulty or troubles; easily experience unease or concern.',
    'Melancholy': 'Normal tendency to experience feelings of guilt, sadness, hopelessness, or loneliness. **This demo cannot diagnose a mental illness.**',
    'Impulsiveness': 'Tendency to act on cravings and urges rather over resisting them or delaying gratification.',
    'Self-consciousness': 'Concern with rejection, embarrassment; shyness.',
    'Sensitivity to stress': 'Difficulty in coping with stress or pressure in difficult situations.'
  },
  needs: {
    'Structure': 'A need for organization, planning, and things that have a clear purpose.',
    'Stability': 'A need for the sensible, tried and tested, with a good track record and a known history.',
    'Self-expression': 'A desire to discover and assert one\'s identity.',
    'Practicality': 'A desire for getting the job done, skill, and efficiency.',
    'Love': 'Social contact, whether one-to-one or one-to-many.',
    'Liberty': 'A need to escape, a desire for new experiences, new things.',
    'Ideal': 'A desire to satisfy one\'s idea of perfection in a lifestyle or experience, oftentimes seen as pursuing a sense of community.',
    'Harmony': 'A need to appreciate or please other people, their viewpoints, and feelings.',
    'Excitement': 'A need to pursue experiences or lead a lifestyle that arouses enthusiasm and eagerness.',
    'Curiosity': 'A need to pursue experiences that foster learning, exploration, and growth.',
    'Closeness': 'A need to nurture or be nurtured; a feeling of belonging.',
    'Challenge': 'A desire to achieve, succeed, compete, or pursue experiences that test one\'s abilities.'
  },
  values: {
    'Tradition': 'Respect, commitment, and acceptance of the customs and ideas that one\'s culture and/or religion provides.',
    'Stimulation': 'Excitement, novelty, and challenge in life.',
    'Taking pleasure in life': 'Pleasure or sensuous gratification for oneself.',
    'Achievement': 'Personal success through demonstrating competence according to social standards.',
    'Helping others': 'Preserving and enhancing the welfare of those with whom one is in frequent personal contact.'
  }
};

},{}],3:[function(_dereq_,module,exports){

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

Dictionary = (function() {
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

  Dictionary.prototype.get = function(key, defaultValue) {
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

  Dictionary.prototype.getNode = function(key) {
    var value;
    value = this.get(key);
    if (value) {
      return new Dictionary(value);
    }
  };

  Dictionary.prototype.getValue = function() {
    return this.value;
  };

  Dictionary.prototype.keys = function() {
    var _keys;
    _keys = function(o) {
      var ks;
      ks = [];
      if (typeof o === 'object') {
        Object.keys(o).forEach(function(key) {
          return ks = ks.concat([key], _keys(o[key]).map(function(k2) {
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