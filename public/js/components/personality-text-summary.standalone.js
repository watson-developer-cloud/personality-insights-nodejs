!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.TextSummary=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

var format = _dereq_('./format'),
    i18n = _dereq_('./i18n');

/**
 * Provides a Text Summary for profiles.
 */
module.exports = function (lang) {

  var self = {},
      dictionary = i18n.getDictionary(lang),
      tphrase = i18n.translatorFactory.createTranslator(dictionary.phrases); // i18n for phrases

  // Download all static data.
  self.circumplexData = dictionary.traits;
  self.facetsData = dictionary.facets;
  self.valuesData = dictionary.values;
  self.needsData = dictionary.needs;

  function compareByRelevance(o1, o2) {
    var result = 0;

    if (Math.abs(0.5 - o1.percentage) > Math.abs(0.5 - o2.percentage)) {
      result = -1; // A trait with 1% is more interesting than one with 60%.
    }

    if (Math.abs(0.5 - o1.percentage) < Math.abs(0.5 - o2.percentage)) {
      result = 1;
    }

    return result;
  }

  function compareByValue(o1, o2) {
    var result = 0;

    if (Math.abs(o1.percentage) > Math.abs(o2.percentage)) {
      result = -1; // 100 % has precedence over 99%
    }

    if (Math.abs(o1.percentage) < Math.abs(o2.percentage)) {
      result = 1;
    }

    return result;
  }

  function getCircumplexAdjective(p1, p2, order) {
    // Sort the personality traits in the order the JSON file stored it.
    var ordered = [p1, p2].sort(function (o1, o2) {
      var i1 = 'EANOC'.indexOf(o1.id.charAt(0)),
          i2 = 'EANOC'.indexOf(o2.id.charAt(0));

      return i1 < i2 ? -1 : 1;
    }),

    // Assemble the identifier as the JSON file stored it.
    identifier = ordered[0].id.concat(ordered[0].percentage > 0.5 ? '_plus_' : '_minus_').concat(ordered[1].id).concat(ordered[1].percentage > 0.5 ? '_plus' : '_minus'),
        traitMult = self.circumplexData[identifier][0],
        sentence = "%s";

    if (traitMult.perceived_negatively) {
      switch (order) {
        case 0:
          sentence = tphrase('a bit %s');
          break;
        case 1:
          sentence = tphrase('somewhat %s');
          break;
        case 2:
          sentence = tphrase('can be perceived as %s');
          break;
      }
    }

    return format(sentence, traitMult.word);
  }

  function getFacetInfo(f) {
    var data = self.facetsData[f.id.replace('_', '-').replace(' ', '-')],
        t,
        d;

    if (f.percentage > 0.5) {
      t = data.HighTerm.toLowerCase();
      d = data.HighDescription.toLowerCase();
    } else {
      t = data.LowTerm.toLowerCase();
      d = data.LowDescription.toLowerCase();
    }

    return {
      name: f.id,
      term: t,
      description: d
    };
  }

  function intervalFor(p) {
    // The MIN handles the special case for 100%.
    return Math.min(Math.floor(p * 4), 3);
  }

  function getInfoForValue(v) {
    var data = self.valuesData[v.id.replace(/[_ ]/g, '-')][0],
        d = v.percentage > 0.5 ? data.HighDescription : data.LowDescription;

    return {
      name: v.id,
      term: data.Term.toLowerCase(),
      description: d
    };
  }

  function getWordsForNeed(n) {
    // Assemble the identifier as the JSON file stored it.
    var traitMult = self.needsData[n.id];
    return traitMult;
  }

  function assembleTraits(personalityTree) {
    var sentences = [],
        big5elements = [],
        relevantBig5,
        adj,
        adj1,
        adj2,
        adj3;

    // Sort the Big 5 based on how extreme the number is.
    personalityTree.children[0].children.forEach(function (p) {
      big5elements.push({
        id: p.id,
        percentage: p.percentage
      });
    });
    big5elements.sort(compareByRelevance);

    // Remove everything between 32% and 68%, as it's inside the common people.
    relevantBig5 = big5elements.filter(function (item) {
      return Math.abs(0.5 - item.percentage) > 0.18;
    });
    if (relevantBig5.length < 2) {
      // Even if no Big 5 attribute is interesting, you get 1 adjective.
      relevantBig5 = [big5elements[0], big5elements[1]];
    }

    switch (relevantBig5.length) {
      case 2:
        // Report 1 adjective.
        adj = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
        sentences.push(format(tphrase('You are %s'), adj) + '.');
        break;
      case 3:
        // Report 2 adjectives.
        adj1 = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
        adj2 = getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1);
        sentences.push(format(tphrase('You are %s and %s'), adj1, adj2) + '.');
        break;
      case 4:
      case 5:
        // Report 3 adjectives.
        adj1 = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
        adj2 = getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1);
        adj3 = getCircumplexAdjective(relevantBig5[2], relevantBig5[3], 2);
        sentences.push(format(tphrase('You are %s, %s and %s'), adj1, adj2, adj3) + '.');
        break;
    }

    return sentences;
  }

  function assembleFacets(personalityTree) {
    var sentences = [],
        facetElements = [],
        info,
        i;

    // Assemble the full list of facets and sort them based on how extreme
    // is the number.
    personalityTree.children[0].children.forEach(function (p) {
      p.children.forEach(function (f) {
        facetElements.push({
          id: f.id,
          percentage: f.percentage,
          parent: p
        });
      });
    });
    facetElements.sort(compareByRelevance);

    // Assemble an adjective and description for the two most important facets.
    info = getFacetInfo(facetElements[0]);
    sentences.push(format(tphrase('You are %s'), info.term) + ': ' + info.description + '.');
    info = getFacetInfo(facetElements[1]);
    sentences.push(format(tphrase('You are %s'), info.term) + ': ' + info.description + '.');

    // If all the facets correspond to the same feature, continue until a
    // different parent feature is found.
    i = 2;
    if (facetElements[0].parent === facetElements[1].parent) {
      while (facetElements[0].parent === facetElements[i].parent) {
        i += 1;
      }
    }
    info = getFacetInfo(facetElements[i]);
    sentences.push(format(tphrase('And you are %s'), info.term) + ': ' + info.description + '.');

    return sentences;
  }

  /**
   * Assemble the list of values and sort them based on relevance.
   */
  function assembleValues(valuesTree) {
    var sentences = [],
        valuesList = [],
        sameQI,
        info1,
        info2,
        sentence,
        valuesInfo,
        i,
        term1,
        term2;

    valuesTree.children[0].children.forEach(function (p) {
      valuesList.push({
        id: p.id,
        percentage: p.percentage
      });
    });
    valuesList.sort(compareByRelevance);

    // Are the two most relevant in the same quartile interval? (e.g. 0%-25%)
    sameQI = intervalFor(valuesList[0].percentage) === intervalFor(valuesList[1].percentage);

    // Get all the text and data required.
    info1 = getInfoForValue(valuesList[0]);
    info2 = getInfoForValue(valuesList[1]);

    if (sameQI) {
      // Assemble the first 'both' sentence.
      term1 = info1.term;
      term2 = info2.term;
      switch (intervalFor(valuesList[0].percentage)) {
        case 0:
          sentence = format(tphrase('You are relatively unconcerned with both %s and %s'), term1, term2) + '.';
          break;
        case 1:
          sentence = format(tphrase("You don't find either %s or %s to be particularly motivating for you"), term1, term2) + '.';
          break;
        case 2:
          sentence = format(tphrase('You value both %s and %s a bit'), term1, term2) + '.';
          break;
        case 3:
          sentence = format(tphrase('You consider both %s and %s to guide a large part of what you do'), term1, term2) + '.';
          break;
      }
      sentences.push(sentence);

      // Assemble the final strings in the correct format.
      sentences.push(info1.description + '.');
      sentences.push(format(tphrase('And %s'), info2.description.toLowerCase()) + '.');
    } else {
      valuesInfo = [info1, info2];
      for (i = 0; i < valuesInfo.length; i += 1) {
        // Process it this way because the code is the same.
        switch (intervalFor(valuesList[i].percentage)) {
          case 0:
            sentence = format(tphrase('You are relatively unconcerned with %s'), valuesInfo[i].term);
            break;
          case 1:
            sentence = format(tphrase("You don't find %s to be particularly motivating for you"), valuesInfo[i].term);
            break;
          case 2:
            sentence = format(tphrase('You value %s a bit more'), valuesInfo[i].term);
            break;
          case 3:
            sentence = format(tphrase('You consider %s to guide a large part of what you do'), valuesInfo[i].term);
            break;
        }
        sentence = sentence.concat(': ').concat(valuesInfo[i].description.toLowerCase()).concat('.');
        sentences.push(sentence);
      }
    }

    return sentences;
  }

  /**
   * Assemble the list of needs and sort them based on value.
   */
  function assembleNeeds(needsTree) {
    var sentences = [],
        needsList = [],
        word,
        sentence;

    needsTree.children[0].children.forEach(function (p) {
      needsList.push({
        id: p.id,
        percentage: p.percentage
      });
    });
    needsList.sort(compareByValue);

    // Get the words required.
    word = getWordsForNeed(needsList[0])[0];

    // Form the right sentence for the single need.
    switch (intervalFor(needsList[0].percentage)) {
      case 0:
        sentence = tphrase('Experiences that make you feel high %s are generally unappealing to you');
        break;
      case 1:
        sentence = tphrase('Experiences that give a sense of %s hold some appeal to you');
        break;
      case 2:
        sentence = tphrase('You are motivated to seek out experiences that provide a strong feeling of %s');
        break;
      case 3:
        sentence = tphrase('Your choices are driven by a desire for %s');
        break;
    }
    sentence = format(sentence, word).concat(".");
    sentences.push(sentence);

    return sentences;
  }

  /**
   * Given a TraitTree returns a text
   * summary describing the result.
   *
   * @param tree A TraitTree.
   * @return An array of strings representing the
   *         paragraphs of the text summary.
   */
  function assemble(tree) {
    return [assembleTraits(tree.children[0]), assembleFacets(tree.children[0]), assembleNeeds(tree.children[1]), assembleValues(tree.children[2])];
  }

  /**
   * Given a TraitTree returns a text
   * summary describing the result.
   *
   * @param tree A TraitTree.
   * @return A String containing the text summary.
   */
  function getSummary(profile) {
    return assemble(profile.tree).map(function (paragraph) {
      return paragraph.join(" ");
    }).join("\n");
  }

  /* Text-Summary API */
  self.assembleTraits = assembleTraits;
  self.assembleFacets = assembleFacets;
  self.assembleNeeds = assembleNeeds;
  self.assembleValues = assembleValues;
  self.assemble = assemble;
  self.getSummary = getSummary;

  return self;
};

},{"./format":2,"./i18n":3}],2:[function(_dereq_,module,exports){
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

/**
 * Given a template string to format and serveral strings
 * to fill the template, it returns the formatted string.
 * @param template This is a string containing zero, one or
 *                 more occurrences of "%s".
 * @param ...strings
 * @returns The formattted template.
 */
function format(subject) {
  'use strict';

  var replaces = Array.prototype.slice.apply(arguments, [1, arguments.length]),
      parts = null,
      output,
      i;

  if (subject.match(/%s/g) === null && replaces.length > 0 || replaces.length !== subject.match(/%s/g).length) {
    throw 'Format error: The string count to replace do not matches the argument count. Subject: ' + subject + '. Replaces: ' + replaces;
  }

  output = subject;
  for (i = 1; i < arguments.length; i += 1) {
    parts = output.split('%s');
    output = parts[0] + arguments[i] + parts.slice(1, parts.length).join('%s');
  }

  return output;
}

module.exports = format;

},{}],3:[function(_dereq_,module,exports){
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

var format = _dereq_('./format');

/**
 * Creates translators
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
var translatorFactory = function () {
  'use strict';

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
    getKey: function (dictionary, key, defaultValue) {
      var i,
          parts = key.split('.'),
          value = dictionary;

      for (i = 0; i < parts.length; i = i + 1) {
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
    createTranslator: function (translations, defaults) {
      defaults = defaults || {};
      var _this = this;
      return function (key) {
        var value = self.getKey(translations, key, null);
        if (value === null) {
          console.log(format('Pending translation for: %s', key));
          value = _this.getKey(defaults, key, key);
        }
        return value;
      };
    }
  };

  return self;
}(),


/**
 * Provide files according to user's locale
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
i18nProvider = function () {
  'use strict';

  var DEFAULT_LOCALE = 'en',
      I18N_DIR = './i18n',
      self = {
    dictionaries: {
      'en': _dereq_('./i18n/en'),
      'es': _dereq_('./i18n/es'),
      'ja': _dereq_('./i18n/ja')
    }
  };

  /**
   * Returns all the locale options.
   * for 'es-AR'['traits_es-AR.json', 'traits_es.json', 'traits.json']
   *
   * @param locale A locale (format: ll-CC)
   * @returns {Array} An array of the possible names for dictionary file.
   */
  self.getLocaleOptions = function (locale) {
    var localeParts = locale.split('-'),
        options = [];

    options.push(locale.replace('-', '_'));
    if (localeParts.length === 2) {
      options.push(localeParts[0]);
    }

    options.push(DEFAULT_LOCALE);

    return options;
  };

  /**
   * Get the appropiate dictionary file for user's locale.
   */
  self.getDictionary = function (locale) {
    var locales = self.getLocaleOptions(locale),
        dict;

    for (var i = 0; i < locales.length; i++) {
      if (self.dictionaries[locales[i]]) {
        return self.dictionaries[locales[i]];
      }
    }

    throw new Error('Could not obtain any dictionary for locale "' + locale + '"');
  };

  return self;
}();

module.exports = {
  i18nProvider: i18nProvider,
  getDictionary: i18nProvider.getDictionary,
  translatorFactory: translatorFactory
};

},{"./format":2,"./i18n/en":4,"./i18n/es":5,"./i18n/ja":6}],4:[function(_dereq_,module,exports){
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

module.exports = {
    "facets": {
        "Friendliness": {
            "Big5": "Extraversion",
            "LowTerm": "Reserved",
            "HighTerm": "Outgoing",
            "LowDescription": "You are a private person and don't let many people in",
            "HighDescription": "You make friends easily and feel comfortable around other people"
        },
        "Gregariousness": {
            "Big5": "Extraversion",
            "LowTerm": "Independent",
            "HighTerm": "Sociable",
            "LowDescription": "You have a strong desire to have time to yourself",
            "HighDescription": "You enjoy being in the company of others"
        },
        "Assertiveness": {
            "Big5": "Extraversion",
            "LowTerm": "Demure",
            "HighTerm": "Assertive",
            "LowDescription": "You prefer to listen than to talk, especially in group situations",
            "HighDescription": "You tend to speak up and take charge of situations, and you are comfortable leading groups"
        },
        "Activity-level": {
            "Big5": "Extraversion",
            "LowTerm": "Laid-back",
            "HighTerm": "Energetic",
            "LowDescription": "You appreciate a relaxed pace in life",
            "HighDescription": "You enjoy a fast-paced, busy schedule with many activities"
        },
        "Excitement-seeking": {
            "Big5": "Extraversion",
            "LowTerm": "Calm-seeking",
            "HighTerm": "Excitement-seeking",
            "LowDescription": "You prefer activities that are quiet, calm, and safe",
            "HighDescription": "You are excited by taking risks and feel bored without lots of action going on"
        },
        "Cheerfulness": {
            "Big5": "Extraversion",
            "LowTerm": "Solemn",
            "HighTerm": "Cheerful",
            "LowDescription": "You are generally serious and do not joke much",
            "HighDescription": "You are a joyful person and share that joy with the world"
        },
        "Trust": {
            "Big5": "Agreeableness",
            "LowTerm": "Cautious of others",
            "HighTerm": "Trusting of others",
            "LowDescription": "You are wary of other people's intentions and do not trust easily",
            "HighDescription": "You believe the best in others and trust people easily"
        },
        "Cooperation": {
            "Big5": "Agreeableness",
            "LowTerm": "Contrary",
            "HighTerm": "Accommodating",
            "LowDescription": "You do not shy away from contradicting others",
            "HighDescription": "You are easy to please and try to avoid confrontation"
        },
        "Altruism": {
            "Big5": "Agreeableness",
            "LowTerm": "Self-focused",
            "HighTerm": "Altruistic",
            "LowDescription": "You are more concerned with taking care of yourself than taking time for others",
            "HighDescription": "You feel fulfilled when helping others, and will go out of your way to do so"
        },
        "Morality": {
            "Big5": "Agreeableness",
            "LowTerm": "Compromising",
            "HighTerm": "Uncompromising",
            "LowDescription": "You are comfortable using every trick in the book to get what you want",
            "HighDescription": "You think it is wrong to take advantage of others to get ahead"
        },
        "Modesty": {
            "Big5": "Agreeableness",
            "LowTerm": "Proud",
            "HighTerm": "Modest",
            "LowDescription": "You hold yourself in high regard, satisfied with who you are",
            "HighDescription": "You are uncomfortable being the center of attention"
        },
        "Sympathy": {
            "Big5": "Agreeableness",
            "LowTerm": "Hardened",
            "HighTerm": "Empathetic",
            "LowDescription": "You think that people should generally rely more on themselves than on other people",
            "HighDescription": "You feel what others feel and are compassionate towards them"
        },
        "Self-efficacy": {
            "Big5": "Conscientiousness",
            "LowTerm": "Self-doubting",
            "HighTerm": "Self-assured",
            "LowDescription": "You frequently doubt your ability to achieve your goals",
            "HighDescription": "You feel you have the ability to succeed in the tasks you set out to do"
        },
        "Orderliness": {
            "Big5": "Conscientiousness",
            "LowTerm": "Unstructured",
            "HighTerm": "Organized",
            "LowDescription": "You do not make a lot of time for organization in your daily life",
            "HighDescription": "You feel a strong need for structure in your life"
        },
        "Dutifulness": {
            "Big5": "Conscientiousness",
            "LowTerm": "Carefree",
            "HighTerm": "Dutiful",
            "LowDescription": "You do what you want, disregarding rules and obligations",
            "HighDescription": "You take rules and obligations seriously, even when they're inconvenient"
        },
        "Achievement-striving": {
            "Big5": "Conscientiousness",
            "LowTerm": "Content",
            "HighTerm": "Driven",
            "LowDescription": "You are content with your level of accomplishment and do not feel the need to set ambitious goals",
            "HighDescription": "You have high goals for yourself and work hard to achieve them"
        },
        "Self-discipline": {
            "Big5": "Conscientiousness",
            "LowTerm": "Intermittent",
            "HighTerm": "Persistent",
            "LowDescription": "You have a hard time sticking with difficult tasks for a long period of time",
            "HighDescription": "You can tackle and stick with tough tasks"
        },
        "Cautiousness": {
            "Big5": "Conscientiousness",
            "LowTerm": "Bold",
            "HighTerm": "Deliberate",
            "LowDescription": "You would rather take action immediately than spend time deliberating making a decision",
            "HighDescription": "You carefully think through decisions before making them"
        },
        "Anxiety": {
            "Big5": "Neuroticism",
            "LowTerm": "Self-assured",
            "HighTerm": "Prone to worry",
            "LowDescription": "You tend to feel calm and self-assured",
            "HighDescription": "You tend to worry about things that might happen"
        },
        "Anger": {
            "Big5": "Neuroticism",
            "LowTerm": "Mild-tempered",
            "HighTerm": "Fiery",
            "LowDescription": "It takes a lot to get you angry",
            "HighDescription": "You have a fiery temper, especially when things do not go your way"
        },
        "Depression": {
            "Big5": "Neuroticism",
            "LowTerm": "Content",
            "HighTerm": "Melancholy",
            "LowDescription": "You are generally comfortable with yourself as you are",
            "HighDescription": "You think quite often about the things you are unhappy about"
        },
        "Self-consciousness": {
            "Big5": "Neuroticism",
            "LowTerm": "Confident",
            "HighTerm": "Self-conscious",
            "LowDescription": "You are hard to embarrass and are self-confident most of the time",
            "HighDescription": "You are sensitive about what others might be thinking about you"
        },
        "Immoderation": {
            "Big5": "Neuroticism",
            "LowTerm": "Self-controlled",
            "HighTerm": "Hedonistic",
            "LowDescription": "You have control over your desires, which are not particularly intense",
            "HighDescription": "You feel your desires strongly and are easily tempted by them"
        },
        "Vulnerability": {
            "Big5": "Neuroticism",
            "LowTerm": "Calm under pressure",
            "HighTerm": "Susceptible to stress",
            "LowDescription": "You handle unexpected events calmly and effectively",
            "HighDescription": "You are easily overwhelmed in stressful situations"
        },
        "Imagination": {
            "Big5": "Openness",
            "LowTerm": "Down-to-earth",
            "HighTerm": "Imaginative",
            "LowDescription": "You prefer facts over fantasy",
            "HighDescription": "You have a wild imagination"
        },
        "Artistic-interests": {
            "Big5": "Openness",
            "LowTerm": "Unconcerned with art",
            "HighTerm": "Appreciative of art",
            "LowDescription": "You are less concerned with artistic or creative activities than most people who participated in our surveys",
            "HighDescription": "You enjoy beauty and seek out creative experiences"
        },
        "Emotionality": {
            "Big5": "Openness",
            "LowTerm": "Dispassionate",
            "HighTerm": "Emotionally aware",
            "LowDescription": "You do not frequently think about or openly express your emotions",
            "HighDescription": "You are aware of your feelings and how to express them"
        },
        "Adventurousness": {
            "Big5": "Openness",
            "LowTerm": "Consistent",
            "HighTerm": "Adventurous",
            "LowDescription": "You enjoy familiar routines and prefer not to deviate from them",
            "HighDescription": "You are eager to experience new things"
        },
        "Intellect": {
            "Big5": "Openness",
            "LowTerm": "Concrete",
            "HighTerm": "Philosophical",
            "LowDescription": "You prefer dealing with the world as it is, rarely considering abstract ideas",
            "HighDescription": "You are open to and intrigued by new ideas and love to explore them"
        },
        "Liberalism": {
            "Big5": "Openness",
            "LowTerm": "Respectful of authority",
            "HighTerm": "Authority-challenging",
            "LowDescription": "You prefer following with tradition in order to maintain a sense of stability",
            "HighDescription": "You prefer to challenge authority and traditional values to help bring about positive changes"
        }
    },
    "needs": {
        "Challenge": ["prestige", "competition", "glory"],
        "Closeness": ["belongingness", "nostalgia", "intimacy"],
        "Curiosity": ["discovery", "mastery", "gaining knowledge"],
        "Excitement": ["revelry", "anticipation", "exhiliration"],
        "Harmony": ["well-being", "courtesy", "politeness"],
        "Ideal": ["sophistication", "spirituality", "superiority", "fulfillment"],
        "Liberty": ["modernity", "expanding possibility", "escape", "spontaneity", "novelty"],
        "Love": ["connectedness", "affinity"],
        "Practicality": ["efficiency", "practicality", "high value", "convenience"],
        "Self-expression": ["self-expression", "personal empowerment", "personal strength"],
        "Stability": ["stability", "authenticity", "trustworthiness"],
        "Structure": ["organization", "straightforwardness", "clarity", "reliability"]
    },
    "phrases": {
        "You are %s": "You are %s",
        "You are %s and %s": "You are %s and %s",
        "You are %s, %s and %s": "You are %s, %s and %s",
        "And you are %s": "And you are %s",
        "You are relatively unconcerned with %s": "You are relatively unconcerned with %s",
        "You are relatively unconcerned with both %s and %s": "You are relatively unconcerned with both %s and %s",
        "You don't find %s to be particularly motivating for you": "You don't find %s to be particularly motivating for you",
        "You don't find either %s or %s to be particularly motivating for you": "You don't find either %s or %s to be particularly motivating for you",
        "You value both %s a bit": "You value both %s a bit",
        "You value both %s and %s a bit": "You value both %s and %s a bit",
        "You consider %s to guide a large part of what you do": "You consider %s to guide a large part of what you do",
        "You consider both %s and %s to guide a large part of what you do": "You consider both %s and %s to guide a large part of what you do",
        "And %s": "And %s",
        "You value %s a bit more": "You value %s a bit more",
        "Experiences that make you feel high %s are generally unappealing to you": "Experiences that make you feel high %s are generally unappealing to you",
        "Experiences that give a sense of %s hold some appeal to you": "Experiences that give a sense of %s hold some appeal to you",
        "You are motivated to seek out experiences that provide a strong feeling of %s": "You are motivated to seek out experiences that provide a strong feeling of %s",
        "Your choices are driven by a desire for %s": "Your choices are driven by a desire for %s",
        "a bit %s": "a bit %s",
        "somewhat %s": "somewhat %s",
        "can be perceived as %s": "can be perceived as %s"
    },
    "traits": {
        "Agreeableness_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "inconsiderate"
        }, {
            "perceived_negatively": true,
            "word": "impolite"
        }, {
            "perceived_negatively": true,
            "word": "distrustful"
        }, {
            "perceived_negatively": true,
            "word": "uncooperative"
        }, {
            "perceived_negatively": true,
            "word": "thoughtless"
        }],
        "Agreeableness_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "strict"
        }, {
            "perceived_negatively": false,
            "word": "rigid"
        }, {
            "perceived_negatively": true,
            "word": "stern"
        }],
        "Agreeableness_minus_Extraversion_minus": [{
            "perceived_negatively": true,
            "word": "cynical"
        }, {
            "perceived_negatively": true,
            "word": "wary of others"
        }, {
            "perceived_negatively": true,
            "word": "seclusive"
        }, {
            "perceived_negatively": true,
            "word": "detached"
        }, {
            "perceived_negatively": true,
            "word": "impersonal"
        }, {
            "perceived_negatively": true,
            "word": "glum"
        }],
        "Agreeableness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "bullheaded"
        }, {
            "perceived_negatively": true,
            "word": "abrupt"
        }, {
            "perceived_negatively": true,
            "word": "crude"
        }, {
            "perceived_negatively": true,
            "word": "combative"
        }, {
            "perceived_negatively": true,
            "word": "rough"
        }, {
            "perceived_negatively": false,
            "word": "sly"
        }, {
            "perceived_negatively": true,
            "word": "manipulative"
        }, {
            "perceived_negatively": true,
            "word": "gruff"
        }, {
            "perceived_negatively": true,
            "word": "devious"
        }],
        "Agreeableness_minus_Neuroticism_minus": [{
            "perceived_negatively": true,
            "word": "insensitive"
        }, {
            "perceived_negatively": true,
            "word": "unaffectionate"
        }, {
            "perceived_negatively": true,
            "word": "passionless"
        }, {
            "perceived_negatively": true,
            "word": "unemotional"
        }],
        "Agreeableness_minus_Neuroticism_plus": [{
            "perceived_negatively": true,
            "word": "critical"
        }, {
            "perceived_negatively": true,
            "word": "selfish"
        }, {
            "perceived_negatively": true,
            "word": "ill-tempered"
        }, {
            "perceived_negatively": true,
            "word": "antagonistic"
        }, {
            "perceived_negatively": true,
            "word": "grumpy"
        }, {
            "perceived_negatively": true,
            "word": "bitter"
        }, {
            "perceived_negatively": true,
            "word": "disagreeable"
        }, {
            "perceived_negatively": true,
            "word": "demanding"
        }],
        "Agreeableness_minus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "coarse"
        }, {
            "perceived_negatively": true,
            "word": "tactless"
        }, {
            "perceived_negatively": true,
            "word": "curt"
        }, {
            "perceived_negatively": true,
            "word": "narrow-minded"
        }, {
            "perceived_negatively": true,
            "word": "callous"
        }, {
            "perceived_negatively": true,
            "word": "ruthless"
        }, {
            "perceived_negatively": true,
            "word": "uncharitable"
        }, {
            "perceived_negatively": true,
            "word": "vindictive"
        }],
        "Agreeableness_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "shrewd"
        }, {
            "perceived_negatively": false,
            "word": "eccentric"
        }, {
            "perceived_negatively": false,
            "word": "individualistic"
        }],
        "Agreeableness_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "unpretentious"
        }, {
            "perceived_negatively": false,
            "word": "self-effacing"
        }],
        "Agreeableness_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "helpful"
        }, {
            "perceived_negatively": false,
            "word": "cooperative"
        }, {
            "perceived_negatively": false,
            "word": "considerate"
        }, {
            "perceived_negatively": false,
            "word": "respectful"
        }, {
            "perceived_negatively": false,
            "word": "polite"
        }, {
            "perceived_negatively": false,
            "word": "reasonable"
        }, {
            "perceived_negatively": false,
            "word": "courteous"
        }, {
            "perceived_negatively": false,
            "word": "thoughtful"
        }, {
            "perceived_negatively": false,
            "word": "loyal"
        }, {
            "perceived_negatively": false,
            "word": "moral"
        }],
        "Agreeableness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "soft-hearted"
        }, {
            "perceived_negatively": false,
            "word": "agreeable"
        }, {
            "perceived_negatively": false,
            "word": "obliging"
        }, {
            "perceived_negatively": false,
            "word": "humble"
        }, {
            "perceived_negatively": true,
            "word": "lenient"
        }],
        "Agreeableness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "effervescent"
        }, {
            "perceived_negatively": false,
            "word": "happy"
        }, {
            "perceived_negatively": false,
            "word": "friendly"
        }, {
            "perceived_negatively": false,
            "word": "merry"
        }, {
            "perceived_negatively": false,
            "word": "jovial"
        }, {
            "perceived_negatively": false,
            "word": "humorous"
        }],
        "Agreeableness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "generous"
        }, {
            "perceived_negatively": false,
            "word": "pleasant"
        }, {
            "perceived_negatively": false,
            "word": "tolerant"
        }, {
            "perceived_negatively": false,
            "word": "peaceful"
        }, {
            "perceived_negatively": false,
            "word": "flexible"
        }, {
            "perceived_negatively": false,
            "word": "easy-going"
        }, {
            "perceived_negatively": false,
            "word": "fair"
        }, {
            "perceived_negatively": false,
            "word": "charitable"
        }, {
            "perceived_negatively": false,
            "word": "trustful"
        }],
        "Agreeableness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "sentimental"
        }, {
            "perceived_negatively": false,
            "word": "affectionate"
        }, {
            "perceived_negatively": false,
            "word": "sensitive"
        }, {
            "perceived_negatively": false,
            "word": "soft"
        }, {
            "perceived_negatively": false,
            "word": "passionate"
        }, {
            "perceived_negatively": false,
            "word": "romantic"
        }],
        "Agreeableness_plus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "dependent"
        }, {
            "perceived_negatively": true,
            "word": "simple"
        }],
        "Agreeableness_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "genial"
        }, {
            "perceived_negatively": false,
            "word": "tactful"
        }, {
            "perceived_negatively": false,
            "word": "diplomatic"
        }, {
            "perceived_negatively": false,
            "word": "deep"
        }, {
            "perceived_negatively": false,
            "word": "idealistic"
        }],
        "Conscientiousness_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "rash"
        }, {
            "perceived_negatively": true,
            "word": "uncooperative"
        }, {
            "perceived_negatively": true,
            "word": "unreliable"
        }, {
            "perceived_negatively": true,
            "word": "distrustful"
        }, {
            "perceived_negatively": true,
            "word": "thoughtless"
        }],
        "Conscientiousness_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "unpretentious"
        }, {
            "perceived_negatively": false,
            "word": "self-effacing"
        }],
        "Conscientiousness_minus_Extraversion_minus": [{
            "perceived_negatively": true,
            "word": "indecisive"
        }, {
            "perceived_negatively": true,
            "word": "aimless"
        }, {
            "perceived_negatively": false,
            "word": "wishy-washy"
        }, {
            "perceived_negatively": false,
            "word": "noncommittal"
        }, {
            "perceived_negatively": true,
            "word": "unambitious"
        }],
        "Conscientiousness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "unruly"
        }, {
            "perceived_negatively": false,
            "word": "boisterous"
        }, {
            "perceived_negatively": true,
            "word": "reckless"
        }, {
            "perceived_negatively": true,
            "word": "devil-may-care"
        }, {
            "perceived_negatively": false,
            "word": "demonstrative"
        }],
        "Conscientiousness_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "informal"
        }, {
            "perceived_negatively": false,
            "word": "low-key"
        }],
        "Conscientiousness_minus_Neuroticism_plus": [{
            "perceived_negatively": true,
            "word": "scatterbrained"
        }, {
            "perceived_negatively": true,
            "word": "inconsistent"
        }, {
            "perceived_negatively": true,
            "word": "erratic"
        }, {
            "perceived_negatively": true,
            "word": "forgetful"
        }, {
            "perceived_negatively": true,
            "word": "impulsive"
        }, {
            "perceived_negatively": true,
            "word": "frivolous"
        }],
        "Conscientiousness_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "foolhardy"
        }, {
            "perceived_negatively": true,
            "word": "illogical"
        }, {
            "perceived_negatively": true,
            "word": "immature"
        }, {
            "perceived_negatively": true,
            "word": "haphazard"
        }, {
            "perceived_negatively": false,
            "word": "lax"
        }, {
            "perceived_negatively": true,
            "word": "flippant"
        }],
        "Conscientiousness_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "unconventional"
        }, {
            "perceived_negatively": false,
            "word": "quirky"
        }],
        "Conscientiousness_plus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "stern"
        }, {
            "perceived_negatively": false,
            "word": "strict"
        }, {
            "perceived_negatively": false,
            "word": "rigid"
        }],
        "Conscientiousness_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "dependable"
        }, {
            "perceived_negatively": false,
            "word": "responsible"
        }, {
            "perceived_negatively": false,
            "word": "reliable"
        }, {
            "perceived_negatively": false,
            "word": "mannerly"
        }, {
            "perceived_negatively": false,
            "word": "considerate"
        }],
        "Conscientiousness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "cautious"
        }, {
            "perceived_negatively": false,
            "word": "confident"
        }, {
            "perceived_negatively": false,
            "word": "punctual"
        }, {
            "perceived_negatively": false,
            "word": "formal"
        }, {
            "perceived_negatively": false,
            "word": "thrifty"
        }, {
            "perceived_negatively": false,
            "word": "principled"
        }],
        "Conscientiousness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "ambitious"
        }, {
            "perceived_negatively": false,
            "word": "alert"
        }, {
            "perceived_negatively": false,
            "word": "firm"
        }, {
            "perceived_negatively": false,
            "word": "purposeful"
        }, {
            "perceived_negatively": false,
            "word": "competitive"
        }],
        "Conscientiousness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "thorough"
        }, {
            "perceived_negatively": false,
            "word": "steady"
        }, {
            "perceived_negatively": false,
            "word": "consistent"
        }, {
            "perceived_negatively": false,
            "word": "self-disciplined"
        }, {
            "perceived_negatively": false,
            "word": "logical"
        }, {
            "perceived_negatively": false,
            "word": "decisive"
        }, {
            "perceived_negatively": false,
            "word": "controlled"
        }, {
            "perceived_negatively": false,
            "word": "concise"
        }],
        "Conscientiousness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "particular"
        }, {
            "perceived_negatively": true,
            "word": "high-strung"
        }],
        "Conscientiousness_plus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "traditional"
        }, {
            "perceived_negatively": false,
            "word": "conventional"
        }],
        "Conscientiousness_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "sophisticated"
        }, {
            "perceived_negatively": false,
            "word": "perfectionistic"
        }, {
            "perceived_negatively": false,
            "word": "industrious"
        }, {
            "perceived_negatively": false,
            "word": "dignified"
        }, {
            "perceived_negatively": false,
            "word": "refined"
        }, {
            "perceived_negatively": false,
            "word": "cultured"
        }, {
            "perceived_negatively": false,
            "word": "foresighted"
        }],
        "Extraversion_minus_Agreeableness_minus": [{
            "perceived_negatively": false,
            "word": "skeptical"
        }, {
            "perceived_negatively": false,
            "word": "wary of others"
        }, {
            "perceived_negatively": true,
            "word": "seclusive"
        }, {
            "perceived_negatively": true,
            "word": "uncommunicative"
        }, {
            "perceived_negatively": true,
            "word": "unsociable"
        }, {
            "perceived_negatively": true,
            "word": "glum"
        }, {
            "perceived_negatively": true,
            "word": "detached"
        }, {
            "perceived_negatively": false,
            "word": "aloof"
        }],
        "Extraversion_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "unaggressive"
        }, {
            "perceived_negatively": false,
            "word": "humble"
        }, {
            "perceived_negatively": false,
            "word": "submissive"
        }, {
            "perceived_negatively": false,
            "word": "timid"
        }, {
            "perceived_negatively": false,
            "word": "compliant"
        }, {
            "perceived_negatively": false,
            "word": "naïve"
        }],
        "Extraversion_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "indirect"
        }, {
            "perceived_negatively": true,
            "word": "unenergetic"
        }, {
            "perceived_negatively": true,
            "word": "sluggish"
        }, {
            "perceived_negatively": true,
            "word": "nonpersistent"
        }, {
            "perceived_negatively": true,
            "word": "vague"
        }],
        "Extraversion_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "restrained"
        }, {
            "perceived_negatively": false,
            "word": "serious"
        }, {
            "perceived_negatively": false,
            "word": "discreet"
        }, {
            "perceived_negatively": false,
            "word": "cautious"
        }, {
            "perceived_negatively": false,
            "word": "principled"
        }],
        "Extraversion_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "tranquil"
        }, {
            "perceived_negatively": false,
            "word": "sedate"
        }, {
            "perceived_negatively": false,
            "word": "placid"
        }, {
            "perceived_negatively": false,
            "word": "impartial"
        }, {
            "perceived_negatively": false,
            "word": "unassuming"
        }, {
            "perceived_negatively": false,
            "word": "acquiescent"
        }],
        "Extraversion_minus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "guarded"
        }, {
            "perceived_negatively": false,
            "word": "pessimistic"
        }, {
            "perceived_negatively": false,
            "word": "secretive"
        }, {
            "perceived_negatively": true,
            "word": "cowardly"
        }, {
            "perceived_negatively": false,
            "word": "secretive"
        }],
        "Extraversion_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "somber"
        }, {
            "perceived_negatively": true,
            "word": "meek"
        }, {
            "perceived_negatively": true,
            "word": "unadventurous"
        }, {
            "perceived_negatively": false,
            "word": "passive"
        }, {
            "perceived_negatively": true,
            "word": "apathetic"
        }, {
            "perceived_negatively": false,
            "word": "docile"
        }],
        "Extraversion_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "inner-directed"
        }, {
            "perceived_negatively": false,
            "word": "introspective"
        }, {
            "perceived_negatively": false,
            "word": "meditative"
        }, {
            "perceived_negatively": false,
            "word": "contemplating"
        }, {
            "perceived_negatively": false,
            "word": "self-examining"
        }],
        "Extraversion_plus_Agreeableness_minus": [{
            "perceived_negatively": false,
            "word": "opinionated"
        }, {
            "perceived_negatively": true,
            "word": "forceful"
        }, {
            "perceived_negatively": true,
            "word": "domineering"
        }, {
            "perceived_negatively": true,
            "word": "boastful"
        }, {
            "perceived_negatively": true,
            "word": "bossy"
        }, {
            "perceived_negatively": false,
            "word": "dominant"
        }, {
            "perceived_negatively": false,
            "word": "cunning"
        }],
        "Extraversion_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "social"
        }, {
            "perceived_negatively": false,
            "word": "energetic"
        }, {
            "perceived_negatively": false,
            "word": "enthusiastic"
        }, {
            "perceived_negatively": false,
            "word": "communicative"
        }, {
            "perceived_negatively": false,
            "word": "vibrant"
        }, {
            "perceived_negatively": false,
            "word": "spirited"
        }, {
            "perceived_negatively": false,
            "word": "magnetic"
        }, {
            "perceived_negatively": false,
            "word": "zestful"
        }],
        "Extraversion_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "boisterous"
        }, {
            "perceived_negatively": false,
            "word": "mischievous"
        }, {
            "perceived_negatively": false,
            "word": "exhibitionistic"
        }, {
            "perceived_negatively": false,
            "word": "gregarious"
        }, {
            "perceived_negatively": false,
            "word": "demonstrative"
        }],
        "Extraversion_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "active"
        }, {
            "perceived_negatively": false,
            "word": "competitive"
        }, {
            "perceived_negatively": false,
            "word": "persistent"
        }, {
            "perceived_negatively": false,
            "word": "ambitious"
        }, {
            "perceived_negatively": false,
            "word": "purposeful"
        }],
        "Extraversion_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "confident"
        }, {
            "perceived_negatively": false,
            "word": "bold"
        }, {
            "perceived_negatively": false,
            "word": "assured"
        }, {
            "perceived_negatively": false,
            "word": "uninhibited"
        }, {
            "perceived_negatively": false,
            "word": "courageous"
        }, {
            "perceived_negatively": false,
            "word": "brave"
        }, {
            "perceived_negatively": false,
            "word": "self-satisfied"
        }, {
            "perceived_negatively": false,
            "word": "vigorous"
        }, {
            "perceived_negatively": false,
            "word": "strong"
        }],
        "Extraversion_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "explosive"
        }, {
            "perceived_negatively": true,
            "word": "wordy"
        }, {
            "perceived_negatively": false,
            "word": "extravagant"
        }, {
            "perceived_negatively": true,
            "word": "volatile"
        }, {
            "perceived_negatively": false,
            "word": "flirtatious"
        }],
        "Extraversion_plus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "verbose"
        }, {
            "perceived_negatively": true,
            "word": "unscrupulous"
        }, {
            "perceived_negatively": true,
            "word": "pompous"
        }],
        "Extraversion_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "expressive"
        }, {
            "perceived_negatively": false,
            "word": "candid"
        }, {
            "perceived_negatively": false,
            "word": "dramatic"
        }, {
            "perceived_negatively": false,
            "word": "spontaneous"
        }, {
            "perceived_negatively": false,
            "word": "witty"
        }, {
            "perceived_negatively": false,
            "word": "opportunistic"
        }, {
            "perceived_negatively": false,
            "word": "independent"
        }],
        "Neuroticism_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "unemotional"
        }, {
            "perceived_negatively": true,
            "word": "insensitive"
        }, {
            "perceived_negatively": true,
            "word": "unaffectionate"
        }, {
            "perceived_negatively": true,
            "word": "passionless"
        }],
        "Neuroticism_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "patient"
        }, {
            "perceived_negatively": false,
            "word": "relaxed"
        }, {
            "perceived_negatively": false,
            "word": "undemanding"
        }, {
            "perceived_negatively": false,
            "word": "down-to-earth"
        }, {
            "perceived_negatively": false,
            "word": "optimistic"
        }, {
            "perceived_negatively": false,
            "word": "conceitless"
        }, {
            "perceived_negatively": false,
            "word": "uncritical"
        }, {
            "perceived_negatively": false,
            "word": "unpretentious"
        }],
        "Neuroticism_minus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "informal"
        }, {
            "perceived_negatively": false,
            "word": "low-key"
        }],
        "Neuroticism_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "rational"
        }, {
            "perceived_negatively": false,
            "word": "objective"
        }, {
            "perceived_negatively": false,
            "word": "steady"
        }, {
            "perceived_negatively": false,
            "word": "logical"
        }, {
            "perceived_negatively": false,
            "word": "decisive"
        }, {
            "perceived_negatively": false,
            "word": "poised"
        }, {
            "perceived_negatively": false,
            "word": "concise"
        }, {
            "perceived_negatively": false,
            "word": "thorough"
        }, {
            "perceived_negatively": false,
            "word": "economical"
        }, {
            "perceived_negatively": false,
            "word": "self-disciplined"
        }],
        "Neuroticism_minus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "unassuming"
        }, {
            "perceived_negatively": true,
            "word": "unexcitable"
        }, {
            "perceived_negatively": false,
            "word": "placid"
        }, {
            "perceived_negatively": false,
            "word": "tranquil"
        }],
        "Neuroticism_minus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "unselfconscious"
        }, {
            "perceived_negatively": false,
            "word": "weariless"
        }, {
            "perceived_negatively": false,
            "word": "indefatigable"
        }],
        "Neuroticism_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "imperturbable"
        }, {
            "perceived_negatively": true,
            "word": "insensitive"
        }],
        "Neuroticism_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "heartfelt"
        }, {
            "perceived_negatively": false,
            "word": "versatile"
        }, {
            "perceived_negatively": false,
            "word": "creative"
        }, {
            "perceived_negatively": false,
            "word": "intellectual"
        }, {
            "perceived_negatively": false,
            "word": "insightful"
        }],
        "Neuroticism_plus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "temperamental"
        }, {
            "perceived_negatively": true,
            "word": "irritable"
        }, {
            "perceived_negatively": true,
            "word": "quarrelsome"
        }, {
            "perceived_negatively": true,
            "word": "impatient"
        }, {
            "perceived_negatively": true,
            "word": "grumpy"
        }, {
            "perceived_negatively": true,
            "word": "crabby"
        }, {
            "perceived_negatively": true,
            "word": "cranky"
        }],
        "Neuroticism_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "emotional"
        }, {
            "perceived_negatively": true,
            "word": "gullible"
        }, {
            "perceived_negatively": false,
            "word": "affectionate"
        }, {
            "perceived_negatively": false,
            "word": "sensitive"
        }, {
            "perceived_negatively": false,
            "word": "soft"
        }],
        "Neuroticism_plus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "compulsive"
        }, {
            "perceived_negatively": true,
            "word": "nosey"
        }, {
            "perceived_negatively": true,
            "word": "self-indulgent"
        }, {
            "perceived_negatively": true,
            "word": "forgetful"
        }, {
            "perceived_negatively": true,
            "word": "impulsive"
        }],
        "Neuroticism_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "particular"
        }, {
            "perceived_negatively": true,
            "word": "high-strung"
        }],
        "Neuroticism_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "guarded"
        }, {
            "perceived_negatively": true,
            "word": "fretful"
        }, {
            "perceived_negatively": true,
            "word": "insecure"
        }, {
            "perceived_negatively": true,
            "word": "pessimistic"
        }, {
            "perceived_negatively": false,
            "word": "secretive"
        }, {
            "perceived_negatively": true,
            "word": "fearful"
        }, {
            "perceived_negatively": true,
            "word": "negativistic"
        }, {
            "perceived_negatively": false,
            "word": "self-critical"
        }],
        "Neuroticism_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "excitable"
        }, {
            "perceived_negatively": true,
            "word": "wordy"
        }, {
            "perceived_negatively": false,
            "word": "flirtatious"
        }, {
            "perceived_negatively": true,
            "word": "explosive"
        }, {
            "perceived_negatively": false,
            "word": "extravagant"
        }, {
            "perceived_negatively": true,
            "word": "volatile"
        }],
        "Neuroticism_plus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "easily rattled"
        }, {
            "perceived_negatively": false,
            "word": "easily irked"
        }, {
            "perceived_negatively": false,
            "word": "apprehensive"
        }],
        "Neuroticism_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "excitable"
        }, {
            "perceived_negatively": false,
            "word": "passionate"
        }, {
            "perceived_negatively": false,
            "word": "sensual"
        }],
        "Openness_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "coarse"
        }, {
            "perceived_negatively": true,
            "word": "tactless"
        }, {
            "perceived_negatively": true,
            "word": "curt"
        }, {
            "perceived_negatively": true,
            "word": "narrow-minded"
        }, {
            "perceived_negatively": true,
            "word": "callous"
        }],
        "Openness_minus_Agreeableness_plus": [{
            "perceived_negatively": true,
            "word": "simple"
        }, {
            "perceived_negatively": true,
            "word": "dependent"
        }],
        "Openness_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "shortsighted"
        }, {
            "perceived_negatively": false,
            "word": "foolhardy"
        }, {
            "perceived_negatively": true,
            "word": "illogical"
        }, {
            "perceived_negatively": true,
            "word": "immature"
        }, {
            "perceived_negatively": true,
            "word": "haphazard"
        }, {
            "perceived_negatively": false,
            "word": "lax"
        }, {
            "perceived_negatively": true,
            "word": "flippant"
        }],
        "Openness_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "conventional"
        }, {
            "perceived_negatively": false,
            "word": "traditional"
        }],
        "Openness_minus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "predictable"
        }, {
            "perceived_negatively": true,
            "word": "unimaginative"
        }, {
            "perceived_negatively": false,
            "word": "somber"
        }, {
            "perceived_negatively": true,
            "word": "apathetic"
        }, {
            "perceived_negatively": true,
            "word": "unadventurous"
        }],
        "Openness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "verbose"
        }, {
            "perceived_negatively": true,
            "word": "unscrupulous"
        }, {
            "perceived_negatively": true,
            "word": "pompous"
        }],
        "Openness_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "imperturbable"
        }, {
            "perceived_negatively": true,
            "word": "insensitive"
        }],
        "Openness_minus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "easily rattled"
        }, {
            "perceived_negatively": false,
            "word": "easily irked"
        }, {
            "perceived_negatively": false,
            "word": "apprehensive"
        }],
        "Openness_plus_Agreeableness_minus": [{
            "perceived_negatively": false,
            "word": "shrewd"
        }, {
            "perceived_negatively": false,
            "word": "eccentric"
        }, {
            "perceived_negatively": false,
            "word": "individualistic"
        }],
        "Openness_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "idealistic"
        }, {
            "perceived_negatively": false,
            "word": "diplomatic"
        }, {
            "perceived_negatively": false,
            "word": "deep"
        }, {
            "perceived_negatively": false,
            "word": "tactful"
        }, {
            "perceived_negatively": false,
            "word": "genial"
        }],
        "Openness_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "unconventional"
        }, {
            "perceived_negatively": false,
            "word": "quirky"
        }],
        "Openness_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "analytical"
        }, {
            "perceived_negatively": false,
            "word": "perceptive"
        }, {
            "perceived_negatively": false,
            "word": "informative"
        }, {
            "perceived_negatively": false,
            "word": "articulate"
        }, {
            "perceived_negatively": false,
            "word": "dignified"
        }, {
            "perceived_negatively": false,
            "word": "cultured"
        }],
        "Openness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "introspective"
        }, {
            "perceived_negatively": false,
            "word": "meditative"
        }, {
            "perceived_negatively": false,
            "word": "contemplating"
        }, {
            "perceived_negatively": false,
            "word": "self-examining"
        }, {
            "perceived_negatively": false,
            "word": "inner-directed"
        }],
        "Openness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "worldly"
        }, {
            "perceived_negatively": false,
            "word": "theatrical"
        }, {
            "perceived_negatively": false,
            "word": "eloquent"
        }, {
            "perceived_negatively": false,
            "word": "inquisitive"
        }, {
            "perceived_negatively": false,
            "word": "intense"
        }],
        "Openness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "creative"
        }, {
            "perceived_negatively": false,
            "word": "intellectual"
        }, {
            "perceived_negatively": false,
            "word": "insightful"
        }, {
            "perceived_negatively": false,
            "word": "versatile"
        }, {
            "perceived_negatively": false,
            "word": "inventive"
        }],
        "Openness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "passionate"
        }, {
            "perceived_negatively": false,
            "word": "excitable"
        }, {
            "perceived_negatively": false,
            "word": "sensual"
        }]
    },
    "values": {
        "Hedonism": [{
            "Term": "Taking pleasure in life",
            "LowDescription": "You prefer activities with a purpose greater than just personal enjoyment",
            "HighDescription": "You are highly motivated to enjoy life to its fullest"
        }],
        "Self-transcendence": [{
            "Term": "Helping others",
            "LowDescription": "You think people can handle their own business without interference",
            "HighDescription": "You think it is important to take care of the people around you"
        }, {
            "Term": "Fairness",
            "LowDescription": "You believe that people create their own opportunities",
            "HighDescription": "You believe in social justice and equality for all"
        }, {
            "Term": "Social justice",
            "LowDescription": "You believe that people create their own opportunities",
            "HighDescription": "You believe in social justice and equality for all"
        }, {
            "Term": "Equality",
            "LowDescription": "You believe that people create their own opportunities",
            "HighDescription": "You believe in social justice and equality for all"
        }, {
            "Term": "Community service",
            "LowDescription": "You think people can handle their own business without interference",
            "HighDescription": "You think it is important to take care of the people around you"
        }],
        "Conservation": [{
            "Term": "Tradition",
            "LowDescription": "You care more about making your own path than following what others have done",
            "HighDescription": "You highly respect the groups you belong to and follow their guidance"
        }, {
            "Term": "Harmony",
            "LowDescription": "You decide what is right based on your beliefs, not what other people think",
            "HighDescription": "You know rules are there for a reason, and you try never to break them"
        }, {
            "Term": "Humility",
            "LowDescription": "You decide what is right based on your beliefs, not what other people think",
            "HighDescription": "You see worth in deferring to others"
        }, {
            "Term": "Social norms",
            "LowDescription": "You decide what is right based on your beliefs, not what other people think",
            "HighDescription": "You know rules are there for a reason, and you try never to break them"
        }, {
            "Term": "Security",
            "LowDescription": "You believe that security is worth sacrificing to achieve other goals",
            "HighDescription": "You believe that safety and security are important things to safeguard"
        }, {
            "Term": "Safety",
            "LowDescription": "You believe that safety is worth sacrificing to achieve other goals",
            "HighDescription": "You believe that safety and security are important things to safeguard"
        }],
        "Openness-to-change": [{
            "Term": "Independence",
            "LowDescription": "You welcome when others direct your activities for you",
            "HighDescription": "You like to set your own goals to decide how to best achieve them"
        }, {
            "Term": "Excitement",
            "LowDescription": "You would rather stick with things you already know you like than risk trying something new and risky",
            "HighDescription": "You are eager to search out new and exciting experiences"
        }, {
            "Term": "Creativity",
            "LowDescription": "You would rather stick with things you already know you like than risk trying something new and risky",
            "HighDescription": "You are eager to search out new and exciting experiences"
        }, {
            "Term": "Curiosity",
            "LowDescription": "You would rather stick with things you already know you like than risk trying something new and risky",
            "HighDescription": "You are eager to search out new and exciting experiences"
        }, {
            "Term": "Self-direction",
            "LowDescription": "You welcome when others direct your activities for you",
            "HighDescription": "You like to set your own goals to decide how to best achieve them"
        }, {
            "Term": "Freedom",
            "LowDescription": "You welcome when others direct your activities for you",
            "HighDescription": "You like to set your own goals to decide how to best achieve them"
        }],
        "Self-enhancement": [{
            "Term": "Achieving success",
            "LowDescription": "You make decisions with little regard for how they show off your talents",
            "HighDescription": "You seek out opportunities to improve yourself and demonstrate that you are a capable person"
        }, {
            "Term": "Gaining social status",
            "LowDescription": "You are comfortable with your social status and don't feel a strong need to improve it",
            "HighDescription": "You put substantial effort into improving your status and public image"
        }, {
            "Term": "Ambition",
            "LowDescription": "You are comfortable with your social status and don't feel a strong need to improve it",
            "HighDescription": "You feel it is important to push forward towards goals"
        }, {
            "Term": "High achievement",
            "LowDescription": "You make decisions with little regard for how they show off your talents",
            "HighDescription": "You seek out opportunities to improve yourself and demonstrate that you are a capable person"
        }]
    }
};

},{}],5:[function(_dereq_,module,exports){
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

module.exports = {
    "facets": {
        "Artistic-interests": {
            "HighTerm": "Una persona que aprecia el arte",
            "Big5": "Apertura a experiencias",
            "HighDescription": "Disfruta de la belleza y busca experiencias creativas",
            "LowDescription": "Le interesan menos las actividades artísticas o creativas que la mayoría de las personas que participaron de nuestras encuestas",
            "LowTerm": "Una persona desinteresada por el arte"
        },
        "Dutifulness": {
            "HighTerm": "Una persona que cumple con su deber",
            "Big5": "Responsabilidad",
            "HighDescription": "Toma las reglas y las obligaciones seriamente, aún cuando son inconvenientes",
            "LowDescription": "Hace lo que quiere sin importar las reglas y las obligaciones",
            "LowTerm": "Despreocupado"
        },
        "Cooperation": {
            "HighTerm": "Acomodaticio",
            "Big5": "Afabilidad",
            "HighDescription": "Es fácil de complacer e intenta evitar posibles confrontaciones",
            "LowDescription": "No te importa contradecir a los demás",
            "LowTerm": "Contrario"
        },
        "Self-consciousness": {
            "HighTerm": "Consciente de sí mismo",
            "Big5": "Rango emocional",
            "HighDescription": "Es sensible a lo que las demás personas podrían estar pensando acerca de usted",
            "LowDescription": "Es difícil de avergonzar y confía en sí mismo la mayor parte del tiempo",
            "LowTerm": "Confiado"
        },
        "Orderliness": {
            "HighTerm": "Organizado",
            "Big5": "Responsabilidad",
            "HighDescription": "Siente una fuerte necesidad de mantener una vida estructurada",
            "LowDescription": "No le dedica mucho tiempo a organizarse en su vida diaria",
            "LowTerm": "Desestructurado"
        },
        "Sympathy": {
            "HighTerm": "Empático",
            "Big5": "Afabilidad",
            "HighDescription": "Siente lo que otros sienten y es compasivo con ellos",
            "LowDescription": "Cree que las personas deberían confiar más en sí mismos que en otras personas",
            "LowTerm": "Una persona de gran fortaleza"
        },
        "Activity-level": {
            "HighTerm": "Energético",
            "Big5": "Extraversión",
            "HighDescription": "Disfruta llevar un ritmo de vida acelerado, una agenda ocupada con muchas actividades",
            "LowDescription": "Aprecia llevar un ritmo de vida relajado",
            "LowTerm": "Relajado"
        },
        "Self-efficacy": {
            "HighTerm": "Seguro de sí mismo",
            "Big5": "Responsabilidad",
            "HighDescription": "Siente que tiene la habilidad de triunfar en las tareas que se propone realizar",
            "LowDescription": "Frecuentemente duda acerca de su habilidad para alcanzar sus metas",
            "LowTerm": "Inseguro de sí misma"
        },
        "Self-discipline": {
            "HighTerm": "Persistente",
            "Big5": "Responsabilidad",
            "HighDescription": "Puede hacer frente y llevar a cabo tareas difíciles",
            "LowDescription": "Le da trabajo llevar adelante tareas difíciles por un largo periodo de tiempo",
            "LowTerm": "Intermitente"
        },
        "Altruism": {
            "HighTerm": "Altruista",
            "Big5": "Afabilidad",
            "HighDescription": "Se siente realizado ayudando a otros y dejará sus cosas de lado para hacerlo",
            "LowDescription": "Está más enfocado en cuidar de usted mismo que en dedicar tiempo a otras personas",
            "LowTerm": "Individualista"
        },
        "Cautiousness": {
            "HighTerm": "Prudente",
            "Big5": "Responsabilidad",
            "HighDescription": "Piensa cuidadosamente acerca de sus decisiones antes de tomarlas",
            "LowDescription": "Prefiere tomar acción inmediatamente antes que invertir tiempo deliberando qué decisión tomar",
            "LowTerm": "Audaz"
        },
        "Morality": {
            "HighTerm": "Intransigente",
            "Big5": "Afabilidad",
            "HighDescription": "Piensa que está mal tomar ventaja de los demás para avanzar",
            "LowDescription": "Utiliza cualquier medio posible para conseguir lo que quiere y está cómodo con ello",
            "LowTerm": "Una persona comprometida"
        },
        "Anxiety": {
            "HighTerm": "Propenso a preocuparse",
            "Big5": "Rango emocional",
            "HighDescription": "Tiende a preocuparse acerca de las cosas que podrían pasar",
            "LowDescription": "Tiende a sentirse tranquilo y a confiar en sí mismo",
            "LowTerm": "Seguro de sí mismo"
        },
        "Emotionality": {
            "HighTerm": "Emocionalmente consciente",
            "Big5": "Apertura a experiencias",
            "HighDescription": "Es consciente de sus sentimientos y de cómo expresarlos",
            "LowDescription": "No piensa frecuentemente acerca de sus emociones ni las expresa abiertamente",
            "LowTerm": "Desapasionado"
        },
        "Vulnerability": {
            "HighTerm": "Susceptible al estrés",
            "Big5": "Rango emocional",
            "HighDescription": "Se abruma fácilmente en situaciones de estrés",
            "LowDescription": "Maneja eventos inesperados con calma y efectivamente",
            "LowTerm": "Una persona que mantiene la calma bajo presión"
        },
        "Immoderation": {
            "HighTerm": "Hedonista",
            "Big5": "Rango emocional",
            "HighDescription": "Siente fuertemente sus deseos y es fácilmente tentado por ellos",
            "LowDescription": "Controla sus deseos, los cuales no son particularmente intensos",
            "LowTerm": "Sereno"
        },
        "Friendliness": {
            "HighTerm": "Extrovertido",
            "Big5": "Extraversión",
            "HighDescription": "Hace amigos fácilmente y se siente cómodo estando con otras personas",
            "LowDescription": "Es una persona reservada y no deja a muchas personas entrar",
            "LowTerm": "Reservado"
        },
        "Achievement-striving": {
            "HighTerm": "Una persona motivada",
            "Big5": "Responsabilidad",
            "HighDescription": "Se propone grandes metas y trabaja duro para alcanzarlas",
            "LowDescription": "Está conforme con sus logros y no siente la necesidad de ponerse metas más ambiciosas",
            "LowTerm": "Una persona satisfecha"
        },
        "Modesty": {
            "HighTerm": "Modesto",
            "Big5": "Afabilidad",
            "HighDescription": "Se siente cómodo siendo el centro de atención",
            "LowDescription": "Se tiene una estima alta, se encuentra satisfecho con quién es",
            "LowTerm": "Orgulloso"
        },
        "Excitement-seeking": {
            "HighTerm": "Una persona que busca la emoción",
            "Big5": "Extraversión",
            "HighDescription": "Le emociona tomar riesgos y se aburre si no se ve envuelto en mucha acción",
            "LowDescription": "Prefiere las actividades tranquilas, pacíficas y seguras",
            "LowTerm": "Una persona que busca la calma"
        },
        "Assertiveness": {
            "HighTerm": "Asertivo",
            "Big5": "Extraversión",
            "HighDescription": "Tiende a expresarse y a hacerse cargo de las situaciones, y se encuentra cómodo liderando grupos",
            "LowDescription": "Prefiere escuchar antes que hablar, especialmente en situaciones de grupo",
            "LowTerm": "Callado"
        },
        "Adventurousness": {
            "HighTerm": "Audaz",
            "Big5": "Apertura a experiencias",
            "HighDescription": "Está deseoso de tener nuevas experiencias",
            "LowDescription": "Disfruta de las rutinas familiares y prefiere no desviarse de ellas",
            "LowTerm": "Consistente"
        },
        "Gregariousness": {
            "HighTerm": "Sociable",
            "Big5": "Extraversión",
            "HighDescription": "Disfruta estando en compañía de otros",
            "LowDescription": "Tiene un fuerte deseo de tener tiempo para usted mismo",
            "LowTerm": "Independiente"
        },
        "Cheerfulness": {
            "HighTerm": "Alegre",
            "Big5": "Extraversión",
            "HighDescription": "Es una persona alegre y comparte esa alegría con el mundo",
            "LowDescription": "Generalmente es serio y no hace muchas bromas",
            "LowTerm": "Solemne"
        },
        "Imagination": {
            "HighTerm": "Imaginativo",
            "Big5": "Apertura a experiencias",
            "HighDescription": "Su imaginación vuela libre",
            "LowDescription": "Prefiere hechos antes que la fantasía",
            "LowTerm": "Una persona con los pies en la tierra"
        },
        "Depression": {
            "HighTerm": "Melancólico",
            "Big5": "Rango emocional",
            "HighDescription": "Piensa bastante seguido en las cosas con las que está disconforme",
            "LowDescription": "Generalmente se acepta a usted mismo tal cual es",
            "LowTerm": "Una persona satisfecha"
        },
        "Anger": {
            "HighTerm": "Intenso",
            "Big5": "Rango emocional",
            "HighDescription": "Tiene un temperamento fuerte, especialmente cuando las cosas no funcionan como espera",
            "LowDescription": "Es difícil hacerle enojar",
            "LowTerm": "Apacible"
        },
        "Trust": {
            "HighTerm": "Una persona que confía en los demás",
            "Big5": "Afabilidad",
            "HighDescription": "Cree lo mejor de los demás y confía fácilmente en las personas",
            "LowDescription": "Se cuida de las intenciones de los demás y no confía fácilmente",
            "LowTerm": "Cuidadoso con los demás"
        },
        "Intellect": {
            "HighTerm": "Filosófico",
            "Big5": "Apertura a experiencias",
            "HighDescription": "Está abierto a nuevas ideas, le intrigan y ama explorarlas",
            "LowDescription": "Prefiere lidiar con el mundo tal cual es, raramente considerando ideas abstractas",
            "LowTerm": "Concreto"
        },
        "Liberalism": {
            "HighTerm": "Desafiante ante la autoridad",
            "Big5": "Apertura a experiencias",
            "HighDescription": "Prefiere desafiar a la autoridad y  a los valores tradicionales para lograr cambios positivos",
            "LowDescription": "Prefiere seguir tradiciones para mantener una sensación de estabilidad",
            "LowTerm": "Respetuoso de la autoridad"
        }
    },
    "needs": {
        "Stability": ["estabilidad", "autenticidad", "integridad"],
        "Practicality": ["eficiencia", "practicidad", "valor agregado", "conveniencia"],
        "Love": ["afinidad", "conexión"],
        "Self-expression": ["auto-expresión", "empoderamiento personal", "fortaleza personal"],
        "Challenge": ["prestigio", "competencia", "gloria"],
        "Closeness": ["pertenencia", "nostalgia", "intimidad"],
        "Liberty": ["modernidad", "expansión de posibilidades", "poder escapar", "espontaneidad", "novedad"],
        "Excitement": ["regocijo", "anticipación", "cebración"],
        "Ideal": ["sofisticación", "espiritualidad", "superioridad", "realización"],
        "Harmony": ["bienestar", "cortesía", "civilidad"],
        "Curiosity": ["descubrimiento", "maestría", "adquisición de conocimiento"],
        "Structure": ["organización", "franqueza", "claridad", "confiabilidad"]
    },
    "phrases": {
        "You are %s": "Usted es %s",
        "You are %s and %s": "Usted es %s y %s",
        "You are %s, %s and %s": "Usted es %s, %s y %s",
        "And you are %s": "Y usted es %s",
        "You are relatively unconcerned with %s": "Usted es relativamente indiferente con %s",
        "You are relatively unconcerned with both %s and %s": "Usted es relativamente indiferente con %s y %s",
        "You don't find %s to be particularly motivating for you": "Usted no encuentra a %s particularmente motivante para usted",
        "You don't find either %s or %s to be particularly motivating for you": "Usted no encuentra a %s o %s particularmente motivantes para usted",
        "You value both %s a bit": "Usted valora a %s un poco",
        "You value both %s and %s a bit": "Usted valora a %s y %s un poco",
        "You consider %s to guide a large part of what you do": "Usted considera que %s lo guia en gran parte de lo que hace",
        "You consider both %s and %s to guide a large part of what you do": "Usted considera que %s y %s lo guian en gran parte de lo que hace",
        "And %s": "Y %s",
        "Experiences that make you feel high %s are generally unappealing to you": "No le agradan las experiencias que le dan una gran sensación de %s",
        "Experiences that give a sense of %s hold some appeal to you": "Le agradan las experiencias que le dan una sensación de %s",
        "You are motivated to seek out experiences that provide a strong feeling of %s": "Está motivado a buscar experiencias que lo provean de una fuerte sensación de %s",
        "Your choices are driven by a desire for %s": "Sus elecciones están determinadas por un deseo de %s",
        "a bit %s": "un poco %s",
        "somewhat %s": "algo %s",
        "can be perceived as %s": "puede ser percibido como %s"
    },
    "traits": {
        "Agreeableness_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "desconsiderado"
        }, {
            "perceived_negatively": true,
            "word": "descortés"
        }, {
            "perceived_negatively": true,
            "word": "desconfiado"
        }, {
            "perceived_negatively": true,
            "word": "poco cooperativo"
        }, {
            "perceived_negatively": true,
            "word": "irreflexivo"
        }],
        "Agreeableness_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "estricto"
        }, {
            "perceived_negatively": false,
            "word": "rígido"
        }, {
            "perceived_negatively": true,
            "word": "duro"
        }],
        "Agreeableness_minus_Extraversion_minus": [{
            "perceived_negatively": true,
            "word": "cínico"
        }, {
            "perceived_negatively": true,
            "word": "cauto con los demás"
        }, {
            "perceived_negatively": true,
            "word": "solitario"
        }, {
            "perceived_negatively": true,
            "word": "desapegado"
        }, {
            "perceived_negatively": true,
            "word": "impersonal"
        }, {
            "perceived_negatively": true,
            "word": "sombrío"
        }],
        "Agreeableness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "obstinado"
        }, {
            "perceived_negatively": true,
            "word": "abrupto"
        }, {
            "perceived_negatively": true,
            "word": "crudo"
        }, {
            "perceived_negatively": true,
            "word": "combativo"
        }, {
            "perceived_negatively": true,
            "word": "duro"
        }, {
            "perceived_negatively": false,
            "word": "astuto"
        }, {
            "perceived_negatively": true,
            "word": "manipulador"
        }, {
            "perceived_negatively": true,
            "word": "hosco"
        }, {
            "perceived_negatively": true,
            "word": "taimado"
        }],
        "Agreeableness_minus_Neuroticism_minus": [{
            "perceived_negatively": true,
            "word": "insensible"
        }, {
            "perceived_negatively": true,
            "word": "poco afectuoso"
        }, {
            "perceived_negatively": true,
            "word": "desapasionado"
        }, {
            "perceived_negatively": true,
            "word": "una persona sin emociones"
        }],
        "Agreeableness_minus_Neuroticism_plus": [{
            "perceived_negatively": true,
            "word": "crítico"
        }, {
            "perceived_negatively": true,
            "word": "egoísta"
        }, {
            "perceived_negatively": true,
            "word": "de mal genio"
        }, {
            "perceived_negatively": true,
            "word": "antagonista"
        }, {
            "perceived_negatively": true,
            "word": "gruñón"
        }, {
            "perceived_negatively": true,
            "word": "amargado"
        }, {
            "perceived_negatively": true,
            "word": "desagradable"
        }, {
            "perceived_negatively": true,
            "word": "exigente"
        }],
        "Agreeableness_minus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "tosco"
        }, {
            "perceived_negatively": true,
            "word": "una persona sin tacto"
        }, {
            "perceived_negatively": true,
            "word": "brusco"
        }, {
            "perceived_negatively": true,
            "word": "cerrado"
        }, {
            "perceived_negatively": true,
            "word": "áspero"
        }, {
            "perceived_negatively": true,
            "word": "implacable"
        }, {
            "perceived_negatively": true,
            "word": "poco caritativo"
        }, {
            "perceived_negatively": true,
            "word": "vengativo"
        }],
        "Agreeableness_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "perspicaz"
        }, {
            "perceived_negatively": false,
            "word": "excéntrico"
        }, {
            "perceived_negatively": false,
            "word": "individualista"
        }],
        "Agreeableness_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "sobrio"
        }, {
            "perceived_negatively": false,
            "word": "modesto"
        }],
        "Agreeableness_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "servicial"
        }, {
            "perceived_negatively": false,
            "word": "cooperativo"
        }, {
            "perceived_negatively": false,
            "word": "considerado"
        }, {
            "perceived_negatively": false,
            "word": "respetuoso"
        }, {
            "perceived_negatively": false,
            "word": "cortés"
        }, {
            "perceived_negatively": false,
            "word": "sensato"
        }, {
            "perceived_negatively": false,
            "word": "atento"
        }, {
            "perceived_negatively": false,
            "word": "considerado"
        }, {
            "perceived_negatively": false,
            "word": "leal"
        }, {
            "perceived_negatively": false,
            "word": "moral"
        }],
        "Agreeableness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "conmovible"
        }, {
            "perceived_negatively": false,
            "word": "agradable"
        }, {
            "perceived_negatively": false,
            "word": "servicial"
        }, {
            "perceived_negatively": false,
            "word": "humilde"
        }, {
            "perceived_negatively": true,
            "word": "indulgente"
        }],
        "Agreeableness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "efervescente"
        }, {
            "perceived_negatively": false,
            "word": "alegre"
        }, {
            "perceived_negatively": false,
            "word": "amistoso"
        }, {
            "perceived_negatively": false,
            "word": "alegre"
        }, {
            "perceived_negatively": false,
            "word": "jovial"
        }, {
            "perceived_negatively": false,
            "word": "jocoso"
        }],
        "Agreeableness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "generoso"
        }, {
            "perceived_negatively": false,
            "word": "agradable"
        }, {
            "perceived_negatively": false,
            "word": "tolerante"
        }, {
            "perceived_negatively": false,
            "word": "pacífico"
        }, {
            "perceived_negatively": false,
            "word": "flexible"
        }, {
            "perceived_negatively": false,
            "word": "fácil de tratar"
        }, {
            "perceived_negatively": false,
            "word": "justo"
        }, {
            "perceived_negatively": false,
            "word": "caritativo"
        }, {
            "perceived_negatively": false,
            "word": "confiable"
        }],
        "Agreeableness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "sentimental"
        }, {
            "perceived_negatively": false,
            "word": "cariñoso"
        }, {
            "perceived_negatively": false,
            "word": "sensible"
        }, {
            "perceived_negatively": false,
            "word": "tierno"
        }, {
            "perceived_negatively": false,
            "word": "apasionado"
        }, {
            "perceived_negatively": false,
            "word": "romántico"
        }],
        "Agreeableness_plus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "dependiente"
        }, {
            "perceived_negatively": true,
            "word": "simple"
        }],
        "Agreeableness_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "amistoso"
        }, {
            "perceived_negatively": false,
            "word": "una persona con tacto"
        }, {
            "perceived_negatively": false,
            "word": "diplomático"
        }, {
            "perceived_negatively": false,
            "word": "profundo"
        }, {
            "perceived_negatively": false,
            "word": "idealista"
        }],
        "Conscientiousness_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "arrebatado"
        }, {
            "perceived_negatively": true,
            "word": "poco cooperativo"
        }, {
            "perceived_negatively": true,
            "word": "poco fiable"
        }, {
            "perceived_negatively": true,
            "word": "desconfiado"
        }, {
            "perceived_negatively": true,
            "word": "irreflexivo"
        }],
        "Conscientiousness_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "poco pretencioso"
        }, {
            "perceived_negatively": false,
            "word": "modesto"
        }],
        "Conscientiousness_minus_Extraversion_minus": [{
            "perceived_negatively": true,
            "word": "indeciso"
        }, {
            "perceived_negatively": true,
            "word": "una persona sin propósito"
        }, {
            "perceived_negatively": false,
            "word": "una persona sin carácter"
        }, {
            "perceived_negatively": false,
            "word": "una persona sin compromiso"
        }, {
            "perceived_negatively": true,
            "word": "poco ambicioso"
        }],
        "Conscientiousness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "revoltoso"
        }, {
            "perceived_negatively": false,
            "word": "bullicioso"
        }, {
            "perceived_negatively": true,
            "word": "temerario"
        }, {
            "perceived_negatively": true,
            "word": "tumultuoso"
        }, {
            "perceived_negatively": false,
            "word": "demostrativo"
        }],
        "Conscientiousness_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "informal"
        }, {
            "perceived_negatively": false,
            "word": "de bajo perfil"
        }],
        "Conscientiousness_minus_Neuroticism_plus": [{
            "perceived_negatively": true,
            "word": "atolondrado"
        }, {
            "perceived_negatively": true,
            "word": "inconsistente"
        }, {
            "perceived_negatively": true,
            "word": "errático"
        }, {
            "perceived_negatively": true,
            "word": "olvidadizo"
        }, {
            "perceived_negatively": true,
            "word": "impulsivo"
        }, {
            "perceived_negatively": true,
            "word": "frívolo"
        }],
        "Conscientiousness_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "temerario"
        }, {
            "perceived_negatively": true,
            "word": "ilógico"
        }, {
            "perceived_negatively": true,
            "word": "inmaduro"
        }, {
            "perceived_negatively": true,
            "word": "azaroso"
        }, {
            "perceived_negatively": false,
            "word": "laxo"
        }, {
            "perceived_negatively": true,
            "word": "indisciplinado"
        }],
        "Conscientiousness_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "poco convencional"
        }, {
            "perceived_negatively": false,
            "word": "peculiar"
        }],
        "Conscientiousness_plus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "inflexible"
        }, {
            "perceived_negatively": false,
            "word": "estricto"
        }, {
            "perceived_negatively": false,
            "word": "rígido"
        }],
        "Conscientiousness_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "confiable"
        }, {
            "perceived_negatively": false,
            "word": "responsable"
        }, {
            "perceived_negatively": false,
            "word": "seguro"
        }, {
            "perceived_negatively": false,
            "word": "educado"
        }, {
            "perceived_negatively": false,
            "word": "considerado"
        }],
        "Conscientiousness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "cauto"
        }, {
            "perceived_negatively": false,
            "word": "seguro"
        }, {
            "perceived_negatively": false,
            "word": "exacto"
        }, {
            "perceived_negatively": false,
            "word": "formal"
        }, {
            "perceived_negatively": false,
            "word": "ahorrativo"
        }, {
            "perceived_negatively": false,
            "word": "principista"
        }],
        "Conscientiousness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "ambicioso"
        }, {
            "perceived_negatively": false,
            "word": "alerta"
        }, {
            "perceived_negatively": false,
            "word": "firme"
        }, {
            "perceived_negatively": false,
            "word": "decidido"
        }, {
            "perceived_negatively": false,
            "word": "competitivo"
        }],
        "Conscientiousness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "minucioso"
        }, {
            "perceived_negatively": false,
            "word": "estable"
        }, {
            "perceived_negatively": false,
            "word": "consistente"
        }, {
            "perceived_negatively": false,
            "word": "disciplinado"
        }, {
            "perceived_negatively": false,
            "word": "lógico"
        }, {
            "perceived_negatively": false,
            "word": "decidido"
        }, {
            "perceived_negatively": false,
            "word": "controlado"
        }, {
            "perceived_negatively": false,
            "word": "conciso"
        }],
        "Conscientiousness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "detallista"
        }, {
            "perceived_negatively": true,
            "word": "excitable"
        }],
        "Conscientiousness_plus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "tradicional"
        }, {
            "perceived_negatively": false,
            "word": "convencional"
        }],
        "Conscientiousness_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "sofisticado"
        }, {
            "perceived_negatively": false,
            "word": "perfeccionista"
        }, {
            "perceived_negatively": false,
            "word": "industrioso"
        }, {
            "perceived_negatively": false,
            "word": "digno"
        }, {
            "perceived_negatively": false,
            "word": "refinado"
        }, {
            "perceived_negatively": false,
            "word": "culto"
        }, {
            "perceived_negatively": false,
            "word": "previsor"
        }],
        "Extraversion_minus_Agreeableness_minus": [{
            "perceived_negatively": false,
            "word": "escéptico"
        }, {
            "perceived_negatively": false,
            "word": "cauto con los demás"
        }, {
            "perceived_negatively": true,
            "word": "solitario"
        }, {
            "perceived_negatively": true,
            "word": "poco comunicativo"
        }, {
            "perceived_negatively": true,
            "word": "antisocial"
        }, {
            "perceived_negatively": true,
            "word": "sombrío"
        }, {
            "perceived_negatively": true,
            "word": "desinteresado"
        }, {
            "perceived_negatively": false,
            "word": "apartado"
        }],
        "Extraversion_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "pacífico"
        }, {
            "perceived_negatively": false,
            "word": "humilde"
        }, {
            "perceived_negatively": false,
            "word": "sumiso"
        }, {
            "perceived_negatively": false,
            "word": "tímido"
        }, {
            "perceived_negatively": false,
            "word": "obediente"
        }, {
            "perceived_negatively": false,
            "word": "ingenuo"
        }],
        "Extraversion_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "indirecto"
        }, {
            "perceived_negatively": true,
            "word": "débil"
        }, {
            "perceived_negatively": true,
            "word": "perezoso"
        }, {
            "perceived_negatively": true,
            "word": "poco persistente"
        }, {
            "perceived_negatively": true,
            "word": "vago"
        }],
        "Extraversion_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "moderado"
        }, {
            "perceived_negatively": false,
            "word": "serio"
        }, {
            "perceived_negatively": false,
            "word": "discreto"
        }, {
            "perceived_negatively": false,
            "word": "cauteloso"
        }, {
            "perceived_negatively": false,
            "word": "principista"
        }],
        "Extraversion_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "tranquilo"
        }, {
            "perceived_negatively": false,
            "word": "sosegado"
        }, {
            "perceived_negatively": false,
            "word": "plácido"
        }, {
            "perceived_negatively": false,
            "word": "imparcial"
        }, {
            "perceived_negatively": false,
            "word": "modesto"
        }, {
            "perceived_negatively": false,
            "word": "condescendiente"
        }],
        "Extraversion_minus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "desconfiado"
        }, {
            "perceived_negatively": false,
            "word": "pesimista"
        }, {
            "perceived_negatively": false,
            "word": "reservado"
        }, {
            "perceived_negatively": true,
            "word": "cobarde"
        }, {
            "perceived_negatively": false,
            "word": "callado"
        }],
        "Extraversion_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "sombrío"
        }, {
            "perceived_negatively": true,
            "word": "manso"
        }, {
            "perceived_negatively": true,
            "word": "poco aventurero"
        }, {
            "perceived_negatively": false,
            "word": "pasivo"
        }, {
            "perceived_negatively": true,
            "word": "apático"
        }, {
            "perceived_negatively": false,
            "word": "dócil"
        }],
        "Extraversion_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "una persona guiada por su propia consciencia y valores"
        }, {
            "perceived_negatively": false,
            "word": "introspectivo"
        }, {
            "perceived_negatively": false,
            "word": "pensativo"
        }, {
            "perceived_negatively": false,
            "word": "contemplativo"
        }, {
            "perceived_negatively": false,
            "word": "introspectivo"
        }],
        "Extraversion_plus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "terco"
        }, {
            "perceived_negatively": true,
            "word": "vigoroso"
        }, {
            "perceived_negatively": true,
            "word": "dominador"
        }, {
            "perceived_negatively": true,
            "word": "presumido"
        }, {
            "perceived_negatively": true,
            "word": "mandón"
        }, {
            "perceived_negatively": false,
            "word": "dominante"
        }, {
            "perceived_negatively": false,
            "word": "astuto"
        }],
        "Extraversion_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "social"
        }, {
            "perceived_negatively": false,
            "word": "enérgico"
        }, {
            "perceived_negatively": false,
            "word": "entusiasta"
        }, {
            "perceived_negatively": false,
            "word": "comunicativo"
        }, {
            "perceived_negatively": false,
            "word": "vibrante"
        }, {
            "perceived_negatively": false,
            "word": "espirituoso"
        }, {
            "perceived_negatively": false,
            "word": "magnético"
        }, {
            "perceived_negatively": false,
            "word": "entusiasta"
        }],
        "Extraversion_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "bullicioso"
        }, {
            "perceived_negatively": false,
            "word": "travieso"
        }, {
            "perceived_negatively": false,
            "word": "exhibicionista"
        }, {
            "perceived_negatively": false,
            "word": "gregario"
        }, {
            "perceived_negatively": false,
            "word": "demostrativo"
        }],
        "Extraversion_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "activo"
        }, {
            "perceived_negatively": false,
            "word": "competitivo"
        }, {
            "perceived_negatively": false,
            "word": "persistente"
        }, {
            "perceived_negatively": false,
            "word": "ambicioso"
        }, {
            "perceived_negatively": false,
            "word": "decidido"
        }],
        "Extraversion_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "confiado"
        }, {
            "perceived_negatively": false,
            "word": "audaz"
        }, {
            "perceived_negatively": false,
            "word": "seguro"
        }, {
            "perceived_negatively": false,
            "word": "desinhibido"
        }, {
            "perceived_negatively": false,
            "word": "valiente"
        }, {
            "perceived_negatively": false,
            "word": "valiente"
        }, {
            "perceived_negatively": false,
            "word": "una persona satisfecha de si misma"
        }, {
            "perceived_negatively": false,
            "word": "vigoroso"
        }, {
            "perceived_negatively": false,
            "word": "fuerte"
        }],
        "Extraversion_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "explosivo"
        }, {
            "perceived_negatively": true,
            "word": "verborrágico"
        }, {
            "perceived_negatively": false,
            "word": "extravagante"
        }, {
            "perceived_negatively": true,
            "word": "volátil"
        }, {
            "perceived_negatively": false,
            "word": "coqueto"
        }],
        "Extraversion_plus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "verborrágico"
        }, {
            "perceived_negatively": true,
            "word": "inescrupuloso"
        }, {
            "perceived_negatively": true,
            "word": "pomposo"
        }],
        "Extraversion_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "expresivo"
        }, {
            "perceived_negatively": false,
            "word": "cándido"
        }, {
            "perceived_negatively": false,
            "word": "dramático"
        }, {
            "perceived_negatively": false,
            "word": "espontáneo"
        }, {
            "perceived_negatively": false,
            "word": "ingenioso"
        }, {
            "perceived_negatively": false,
            "word": "oportunista"
        }, {
            "perceived_negatively": false,
            "word": "independiente"
        }],
        "Neuroticism_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "poco emocional"
        }, {
            "perceived_negatively": true,
            "word": "insensible"
        }, {
            "perceived_negatively": true,
            "word": "poco cariñoso"
        }, {
            "perceived_negatively": true,
            "word": "desapasionado"
        }],
        "Neuroticism_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "paciente"
        }, {
            "perceived_negatively": false,
            "word": "relajado"
        }, {
            "perceived_negatively": false,
            "word": "poco exigente"
        }, {
            "perceived_negatively": false,
            "word": "realista"
        }, {
            "perceived_negatively": false,
            "word": "optimista"
        }, {
            "perceived_negatively": false,
            "word": "modesto"
        }, {
            "perceived_negatively": false,
            "word": "poco crítico"
        }, {
            "perceived_negatively": false,
            "word": "poco pretencioso"
        }],
        "Neuroticism_minus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "informal"
        }, {
            "perceived_negatively": false,
            "word": "de perfil bajo"
        }],
        "Neuroticism_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "racional"
        }, {
            "perceived_negatively": false,
            "word": "objetivo"
        }, {
            "perceived_negatively": false,
            "word": "estable"
        }, {
            "perceived_negatively": false,
            "word": "lógico"
        }, {
            "perceived_negatively": false,
            "word": "decidido"
        }, {
            "perceived_negatively": false,
            "word": "preparado"
        }, {
            "perceived_negatively": false,
            "word": "conciso"
        }, {
            "perceived_negatively": false,
            "word": "exhaustivo"
        }, {
            "perceived_negatively": false,
            "word": "económico"
        }, {
            "perceived_negatively": false,
            "word": "disciplinado"
        }],
        "Neuroticism_minus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "modesto"
        }, {
            "perceived_negatively": true,
            "word": "poco excitable"
        }, {
            "perceived_negatively": false,
            "word": "plácido"
        }, {
            "perceived_negatively": false,
            "word": "tranquilo"
        }],
        "Neuroticism_minus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "inconsciente de si mismo"
        }, {
            "perceived_negatively": false,
            "word": "incansable"
        }, {
            "perceived_negatively": false,
            "word": "infatigable"
        }],
        "Neuroticism_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "imperturbable"
        }, {
            "perceived_negatively": true,
            "word": "insensible"
        }],
        "Neuroticism_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "sentido"
        }, {
            "perceived_negatively": false,
            "word": "versátil"
        }, {
            "perceived_negatively": false,
            "word": "creativo"
        }, {
            "perceived_negatively": false,
            "word": "intelectual"
        }, {
            "perceived_negatively": false,
            "word": "perspicaz"
        }],
        "Neuroticism_plus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "temperamental"
        }, {
            "perceived_negatively": true,
            "word": "irritable"
        }, {
            "perceived_negatively": true,
            "word": "peleador"
        }, {
            "perceived_negatively": true,
            "word": "impaciente"
        }, {
            "perceived_negatively": true,
            "word": "gruñón"
        }, {
            "perceived_negatively": true,
            "word": "malhumorado"
        }, {
            "perceived_negatively": true,
            "word": "irritable"
        }],
        "Neuroticism_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "emotivo"
        }, {
            "perceived_negatively": true,
            "word": "crédulo"
        }, {
            "perceived_negatively": false,
            "word": "cariñoso"
        }, {
            "perceived_negatively": false,
            "word": "sensible"
        }, {
            "perceived_negatively": false,
            "word": "blando"
        }],
        "Neuroticism_plus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "compulsivo"
        }, {
            "perceived_negatively": true,
            "word": "inquisitivo"
        }, {
            "perceived_negatively": true,
            "word": "desenfrenado"
        }, {
            "perceived_negatively": true,
            "word": "olvidadizo"
        }, {
            "perceived_negatively": true,
            "word": "impulsivo"
        }],
        "Neuroticism_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "detallista"
        }, {
            "perceived_negatively": true,
            "word": "excitable"
        }],
        "Neuroticism_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "guardado"
        }, {
            "perceived_negatively": true,
            "word": "irritable"
        }, {
            "perceived_negatively": true,
            "word": "inseguro"
        }, {
            "perceived_negatively": true,
            "word": "pesimista"
        }, {
            "perceived_negatively": false,
            "word": "reservado"
        }, {
            "perceived_negatively": true,
            "word": "temeroso"
        }, {
            "perceived_negatively": true,
            "word": "negativo"
        }, {
            "perceived_negatively": false,
            "word": "auto-crítico"
        }],
        "Neuroticism_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "excitable"
        }, {
            "perceived_negatively": true,
            "word": "verborrágico"
        }, {
            "perceived_negatively": false,
            "word": "coqueto"
        }, {
            "perceived_negatively": true,
            "word": "explosivo"
        }, {
            "perceived_negatively": false,
            "word": "extravagante"
        }, {
            "perceived_negatively": true,
            "word": "volátil"
        }],
        "Neuroticism_plus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "irritable"
        }, {
            "perceived_negatively": false,
            "word": "fastidioso"
        }, {
            "perceived_negatively": false,
            "word": "aprensivo"
        }],
        "Neuroticism_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "excitable"
        }, {
            "perceived_negatively": false,
            "word": "apasionado"
        }, {
            "perceived_negatively": false,
            "word": "sensual"
        }],
        "Openness_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "ordinario"
        }, {
            "perceived_negatively": true,
            "word": "sin tacto"
        }, {
            "perceived_negatively": true,
            "word": "brusco"
        }, {
            "perceived_negatively": true,
            "word": "cerrado"
        }, {
            "perceived_negatively": true,
            "word": "duro"
        }],
        "Openness_minus_Agreeableness_plus": [{
            "perceived_negatively": true,
            "word": "simple"
        }, {
            "perceived_negatively": true,
            "word": "dependiente"
        }],
        "Openness_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "cortoplacista"
        }, {
            "perceived_negatively": false,
            "word": "temerario"
        }, {
            "perceived_negatively": true,
            "word": "ilógico"
        }, {
            "perceived_negatively": true,
            "word": "inmaduro"
        }, {
            "perceived_negatively": true,
            "word": "azaroso"
        }, {
            "perceived_negatively": false,
            "word": "laxo"
        }, {
            "perceived_negatively": true,
            "word": "irrespetuoso"
        }],
        "Openness_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "convencional"
        }, {
            "perceived_negatively": false,
            "word": "tradicional"
        }],
        "Openness_minus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "predecible"
        }, {
            "perceived_negatively": true,
            "word": "poco imaginativo"
        }, {
            "perceived_negatively": false,
            "word": "sombrío"
        }, {
            "perceived_negatively": true,
            "word": "apático"
        }, {
            "perceived_negatively": true,
            "word": "poco aventurero"
        }],
        "Openness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "verborrágico"
        }, {
            "perceived_negatively": true,
            "word": "inescrupuloso"
        }, {
            "perceived_negatively": true,
            "word": "pomposo"
        }],
        "Openness_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "imperturbable"
        }, {
            "perceived_negatively": true,
            "word": "insensible"
        }],
        "Openness_minus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "irritable"
        }, {
            "perceived_negatively": false,
            "word": "fastidioso"
        }, {
            "perceived_negatively": false,
            "word": "aprensivo"
        }],
        "Openness_plus_Agreeableness_minus": [{
            "perceived_negatively": false,
            "word": "perspicaz"
        }, {
            "perceived_negatively": false,
            "word": "excéntrico"
        }, {
            "perceived_negatively": false,
            "word": "individualista"
        }],
        "Openness_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "idealista"
        }, {
            "perceived_negatively": false,
            "word": "diplomático"
        }, {
            "perceived_negatively": false,
            "word": "profundo"
        }, {
            "perceived_negatively": false,
            "word": "una persona con tacto"
        }, {
            "perceived_negatively": false,
            "word": "amistoso"
        }],
        "Openness_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "poco convencional"
        }, {
            "perceived_negatively": false,
            "word": "peculiar"
        }],
        "Openness_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "analítico"
        }, {
            "perceived_negatively": false,
            "word": "perceptivo"
        }, {
            "perceived_negatively": false,
            "word": "informativo"
        }, {
            "perceived_negatively": false,
            "word": "grandilocuente"
        }, {
            "perceived_negatively": false,
            "word": "digno"
        }, {
            "perceived_negatively": false,
            "word": "culto"
        }],
        "Openness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "introspectivo"
        }, {
            "perceived_negatively": false,
            "word": "meditativo"
        }, {
            "perceived_negatively": false,
            "word": "contemplativo"
        }, {
            "perceived_negatively": false,
            "word": "introspectivo"
        }, {
            "perceived_negatively": false,
            "word": "pensativo"
        }],
        "Openness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "mundano"
        }, {
            "perceived_negatively": false,
            "word": "exagerado"
        }, {
            "perceived_negatively": false,
            "word": "elocuente"
        }, {
            "perceived_negatively": false,
            "word": "inquisitivo"
        }, {
            "perceived_negatively": false,
            "word": "intenso"
        }],
        "Openness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "creativo"
        }, {
            "perceived_negatively": false,
            "word": "intelectual"
        }, {
            "perceived_negatively": false,
            "word": "perspicaz"
        }, {
            "perceived_negatively": false,
            "word": "versátil"
        }, {
            "perceived_negatively": false,
            "word": "inventivo"
        }],
        "Openness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "apasionado"
        }, {
            "perceived_negatively": false,
            "word": "excitable"
        }, {
            "perceived_negatively": false,
            "word": "sensual"
        }]
    },
    "values": {
        "Hedonism": [{
            "Term": "Disfrutar de la vida",
            "LowDescription": "Prefiere actividades con un propósito más grande que el sólo deleite personal",
            "HighDescription": "Tiene gran motivación por disfrutar la vida en su plenitud"
        }],
        "Self-transcendence": [{
            "Term": "Ayudar a los demás",
            "LowDescription": "Cree que las personas pueden encargarse de sus propios asuntos sin interferencia",
            "HighDescription": "Cree que es importante cuidar de las personas que lo rodean"
        }, {
            "Term": "La justicia",
            "LowDescription": "Cree que son las personas crean sus oportunidades",
            "HighDescription": "Cree en la justicia social y la igualdad para todos"
        }, {
            "Term": "La justicia social",
            "LowDescription": "Cree que son las personas crean sus oportunidades",
            "HighDescription": "Cree en la justicia social y la igualdad para todos"
        }, {
            "Term": "La igualdad",
            "LowDescription": "Cree que son las personas crean sus oportunidades",
            "HighDescription": "Cree en la justicia social y la igualdad para todos"
        }, {
            "Term": "El servicio comunitario",
            "LowDescription": "Cree que las personas pueden encargarse de sus propios asuntos sin interferencia",
            "HighDescription": "Cree que es importante cuidar de las personas que lo rodean"
        }],
        "Conservation": [{
            "Term": "Las tradiciones",
            "LowDescription": "Le importa más seguir su propio camino que seguir el camino de otros",
            "HighDescription": "Tiene mucho respeto por los grupos a los que pertenece y sigue su guía"
        }, {
            "Term": "La armonía",
            "LowDescription": "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            "HighDescription": "Cree que las reglas existen por una razón y nunca intenta trasgredirlas"
        }, {
            "Term": "La humildad",
            "LowDescription": "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            "HighDescription": "Ve valor en deferir a otros"
        }, {
            "Term": "Las normas sociales",
            "LowDescription": "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            "HighDescription": "Cree que las reglas existen por una razón y nunca intenta trasgredirlas"
        }, {
            "Term": "La seguridad",
            "LowDescription": "Prefiere la seguridad a costa de dejar a un lado sus metas",
            "HighDescription": "Cree que es importante salvaguardar la seguridad"
        }, {
            "Term": "La seguridad",
            "LowDescription": "Prefiere estar seguro a costa de dejar a un lado sus metas",
            "HighDescription": "Cree que es importante salvaguardar la seguridad"
        }],
        "Openness-to-change": [{
            "Term": "Ser independiente",
            "LowDescription": "Recibe de buena manera que otros dirijan sus actividades",
            "HighDescription": "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }, {
            "Term": "La emoción",
            "LowDescription": "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            "HighDescription": "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            "Term": "La creatividad",
            "LowDescription": "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            "HighDescription": "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            "Term": "La curiosidad",
            "LowDescription": "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            "HighDescription": "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            "Term": "La autonomía",
            "LowDescription": "Recibe de buena manera que otros dirijan sus actividades",
            "HighDescription": "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }, {
            "Term": "La libertad",
            "LowDescription": "Recibe de buena manera que otros dirijan sus actividades",
            "HighDescription": "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }],
        "Self-enhancement": [{
            "Term": "Alcanzar el éxito",
            "LowDescription": "Toma decisiones sin considerar cómo muestran sus talentos",
            "HighDescription": "Busca oportunidades para autosuperase y para demostrar que es una persona capaz"
        }, {
            "Term": "Mejorar su estatus social",
            "LowDescription": "Está conforme con su estatus social y no siente necesidad de mejorarlo",
            "HighDescription": "Se esfuerza considerablemente para mejorar su estatus e imagen pública"
        }, {
            "Term": "La ambición",
            "LowDescription": "Está conforme con su estatus social y no siente necesidad de mejorarlo",
            "HighDescription": "Siente que es importante avanzar para alcanzar metas"
        }, {
            "Term": "Los grandes logros",
            "LowDescription": "Toma decisiones sin considerar cómo muestran sus talentos",
            "HighDescription": "Busca oportunidades para autosuperase y para demostrar que es una persona capaz"
        }]
    }
};

},{}],6:[function(_dereq_,module,exports){
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

module.exports = {
    "facets": {
        "Friendliness": {
            "Big5": "Extraversion",
            "LowTerm": "遠慮がちな",
            "HighTerm": "外向的な",
            "LowDescription": "プライベートな時間を大切にする人で多くの人々を受け入れません",
            "HighDescription": "友達を作るのが容易で、他人が近くにいることを快適に感じます"
        },
        "Gregariousness": {
            "Big5": "Extraversion",
            "LowTerm": "自主性の高い",
            "HighTerm": "社交的な",
            "LowDescription": "自分の時間を大切にしたいという強い願望があります",
            "HighDescription": "他の人達と一緒にいることを楽しいと感じます"
        },
        "Assertiveness": {
            "Big5": "Extraversion",
            "LowTerm": "慎み深い",
            "HighTerm": "自己主張が強い",
            "LowDescription": "特にグループにいる状況では話すことよりも聞くことを好みます",
            "HighDescription": "遠慮なく発言し、その場をリードする傾向があります。また、集団を統率できます"
        },
        "Activity-level": {
            "Big5": "Extraversion",
            "LowTerm": "のんびりとしている",
            "HighTerm": "精力的な",
            "LowDescription": "ゆったりとしたペースの生活を好みます",
            "HighDescription": "ペースが速く、多様な活動でスケジュールを埋めることを好みます"
        },
        "Excitement-seeking": {
            "Big5": "Extraversion",
            "LowTerm": "平穏を求める",
            "HighTerm": "興奮を求める",
            "LowDescription": "穏やかで和める、安全な活動を好みます",
            "HighDescription": "リスクを取ることで高揚し、忙しくないと退屈に感じます"
        },
        "Cheerfulness": {
            "Big5": "Extraversion",
            "LowTerm": "厳粛な",
            "HighTerm": "快活な",
            "LowDescription": "普段まじめで、あまり冗談を言いません",
            "HighDescription": "喜びにあふれる人で、その喜びを周囲と分かち合います"
        },
        "Trust": {
            "Big5": "Agreeableness",
            "LowTerm": "用心深い",
            "HighTerm": "人を信じる",
            "LowDescription": "他人の意図を警戒し、容易に信用しません",
            "HighDescription": "何においても人を信じ、容易に信頼します"
        },
        "Cooperation": {
            "Big5": "Agreeableness",
            "LowTerm": "固執する",
            "HighTerm": "柔軟な",
            "LowDescription": "他人と対立することに尻込みしません",
            "HighDescription": "文句を言うような気難しさがなく、対立を回避しようとします"
        },
        "Altruism": {
            "Big5": "Agreeableness",
            "LowTerm": "自分本位な",
            "HighTerm": "利他的な",
            "LowDescription": "人のために時間を費やすよりも、自立的に自分のことを自分で行う傾向があります",
            "HighDescription": "人を支援することに充実感を覚え、そのように尽力するでしょう"
        },
        "Morality": {
            "Big5": "Agreeableness",
            "LowTerm": "対面を気にしない",
            "HighTerm": "名誉を尊重する",
            "LowDescription": "自分が望むものを得るためにあらゆる手段を講じることを心地よく感じます",
            "HighDescription": "他人を利用して成功するのは間違っていると考えます"
        },
        "Modesty": {
            "Big5": "Agreeableness",
            "LowTerm": "自己評価が高い",
            "HighTerm": "謙虚な",
            "LowDescription": "自分を高く評価しており、自分に満足しています",
            "HighDescription": "注目されるのが苦手です"
        },
        "Sympathy": {
            "Big5": "Agreeableness",
            "LowTerm": "冷淡な",
            "HighTerm": "感情移入する",
            "LowDescription": "他人に頼るよりも、自分自身をもっと頼りにすべきだと考えるタイプです",
            "HighDescription": "他人がどう感じるかを意識し、同情するタイプです"
        },
        "Self-efficacy": {
            "Big5": "Conscientiousness",
            "LowTerm": "自分に自信が持てない",
            "HighTerm": "自分に自信がある",
            "LowDescription": "自分の目標達成能力をしばしば疑います",
            "HighDescription": "始めたことを成し遂げる能力があると思っています"
        },
        "Orderliness": {
            "Big5": "Conscientiousness",
            "LowTerm": "自由奔放な",
            "HighTerm": "几帳面な",
            "LowDescription": "毎日の生活の中で組織のためには多くの時間を割きません",
            "HighDescription": "規則正しい生活を強く望んでいます"
        },
        "Dutifulness": {
            "Big5": "Conscientiousness",
            "LowTerm": "無頓着な",
            "HighTerm": "本分を守る",
            "LowDescription": "ルールや義務を無視してやりたいことをやります",
            "HighDescription": "ルールや義務が不便であっても真摯に受け止めます"
        },
        "Achievement-striving": {
            "Big5": "Conscientiousness",
            "LowTerm": "現状に満足している",
            "HighTerm": "やる気がある",
            "LowDescription": "自身の達成レベルに満足していて、大胆な目標を設定する必要を感じていません",
            "HighDescription": "自分自身に高い目標を持ち、それを達成するために熱心に取り組みます"
        },
        "Self-discipline": {
            "Big5": "Conscientiousness",
            "LowTerm": "集中が途切れる",
            "HighTerm": "粘り強い",
            "LowDescription": "長期間にわたって困難な仕事に取り組みつづけることがなかなかできません",
            "HighDescription": "困難な仕事に取り組み続けることができます"
        },
        "Cautiousness": {
            "Big5": "Conscientiousness",
            "LowTerm": "大胆な",
            "HighTerm": "慎重な",
            "LowDescription": "時間をかけて慎重に検討するよりもむしろ即座に行動を起こします",
            "HighDescription": "意思決定する前に注意深く考えます"
        },
        "Anxiety": {
            "Big5": "Neuroticism",
            "LowTerm": "自分に自信がある",
            "HighTerm": "心配しがちな",
            "LowDescription": "冷静で自信があるように感じる傾向があります",
            "HighDescription": "起こるかもしれないことについて心配する傾向があります"
        },
        "Anger": {
            "Big5": "Neuroticism",
            "LowTerm": "温和な",
            "HighTerm": "熱しやすい",
            "LowDescription": "滅多に怒りません",
            "HighDescription": "特に物事があなたの考えるとおりに行かないときにかっとなる性格です"
        },
        "Depression": {
            "Big5": "Neuroticism",
            "LowTerm": "現状に満足している",
            "HighTerm": "沈みがちな",
            "LowDescription": "概してあなた自身に満足しています",
            "HighDescription": "不満に思うことについて常に考えてしまいます"
        },
        "Self-consciousness": {
            "Big5": "Neuroticism",
            "LowTerm": "確信を持って行動する",
            "HighTerm": "人目を気にする",
            "LowDescription": "困難を感じたりせず、大抵の場合自信に満ちています",
            "HighDescription": "人からどう思われているかについて神経質になっています"
        },
        "Immoderation": {
            "Big5": "Neuroticism",
            "LowTerm": "自制心がある",
            "HighTerm": "快楽主義な",
            "LowDescription": "自分の欲望をコントロールできますし、強烈な欲望を持ちません",
            "HighDescription": "強い欲求を持っており、それに惑わされます"
        },
        "Vulnerability": {
            "Big5": "Neuroticism",
            "LowTerm": "圧力を受けても冷静な",
            "HighTerm": "ストレスの影響を受けやすい",
            "LowDescription": "冷静で、予期しない出来事にも効果的に対処します",
            "HighDescription": "ストレスの多い状況下で精神的に押しつぶされ易い傾向があります"
        },
        "Imagination": {
            "Big5": "Openness",
            "LowTerm": "堅実な",
            "HighTerm": "創意に富んでいる",
            "LowDescription": "思い付きよりも事実を選びます",
            "HighDescription": "想像力豊かです"
        },
        "Artistic-interests": {
            "Big5": "Openness",
            "LowTerm": "芸術に無関心な",
            "HighTerm": "芸術への理解がある",
            "LowDescription": "我々が調査した人々と比べると、芸術や創作活動にあまり関心がないようです",
            "HighDescription": "美を楽しみ、創造的な経験を追求します"
        },
        "Emotionality": {
            "Big5": "Openness",
            "LowTerm": "感情に流されない",
            "HighTerm": "情緒的な",
            "LowDescription": "自分の感情についてしきりに考えたり、感情をおおっぴらに表すことはありません",
            "HighDescription": "自分の感情を自覚していて、どう表現すれば良いかわかっています"
        },
        "Adventurousness": {
            "Big5": "Openness",
            "LowTerm": "安定している",
            "HighTerm": "冒険的な",
            "LowDescription": "いつもの習慣や日課を好み、そこから逸脱することを望みません",
            "HighDescription": "新しい経験をすることを熱望しています"
        },
        "Intellect": {
            "Big5": "Openness",
            "LowTerm": "現実的な",
            "HighTerm": "哲学的な",
            "LowDescription": "抽象的なアイディアや新しい発想にはあまり目を向けず、現状の世の中にうまく対応していくことを好みます",
            "HighDescription": "新しいアイディアに興味をそそられ、進んで受け入れ、探求することを好みます"
        },
        "Liberalism": {
            "Big5": "Openness",
            "LowTerm": "権威を尊重する",
            "HighTerm": "権威に挑む",
            "LowDescription": "安定感を大切にし、伝統に従うことを好みます",
            "HighDescription": "権威や伝統を守るよりも、より良い方向へ変化させる方が良いと考えます"
        }
    },
    "needs": {
        "Challenge": ["名声", "競争", "栄光"],
        "Closeness": ["帰属", "郷愁", "親密さ"],
        "Curiosity": ["発見", "専門性", "知識獲得"],
        "Excitement": ["お祭り騒ぎ", "期待", "うきうきした気分"],
        "Harmony": ["幸福", "礼儀", "丁寧さ"],
        "Ideal": ["洗練", "崇高さ", "優越感", "満足感"],
        "Liberty": ["現代性", "可能性拡大", "束縛脱出", "自発性", "斬新さ"],
        "Love": ["つながり", "親近感"],
        "Practicality": ["効率", "実用性", "高価値", "利便性"],
        "Self-expression": ["自己表現", "自己啓発", "個人的強み"],
        "Stability": ["安定", "信憑性", "信用性"],
        "Structure": ["組織への帰属", "率直さ", "明瞭さ", "信頼性"]
    },
    "phrases": {
        "You are %s": "%sタイプです",
        "You are %s and %s": "%sタイプであり、また%sタイプです",
        "You are %s, %s and %s": "%sタイプであり、%sタイプであり、また%sタイプです",
        "And you are %s": "また、%sタイプです",
        "You are relatively unconcerned with %s": "%sにはあまりこだわりません",
        "You are relatively unconcerned with both %s and %s": "%sと%sの両方にあまりこだわりません",
        "You don't find %s to be particularly motivating for you": "%sには特に関心がありません",
        "You don't find either %s or %s to be particularly motivating for you": "%s、%sのいずれも関心がありません",
        "You value both %s a bit": "両方の%sを少し評価します",
        "You value both %s and %s a bit": "%s と%sの両方が少しばかり有用と考えています",
        "You consider %s to guide a large part of what you do": "%sがあなたの行動に大きな影響を与えています",
        "You consider both %s and %s to guide a large part of what you do": "方針を決める際に%sと%sの両方を重要とみなします",
        "And %s": "また%s",
        "You value %s a bit more": "%sを多少有用だと考えています",
        "Experiences that make you feel high %s are generally unappealing to you": "気分が高揚する経験の%sには慨して魅力を感じません",
        "Experiences that give a sense of %s hold some appeal to you": "%sを感じられる体験に魅力を感じます",
        "You are motivated to seek out experiences that provide a strong feeling of %s": "%sにつながる体験を好みます",
        "Your choices are driven by a desire for %s": "%sを意識して意思決定するタイプです",
        "a bit %s": "少し%s",
        "somewhat %s": "多少%s",
        "can be perceived as %s": "%s人と思われるかもしれない"
    },
    "traits": {
        "Agreeableness_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "猪突猛進な"
        }, {
            "perceived_negatively": true,
            "word": "儀礼にこだわらない、単刀直入な"
        }, {
            "perceived_negatively": true,
            "word": "全面的には信頼しない"
        }, {
            "perceived_negatively": true,
            "word": "安易に協調せず、自分の信念を貫く"
        }, {
            "perceived_negatively": true,
            "word": "議論より実践の"
        }],
        "Agreeableness_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "忠実な"
        }, {
            "perceived_negatively": false,
            "word": "剛直な"
        }, {
            "perceived_negatively": true,
            "word": "厳格な"
        }],
        "Agreeableness_minus_Extraversion_minus": [{
            "perceived_negatively": true,
            "word": "斜に構えた"
        }, {
            "perceived_negatively": true,
            "word": "人に用心深い"
        }, {
            "perceived_negatively": true,
            "word": "引っ込み思案な"
        }, {
            "perceived_negatively": true,
            "word": "私心がない"
        }, {
            "perceived_negatively": true,
            "word": "客観的な"
        }, {
            "perceived_negatively": true,
            "word": "心配そうな"
        }],
        "Agreeableness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "頑固な"
        }, {
            "perceived_negatively": true,
            "word": "飛躍が多い"
        }, {
            "perceived_negatively": true,
            "word": "荒削りな"
        }, {
            "perceived_negatively": true,
            "word": "好戦的な"
        }, {
            "perceived_negatively": true,
            "word": "大まかな"
        }, {
            "perceived_negatively": false,
            "word": "ちゃめっ気のある"
        }, {
            "perceived_negatively": true,
            "word": "巧みな"
        }, {
            "perceived_negatively": true,
            "word": "飾り気のない"
        }, {
            "perceived_negatively": true,
            "word": "疑われやすい"
        }],
        "Agreeableness_minus_Neuroticism_minus": [{
            "perceived_negatively": true,
            "word": "気配りが苦手な"
        }, {
            "perceived_negatively": true,
            "word": "よそよそしい"
        }, {
            "perceived_negatively": true,
            "word": "冷静な"
        }, {
            "perceived_negatively": true,
            "word": "感情に流されない"
        }],
        "Agreeableness_minus_Neuroticism_plus": [{
            "perceived_negatively": true,
            "word": "批判的な"
        }, {
            "perceived_negatively": true,
            "word": "利己的な"
        }, {
            "perceived_negatively": true,
            "word": "怒りっぽい"
        }, {
            "perceived_negatively": true,
            "word": "対立する"
        }, {
            "perceived_negatively": true,
            "word": "ご機嫌斜めの"
        }, {
            "perceived_negatively": true,
            "word": "厳しい"
        }, {
            "perceived_negatively": true,
            "word": "社交が苦手な"
        }, {
            "perceived_negatively": true,
            "word": "人に要求しがちな"
        }],
        "Agreeableness_minus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "大雑把な"
        }, {
            "perceived_negatively": true,
            "word": "機転の利かない"
        }, {
            "perceived_negatively": true,
            "word": "素っ気ない"
        }, {
            "perceived_negatively": true,
            "word": "心にゆとりがない"
        }, {
            "perceived_negatively": true,
            "word": "情にほだされない"
        }, {
            "perceived_negatively": true,
            "word": "断固とした"
        }, {
            "perceived_negatively": true,
            "word": "手加減できない"
        }, {
            "perceived_negatively": true,
            "word": "執念深い"
        }],
        "Agreeableness_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "鋭敏な"
        }, {
            "perceived_negatively": false,
            "word": "風変わりな"
        }, {
            "perceived_negatively": false,
            "word": "個性的な"
        }],
        "Agreeableness_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "控えめな"
        }, {
            "perceived_negatively": false,
            "word": "でしゃばらない"
        }],
        "Agreeableness_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "役立つ"
        }, {
            "perceived_negatively": false,
            "word": "協力的な"
        }, {
            "perceived_negatively": false,
            "word": "思いやりのある"
        }, {
            "perceived_negatively": false,
            "word": "礼儀正しい"
        }, {
            "perceived_negatively": false,
            "word": "丁寧な"
        }, {
            "perceived_negatively": false,
            "word": "道理をわきまえる"
        }, {
            "perceived_negatively": false,
            "word": "丁重な"
        }, {
            "perceived_negatively": false,
            "word": "思慮深い"
        }, {
            "perceived_negatively": false,
            "word": "忠実な"
        }, {
            "perceived_negatively": false,
            "word": "モラルがある"
        }],
        "Agreeableness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "心が優しい"
        }, {
            "perceived_negatively": false,
            "word": "快い"
        }, {
            "perceived_negatively": false,
            "word": "好意的な"
        }, {
            "perceived_negatively": false,
            "word": "控えめな"
        }, {
            "perceived_negatively": true,
            "word": "慈悲深い"
        }],
        "Agreeableness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "はしゃぐ"
        }, {
            "perceived_negatively": false,
            "word": "幸福そうな"
        }, {
            "perceived_negatively": false,
            "word": "親しみやすい"
        }, {
            "perceived_negatively": false,
            "word": "面白い"
        }, {
            "perceived_negatively": false,
            "word": "陽気な"
        }, {
            "perceived_negatively": false,
            "word": "ユーモアがある"
        }],
        "Agreeableness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "寛大な"
        }, {
            "perceived_negatively": false,
            "word": "愉快な"
        }, {
            "perceived_negatively": false,
            "word": "寛容な"
        }, {
            "perceived_negatively": false,
            "word": "平和的な"
        }, {
            "perceived_negatively": false,
            "word": "柔軟な"
        }, {
            "perceived_negatively": false,
            "word": "気楽な"
        }, {
            "perceived_negatively": false,
            "word": "フェアな"
        }, {
            "perceived_negatively": false,
            "word": "慈悲深い"
        }, {
            "perceived_negatively": false,
            "word": "信じやすい"
        }],
        "Agreeableness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "情にもろい"
        }, {
            "perceived_negatively": false,
            "word": "優しい"
        }, {
            "perceived_negatively": false,
            "word": "活気にあふれる"
        }, {
            "perceived_negatively": false,
            "word": "柔和な"
        }, {
            "perceived_negatively": false,
            "word": "情熱的"
        }, {
            "perceived_negatively": false,
            "word": "ロマンチストの"
        }],
        "Agreeableness_plus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "人に頼りがちな"
        }, {
            "perceived_negatively": true,
            "word": "簡素好きな"
        }],
        "Agreeableness_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "愛想の良い"
        }, {
            "perceived_negatively": false,
            "word": "如才ない"
        }, {
            "perceived_negatively": false,
            "word": "駆引きがうまい"
        }, {
            "perceived_negatively": false,
            "word": "深みがある"
        }, {
            "perceived_negatively": false,
            "word": "理想家の"
        }],
        "Conscientiousness_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "気が早い"
        }, {
            "perceived_negatively": true,
            "word": "安易に協調せず、自分の信念を貫く"
        }, {
            "perceived_negatively": true,
            "word": "頼りない"
        }, {
            "perceived_negatively": true,
            "word": "全面的には信頼しない"
        }, {
            "perceived_negatively": true,
            "word": "議論より実践の"
        }],
        "Conscientiousness_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "控えめ"
        }, {
            "perceived_negatively": false,
            "word": "でしゃばらない"
        }],
        "Conscientiousness_minus_Extraversion_minus": [{
            "perceived_negatively": true,
            "word": "優柔不断な"
        }, {
            "perceived_negatively": true,
            "word": "目的がない"
        }, {
            "perceived_negatively": false,
            "word": "気が抜けている"
        }, {
            "perceived_negatively": false,
            "word": "当り障りがない"
        }, {
            "perceived_negatively": true,
            "word": "野心的でない"
        }],
        "Conscientiousness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "気ままな"
        }, {
            "perceived_negatively": false,
            "word": "ひどく陽気な"
        }, {
            "perceived_negatively": true,
            "word": "向こう見ずな"
        }, {
            "perceived_negatively": true,
            "word": "がむしゃらな"
        }, {
            "perceived_negatively": false,
            "word": "感情を表に出す"
        }],
        "Conscientiousness_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "形式張らない"
        }, {
            "perceived_negatively": false,
            "word": "地味な"
        }],
        "Conscientiousness_minus_Neuroticism_plus": [{
            "perceived_negatively": true,
            "word": "ぼーっとしてる"
        }, {
            "perceived_negatively": true,
            "word": "臨機応変な"
        }, {
            "perceived_negatively": true,
            "word": "風変わりな"
        }, {
            "perceived_negatively": true,
            "word": "忘れっぽい"
        }, {
            "perceived_negatively": true,
            "word": "衝動的な"
        }, {
            "perceived_negatively": true,
            "word": "勝手気ままな"
        }],
        "Conscientiousness_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "型破りな"
        }, {
            "perceived_negatively": true,
            "word": "理屈に拘らない"
        }, {
            "perceived_negatively": true,
            "word": "子どもっぽい"
        }, {
            "perceived_negatively": true,
            "word": "ぶっつけ本番、出たとこ勝負の"
        }, {
            "perceived_negatively": false,
            "word": "曖昧な"
        }, {
            "perceived_negatively": true,
            "word": "浮ついたところのある"
        }],
        "Conscientiousness_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "慣例にとらわれない"
        }, {
            "perceived_negatively": false,
            "word": "奇抜な"
        }],
        "Conscientiousness_plus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "厳格な"
        }, {
            "perceived_negatively": false,
            "word": "忠実な"
        }, {
            "perceived_negatively": false,
            "word": "剛直な"
        }],
        "Conscientiousness_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "頼りになる"
        }, {
            "perceived_negatively": false,
            "word": "責任感がある"
        }, {
            "perceived_negatively": false,
            "word": "信頼できる"
        }, {
            "perceived_negatively": false,
            "word": "礼儀正しい"
        }, {
            "perceived_negatively": false,
            "word": "思いやりのある"
        }],
        "Conscientiousness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "用心深い"
        }, {
            "perceived_negatively": false,
            "word": "自信のある"
        }, {
            "perceived_negatively": false,
            "word": "時間厳守する"
        }, {
            "perceived_negatively": false,
            "word": "儀礼的な"
        }, {
            "perceived_negatively": false,
            "word": "やりくりがうまい"
        }, {
            "perceived_negatively": false,
            "word": "信念を持ってる"
        }],
        "Conscientiousness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "意欲的な"
        }, {
            "perceived_negatively": false,
            "word": "注意深い"
        }, {
            "perceived_negatively": false,
            "word": "堅固な"
        }, {
            "perceived_negatively": false,
            "word": "決断力がある"
        }, {
            "perceived_negatively": false,
            "word": "競争力がある"
        }],
        "Conscientiousness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "徹底している"
        }, {
            "perceived_negatively": false,
            "word": "着実な"
        }, {
            "perceived_negatively": false,
            "word": "一貫している"
        }, {
            "perceived_negatively": false,
            "word": "自制力がある"
        }, {
            "perceived_negatively": false,
            "word": "論理的"
        }, {
            "perceived_negatively": false,
            "word": "決定力のある"
        }, {
            "perceived_negatively": false,
            "word": "統制された"
        }, {
            "perceived_negatively": false,
            "word": "簡潔な"
        }],
        "Conscientiousness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "独特な"
        }, {
            "perceived_negatively": true,
            "word": "緊張しがちな"
        }],
        "Conscientiousness_plus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "伝統を守る"
        }, {
            "perceived_negatively": false,
            "word": "慣習を重んじる"
        }],
        "Conscientiousness_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "洗練されている"
        }, {
            "perceived_negatively": false,
            "word": "完璧を追求する"
        }, {
            "perceived_negatively": false,
            "word": "勤勉な"
        }, {
            "perceived_negatively": false,
            "word": "品位がある"
        }, {
            "perceived_negatively": false,
            "word": "上品な"
        }, {
            "perceived_negatively": false,
            "word": "教養がある"
        }, {
            "perceived_negatively": false,
            "word": "先見の明のある"
        }],
        "Extraversion_minus_Agreeableness_minus": [{
            "perceived_negatively": false,
            "word": "物事に懐疑的な"
        }, {
            "perceived_negatively": false,
            "word": "人に用心深い"
        }, {
            "perceived_negatively": true,
            "word": "引っ込み思案な"
        }, {
            "perceived_negatively": true,
            "word": "無口な"
        }, {
            "perceived_negatively": true,
            "word": "社交が苦手な"
        }, {
            "perceived_negatively": true,
            "word": "心配そうな"
        }, {
            "perceived_negatively": true,
            "word": "私心がない"
        }, {
            "perceived_negatively": false,
            "word": "超然とした"
        }],
        "Extraversion_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "非攻撃的な"
        }, {
            "perceived_negatively": false,
            "word": "控えめな"
        }, {
            "perceived_negatively": false,
            "word": "素直に対応する"
        }, {
            "perceived_negatively": false,
            "word": "気が小さい"
        }, {
            "perceived_negatively": false,
            "word": "適合力のある"
        }, {
            "perceived_negatively": false,
            "word": "単純な"
        }],
        "Extraversion_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "鵜呑みにしない"
        }, {
            "perceived_negatively": true,
            "word": "精力的でない"
        }, {
            "perceived_negatively": true,
            "word": "対応がゆっくりな"
        }, {
            "perceived_negatively": true,
            "word": "持続力に欠ける"
        }, {
            "perceived_negatively": true,
            "word": "あやふやな"
        }],
        "Extraversion_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "節度がある"
        }, {
            "perceived_negatively": false,
            "word": "まじめな"
        }, {
            "perceived_negatively": false,
            "word": "慎重な"
        }, {
            "perceived_negatively": false,
            "word": "用心深い"
        }, {
            "perceived_negatively": false,
            "word": "信念を持ってる"
        }],
        "Extraversion_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "物静かな"
        }, {
            "perceived_negatively": false,
            "word": "落ち着いている"
        }, {
            "perceived_negatively": false,
            "word": "穏やかな"
        }, {
            "perceived_negatively": false,
            "word": "偏見がない"
        }, {
            "perceived_negatively": false,
            "word": "高ぶらない"
        }, {
            "perceived_negatively": false,
            "word": "素直な"
        }],
        "Extraversion_minus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "ガードが堅い"
        }, {
            "perceived_negatively": false,
            "word": "悲観的な"
        }, {
            "perceived_negatively": false,
            "word": "隠したがる"
        }, {
            "perceived_negatively": true,
            "word": "気の小さい"
        }, {
            "perceived_negatively": false,
            "word": "隠したがる"
        }],
        "Extraversion_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "気分が沈みがちな"
        }, {
            "perceived_negatively": true,
            "word": "おとなしい"
        }, {
            "perceived_negatively": true,
            "word": "冒険を好まない"
        }, {
            "perceived_negatively": false,
            "word": "受け身な"
        }, {
            "perceived_negatively": true,
            "word": "何事にも関心を持たない"
        }, {
            "perceived_negatively": false,
            "word": "素直な"
        }],
        "Extraversion_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "内部志向型な"
        }, {
            "perceived_negatively": false,
            "word": "内省的な"
        }, {
            "perceived_negatively": false,
            "word": "よく瞑想にふける"
        }, {
            "perceived_negatively": false,
            "word": "熟考する"
        }, {
            "perceived_negatively": false,
            "word": "自省する"
        }],
        "Extraversion_plus_Agreeableness_minus": [{
            "perceived_negatively": false,
            "word": "自説を曲げない"
        }, {
            "perceived_negatively": true,
            "word": "強引なところがある"
        }, {
            "perceived_negatively": true,
            "word": "支配力を追い求める"
        }, {
            "perceived_negatively": true,
            "word": "自慢好きな"
        }, {
            "perceived_negatively": true,
            "word": "親分風の"
        }, {
            "perceived_negatively": false,
            "word": "支配的な"
        }, {
            "perceived_negatively": false,
            "word": "抜け目のない"
        }],
        "Extraversion_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "社会的な"
        }, {
            "perceived_negatively": false,
            "word": "精力的な"
        }, {
            "perceived_negatively": false,
            "word": "熱中しやすい"
        }, {
            "perceived_negatively": false,
            "word": "おしゃべり好きな"
        }, {
            "perceived_negatively": false,
            "word": "敏感な"
        }, {
            "perceived_negatively": false,
            "word": "元気な"
        }, {
            "perceived_negatively": false,
            "word": "人をひきつける"
        }, {
            "perceived_negatively": false,
            "word": "何事にも熱心な"
        }],
        "Extraversion_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "ひどく陽気な"
        }, {
            "perceived_negatively": false,
            "word": "いたずら好きな"
        }, {
            "perceived_negatively": false,
            "word": "自己の主張に強い信念をもっている"
        }, {
            "perceived_negatively": false,
            "word": "社交的な"
        }, {
            "perceived_negatively": false,
            "word": "感情を表に出す"
        }],
        "Extraversion_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "活発な"
        }, {
            "perceived_negatively": false,
            "word": "競争力がある"
        }, {
            "perceived_negatively": false,
            "word": "粘り強い"
        }, {
            "perceived_negatively": false,
            "word": "意欲的な"
        }, {
            "perceived_negatively": false,
            "word": "決断力がある"
        }],
        "Extraversion_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "自信のある"
        }, {
            "perceived_negatively": false,
            "word": "大胆な"
        }, {
            "perceived_negatively": false,
            "word": "確信を持った"
        }, {
            "perceived_negatively": false,
            "word": "単刀直入な"
        }, {
            "perceived_negatively": false,
            "word": "精神的に強い"
        }, {
            "perceived_negatively": false,
            "word": "困難に立ち向かう"
        }, {
            "perceived_negatively": false,
            "word": "自己に満足している"
        }, {
            "perceived_negatively": false,
            "word": "元気いっぱいな"
        }, {
            "perceived_negatively": false,
            "word": "たくましい"
        }],
        "Extraversion_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "熱くなりやすい"
        }, {
            "perceived_negatively": true,
            "word": "言葉が多い"
        }, {
            "perceived_negatively": false,
            "word": "ひどく気前が良い"
        }, {
            "perceived_negatively": true,
            "word": "気まぐれな"
        }, {
            "perceived_negatively": false,
            "word": "異性の気を引こうとする"
        }],
        "Extraversion_plus_Openness_minus": [{
            "perceived_negatively": true,
            "word": "言葉数が多い"
        }, {
            "perceived_negatively": true,
            "word": "めんどくさがりな"
        }, {
            "perceived_negatively": true,
            "word": "気取った"
        }],
        "Extraversion_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "表現に富む"
        }, {
            "perceived_negatively": false,
            "word": "率直な"
        }, {
            "perceived_negatively": false,
            "word": "ドラマティックな"
        }, {
            "perceived_negatively": false,
            "word": "自発的な"
        }, {
            "perceived_negatively": false,
            "word": "機知に富んでいる"
        }, {
            "perceived_negatively": false,
            "word": "機を見るに敏な"
        }, {
            "perceived_negatively": false,
            "word": "自立している"
        }],
        "Neuroticism_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "感情に流されない"
        }, {
            "perceived_negatively": true,
            "word": "気配りが苦手な"
        }, {
            "perceived_negatively": true,
            "word": "よそよそしい"
        }, {
            "perceived_negatively": true,
            "word": "冷静な"
        }],
        "Neuroticism_minus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "忍耐強い"
        }, {
            "perceived_negatively": false,
            "word": "リラックスしている"
        }, {
            "perceived_negatively": false,
            "word": "多くを要求しない"
        }, {
            "perceived_negatively": false,
            "word": "現実的な"
        }, {
            "perceived_negatively": false,
            "word": "楽観的な"
        }, {
            "perceived_negatively": false,
            "word": "思いやりのある"
        }, {
            "perceived_negatively": false,
            "word": "批判することを遠慮する"
        }, {
            "perceived_negatively": false,
            "word": "控えめ"
        }],
        "Neuroticism_minus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "形式張らない"
        }, {
            "perceived_negatively": false,
            "word": "地味な"
        }],
        "Neuroticism_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "合理的な"
        }, {
            "perceived_negatively": false,
            "word": "公平な"
        }, {
            "perceived_negatively": false,
            "word": "着実な"
        }, {
            "perceived_negatively": false,
            "word": "論理的"
        }, {
            "perceived_negatively": false,
            "word": "決定力のある"
        }, {
            "perceived_negatively": false,
            "word": "落ち着いている"
        }, {
            "perceived_negatively": false,
            "word": "簡潔な"
        }, {
            "perceived_negatively": false,
            "word": "徹底している"
        }, {
            "perceived_negatively": false,
            "word": "経済的な"
        }, {
            "perceived_negatively": false,
            "word": "自制力がある"
        }],
        "Neuroticism_minus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "高ぶらない"
        }, {
            "perceived_negatively": true,
            "word": "興奮しない"
        }, {
            "perceived_negatively": false,
            "word": "穏やかな"
        }, {
            "perceived_negatively": false,
            "word": "物静かな"
        }],
        "Neuroticism_minus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "気取らない"
        }, {
            "perceived_negatively": false,
            "word": "物事に飽きない"
        }, {
            "perceived_negatively": false,
            "word": "不屈な"
        }],
        "Neuroticism_minus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "沈着な"
        }, {
            "perceived_negatively": true,
            "word": "気配りが苦手な"
        }],
        "Neuroticism_minus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "情に厚い"
        }, {
            "perceived_negatively": false,
            "word": "多芸な"
        }, {
            "perceived_negatively": false,
            "word": "創造的な"
        }, {
            "perceived_negatively": false,
            "word": "知的な"
        }, {
            "perceived_negatively": false,
            "word": "洞察力がある"
        }],
        "Neuroticism_plus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "気まぐれな"
        }, {
            "perceived_negatively": true,
            "word": "熱くなりやすい"
        }, {
            "perceived_negatively": true,
            "word": "口論好きの"
        }, {
            "perceived_negatively": true,
            "word": "性急な"
        }, {
            "perceived_negatively": true,
            "word": "ご機嫌斜めの"
        }, {
            "perceived_negatively": true,
            "word": "怒りっぽい"
        }, {
            "perceived_negatively": true,
            "word": "奇妙な"
        }],
        "Neuroticism_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "情緒的な"
        }, {
            "perceived_negatively": true,
            "word": "疑うことを知らない"
        }, {
            "perceived_negatively": false,
            "word": "優しい"
        }, {
            "perceived_negatively": false,
            "word": "敏感な"
        }, {
            "perceived_negatively": false,
            "word": "柔和な"
        }],
        "Neuroticism_plus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "何かをせずにいられない"
        }, {
            "perceived_negatively": true,
            "word": "おせっかいな"
        }, {
            "perceived_negatively": true,
            "word": "気ままな"
        }, {
            "perceived_negatively": true,
            "word": "忘れやすい"
        }, {
            "perceived_negatively": true,
            "word": "衝動的な"
        }],
        "Neuroticism_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "独特な"
        }, {
            "perceived_negatively": true,
            "word": "神経質な"
        }],
        "Neuroticism_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "ガードが堅い"
        }, {
            "perceived_negatively": true,
            "word": "いらいらしやすい"
        }, {
            "perceived_negatively": true,
            "word": "自分に確信が持てない"
        }, {
            "perceived_negatively": true,
            "word": "悲観的な"
        }, {
            "perceived_negatively": false,
            "word": "秘密にしたがる"
        }, {
            "perceived_negatively": true,
            "word": "心配性の"
        }, {
            "perceived_negatively": true,
            "word": "ものごとを否定的に捉える"
        }, {
            "perceived_negatively": false,
            "word": "自分に厳しい"
        }],
        "Neuroticism_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "興奮しやすい"
        }, {
            "perceived_negatively": true,
            "word": "言葉が多い"
        }, {
            "perceived_negatively": false,
            "word": "異性の気を引こうとする"
        }, {
            "perceived_negatively": true,
            "word": "熱くなりやすい"
        }, {
            "perceived_negatively": false,
            "word": "ひどく気前が良い"
        }, {
            "perceived_negatively": true,
            "word": "移り気な"
        }],
        "Neuroticism_plus_Openness_minus": [{
            "perceived_negatively": false,
            "word": "すぐに慌ててしまう"
        }, {
            "perceived_negatively": false,
            "word": "つい腹を立てやすい"
        }, {
            "perceived_negatively": false,
            "word": "気遣う"
        }],
        "Neuroticism_plus_Openness_plus": [{
            "perceived_negatively": false,
            "word": "興奮しやすい"
        }, {
            "perceived_negatively": false,
            "word": "情熱的"
        }, {
            "perceived_negatively": false,
            "word": "肉感的な"
        }],
        "Openness_minus_Agreeableness_minus": [{
            "perceived_negatively": true,
            "word": "大雑把な"
        }, {
            "perceived_negatively": true,
            "word": "機転の利かない"
        }, {
            "perceived_negatively": true,
            "word": "素っ気ない"
        }, {
            "perceived_negatively": true,
            "word": "心にゆとりがない"
        }, {
            "perceived_negatively": true,
            "word": "情にほだされない"
        }],
        "Openness_minus_Agreeableness_plus": [{
            "perceived_negatively": true,
            "word": "簡素好きな"
        }, {
            "perceived_negatively": true,
            "word": "人に頼りがちなの"
        }],
        "Openness_minus_Conscientiousness_minus": [{
            "perceived_negatively": true,
            "word": "目の前のことに専念する"
        }, {
            "perceived_negatively": false,
            "word": "型破りな"
        }, {
            "perceived_negatively": true,
            "word": "理屈に拘らない"
        }, {
            "perceived_negatively": true,
            "word": "子どもっぽい"
        }, {
            "perceived_negatively": true,
            "word": "ぶっつけ本番、出たとこ勝負の"
        }, {
            "perceived_negatively": false,
            "word": "曖昧な"
        }, {
            "perceived_negatively": true,
            "word": "浮ついたところのある"
        }],
        "Openness_minus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "慣習を重んじる"
        }, {
            "perceived_negatively": false,
            "word": "伝統を守る"
        }],
        "Openness_minus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "平均的な"
        }, {
            "perceived_negatively": true,
            "word": "いたって普通な"
        }, {
            "perceived_negatively": false,
            "word": "気分が沈みがちな"
        }, {
            "perceived_negatively": true,
            "word": "何事にも関心を持たない"
        }, {
            "perceived_negatively": true,
            "word": "冒険を好まない"
        }],
        "Openness_minus_Extraversion_plus": [{
            "perceived_negatively": true,
            "word": "言葉数が多い"
        }, {
            "perceived_negatively": true,
            "word": "めんどくさがりな"
        }, {
            "perceived_negatively": true,
            "word": "気取った"
        }],
        "Openness_minus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "沈着な"
        }, {
            "perceived_negatively": true,
            "word": "気配りが苦手な"
        }],
        "Openness_minus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "すぐに慌ててしまう"
        }, {
            "perceived_negatively": false,
            "word": "つい腹を立てやすい"
        }, {
            "perceived_negatively": false,
            "word": "気遣う"
        }],
        "Openness_plus_Agreeableness_minus": [{
            "perceived_negatively": false,
            "word": "鋭敏な"
        }, {
            "perceived_negatively": false,
            "word": "変わった"
        }, {
            "perceived_negatively": false,
            "word": "個性的な"
        }],
        "Openness_plus_Agreeableness_plus": [{
            "perceived_negatively": false,
            "word": "理想家の"
        }, {
            "perceived_negatively": false,
            "word": "駆引きがうまい"
        }, {
            "perceived_negatively": false,
            "word": "深みがある"
        }, {
            "perceived_negatively": false,
            "word": "如才ない"
        }, {
            "perceived_negatively": false,
            "word": "愛想の良い"
        }],
        "Openness_plus_Conscientiousness_minus": [{
            "perceived_negatively": false,
            "word": "慣例にとらわれない"
        }, {
            "perceived_negatively": false,
            "word": "奇抜な"
        }],
        "Openness_plus_Conscientiousness_plus": [{
            "perceived_negatively": false,
            "word": "分析好きな"
        }, {
            "perceived_negatively": false,
            "word": "明敏な"
        }, {
            "perceived_negatively": false,
            "word": "物知りな"
        }, {
            "perceived_negatively": false,
            "word": "明確に述べる"
        }, {
            "perceived_negatively": false,
            "word": "品位がある"
        }, {
            "perceived_negatively": false,
            "word": "教養がある"
        }],
        "Openness_plus_Extraversion_minus": [{
            "perceived_negatively": false,
            "word": "内省的な"
        }, {
            "perceived_negatively": false,
            "word": "よく瞑想にふける"
        }, {
            "perceived_negatively": false,
            "word": "熟考する"
        }, {
            "perceived_negatively": false,
            "word": "自省する"
        }, {
            "perceived_negatively": false,
            "word": "内部志向型な"
        }],
        "Openness_plus_Extraversion_plus": [{
            "perceived_negatively": false,
            "word": "世知に長けた"
        }, {
            "perceived_negatively": false,
            "word": "劇場的な"
        }, {
            "perceived_negatively": false,
            "word": "雄弁な"
        }, {
            "perceived_negatively": false,
            "word": "探究的な"
        }, {
            "perceived_negatively": false,
            "word": "情熱的な"
        }],
        "Openness_plus_Neuroticism_minus": [{
            "perceived_negatively": false,
            "word": "創造的な"
        }, {
            "perceived_negatively": false,
            "word": "知的な"
        }, {
            "perceived_negatively": false,
            "word": "洞察力がある"
        }, {
            "perceived_negatively": false,
            "word": "多芸な"
        }, {
            "perceived_negatively": false,
            "word": "創造性がある"
        }],
        "Openness_plus_Neuroticism_plus": [{
            "perceived_negatively": false,
            "word": "情熱的"
        }, {
            "perceived_negatively": false,
            "word": "興奮しやすい"
        }, {
            "perceived_negatively": false,
            "word": "肉感的な"
        }]
    },
    "values": {
        "Hedonism": [{
            "Term": "生活を楽しむこと",
            "LowDescription": "単なる個人の楽しみよりも大きな目標を伴う行動を優先します",
            "HighDescription": "人生を最大限に楽しもうとしています"
        }],
        "Self-transcendence": [{
            "Term": "他人への支援",
            "LowDescription": "人は干渉されずに自分で物事に対処できると思われています",
            "HighDescription": "自分のまわりの人々を世話することは重要であると考えます"
        }, {
            "Term": "公平",
            "LowDescription": "人は自ら機会を作っていくものと信じます",
            "HighDescription": "社会正義と全ての人の平等を信じます"
        }, {
            "Term": "社会正義",
            "LowDescription": "人は自ら機会を作っていくものと信じます",
            "HighDescription": "社会正義と全ての人の平等を信じます"
        }, {
            "Term": "平等",
            "LowDescription": "人は自ら機会を作っていくものと信じます",
            "HighDescription": "社会正義と全ての人の平等を信じます"
        }, {
            "Term": "コミュニティ・サービス",
            "LowDescription": "干渉されずに自分で物事に対処できると思われています",
            "HighDescription": "自分のまわりの人々を世話することは重要であると考えます"
        }],
        "Conservation": [{
            "Term": "伝統",
            "LowDescription": "人が通った道よりもわが道を行くことを大切にします",
            "HighDescription": "自分が属するグループに敬意を払い、それらのガイダンスに従います"
        }, {
            "Term": "調和",
            "LowDescription": "何が正しいか、他人がどう思うかではなく、自分の信条で決定します",
            "HighDescription": "規則は理由があって存在すると知っており、それらを破らないようにしています"
        }, {
            "Term": "謙虚",
            "LowDescription": "何が正しいか、他人がどう思うかではなく、自分の信条で決定します",
            "HighDescription": "他人に従うことに価値を見出します"
        }, {
            "Term": "社会規範",
            "LowDescription": "何が正しいか、他人がどう思うかではなく、自分の信条で決定します",
            "HighDescription": "規則は理由があって存在すると知っており、それらを破らないようにしています"
        }, {
            "Term": "セキュリティー",
            "LowDescription": "目的を達成するためにはセキュリティーが犠牲になってもよいと信じます",
            "HighDescription": "安全性とセキュリティーは守るべき重要なものであると信じます"
        }, {
            "Term": "安全性",
            "LowDescription": "目的を達成するためには安全性が犠牲になってもよいと信じます",
            "HighDescription": "安全性とセキュリティは守るべき重要なものであると信じます"
        }],
        "Openness-to-change": [{
            "Term": "自主性",
            "LowDescription": "他人が自分の行動の指揮をとることを受け入れます",
            "HighDescription": "最高の成果が得られるよう、自分自身で目標を設定する傾向があります"
        }, {
            "Term": "興奮",
            "LowDescription": "危険を冒して新しいことに挑むより、悪くないと分かっていることを選びます",
            "HighDescription": "新しく刺激的な経験をすることを熱望しています"
        }, {
            "Term": "創造性",
            "LowDescription": "危険を冒して新しいことに挑むより、悪くないと分かっていることを選びます",
            "HighDescription": "新しく刺激的な経験をすることを熱望しています"
        }, {
            "Term": "好奇心",
            "LowDescription": "危険を冒して新しいことに挑むより、悪くないと分かっていることを選びます",
            "HighDescription": "新しく刺激的な経験をすることを熱望しています"
        }, {
            "Term": "主体性",
            "LowDescription": "他人が自分の行動の指揮をとることを受け入れます",
            "HighDescription": "最高の成果が得られるよう、自分自身で目標を設定する傾向があります"
        }, {
            "Term": "自由",
            "LowDescription": "他人が自分の行動の指揮をとることを受け入れます",
            "HighDescription": "最高の成果が得られるよう、自分自身で目標を設定する傾向があります"
        }],
        "Self-enhancement": [{
            "Term": "成功すること",
            "LowDescription": "自分の才能を誇示することにあまり拘らず意思決定します",
            "HighDescription": "自分自身を向上させ、自分が有能な人であることを実証する機会を探しています"
        }, {
            "Term": "社会的地位の獲得",
            "LowDescription": "社会的地位に満足していて、それ以上を強くは望んでいません",
            "HighDescription": "自分の地位と世間体を向上するために相当な努力を行います"
        }, {
            "Term": "野心",
            "LowDescription": "社会的地位に満足していて、それ以上を強くは望んでいません",
            "HighDescription": "ゴールへ突き進むことが重要であると感じます"
        }, {
            "Term": "大成功",
            "LowDescription": "自分の才能を誇示することにあまり拘らず意思決定します",
            "HighDescription": "自分自身を向上させ、自分が有能な人であることを実証する機会を探しています"
        }]
    }
};

},{}]},{},[1])
(1)
});