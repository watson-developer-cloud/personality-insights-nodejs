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

"use strict";

var format = _dereq_("./format"),
    i18n = _dereq_("./i18n");

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
      var i1 = "EANOC".indexOf(o1.id.charAt(0)),
          i2 = "EANOC".indexOf(o2.id.charAt(0));

      return i1 < i2 ? -1 : 1;
    }),

    // Assemble the identifier as the JSON file stored it.
    identifier = ordered[0].id.concat(ordered[0].percentage > 0.5 ? "_plus_" : "_minus_").concat(ordered[1].id).concat(ordered[1].percentage > 0.5 ? "_plus" : "_minus"),
        traitMult = self.circumplexData[identifier][0],
        sentence = "%s";

    if (traitMult.perceived_negatively) {
      switch (order) {
        case 0:
          sentence = tphrase("a bit %s");
          break;
        case 1:
          sentence = tphrase("somewhat %s");
          break;
        case 2:
          sentence = tphrase("can be perceived as %s");
          break;
      }
    }

    return format(sentence, traitMult.word);
  }

  function getFacetInfo(f) {
    var data = self.facetsData[f.id.replace("_", "-").replace(" ", "-")],
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
    var data = self.valuesData[v.id.replace(/[_ ]/g, "-")][0],
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
        sentences.push(format(tphrase("You are %s"), adj) + ".");
        break;
      case 3:
        // Report 2 adjectives.
        adj1 = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
        adj2 = getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1);
        sentences.push(format(tphrase("You are %s and %s"), adj1, adj2) + ".");
        break;
      case 4:
      case 5:
        // Report 3 adjectives.
        adj1 = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
        adj2 = getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1);
        adj3 = getCircumplexAdjective(relevantBig5[2], relevantBig5[3], 2);
        sentences.push(format(tphrase("You are %s, %s and %s"), adj1, adj2, adj3) + ".");
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
    sentences.push(format(tphrase("You are %s"), info.term) + ": " + info.description + ".");
    info = getFacetInfo(facetElements[1]);
    sentences.push(format(tphrase("You are %s"), info.term) + ": " + info.description + ".");

    // If all the facets correspond to the same feature, continue until a
    // different parent feature is found.
    i = 2;
    if (facetElements[0].parent === facetElements[1].parent) {
      while (facetElements[0].parent === facetElements[i].parent) {
        i += 1;
      }
    }
    info = getFacetInfo(facetElements[i]);
    sentences.push(format(tphrase("And you are %s"), info.term) + ": " + info.description + ".");

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
          sentence = format(tphrase("You are relatively unconcerned with both %s and %s"), term1, term2) + ".";
          break;
        case 1:
          sentence = format(tphrase("You don't find either %s or %s to be particularly motivating for you"), term1, term2) + ".";
          break;
        case 2:
          sentence = format(tphrase("You value both %s and %s a bit"), term1, term2) + ".";
          break;
        case 3:
          sentence = format(tphrase("You consider both %s and %s to guide a large part of what you do"), term1, term2) + ".";
          break;
      }
      sentences.push(sentence);

      // Assemble the final strings in the correct format.
      sentences.push(info1.description + ".");
      sentences.push(format(tphrase("And %s"), info2.description.toLowerCase()) + ".");
    } else {
      valuesInfo = [info1, info2];
      for (i = 0; i < valuesInfo.length; i += 1) {
        // Process it this way because the code is the same.
        switch (intervalFor(valuesList[i].percentage)) {
          case 0:
            sentence = format(tphrase("You are relatively unconcerned with %s"), valuesInfo[i].term);
            break;
          case 1:
            sentence = format(tphrase("You don't find %s to be particularly motivating for you"), valuesInfo[i].term);
            break;
          case 2:
            sentence = format(tphrase("You value %s a bit more"), valuesInfo[i].term);
            break;
          case 3:
            sentence = format(tphrase("You consider %s to guide a large part of what you do"), valuesInfo[i].term);
            break;
        }
        sentence = sentence.concat(": ").concat(valuesInfo[i].description.toLowerCase()).concat(".");
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
        sentence = tphrase("Experiences that make you feel high %s are generally unappealing to you");
        break;
      case 1:
        sentence = tphrase("Experiences that give a sense of %s hold some appeal to you");
        break;
      case 2:
        sentence = tphrase("You are motivated to seek out experiences that provide a strong feeling of %s");
        break;
      case 3:
        sentence = tphrase("Your choices are driven by a desire for %s");
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
"use strict";

function format(subject) {
  "use strict";

  var replaces = Array.prototype.slice.apply(arguments, [1, arguments.length]),
      parts = null,
      output,
      i;

  if (subject.match(/%s/g) === null && replaces.length > 0 || replaces.length !== subject.match(/%s/g).length) {
    throw "Format error: The string count to replace do not matches the argument count. Subject: " + subject + ". Replaces: " + replaces;
  }

  output = subject;
  for (i = 1; i < arguments.length; i += 1) {
    parts = output.split("%s");
    output = parts[0] + arguments[i] + parts.slice(1, parts.length).join("%s");
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

"use strict";

var format = _dereq_("./format");

/**
 * Creates translators
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
var translatorFactory = (function () {
  "use strict";

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
    getKey: function getKey(dictionary, key, defaultValue) {
      var i,
          parts = key.split("."),
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
    createTranslator: function createTranslator(translations, defaults) {
      defaults = defaults || {};
      var _this = this;
      return function (key) {
        var value = self.getKey(translations, key, null);
        if (value === null) {
          console.log(format("Pending translation for: %s", key));
          value = _this.getKey(defaults, key, key);
        }
        return value;
      };
    }
  };

  return self;
})(),

/**
 * Provide files according to user's locale
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
i18nProvider = (function () {
  "use strict";

  var DEFAULT_LOCALE = "en",
      I18N_DIR = "./i18n",
      self = {
    dictionaries: {
      en: _dereq_("./i18n/en"),
      es: _dereq_("./i18n/es")
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
    var localeParts = locale.split("-"),
        options = [];

    options.push(locale.replace("-", "_"));
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

    throw new Error("Could not obtain any dictionary for locale \"" + locale + "\"");
  };

  return self;
})();

module.exports = {
  i18nProvider: i18nProvider,
  getDictionary: i18nProvider.getDictionary,
  translatorFactory: translatorFactory
};

},{"./format":2,"./i18n/en":4,"./i18n/es":5}],4:[function(_dereq_,module,exports){
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

"use strict";

module.exports = {
    facets: {
        Friendliness: {
            Big5: "Extraversion",
            LowTerm: "Reserved",
            HighTerm: "Outgoing",
            LowDescription: "You are a private person and don't let many people in",
            HighDescription: "You make friends easily and feel comfortable around other people"
        },
        Gregariousness: {
            Big5: "Extraversion",
            LowTerm: "Independent",
            HighTerm: "Sociable",
            LowDescription: "You have a strong desire to have time to yourself",
            HighDescription: "You enjoy being in the company of others"
        },
        Assertiveness: {
            Big5: "Extraversion",
            LowTerm: "Demure",
            HighTerm: "Assertive",
            LowDescription: "You prefer to listen than to talk, especially in group situations",
            HighDescription: "You tend to speak up and take charge of situations, and you are comfortable leading groups"
        },
        "Activity-level": {
            Big5: "Extraversion",
            LowTerm: "Laid-back",
            HighTerm: "Energetic",
            LowDescription: "You appreciate a relaxed pace in life",
            HighDescription: "You enjoy a fast-paced, busy schedule with many activities"
        },
        "Excitement-seeking": {
            Big5: "Extraversion",
            LowTerm: "Calm-seeking",
            HighTerm: "Excitement-seeking",
            LowDescription: "You prefer activities that are quiet, calm, and safe",
            HighDescription: "You are excited by taking risks and feel bored without lots of action going on"
        },
        Cheerfulness: {
            Big5: "Extraversion",
            LowTerm: "Solemn",
            HighTerm: "Cheerful",
            LowDescription: "You are generally serious and do not joke much",
            HighDescription: "You are a joyful person and share that joy with the world"
        },
        Trust: {
            Big5: "Agreeableness",
            LowTerm: "Cautious of others",
            HighTerm: "Trusting of others",
            LowDescription: "You are wary of other people's intentions and do not trust easily",
            HighDescription: "You believe the best in others and trust people easily"
        },
        Cooperation: {
            Big5: "Agreeableness",
            LowTerm: "Contrary",
            HighTerm: "Accommodating",
            LowDescription: "You do not shy away from contradicting others",
            HighDescription: "You are easy to please and try to avoid confrontation"
        },
        Altruism: {
            Big5: "Agreeableness",
            LowTerm: "Self-focused",
            HighTerm: "Altruistic",
            LowDescription: "You are more concerned with taking care of yourself than taking time for others",
            HighDescription: "You feel fulfilled when helping others, and will go out of your way to do so"
        },
        Morality: {
            Big5: "Agreeableness",
            LowTerm: "Compromising",
            HighTerm: "Uncompromising",
            LowDescription: "You are comfortable using every trick in the book to get what you want",
            HighDescription: "You think it is wrong to take advantage of others to get ahead"
        },
        Modesty: {
            Big5: "Agreeableness",
            LowTerm: "Proud",
            HighTerm: "Modest",
            LowDescription: "You hold yourself in high regard, satisfied with who you are",
            HighDescription: "You are uncomfortable being the center of attention"
        },
        Sympathy: {
            Big5: "Agreeableness",
            LowTerm: "Hardened",
            HighTerm: "Empathetic",
            LowDescription: "You think that people should generally rely more on themselves than on other people",
            HighDescription: "You feel what others feel and are compassionate towards them"
        },
        "Self-efficacy": {
            Big5: "Conscientiousness",
            LowTerm: "Self-doubting",
            HighTerm: "Self-assured",
            LowDescription: "You frequently doubt your ability to achieve your goals",
            HighDescription: "You feel you have the ability to succeed in the tasks you set out to do"
        },
        Orderliness: {
            Big5: "Conscientiousness",
            LowTerm: "Unstructured",
            HighTerm: "Organized",
            LowDescription: "You do not make a lot of time for organization in your daily life",
            HighDescription: "You feel a strong need for structure in your life"
        },
        Dutifulness: {
            Big5: "Conscientiousness",
            LowTerm: "Carefree",
            HighTerm: "Dutiful",
            LowDescription: "You do what you want, disregarding rules and obligations",
            HighDescription: "You take rules and obligations seriously, even when they're inconvenient"
        },
        "Achievement-striving": {
            Big5: "Conscientiousness",
            LowTerm: "Content",
            HighTerm: "Driven",
            LowDescription: "You are content with your level of accomplishment and do not feel the need to set ambitious goals",
            HighDescription: "You have high goals for yourself and work hard to achieve them"
        },
        "Self-discipline": {
            Big5: "Conscientiousness",
            LowTerm: "Intermittent",
            HighTerm: "Persistent",
            LowDescription: "You have a hard time sticking with difficult tasks for a long period of time",
            HighDescription: "You can tackle and stick with tough tasks"
        },
        Cautiousness: {
            Big5: "Conscientiousness",
            LowTerm: "Bold",
            HighTerm: "Deliberate",
            LowDescription: "You would rather take action immediately than spend time deliberating making a decision",
            HighDescription: "You carefully think through decisions before making them"
        },
        Anxiety: {
            Big5: "Neuroticism",
            LowTerm: "Self-assured",
            HighTerm: "Prone to worry",
            LowDescription: "You tend to feel calm and self-assured",
            HighDescription: "You tend to worry about things that might happen"
        },
        Anger: {
            Big5: "Neuroticism",
            LowTerm: "Mild-tempered",
            HighTerm: "Fiery",
            LowDescription: "It takes a lot to get you angry",
            HighDescription: "You have a fiery temper, especially when things do not go your way"
        },
        Depression: {
            Big5: "Neuroticism",
            LowTerm: "Content",
            HighTerm: "Melancholy",
            LowDescription: "You are generally comfortable with yourself as you are",
            HighDescription: "You think quite often about the things you are unhappy about"
        },
        "Self-consciousness": {
            Big5: "Neuroticism",
            LowTerm: "Confident",
            HighTerm: "Self-conscious",
            LowDescription: "You are hard to embarrass and are self-confident most of the time",
            HighDescription: "You are sensitive about what others might be thinking about you"
        },
        Immoderation: {
            Big5: "Neuroticism",
            LowTerm: "Self-controlled",
            HighTerm: "Hedonistic",
            LowDescription: "You have control over your desires, which are not particularly intense",
            HighDescription: "You feel your desires strongly and are easily tempted by them"
        },
        Vulnerability: {
            Big5: "Neuroticism",
            LowTerm: "Calm under pressure",
            HighTerm: "Susceptible to stress",
            LowDescription: "You handle unexpected events calmly and effectively",
            HighDescription: "You are easily overwhelmed in stressful situations"
        },
        Imagination: {
            Big5: "Openness",
            LowTerm: "Down-to-earth",
            HighTerm: "Imaginative",
            LowDescription: "You prefer facts over fantasy",
            HighDescription: "You have a wild imagination"
        },
        "Artistic-interests": {
            Big5: "Openness",
            LowTerm: "Unconcerned with art",
            HighTerm: "Appreciative of art",
            LowDescription: "You are less concerned with artistic or creative activities than most people who participated in our surveys",
            HighDescription: "You enjoy beauty and seek out creative experiences"
        },
        Emotionality: {
            Big5: "Openness",
            LowTerm: "Dispassionate",
            HighTerm: "Emotionally aware",
            LowDescription: "You do not frequently think about or openly express your emotions",
            HighDescription: "You are aware of your feelings and how to express them"
        },
        Adventurousness: {
            Big5: "Openness",
            LowTerm: "Consistent",
            HighTerm: "Adventurous",
            LowDescription: "You enjoy familiar routines and prefer not to deviate from them",
            HighDescription: "You are eager to experience new things"
        },
        Intellect: {
            Big5: "Openness",
            LowTerm: "Concrete",
            HighTerm: "Philosophical",
            LowDescription: "You prefer dealing with the world as it is, rarely considering abstract ideas",
            HighDescription: "You are open to and intrigued by new ideas and love to explore them"
        },
        Liberalism: {
            Big5: "Openness",
            LowTerm: "Respectful of authority",
            HighTerm: "Authority-challenging",
            LowDescription: "You prefer following with tradition in order to maintain a sense of stability",
            HighDescription: "You prefer to challenge authority and traditional values to help bring about positive changes"
        }
    },
    needs: {
        Challenge: ["prestige", "competition", "glory"],
        Closeness: ["belongingness", "nostalgia", "intimacy"],
        Curiosity: ["discovery", "mastery", "gaining knowledge"],
        Excitement: ["revelry", "anticipation", "exhiliration"],
        Harmony: ["well-being", "courtesy", "politeness"],
        Ideal: ["sophistication", "spirituality", "superiority", "fulfillment"],
        Liberty: ["modernity", "expanding possibility", "escape", "spontaneity", "novelty"],
        Love: ["connectedness", "affinity"],
        Practicality: ["efficiency", "practicality", "high value", "convenience"],
        "Self-expression": ["self-expression", "personal empowerment", "personal strength"],
        Stability: ["stability", "authenticity", "trustworthiness"],
        Structure: ["organization", "straightforwardness", "clarity", "reliability"]
    },
    phrases: {
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
    traits: {
        Agreeableness_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "inconsiderate"
        }, {
            perceived_negatively: true,
            word: "impolite"
        }, {
            perceived_negatively: true,
            word: "distrustful"
        }, {
            perceived_negatively: true,
            word: "uncooperative"
        }, {
            perceived_negatively: true,
            word: "thoughtless"
        }],
        Agreeableness_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "strict"
        }, {
            perceived_negatively: false,
            word: "rigid"
        }, {
            perceived_negatively: true,
            word: "stern"
        }],
        Agreeableness_minus_Extraversion_minus: [{
            perceived_negatively: true,
            word: "cynical"
        }, {
            perceived_negatively: true,
            word: "wary of others"
        }, {
            perceived_negatively: true,
            word: "seclusive"
        }, {
            perceived_negatively: true,
            word: "detached"
        }, {
            perceived_negatively: true,
            word: "impersonal"
        }, {
            perceived_negatively: true,
            word: "glum"
        }],
        Agreeableness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "bullheaded"
        }, {
            perceived_negatively: true,
            word: "abrupt"
        }, {
            perceived_negatively: true,
            word: "crude"
        }, {
            perceived_negatively: true,
            word: "combative"
        }, {
            perceived_negatively: true,
            word: "rough"
        }, {
            perceived_negatively: false,
            word: "sly"
        }, {
            perceived_negatively: true,
            word: "manipulative"
        }, {
            perceived_negatively: true,
            word: "gruff"
        }, {
            perceived_negatively: true,
            word: "devious"
        }],
        Agreeableness_minus_Neuroticism_minus: [{
            perceived_negatively: true,
            word: "insensitive"
        }, {
            perceived_negatively: true,
            word: "unaffectionate"
        }, {
            perceived_negatively: true,
            word: "passionless"
        }, {
            perceived_negatively: true,
            word: "unemotional"
        }],
        Agreeableness_minus_Neuroticism_plus: [{
            perceived_negatively: true,
            word: "critical"
        }, {
            perceived_negatively: true,
            word: "selfish"
        }, {
            perceived_negatively: true,
            word: "ill-tempered"
        }, {
            perceived_negatively: true,
            word: "antagonistic"
        }, {
            perceived_negatively: true,
            word: "grumpy"
        }, {
            perceived_negatively: true,
            word: "bitter"
        }, {
            perceived_negatively: true,
            word: "disagreeable"
        }, {
            perceived_negatively: true,
            word: "demanding"
        }],
        Agreeableness_minus_Openness_minus: [{
            perceived_negatively: true,
            word: "coarse"
        }, {
            perceived_negatively: true,
            word: "tactless"
        }, {
            perceived_negatively: true,
            word: "curt"
        }, {
            perceived_negatively: true,
            word: "narrow-minded"
        }, {
            perceived_negatively: true,
            word: "callous"
        }, {
            perceived_negatively: true,
            word: "ruthless"
        }, {
            perceived_negatively: true,
            word: "uncharitable"
        }, {
            perceived_negatively: true,
            word: "vindictive"
        }],
        Agreeableness_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "shrewd"
        }, {
            perceived_negatively: false,
            word: "eccentric"
        }, {
            perceived_negatively: false,
            word: "individualistic"
        }],
        Agreeableness_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "unpretentious"
        }, {
            perceived_negatively: false,
            word: "self-effacing"
        }],
        Agreeableness_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "helpful"
        }, {
            perceived_negatively: false,
            word: "cooperative"
        }, {
            perceived_negatively: false,
            word: "considerate"
        }, {
            perceived_negatively: false,
            word: "respectful"
        }, {
            perceived_negatively: false,
            word: "polite"
        }, {
            perceived_negatively: false,
            word: "reasonable"
        }, {
            perceived_negatively: false,
            word: "courteous"
        }, {
            perceived_negatively: false,
            word: "thoughtful"
        }, {
            perceived_negatively: false,
            word: "loyal"
        }, {
            perceived_negatively: false,
            word: "moral"
        }],
        Agreeableness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "soft-hearted"
        }, {
            perceived_negatively: false,
            word: "agreeable"
        }, {
            perceived_negatively: false,
            word: "obliging"
        }, {
            perceived_negatively: false,
            word: "humble"
        }, {
            perceived_negatively: true,
            word: "lenient"
        }],
        Agreeableness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "effervescent"
        }, {
            perceived_negatively: false,
            word: "happy"
        }, {
            perceived_negatively: false,
            word: "friendly"
        }, {
            perceived_negatively: false,
            word: "merry"
        }, {
            perceived_negatively: false,
            word: "jovial"
        }, {
            perceived_negatively: false,
            word: "humorous"
        }],
        Agreeableness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "generous"
        }, {
            perceived_negatively: false,
            word: "pleasant"
        }, {
            perceived_negatively: false,
            word: "tolerant"
        }, {
            perceived_negatively: false,
            word: "peaceful"
        }, {
            perceived_negatively: false,
            word: "flexible"
        }, {
            perceived_negatively: false,
            word: "easy-going"
        }, {
            perceived_negatively: false,
            word: "fair"
        }, {
            perceived_negatively: false,
            word: "charitable"
        }, {
            perceived_negatively: false,
            word: "trustful"
        }],
        Agreeableness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "sentimental"
        }, {
            perceived_negatively: false,
            word: "affectionate"
        }, {
            perceived_negatively: false,
            word: "sensitive"
        }, {
            perceived_negatively: false,
            word: "soft"
        }, {
            perceived_negatively: false,
            word: "passionate"
        }, {
            perceived_negatively: false,
            word: "romantic"
        }],
        Agreeableness_plus_Openness_minus: [{
            perceived_negatively: true,
            word: "dependent"
        }, {
            perceived_negatively: true,
            word: "simple"
        }],
        Agreeableness_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "genial"
        }, {
            perceived_negatively: false,
            word: "tactful"
        }, {
            perceived_negatively: false,
            word: "diplomatic"
        }, {
            perceived_negatively: false,
            word: "deep"
        }, {
            perceived_negatively: false,
            word: "idealistic"
        }],
        Conscientiousness_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "rash"
        }, {
            perceived_negatively: true,
            word: "uncooperative"
        }, {
            perceived_negatively: true,
            word: "unreliable"
        }, {
            perceived_negatively: true,
            word: "distrustful"
        }, {
            perceived_negatively: true,
            word: "thoughtless"
        }],
        Conscientiousness_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "unpretentious"
        }, {
            perceived_negatively: false,
            word: "self-effacing"
        }],
        Conscientiousness_minus_Extraversion_minus: [{
            perceived_negatively: true,
            word: "indecisive"
        }, {
            perceived_negatively: true,
            word: "aimless"
        }, {
            perceived_negatively: false,
            word: "wishy-washy"
        }, {
            perceived_negatively: false,
            word: "noncommittal"
        }, {
            perceived_negatively: true,
            word: "unambitious"
        }],
        Conscientiousness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "unruly"
        }, {
            perceived_negatively: false,
            word: "boisterous"
        }, {
            perceived_negatively: true,
            word: "reckless"
        }, {
            perceived_negatively: true,
            word: "devil-may-care"
        }, {
            perceived_negatively: false,
            word: "demonstrative"
        }],
        Conscientiousness_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "informal"
        }, {
            perceived_negatively: false,
            word: "low-key"
        }],
        Conscientiousness_minus_Neuroticism_plus: [{
            perceived_negatively: true,
            word: "scatterbrained"
        }, {
            perceived_negatively: true,
            word: "inconsistent"
        }, {
            perceived_negatively: true,
            word: "erratic"
        }, {
            perceived_negatively: true,
            word: "forgetful"
        }, {
            perceived_negatively: true,
            word: "impulsive"
        }, {
            perceived_negatively: true,
            word: "frivolous"
        }],
        Conscientiousness_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "foolhardy"
        }, {
            perceived_negatively: true,
            word: "illogical"
        }, {
            perceived_negatively: true,
            word: "immature"
        }, {
            perceived_negatively: true,
            word: "haphazard"
        }, {
            perceived_negatively: false,
            word: "lax"
        }, {
            perceived_negatively: true,
            word: "flippant"
        }],
        Conscientiousness_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "unconventional"
        }, {
            perceived_negatively: false,
            word: "quirky"
        }],
        Conscientiousness_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "stern"
        }, {
            perceived_negatively: false,
            word: "strict"
        }, {
            perceived_negatively: false,
            word: "rigid"
        }],
        Conscientiousness_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "dependable"
        }, {
            perceived_negatively: false,
            word: "responsible"
        }, {
            perceived_negatively: false,
            word: "reliable"
        }, {
            perceived_negatively: false,
            word: "mannerly"
        }, {
            perceived_negatively: false,
            word: "considerate"
        }],
        Conscientiousness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "cautious"
        }, {
            perceived_negatively: false,
            word: "confident"
        }, {
            perceived_negatively: false,
            word: "punctual"
        }, {
            perceived_negatively: false,
            word: "formal"
        }, {
            perceived_negatively: false,
            word: "thrifty"
        }, {
            perceived_negatively: false,
            word: "principled"
        }],
        Conscientiousness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "ambitious"
        }, {
            perceived_negatively: false,
            word: "alert"
        }, {
            perceived_negatively: false,
            word: "firm"
        }, {
            perceived_negatively: false,
            word: "purposeful"
        }, {
            perceived_negatively: false,
            word: "competitive"
        }],
        Conscientiousness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "thorough"
        }, {
            perceived_negatively: false,
            word: "steady"
        }, {
            perceived_negatively: false,
            word: "consistent"
        }, {
            perceived_negatively: false,
            word: "self-disciplined"
        }, {
            perceived_negatively: false,
            word: "logical"
        }, {
            perceived_negatively: false,
            word: "decisive"
        }, {
            perceived_negatively: false,
            word: "controlled"
        }, {
            perceived_negatively: false,
            word: "concise"
        }],
        Conscientiousness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "particular"
        }, {
            perceived_negatively: true,
            word: "high-strung"
        }],
        Conscientiousness_plus_Openness_minus: [{
            perceived_negatively: false,
            word: "traditional"
        }, {
            perceived_negatively: false,
            word: "conventional"
        }],
        Conscientiousness_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "sophisticated"
        }, {
            perceived_negatively: false,
            word: "perfectionistic"
        }, {
            perceived_negatively: false,
            word: "industrious"
        }, {
            perceived_negatively: false,
            word: "dignified"
        }, {
            perceived_negatively: false,
            word: "refined"
        }, {
            perceived_negatively: false,
            word: "cultured"
        }, {
            perceived_negatively: false,
            word: "foresighted"
        }],
        Extraversion_minus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "skeptical"
        }, {
            perceived_negatively: false,
            word: "wary of others"
        }, {
            perceived_negatively: true,
            word: "seclusive"
        }, {
            perceived_negatively: true,
            word: "uncommunicative"
        }, {
            perceived_negatively: true,
            word: "unsociable"
        }, {
            perceived_negatively: true,
            word: "glum"
        }, {
            perceived_negatively: true,
            word: "detached"
        }, {
            perceived_negatively: false,
            word: "aloof"
        }],
        Extraversion_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "unaggressive"
        }, {
            perceived_negatively: false,
            word: "humble"
        }, {
            perceived_negatively: false,
            word: "submissive"
        }, {
            perceived_negatively: false,
            word: "timid"
        }, {
            perceived_negatively: false,
            word: "compliant"
        }, {
            perceived_negatively: false,
            word: "naïve"
        }],
        Extraversion_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "indirect"
        }, {
            perceived_negatively: true,
            word: "unenergetic"
        }, {
            perceived_negatively: true,
            word: "sluggish"
        }, {
            perceived_negatively: true,
            word: "nonpersistent"
        }, {
            perceived_negatively: true,
            word: "vague"
        }],
        Extraversion_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "restrained"
        }, {
            perceived_negatively: false,
            word: "serious"
        }, {
            perceived_negatively: false,
            word: "discreet"
        }, {
            perceived_negatively: false,
            word: "cautious"
        }, {
            perceived_negatively: false,
            word: "principled"
        }],
        Extraversion_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "tranquil"
        }, {
            perceived_negatively: false,
            word: "sedate"
        }, {
            perceived_negatively: false,
            word: "placid"
        }, {
            perceived_negatively: false,
            word: "impartial"
        }, {
            perceived_negatively: false,
            word: "unassuming"
        }, {
            perceived_negatively: false,
            word: "acquiescent"
        }],
        Extraversion_minus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "guarded"
        }, {
            perceived_negatively: false,
            word: "pessimistic"
        }, {
            perceived_negatively: false,
            word: "secretive"
        }, {
            perceived_negatively: true,
            word: "cowardly"
        }, {
            perceived_negatively: false,
            word: "secretive"
        }],
        Extraversion_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "somber"
        }, {
            perceived_negatively: true,
            word: "meek"
        }, {
            perceived_negatively: true,
            word: "unadventurous"
        }, {
            perceived_negatively: false,
            word: "passive"
        }, {
            perceived_negatively: true,
            word: "apathetic"
        }, {
            perceived_negatively: false,
            word: "docile"
        }],
        Extraversion_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "inner-directed"
        }, {
            perceived_negatively: false,
            word: "introspective"
        }, {
            perceived_negatively: false,
            word: "meditative"
        }, {
            perceived_negatively: false,
            word: "contemplating"
        }, {
            perceived_negatively: false,
            word: "self-examining"
        }],
        Extraversion_plus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "opinionated"
        }, {
            perceived_negatively: true,
            word: "forceful"
        }, {
            perceived_negatively: true,
            word: "domineering"
        }, {
            perceived_negatively: true,
            word: "boastful"
        }, {
            perceived_negatively: true,
            word: "bossy"
        }, {
            perceived_negatively: false,
            word: "dominant"
        }, {
            perceived_negatively: false,
            word: "cunning"
        }],
        Extraversion_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "social"
        }, {
            perceived_negatively: false,
            word: "energetic"
        }, {
            perceived_negatively: false,
            word: "enthusiastic"
        }, {
            perceived_negatively: false,
            word: "communicative"
        }, {
            perceived_negatively: false,
            word: "vibrant"
        }, {
            perceived_negatively: false,
            word: "spirited"
        }, {
            perceived_negatively: false,
            word: "magnetic"
        }, {
            perceived_negatively: false,
            word: "zestful"
        }],
        Extraversion_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "boisterous"
        }, {
            perceived_negatively: false,
            word: "mischievous"
        }, {
            perceived_negatively: false,
            word: "exhibitionistic"
        }, {
            perceived_negatively: false,
            word: "gregarious"
        }, {
            perceived_negatively: false,
            word: "demonstrative"
        }],
        Extraversion_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "active"
        }, {
            perceived_negatively: false,
            word: "competitive"
        }, {
            perceived_negatively: false,
            word: "persistent"
        }, {
            perceived_negatively: false,
            word: "ambitious"
        }, {
            perceived_negatively: false,
            word: "purposeful"
        }],
        Extraversion_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "confident"
        }, {
            perceived_negatively: false,
            word: "bold"
        }, {
            perceived_negatively: false,
            word: "assured"
        }, {
            perceived_negatively: false,
            word: "uninhibited"
        }, {
            perceived_negatively: false,
            word: "courageous"
        }, {
            perceived_negatively: false,
            word: "brave"
        }, {
            perceived_negatively: false,
            word: "self-satisfied"
        }, {
            perceived_negatively: false,
            word: "vigorous"
        }, {
            perceived_negatively: false,
            word: "strong"
        }],
        Extraversion_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "explosive"
        }, {
            perceived_negatively: true,
            word: "wordy"
        }, {
            perceived_negatively: false,
            word: "extravagant"
        }, {
            perceived_negatively: true,
            word: "volatile"
        }, {
            perceived_negatively: false,
            word: "flirtatious"
        }],
        Extraversion_plus_Openness_minus: [{
            perceived_negatively: true,
            word: "verbose"
        }, {
            perceived_negatively: true,
            word: "unscrupulous"
        }, {
            perceived_negatively: true,
            word: "pompous"
        }],
        Extraversion_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "expressive"
        }, {
            perceived_negatively: false,
            word: "candid"
        }, {
            perceived_negatively: false,
            word: "dramatic"
        }, {
            perceived_negatively: false,
            word: "spontaneous"
        }, {
            perceived_negatively: false,
            word: "witty"
        }, {
            perceived_negatively: false,
            word: "opportunistic"
        }, {
            perceived_negatively: false,
            word: "independent"
        }],
        Neuroticism_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "unemotional"
        }, {
            perceived_negatively: true,
            word: "insensitive"
        }, {
            perceived_negatively: true,
            word: "unaffectionate"
        }, {
            perceived_negatively: true,
            word: "passionless"
        }],
        Neuroticism_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "patient"
        }, {
            perceived_negatively: false,
            word: "relaxed"
        }, {
            perceived_negatively: false,
            word: "undemanding"
        }, {
            perceived_negatively: false,
            word: "down-to-earth"
        }, {
            perceived_negatively: false,
            word: "optimistic"
        }, {
            perceived_negatively: false,
            word: "conceitless"
        }, {
            perceived_negatively: false,
            word: "uncritical"
        }, {
            perceived_negatively: false,
            word: "unpretentious"
        }],
        Neuroticism_minus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "informal"
        }, {
            perceived_negatively: false,
            word: "low-key"
        }],
        Neuroticism_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "rational"
        }, {
            perceived_negatively: false,
            word: "objective"
        }, {
            perceived_negatively: false,
            word: "steady"
        }, {
            perceived_negatively: false,
            word: "logical"
        }, {
            perceived_negatively: false,
            word: "decisive"
        }, {
            perceived_negatively: false,
            word: "poised"
        }, {
            perceived_negatively: false,
            word: "concise"
        }, {
            perceived_negatively: false,
            word: "thorough"
        }, {
            perceived_negatively: false,
            word: "economical"
        }, {
            perceived_negatively: false,
            word: "self-disciplined"
        }],
        Neuroticism_minus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "unassuming"
        }, {
            perceived_negatively: true,
            word: "unexcitable"
        }, {
            perceived_negatively: false,
            word: "placid"
        }, {
            perceived_negatively: false,
            word: "tranquil"
        }],
        Neuroticism_minus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "unselfconscious"
        }, {
            perceived_negatively: false,
            word: "weariless"
        }, {
            perceived_negatively: false,
            word: "indefatigable"
        }],
        Neuroticism_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "imperturbable"
        }, {
            perceived_negatively: true,
            word: "insensitive"
        }],
        Neuroticism_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "heartfelt"
        }, {
            perceived_negatively: false,
            word: "versatile"
        }, {
            perceived_negatively: false,
            word: "creative"
        }, {
            perceived_negatively: false,
            word: "intellectual"
        }, {
            perceived_negatively: false,
            word: "insightful"
        }],
        Neuroticism_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "temperamental"
        }, {
            perceived_negatively: true,
            word: "irritable"
        }, {
            perceived_negatively: true,
            word: "quarrelsome"
        }, {
            perceived_negatively: true,
            word: "impatient"
        }, {
            perceived_negatively: true,
            word: "grumpy"
        }, {
            perceived_negatively: true,
            word: "crabby"
        }, {
            perceived_negatively: true,
            word: "cranky"
        }],
        Neuroticism_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "emotional"
        }, {
            perceived_negatively: true,
            word: "gullible"
        }, {
            perceived_negatively: false,
            word: "affectionate"
        }, {
            perceived_negatively: false,
            word: "sensitive"
        }, {
            perceived_negatively: false,
            word: "soft"
        }],
        Neuroticism_plus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "compulsive"
        }, {
            perceived_negatively: true,
            word: "nosey"
        }, {
            perceived_negatively: true,
            word: "self-indulgent"
        }, {
            perceived_negatively: true,
            word: "forgetful"
        }, {
            perceived_negatively: true,
            word: "impulsive"
        }],
        Neuroticism_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "particular"
        }, {
            perceived_negatively: true,
            word: "high-strung"
        }],
        Neuroticism_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "guarded"
        }, {
            perceived_negatively: true,
            word: "fretful"
        }, {
            perceived_negatively: true,
            word: "insecure"
        }, {
            perceived_negatively: true,
            word: "pessimistic"
        }, {
            perceived_negatively: false,
            word: "secretive"
        }, {
            perceived_negatively: true,
            word: "fearful"
        }, {
            perceived_negatively: true,
            word: "negativistic"
        }, {
            perceived_negatively: false,
            word: "self-critical"
        }],
        Neuroticism_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: true,
            word: "wordy"
        }, {
            perceived_negatively: false,
            word: "flirtatious"
        }, {
            perceived_negatively: true,
            word: "explosive"
        }, {
            perceived_negatively: false,
            word: "extravagant"
        }, {
            perceived_negatively: true,
            word: "volatile"
        }],
        Neuroticism_plus_Openness_minus: [{
            perceived_negatively: false,
            word: "easily rattled"
        }, {
            perceived_negatively: false,
            word: "easily irked"
        }, {
            perceived_negatively: false,
            word: "apprehensive"
        }],
        Neuroticism_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: false,
            word: "passionate"
        }, {
            perceived_negatively: false,
            word: "sensual"
        }],
        Openness_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "coarse"
        }, {
            perceived_negatively: true,
            word: "tactless"
        }, {
            perceived_negatively: true,
            word: "curt"
        }, {
            perceived_negatively: true,
            word: "narrow-minded"
        }, {
            perceived_negatively: true,
            word: "callous"
        }],
        Openness_minus_Agreeableness_plus: [{
            perceived_negatively: true,
            word: "simple"
        }, {
            perceived_negatively: true,
            word: "dependent"
        }],
        Openness_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "shortsighted"
        }, {
            perceived_negatively: false,
            word: "foolhardy"
        }, {
            perceived_negatively: true,
            word: "illogical"
        }, {
            perceived_negatively: true,
            word: "immature"
        }, {
            perceived_negatively: true,
            word: "haphazard"
        }, {
            perceived_negatively: false,
            word: "lax"
        }, {
            perceived_negatively: true,
            word: "flippant"
        }],
        Openness_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "conventional"
        }, {
            perceived_negatively: false,
            word: "traditional"
        }],
        Openness_minus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "predictable"
        }, {
            perceived_negatively: true,
            word: "unimaginative"
        }, {
            perceived_negatively: false,
            word: "somber"
        }, {
            perceived_negatively: true,
            word: "apathetic"
        }, {
            perceived_negatively: true,
            word: "unadventurous"
        }],
        Openness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "verbose"
        }, {
            perceived_negatively: true,
            word: "unscrupulous"
        }, {
            perceived_negatively: true,
            word: "pompous"
        }],
        Openness_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "imperturbable"
        }, {
            perceived_negatively: true,
            word: "insensitive"
        }],
        Openness_minus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "easily rattled"
        }, {
            perceived_negatively: false,
            word: "easily irked"
        }, {
            perceived_negatively: false,
            word: "apprehensive"
        }],
        Openness_plus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "shrewd"
        }, {
            perceived_negatively: false,
            word: "eccentric"
        }, {
            perceived_negatively: false,
            word: "individualistic"
        }],
        Openness_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "idealistic"
        }, {
            perceived_negatively: false,
            word: "diplomatic"
        }, {
            perceived_negatively: false,
            word: "deep"
        }, {
            perceived_negatively: false,
            word: "tactful"
        }, {
            perceived_negatively: false,
            word: "genial"
        }],
        Openness_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "unconventional"
        }, {
            perceived_negatively: false,
            word: "quirky"
        }],
        Openness_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "analytical"
        }, {
            perceived_negatively: false,
            word: "perceptive"
        }, {
            perceived_negatively: false,
            word: "informative"
        }, {
            perceived_negatively: false,
            word: "articulate"
        }, {
            perceived_negatively: false,
            word: "dignified"
        }, {
            perceived_negatively: false,
            word: "cultured"
        }],
        Openness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "introspective"
        }, {
            perceived_negatively: false,
            word: "meditative"
        }, {
            perceived_negatively: false,
            word: "contemplating"
        }, {
            perceived_negatively: false,
            word: "self-examining"
        }, {
            perceived_negatively: false,
            word: "inner-directed"
        }],
        Openness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "worldly"
        }, {
            perceived_negatively: false,
            word: "theatrical"
        }, {
            perceived_negatively: false,
            word: "eloquent"
        }, {
            perceived_negatively: false,
            word: "inquisitive"
        }, {
            perceived_negatively: false,
            word: "intense"
        }],
        Openness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "creative"
        }, {
            perceived_negatively: false,
            word: "intellectual"
        }, {
            perceived_negatively: false,
            word: "insightful"
        }, {
            perceived_negatively: false,
            word: "versatile"
        }, {
            perceived_negatively: false,
            word: "inventive"
        }],
        Openness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "passionate"
        }, {
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: false,
            word: "sensual"
        }]
    },
    values: {
        Hedonism: [{
            Term: "Taking pleasure in life",
            LowDescription: "You prefer activities with a purpose greater than just personal enjoyment",
            HighDescription: "You are highly motivated to enjoy life to its fullest"
        }],
        "Self-transcendence": [{
            Term: "Helping others",
            LowDescription: "You think people can handle their own business without interference",
            HighDescription: "You think it is important to take care of the people around you"
        }, {
            Term: "Fairness",
            LowDescription: "You believe that people create their own opportunities",
            HighDescription: "You believe in social justice and equality for all"
        }, {
            Term: "Social justice",
            LowDescription: "You believe that people create their own opportunities",
            HighDescription: "You believe in social justice and equality for all"
        }, {
            Term: "Equality",
            LowDescription: "You believe that people create their own opportunities",
            HighDescription: "You believe in social justice and equality for all"
        }, {
            Term: "Community service",
            LowDescription: "You think people can handle their own business without interference",
            HighDescription: "You think it is important to take care of the people around you"
        }],
        Conservation: [{
            Term: "Tradition",
            LowDescription: "You care more about making your own path than following what others have done",
            HighDescription: "You highly respect the groups you belong to and follow their guidance"
        }, {
            Term: "Harmony",
            LowDescription: "You decide what is right based on your beliefs, not what other people think",
            HighDescription: "You know rules are there for a reason, and you try never to break them"
        }, {
            Term: "Humility",
            LowDescription: "You decide what is right based on your beliefs, not what other people think",
            HighDescription: "You see worth in deferring to others"
        }, {
            Term: "Social norms",
            LowDescription: "You decide what is right based on your beliefs, not what other people think",
            HighDescription: "You know rules are there for a reason, and you try never to break them"
        }, {
            Term: "Security",
            LowDescription: "You believe that security is worth sacrificing to achieve other goals",
            HighDescription: "You believe that safety and security are important things to safeguard"
        }, {
            Term: "Safety",
            LowDescription: "You believe that safety is worth sacrificing to achieve other goals",
            HighDescription: "You believe that safety and security are important things to safeguard"
        }],
        "Openness-to-change": [{
            Term: "Independence",
            LowDescription: "You welcome when others direct your activities for you",
            HighDescription: "You like to set your own goals to decide how to best achieve them"
        }, {
            Term: "Excitement",
            LowDescription: "You would rather stick with things you already know you like than risk trying something new and risky",
            HighDescription: "You are eager to search out new and exciting experiences"
        }, {
            Term: "Creativity",
            LowDescription: "You would rather stick with things you already know you like than risk trying something new and risky",
            HighDescription: "You are eager to search out new and exciting experiences"
        }, {
            Term: "Curiosity",
            LowDescription: "You would rather stick with things you already know you like than risk trying something new and risky",
            HighDescription: "You are eager to search out new and exciting experiences"
        }, {
            Term: "Self-direction",
            LowDescription: "You welcome when others direct your activities for you",
            HighDescription: "You like to set your own goals to decide how to best achieve them"
        }, {
            Term: "Freedom",
            LowDescription: "You welcome when others direct your activities for you",
            HighDescription: "You like to set your own goals to decide how to best achieve them"
        }],
        "Self-enhancement": [{
            Term: "Achieving success",
            LowDescription: "You make decisions with little regard for how they show off your talents",
            HighDescription: "You seek out opportunities to improve yourself and demonstrate that you are a capable person"
        }, {
            Term: "Gaining social status",
            LowDescription: "You are comfortable with your social status and don't feel a strong need to improve it",
            HighDescription: "You put substantial effort into improving your status and public image"
        }, {
            Term: "Ambition",
            LowDescription: "You are comfortable with your social status and don't feel a strong need to improve it",
            HighDescription: "You feel it is important to push forward towards goals"
        }, {
            Term: "High achievement",
            LowDescription: "You make decisions with little regard for how they show off your talents",
            HighDescription: "You seek out opportunities to improve yourself and demonstrate that you are a capable person"
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

"use strict";

module.exports = {
    facets: {
        "Artistic-interests": {
            HighTerm: "Una persona que aprecia el arte",
            Big5: "Apertura a experiencias",
            HighDescription: "Disfruta de la belleza y busca experiencias creativas",
            LowDescription: "Le interesan menos las actividades artísticas o creativas que la mayoría de las personas que participaron de nuestras encuestas",
            LowTerm: "Una persona desinteresada por el arte"
        },
        Dutifulness: {
            HighTerm: "Una persona que cumple con su deber",
            Big5: "Responsabilidad",
            HighDescription: "Toma las reglas y las obligaciones seriamente, aún cuando son inconvenientes",
            LowDescription: "Hace lo que quiere sin importar las reglas y las obligaciones",
            LowTerm: "Despreocupado"
        },
        Cooperation: {
            HighTerm: "Acomodaticio",
            Big5: "Afabilidad",
            HighDescription: "Es fácil de complacer e intenta evitar posibles confrontaciones",
            LowDescription: "No te importa contradecir a los demás",
            LowTerm: "Contrario"
        },
        "Self-consciousness": {
            HighTerm: "Consciente de sí mismo",
            Big5: "Rango emocional",
            HighDescription: "Es sensible a lo que las demás personas podrían estar pensando acerca de usted",
            LowDescription: "Es difícil de avergonzar y confía en sí mismo la mayor parte del tiempo",
            LowTerm: "Confiado"
        },
        Orderliness: {
            HighTerm: "Organizado",
            Big5: "Responsabilidad",
            HighDescription: "Siente una fuerte necesidad de mantener una vida estructurada",
            LowDescription: "No le dedica mucho tiempo a organizarse en su vida diaria",
            LowTerm: "Desestructurado"
        },
        Sympathy: {
            HighTerm: "Empático",
            Big5: "Afabilidad",
            HighDescription: "Siente lo que otros sienten y es compasivo con ellos",
            LowDescription: "Cree que las personas deberían confiar más en sí mismos que en otras personas",
            LowTerm: "Una persona de gran fortaleza"
        },
        "Activity-level": {
            HighTerm: "Energético",
            Big5: "Extraversión",
            HighDescription: "Disfruta llevar un ritmo de vida acelerado, una agenda ocupada con muchas actividades",
            LowDescription: "Aprecia llevar un ritmo de vida relajado",
            LowTerm: "Relajado"
        },
        "Self-efficacy": {
            HighTerm: "Seguro de sí mismo",
            Big5: "Responsabilidad",
            HighDescription: "Siente que tiene la habilidad de triunfar en las tareas que se propone realizar",
            LowDescription: "Frecuentemente duda acerca de su habilidad para alcanzar sus metas",
            LowTerm: "Inseguro de sí misma"
        },
        "Self-discipline": {
            HighTerm: "Persistente",
            Big5: "Responsabilidad",
            HighDescription: "Puede hacer frente y llevar a cabo tareas difíciles",
            LowDescription: "Le da trabajo llevar adelante tareas difíciles por un largo periodo de tiempo",
            LowTerm: "Intermitente"
        },
        Altruism: {
            HighTerm: "Altruista",
            Big5: "Afabilidad",
            HighDescription: "Se siente realizado ayudando a otros y dejará sus cosas de lado para hacerlo",
            LowDescription: "Está más enfocado en cuidar de usted mismo que en dedicar tiempo a otras personas",
            LowTerm: "Individualista"
        },
        Cautiousness: {
            HighTerm: "Prudente",
            Big5: "Responsabilidad",
            HighDescription: "Piensa cuidadosamente acerca de sus decisiones antes de tomarlas",
            LowDescription: "Prefiere tomar acción inmediatamente antes que invertir tiempo deliberando qué decisión tomar",
            LowTerm: "Audaz"
        },
        Morality: {
            HighTerm: "Intransigente",
            Big5: "Afabilidad",
            HighDescription: "Piensa que está mal tomar ventaja de los demás para avanzar",
            LowDescription: "Utiliza cualquier medio posible para conseguir lo que quiere y está cómodo con ello",
            LowTerm: "Una persona comprometida"
        },
        Anxiety: {
            HighTerm: "Propenso a preocuparse",
            Big5: "Rango emocional",
            HighDescription: "Tiende a preocuparse acerca de las cosas que podrían pasar",
            LowDescription: "Tiende a sentirse tranquilo y a confiar en sí mismo",
            LowTerm: "Seguro de sí mismo"
        },
        Emotionality: {
            HighTerm: "Emocionalmente consciente",
            Big5: "Apertura a experiencias",
            HighDescription: "Es consciente de sus sentimientos y de cómo expresarlos",
            LowDescription: "No piensa frecuentemente acerca de sus emociones ni las expresa abiertamente",
            LowTerm: "Desapasionado"
        },
        Vulnerability: {
            HighTerm: "Susceptible al estrés",
            Big5: "Rango emocional",
            HighDescription: "Se abruma fácilmente en situaciones de estrés",
            LowDescription: "Maneja eventos inesperados con calma y efectivamente",
            LowTerm: "Una persona que mantiene la calma bajo presión"
        },
        Immoderation: {
            HighTerm: "Hedonista",
            Big5: "Rango emocional",
            HighDescription: "Siente fuertemente sus deseos y es fácilmente tentado por ellos",
            LowDescription: "Controla sus deseos, los cuales no son particularmente intensos",
            LowTerm: "Sereno"
        },
        Friendliness: {
            HighTerm: "Extrovertido",
            Big5: "Extraversión",
            HighDescription: "Hace amigos fácilmente y se siente cómodo estando con otras personas",
            LowDescription: "Es una persona reservada y no deja a muchas personas entrar",
            LowTerm: "Reservado"
        },
        "Achievement-striving": {
            HighTerm: "Una persona motivada",
            Big5: "Responsabilidad",
            HighDescription: "Se propone grandes metas y trabaja duro para alcanzarlas",
            LowDescription: "Está conforme con sus logros y no siente la necesidad de ponerse metas más ambiciosas",
            LowTerm: "Una persona satisfecha"
        },
        Modesty: {
            HighTerm: "Modesto",
            Big5: "Afabilidad",
            HighDescription: "Se siente cómodo siendo el centro de atención",
            LowDescription: "Se tiene una estima alta, se encuentra satisfecho con quién es",
            LowTerm: "Orgulloso"
        },
        "Excitement-seeking": {
            HighTerm: "Una persona que busca la emoción",
            Big5: "Extraversión",
            HighDescription: "Le emociona tomar riesgos y se aburre si no se ve envuelto en mucha acción",
            LowDescription: "Prefiere las actividades tranquilas, pacíficas y seguras",
            LowTerm: "Una persona que busca la calma"
        },
        Assertiveness: {
            HighTerm: "Asertivo",
            Big5: "Extraversión",
            HighDescription: "Tiende a expresarse y a hacerse cargo de las situaciones, y se encuentra cómodo liderando grupos",
            LowDescription: "Prefiere escuchar antes que hablar, especialmente en situaciones de grupo",
            LowTerm: "Callado"
        },
        Adventurousness: {
            HighTerm: "Audaz",
            Big5: "Apertura a experiencias",
            HighDescription: "Está deseoso de tener nuevas experiencias",
            LowDescription: "Disfruta de las rutinas familiares y prefiere no desviarse de ellas",
            LowTerm: "Consistente"
        },
        Gregariousness: {
            HighTerm: "Sociable",
            Big5: "Extraversión",
            HighDescription: "Disfruta estando en compañía de otros",
            LowDescription: "Tiene un fuerte deseo de tener tiempo para usted mismo",
            LowTerm: "Independiente"
        },
        Cheerfulness: {
            HighTerm: "Alegre",
            Big5: "Extraversión",
            HighDescription: "Es una persona alegre y comparte esa alegría con el mundo",
            LowDescription: "Generalmente es serio y no hace muchas bromas",
            LowTerm: "Solemne"
        },
        Imagination: {
            HighTerm: "Imaginativo",
            Big5: "Apertura a experiencias",
            HighDescription: "Su imaginación vuela libre",
            LowDescription: "Prefiere hechos antes que la fantasía",
            LowTerm: "Una persona con los pies en la tierra"
        },
        Depression: {
            HighTerm: "Melancólico",
            Big5: "Rango emocional",
            HighDescription: "Piensa bastante seguido en las cosas con las que está disconforme",
            LowDescription: "Generalmente se acepta a usted mismo tal cual es",
            LowTerm: "Una persona satisfecha"
        },
        Anger: {
            HighTerm: "Intenso",
            Big5: "Rango emocional",
            HighDescription: "Tiene un temperamento fuerte, especialmente cuando las cosas no funcionan como espera",
            LowDescription: "Es difícil hacerle enojar",
            LowTerm: "Apacible"
        },
        Trust: {
            HighTerm: "Una persona que confía en los demás",
            Big5: "Afabilidad",
            HighDescription: "Cree lo mejor de los demás y confía fácilmente en las personas",
            LowDescription: "Se cuida de las intenciones de los demás y no confía fácilmente",
            LowTerm: "Cuidadoso con los demás"
        },
        Intellect: {
            HighTerm: "Filosófico",
            Big5: "Apertura a experiencias",
            HighDescription: "Está abierto a nuevas ideas, le intrigan y ama explorarlas",
            LowDescription: "Prefiere lidiar con el mundo tal cual es, raramente considerando ideas abstractas",
            LowTerm: "Concreto"
        },
        Liberalism: {
            HighTerm: "Desafiante ante la autoridad",
            Big5: "Apertura a experiencias",
            HighDescription: "Prefiere desafiar a la autoridad y  a los valores tradicionales para lograr cambios positivos",
            LowDescription: "Prefiere seguir tradiciones para mantener una sensación de estabilidad",
            LowTerm: "Respetuoso de la autoridad"
        }
    },
    needs: {
        Stability: ["estabilidad", "autenticidad", "integridad"],
        Practicality: ["eficiencia", "practicidad", "valor agregado", "conveniencia"],
        Love: ["afinidad", "conexión"],
        "Self-expression": ["auto-expresión", "empoderamiento personal", "fortaleza personal"],
        Challenge: ["prestigio", "competencia", "gloria"],
        Closeness: ["pertenencia", "nostalgia", "intimidad"],
        Liberty: ["modernidad", "expansión de posibilidades", "poder escapar", "espontaneidad", "novedad"],
        Excitement: ["regocijo", "anticipación", "cebración"],
        Ideal: ["sofisticación", "espiritualidad", "superioridad", "realización"],
        Harmony: ["bienestar", "cortesía", "civilidad"],
        Curiosity: ["descubrimiento", "maestría", "adquisición de conocimiento"],
        Structure: ["organización", "franqueza", "claridad", "confiabilidad"]
    },
    phrases: {
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
    traits: {
        Agreeableness_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "desconsiderado"
        }, {
            perceived_negatively: true,
            word: "descortés"
        }, {
            perceived_negatively: true,
            word: "desconfiado"
        }, {
            perceived_negatively: true,
            word: "poco cooperativo"
        }, {
            perceived_negatively: true,
            word: "irreflexivo"
        }],
        Agreeableness_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "estricto"
        }, {
            perceived_negatively: false,
            word: "rígido"
        }, {
            perceived_negatively: true,
            word: "duro"
        }],
        Agreeableness_minus_Extraversion_minus: [{
            perceived_negatively: true,
            word: "cínico"
        }, {
            perceived_negatively: true,
            word: "cauto con los demás"
        }, {
            perceived_negatively: true,
            word: "solitario"
        }, {
            perceived_negatively: true,
            word: "desapegado"
        }, {
            perceived_negatively: true,
            word: "impersonal"
        }, {
            perceived_negatively: true,
            word: "sombrío"
        }],
        Agreeableness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "obstinado"
        }, {
            perceived_negatively: true,
            word: "abrupto"
        }, {
            perceived_negatively: true,
            word: "crudo"
        }, {
            perceived_negatively: true,
            word: "combativo"
        }, {
            perceived_negatively: true,
            word: "duro"
        }, {
            perceived_negatively: false,
            word: "astuto"
        }, {
            perceived_negatively: true,
            word: "manipulador"
        }, {
            perceived_negatively: true,
            word: "hosco"
        }, {
            perceived_negatively: true,
            word: "taimado"
        }],
        Agreeableness_minus_Neuroticism_minus: [{
            perceived_negatively: true,
            word: "insensible"
        }, {
            perceived_negatively: true,
            word: "poco afectuoso"
        }, {
            perceived_negatively: true,
            word: "desapasionado"
        }, {
            perceived_negatively: true,
            word: "una persona sin emociones"
        }],
        Agreeableness_minus_Neuroticism_plus: [{
            perceived_negatively: true,
            word: "crítico"
        }, {
            perceived_negatively: true,
            word: "egoísta"
        }, {
            perceived_negatively: true,
            word: "de mal genio"
        }, {
            perceived_negatively: true,
            word: "antagonista"
        }, {
            perceived_negatively: true,
            word: "gruñón"
        }, {
            perceived_negatively: true,
            word: "amargado"
        }, {
            perceived_negatively: true,
            word: "desagradable"
        }, {
            perceived_negatively: true,
            word: "exigente"
        }],
        Agreeableness_minus_Openness_minus: [{
            perceived_negatively: true,
            word: "tosco"
        }, {
            perceived_negatively: true,
            word: "una persona sin tacto"
        }, {
            perceived_negatively: true,
            word: "brusco"
        }, {
            perceived_negatively: true,
            word: "cerrado"
        }, {
            perceived_negatively: true,
            word: "áspero"
        }, {
            perceived_negatively: true,
            word: "implacable"
        }, {
            perceived_negatively: true,
            word: "poco caritativo"
        }, {
            perceived_negatively: true,
            word: "vengativo"
        }],
        Agreeableness_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "perspicaz"
        }, {
            perceived_negatively: false,
            word: "excéntrico"
        }, {
            perceived_negatively: false,
            word: "individualista"
        }],
        Agreeableness_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "sobrio"
        }, {
            perceived_negatively: false,
            word: "modesto"
        }],
        Agreeableness_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "servicial"
        }, {
            perceived_negatively: false,
            word: "cooperativo"
        }, {
            perceived_negatively: false,
            word: "considerado"
        }, {
            perceived_negatively: false,
            word: "respetuoso"
        }, {
            perceived_negatively: false,
            word: "cortés"
        }, {
            perceived_negatively: false,
            word: "sensato"
        }, {
            perceived_negatively: false,
            word: "atento"
        }, {
            perceived_negatively: false,
            word: "considerado"
        }, {
            perceived_negatively: false,
            word: "leal"
        }, {
            perceived_negatively: false,
            word: "moral"
        }],
        Agreeableness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "conmovible"
        }, {
            perceived_negatively: false,
            word: "agradable"
        }, {
            perceived_negatively: false,
            word: "servicial"
        }, {
            perceived_negatively: false,
            word: "humilde"
        }, {
            perceived_negatively: true,
            word: "indulgente"
        }],
        Agreeableness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "efervescente"
        }, {
            perceived_negatively: false,
            word: "alegre"
        }, {
            perceived_negatively: false,
            word: "amistoso"
        }, {
            perceived_negatively: false,
            word: "alegre"
        }, {
            perceived_negatively: false,
            word: "jovial"
        }, {
            perceived_negatively: false,
            word: "jocoso"
        }],
        Agreeableness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "generoso"
        }, {
            perceived_negatively: false,
            word: "agradable"
        }, {
            perceived_negatively: false,
            word: "tolerante"
        }, {
            perceived_negatively: false,
            word: "pacífico"
        }, {
            perceived_negatively: false,
            word: "flexible"
        }, {
            perceived_negatively: false,
            word: "fácil de tratar"
        }, {
            perceived_negatively: false,
            word: "justo"
        }, {
            perceived_negatively: false,
            word: "caritativo"
        }, {
            perceived_negatively: false,
            word: "confiable"
        }],
        Agreeableness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "sentimental"
        }, {
            perceived_negatively: false,
            word: "cariñoso"
        }, {
            perceived_negatively: false,
            word: "sensible"
        }, {
            perceived_negatively: false,
            word: "tierno"
        }, {
            perceived_negatively: false,
            word: "apasionado"
        }, {
            perceived_negatively: false,
            word: "romántico"
        }],
        Agreeableness_plus_Openness_minus: [{
            perceived_negatively: true,
            word: "dependiente"
        }, {
            perceived_negatively: true,
            word: "simple"
        }],
        Agreeableness_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "amistoso"
        }, {
            perceived_negatively: false,
            word: "una persona con tacto"
        }, {
            perceived_negatively: false,
            word: "diplomático"
        }, {
            perceived_negatively: false,
            word: "profundo"
        }, {
            perceived_negatively: false,
            word: "idealista"
        }],
        Conscientiousness_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "arrebatado"
        }, {
            perceived_negatively: true,
            word: "poco cooperativo"
        }, {
            perceived_negatively: true,
            word: "poco fiable"
        }, {
            perceived_negatively: true,
            word: "desconfiado"
        }, {
            perceived_negatively: true,
            word: "irreflexivo"
        }],
        Conscientiousness_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "poco pretencioso"
        }, {
            perceived_negatively: false,
            word: "modesto"
        }],
        Conscientiousness_minus_Extraversion_minus: [{
            perceived_negatively: true,
            word: "indeciso"
        }, {
            perceived_negatively: true,
            word: "una persona sin propósito"
        }, {
            perceived_negatively: false,
            word: "una persona sin carácter"
        }, {
            perceived_negatively: false,
            word: "una persona sin compromiso"
        }, {
            perceived_negatively: true,
            word: "poco ambicioso"
        }],
        Conscientiousness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "revoltoso"
        }, {
            perceived_negatively: false,
            word: "bullicioso"
        }, {
            perceived_negatively: true,
            word: "temerario"
        }, {
            perceived_negatively: true,
            word: "tumultuoso"
        }, {
            perceived_negatively: false,
            word: "demostrativo"
        }],
        Conscientiousness_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "informal"
        }, {
            perceived_negatively: false,
            word: "de bajo perfil"
        }],
        Conscientiousness_minus_Neuroticism_plus: [{
            perceived_negatively: true,
            word: "atolondrado"
        }, {
            perceived_negatively: true,
            word: "inconsistente"
        }, {
            perceived_negatively: true,
            word: "errático"
        }, {
            perceived_negatively: true,
            word: "olvidadizo"
        }, {
            perceived_negatively: true,
            word: "impulsivo"
        }, {
            perceived_negatively: true,
            word: "frívolo"
        }],
        Conscientiousness_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "temerario"
        }, {
            perceived_negatively: true,
            word: "ilógico"
        }, {
            perceived_negatively: true,
            word: "inmaduro"
        }, {
            perceived_negatively: true,
            word: "azaroso"
        }, {
            perceived_negatively: false,
            word: "laxo"
        }, {
            perceived_negatively: true,
            word: "indisciplinado"
        }],
        Conscientiousness_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "poco convencional"
        }, {
            perceived_negatively: false,
            word: "peculiar"
        }],
        Conscientiousness_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "inflexible"
        }, {
            perceived_negatively: false,
            word: "estricto"
        }, {
            perceived_negatively: false,
            word: "rígido"
        }],
        Conscientiousness_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "confiable"
        }, {
            perceived_negatively: false,
            word: "responsable"
        }, {
            perceived_negatively: false,
            word: "seguro"
        }, {
            perceived_negatively: false,
            word: "educado"
        }, {
            perceived_negatively: false,
            word: "considerado"
        }],
        Conscientiousness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "cauto"
        }, {
            perceived_negatively: false,
            word: "seguro"
        }, {
            perceived_negatively: false,
            word: "exacto"
        }, {
            perceived_negatively: false,
            word: "formal"
        }, {
            perceived_negatively: false,
            word: "ahorrativo"
        }, {
            perceived_negatively: false,
            word: "principista"
        }],
        Conscientiousness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "ambicioso"
        }, {
            perceived_negatively: false,
            word: "alerta"
        }, {
            perceived_negatively: false,
            word: "firme"
        }, {
            perceived_negatively: false,
            word: "decidido"
        }, {
            perceived_negatively: false,
            word: "competitivo"
        }],
        Conscientiousness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "minucioso"
        }, {
            perceived_negatively: false,
            word: "estable"
        }, {
            perceived_negatively: false,
            word: "consistente"
        }, {
            perceived_negatively: false,
            word: "disciplinado"
        }, {
            perceived_negatively: false,
            word: "lógico"
        }, {
            perceived_negatively: false,
            word: "decidido"
        }, {
            perceived_negatively: false,
            word: "controlado"
        }, {
            perceived_negatively: false,
            word: "conciso"
        }],
        Conscientiousness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "detallista"
        }, {
            perceived_negatively: true,
            word: "excitable"
        }],
        Conscientiousness_plus_Openness_minus: [{
            perceived_negatively: false,
            word: "tradicional"
        }, {
            perceived_negatively: false,
            word: "convencional"
        }],
        Conscientiousness_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "sofisticado"
        }, {
            perceived_negatively: false,
            word: "perfeccionista"
        }, {
            perceived_negatively: false,
            word: "industrioso"
        }, {
            perceived_negatively: false,
            word: "digno"
        }, {
            perceived_negatively: false,
            word: "refinado"
        }, {
            perceived_negatively: false,
            word: "culto"
        }, {
            perceived_negatively: false,
            word: "previsor"
        }],
        Extraversion_minus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "escéptico"
        }, {
            perceived_negatively: false,
            word: "cauto con los demás"
        }, {
            perceived_negatively: true,
            word: "solitario"
        }, {
            perceived_negatively: true,
            word: "poco comunicativo"
        }, {
            perceived_negatively: true,
            word: "antisocial"
        }, {
            perceived_negatively: true,
            word: "sombrío"
        }, {
            perceived_negatively: true,
            word: "desinteresado"
        }, {
            perceived_negatively: false,
            word: "apartado"
        }],
        Extraversion_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "pacífico"
        }, {
            perceived_negatively: false,
            word: "humilde"
        }, {
            perceived_negatively: false,
            word: "sumiso"
        }, {
            perceived_negatively: false,
            word: "tímido"
        }, {
            perceived_negatively: false,
            word: "obediente"
        }, {
            perceived_negatively: false,
            word: "ingenuo"
        }],
        Extraversion_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "indirecto"
        }, {
            perceived_negatively: true,
            word: "débil"
        }, {
            perceived_negatively: true,
            word: "perezoso"
        }, {
            perceived_negatively: true,
            word: "poco persistente"
        }, {
            perceived_negatively: true,
            word: "vago"
        }],
        Extraversion_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "moderado"
        }, {
            perceived_negatively: false,
            word: "serio"
        }, {
            perceived_negatively: false,
            word: "discreto"
        }, {
            perceived_negatively: false,
            word: "cauteloso"
        }, {
            perceived_negatively: false,
            word: "principista"
        }],
        Extraversion_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "tranquilo"
        }, {
            perceived_negatively: false,
            word: "sosegado"
        }, {
            perceived_negatively: false,
            word: "plácido"
        }, {
            perceived_negatively: false,
            word: "imparcial"
        }, {
            perceived_negatively: false,
            word: "modesto"
        }, {
            perceived_negatively: false,
            word: "condescendiente"
        }],
        Extraversion_minus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "desconfiado"
        }, {
            perceived_negatively: false,
            word: "pesimista"
        }, {
            perceived_negatively: false,
            word: "reservado"
        }, {
            perceived_negatively: true,
            word: "cobarde"
        }, {
            perceived_negatively: false,
            word: "callado"
        }],
        Extraversion_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "sombrío"
        }, {
            perceived_negatively: true,
            word: "manso"
        }, {
            perceived_negatively: true,
            word: "poco aventurero"
        }, {
            perceived_negatively: false,
            word: "pasivo"
        }, {
            perceived_negatively: true,
            word: "apático"
        }, {
            perceived_negatively: false,
            word: "dócil"
        }],
        Extraversion_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "una persona guiada por su propia consciencia y valores"
        }, {
            perceived_negatively: false,
            word: "introspectivo"
        }, {
            perceived_negatively: false,
            word: "pensativo"
        }, {
            perceived_negatively: false,
            word: "contemplativo"
        }, {
            perceived_negatively: false,
            word: "introspectivo"
        }],
        Extraversion_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "terco"
        }, {
            perceived_negatively: true,
            word: "vigoroso"
        }, {
            perceived_negatively: true,
            word: "dominador"
        }, {
            perceived_negatively: true,
            word: "presumido"
        }, {
            perceived_negatively: true,
            word: "mandón"
        }, {
            perceived_negatively: false,
            word: "dominante"
        }, {
            perceived_negatively: false,
            word: "astuto"
        }],
        Extraversion_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "social"
        }, {
            perceived_negatively: false,
            word: "enérgico"
        }, {
            perceived_negatively: false,
            word: "entusiasta"
        }, {
            perceived_negatively: false,
            word: "comunicativo"
        }, {
            perceived_negatively: false,
            word: "vibrante"
        }, {
            perceived_negatively: false,
            word: "espirituoso"
        }, {
            perceived_negatively: false,
            word: "magnético"
        }, {
            perceived_negatively: false,
            word: "entusiasta"
        }],
        Extraversion_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "bullicioso"
        }, {
            perceived_negatively: false,
            word: "travieso"
        }, {
            perceived_negatively: false,
            word: "exhibicionista"
        }, {
            perceived_negatively: false,
            word: "gregario"
        }, {
            perceived_negatively: false,
            word: "demostrativo"
        }],
        Extraversion_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "activo"
        }, {
            perceived_negatively: false,
            word: "competitivo"
        }, {
            perceived_negatively: false,
            word: "persistente"
        }, {
            perceived_negatively: false,
            word: "ambicioso"
        }, {
            perceived_negatively: false,
            word: "decidido"
        }],
        Extraversion_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "confiado"
        }, {
            perceived_negatively: false,
            word: "audaz"
        }, {
            perceived_negatively: false,
            word: "seguro"
        }, {
            perceived_negatively: false,
            word: "desinhibido"
        }, {
            perceived_negatively: false,
            word: "valiente"
        }, {
            perceived_negatively: false,
            word: "valiente"
        }, {
            perceived_negatively: false,
            word: "una persona satisfecha de si misma"
        }, {
            perceived_negatively: false,
            word: "vigoroso"
        }, {
            perceived_negatively: false,
            word: "fuerte"
        }],
        Extraversion_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "explosivo"
        }, {
            perceived_negatively: true,
            word: "verborrágico"
        }, {
            perceived_negatively: false,
            word: "extravagante"
        }, {
            perceived_negatively: true,
            word: "volátil"
        }, {
            perceived_negatively: false,
            word: "coqueto"
        }],
        Extraversion_plus_Openness_minus: [{
            perceived_negatively: true,
            word: "verborrágico"
        }, {
            perceived_negatively: true,
            word: "inescrupuloso"
        }, {
            perceived_negatively: true,
            word: "pomposo"
        }],
        Extraversion_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "expresivo"
        }, {
            perceived_negatively: false,
            word: "cándido"
        }, {
            perceived_negatively: false,
            word: "dramático"
        }, {
            perceived_negatively: false,
            word: "espontáneo"
        }, {
            perceived_negatively: false,
            word: "ingenioso"
        }, {
            perceived_negatively: false,
            word: "oportunista"
        }, {
            perceived_negatively: false,
            word: "independiente"
        }],
        Neuroticism_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "poco emocional"
        }, {
            perceived_negatively: true,
            word: "insensible"
        }, {
            perceived_negatively: true,
            word: "poco cariñoso"
        }, {
            perceived_negatively: true,
            word: "desapasionado"
        }],
        Neuroticism_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "paciente"
        }, {
            perceived_negatively: false,
            word: "relajado"
        }, {
            perceived_negatively: false,
            word: "poco exigente"
        }, {
            perceived_negatively: false,
            word: "realista"
        }, {
            perceived_negatively: false,
            word: "optimista"
        }, {
            perceived_negatively: false,
            word: "modesto"
        }, {
            perceived_negatively: false,
            word: "poco crítico"
        }, {
            perceived_negatively: false,
            word: "poco pretencioso"
        }],
        Neuroticism_minus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "informal"
        }, {
            perceived_negatively: false,
            word: "de perfil bajo"
        }],
        Neuroticism_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "racional"
        }, {
            perceived_negatively: false,
            word: "objetivo"
        }, {
            perceived_negatively: false,
            word: "estable"
        }, {
            perceived_negatively: false,
            word: "lógico"
        }, {
            perceived_negatively: false,
            word: "decidido"
        }, {
            perceived_negatively: false,
            word: "preparado"
        }, {
            perceived_negatively: false,
            word: "conciso"
        }, {
            perceived_negatively: false,
            word: "exhaustivo"
        }, {
            perceived_negatively: false,
            word: "económico"
        }, {
            perceived_negatively: false,
            word: "disciplinado"
        }],
        Neuroticism_minus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "modesto"
        }, {
            perceived_negatively: true,
            word: "poco excitable"
        }, {
            perceived_negatively: false,
            word: "plácido"
        }, {
            perceived_negatively: false,
            word: "tranquilo"
        }],
        Neuroticism_minus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "inconsciente de si mismo"
        }, {
            perceived_negatively: false,
            word: "incansable"
        }, {
            perceived_negatively: false,
            word: "infatigable"
        }],
        Neuroticism_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "imperturbable"
        }, {
            perceived_negatively: true,
            word: "insensible"
        }],
        Neuroticism_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "sentido"
        }, {
            perceived_negatively: false,
            word: "versátil"
        }, {
            perceived_negatively: false,
            word: "creativo"
        }, {
            perceived_negatively: false,
            word: "intelectual"
        }, {
            perceived_negatively: false,
            word: "perspicaz"
        }],
        Neuroticism_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "temperamental"
        }, {
            perceived_negatively: true,
            word: "irritable"
        }, {
            perceived_negatively: true,
            word: "peleador"
        }, {
            perceived_negatively: true,
            word: "impaciente"
        }, {
            perceived_negatively: true,
            word: "gruñón"
        }, {
            perceived_negatively: true,
            word: "malhumorado"
        }, {
            perceived_negatively: true,
            word: "irritable"
        }],
        Neuroticism_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "emotivo"
        }, {
            perceived_negatively: true,
            word: "crédulo"
        }, {
            perceived_negatively: false,
            word: "cariñoso"
        }, {
            perceived_negatively: false,
            word: "sensible"
        }, {
            perceived_negatively: false,
            word: "blando"
        }],
        Neuroticism_plus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "compulsivo"
        }, {
            perceived_negatively: true,
            word: "inquisitivo"
        }, {
            perceived_negatively: true,
            word: "desenfrenado"
        }, {
            perceived_negatively: true,
            word: "olvidadizo"
        }, {
            perceived_negatively: true,
            word: "impulsivo"
        }],
        Neuroticism_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "detallista"
        }, {
            perceived_negatively: true,
            word: "excitable"
        }],
        Neuroticism_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "guardado"
        }, {
            perceived_negatively: true,
            word: "irritable"
        }, {
            perceived_negatively: true,
            word: "inseguro"
        }, {
            perceived_negatively: true,
            word: "pesimista"
        }, {
            perceived_negatively: false,
            word: "reservado"
        }, {
            perceived_negatively: true,
            word: "temeroso"
        }, {
            perceived_negatively: true,
            word: "negativo"
        }, {
            perceived_negatively: false,
            word: "auto-crítico"
        }],
        Neuroticism_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: true,
            word: "verborrágico"
        }, {
            perceived_negatively: false,
            word: "coqueto"
        }, {
            perceived_negatively: true,
            word: "explosivo"
        }, {
            perceived_negatively: false,
            word: "extravagante"
        }, {
            perceived_negatively: true,
            word: "volátil"
        }],
        Neuroticism_plus_Openness_minus: [{
            perceived_negatively: false,
            word: "irritable"
        }, {
            perceived_negatively: false,
            word: "fastidioso"
        }, {
            perceived_negatively: false,
            word: "aprensivo"
        }],
        Neuroticism_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: false,
            word: "apasionado"
        }, {
            perceived_negatively: false,
            word: "sensual"
        }],
        Openness_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "ordinario"
        }, {
            perceived_negatively: true,
            word: "sin tacto"
        }, {
            perceived_negatively: true,
            word: "brusco"
        }, {
            perceived_negatively: true,
            word: "cerrado"
        }, {
            perceived_negatively: true,
            word: "duro"
        }],
        Openness_minus_Agreeableness_plus: [{
            perceived_negatively: true,
            word: "simple"
        }, {
            perceived_negatively: true,
            word: "dependiente"
        }],
        Openness_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "cortoplacista"
        }, {
            perceived_negatively: false,
            word: "temerario"
        }, {
            perceived_negatively: true,
            word: "ilógico"
        }, {
            perceived_negatively: true,
            word: "inmaduro"
        }, {
            perceived_negatively: true,
            word: "azaroso"
        }, {
            perceived_negatively: false,
            word: "laxo"
        }, {
            perceived_negatively: true,
            word: "irrespetuoso"
        }],
        Openness_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "convencional"
        }, {
            perceived_negatively: false,
            word: "tradicional"
        }],
        Openness_minus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "predecible"
        }, {
            perceived_negatively: true,
            word: "poco imaginativo"
        }, {
            perceived_negatively: false,
            word: "sombrío"
        }, {
            perceived_negatively: true,
            word: "apático"
        }, {
            perceived_negatively: true,
            word: "poco aventurero"
        }],
        Openness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "verborrágico"
        }, {
            perceived_negatively: true,
            word: "inescrupuloso"
        }, {
            perceived_negatively: true,
            word: "pomposo"
        }],
        Openness_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "imperturbable"
        }, {
            perceived_negatively: true,
            word: "insensible"
        }],
        Openness_minus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "irritable"
        }, {
            perceived_negatively: false,
            word: "fastidioso"
        }, {
            perceived_negatively: false,
            word: "aprensivo"
        }],
        Openness_plus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "perspicaz"
        }, {
            perceived_negatively: false,
            word: "excéntrico"
        }, {
            perceived_negatively: false,
            word: "individualista"
        }],
        Openness_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "idealista"
        }, {
            perceived_negatively: false,
            word: "diplomático"
        }, {
            perceived_negatively: false,
            word: "profundo"
        }, {
            perceived_negatively: false,
            word: "una persona con tacto"
        }, {
            perceived_negatively: false,
            word: "amistoso"
        }],
        Openness_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "poco convencional"
        }, {
            perceived_negatively: false,
            word: "peculiar"
        }],
        Openness_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "analítico"
        }, {
            perceived_negatively: false,
            word: "perceptivo"
        }, {
            perceived_negatively: false,
            word: "informativo"
        }, {
            perceived_negatively: false,
            word: "grandilocuente"
        }, {
            perceived_negatively: false,
            word: "digno"
        }, {
            perceived_negatively: false,
            word: "culto"
        }],
        Openness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "introspectivo"
        }, {
            perceived_negatively: false,
            word: "meditativo"
        }, {
            perceived_negatively: false,
            word: "contemplativo"
        }, {
            perceived_negatively: false,
            word: "introspectivo"
        }, {
            perceived_negatively: false,
            word: "pensativo"
        }],
        Openness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "mundano"
        }, {
            perceived_negatively: false,
            word: "exagerado"
        }, {
            perceived_negatively: false,
            word: "elocuente"
        }, {
            perceived_negatively: false,
            word: "inquisitivo"
        }, {
            perceived_negatively: false,
            word: "intenso"
        }],
        Openness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "creativo"
        }, {
            perceived_negatively: false,
            word: "intelectual"
        }, {
            perceived_negatively: false,
            word: "perspicaz"
        }, {
            perceived_negatively: false,
            word: "versátil"
        }, {
            perceived_negatively: false,
            word: "inventivo"
        }],
        Openness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "apasionado"
        }, {
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: false,
            word: "sensual"
        }]
    },
    values: {
        Hedonism: [{
            Term: "Disfrutar de la vida",
            LowDescription: "Prefiere actividades con un propósito más grande que el sólo deleite personal",
            HighDescription: "Tiene gran motivación por disfrutar la vida en su plenitud"
        }],
        "Self-transcendence": [{
            Term: "Ayudar a los demás",
            LowDescription: "Cree que las personas pueden encargarse de sus propios asuntos sin interferencia",
            HighDescription: "Cree que es importante cuidar de las personas que lo rodean"
        }, {
            Term: "La justicia",
            LowDescription: "Cree que son las personas crean sus oportunidades",
            HighDescription: "Cree en la justicia social y la igualdad para todos"
        }, {
            Term: "La justicia social",
            LowDescription: "Cree que son las personas crean sus oportunidades",
            HighDescription: "Cree en la justicia social y la igualdad para todos"
        }, {
            Term: "La igualdad",
            LowDescription: "Cree que son las personas crean sus oportunidades",
            HighDescription: "Cree en la justicia social y la igualdad para todos"
        }, {
            Term: "El servicio comunitario",
            LowDescription: "Cree que las personas pueden encargarse de sus propios asuntos sin interferencia",
            HighDescription: "Cree que es importante cuidar de las personas que lo rodean"
        }],
        Conservation: [{
            Term: "Las tradiciones",
            LowDescription: "Le importa más seguir su propio camino que seguir el camino de otros",
            HighDescription: "Tiene mucho respeto por los grupos a los que pertenece y sigue su guía"
        }, {
            Term: "La armonía",
            LowDescription: "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            HighDescription: "Cree que las reglas existen por una razón y nunca intenta trasgredirlas"
        }, {
            Term: "La humildad",
            LowDescription: "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            HighDescription: "Ve valor en deferir a otros"
        }, {
            Term: "Las normas sociales",
            LowDescription: "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            HighDescription: "Cree que las reglas existen por una razón y nunca intenta trasgredirlas"
        }, {
            Term: "La seguridad",
            LowDescription: "Prefiere la seguridad a costa de dejar a un lado sus metas",
            HighDescription: "Cree que es importante salvaguardar la seguridad"
        }, {
            Term: "La seguridad",
            LowDescription: "Prefiere estar seguro a costa de dejar a un lado sus metas",
            HighDescription: "Cree que es importante salvaguardar la seguridad"
        }],
        "Openness-to-change": [{
            Term: "Ser independiente",
            LowDescription: "Recibe de buena manera que otros dirijan sus actividades",
            HighDescription: "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }, {
            Term: "La emoción",
            LowDescription: "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            HighDescription: "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            Term: "La creatividad",
            LowDescription: "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            HighDescription: "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            Term: "La curiosidad",
            LowDescription: "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            HighDescription: "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            Term: "La autonomía",
            LowDescription: "Recibe de buena manera que otros dirijan sus actividades",
            HighDescription: "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }, {
            Term: "La libertad",
            LowDescription: "Recibe de buena manera que otros dirijan sus actividades",
            HighDescription: "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }],
        "Self-enhancement": [{
            Term: "Alcanzar el éxito",
            LowDescription: "Toma decisiones sin considerar cómo muestran sus talentos",
            HighDescription: "Busca oportunidades para autosuperase y para demostrar que es una persona capaz"
        }, {
            Term: "Mejorar su estatus social",
            LowDescription: "Está conforme con su estatus social y no siente necesidad de mejorarlo",
            HighDescription: "Se esfuerza considerablemente para mejorar su estatus e imagen pública"
        }, {
            Term: "La ambición",
            LowDescription: "Está conforme con su estatus social y no siente necesidad de mejorarlo",
            HighDescription: "Siente que es importante avanzar para alcanzar metas"
        }, {
            Term: "Los grandes logros",
            LowDescription: "Toma decisiones sin considerar cómo muestran sus talentos",
            HighDescription: "Busca oportunidades para autosuperase y para demostrar que es una persona capaz"
        }]
    }
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5L25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5Ly5idWlsZC9mYWtlX2I5NTMzNzg5LmpzIiwiL2hvbWUvYmF0YXJ5cGEvd29ya3NwYWNlcy9kZW1vcy9ucG0tc3lzdGVtdS90ZXh0LXN1bW1hcnkvLmJ1aWxkL2Zvcm1hdC5qcyIsIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5Ly5idWlsZC9pMThuLmpzIiwiL2hvbWUvYmF0YXJ5cGEvd29ya3NwYWNlcy9kZW1vcy9ucG0tc3lzdGVtdS90ZXh0LXN1bW1hcnkvLmJ1aWxkL2kxOG4vZW4uanMiLCIvaG9tZS9iYXRhcnlwYS93b3Jrc3BhY2VzL2RlbW9zL25wbS1zeXN0ZW11L3RleHQtc3VtbWFyeS8uYnVpbGQvaTE4bi9lcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNnQkEsWUFBWSxDQUFDOztBQUViLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7SUFDNUIsSUFBSSxHQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Ozs7QUFLL0IsTUFBTSxDQUFDLE9BQU8sR0FBRyxVQUFVLElBQUksRUFBRTs7QUFHL0IsTUFBSSxJQUFJLEdBQUksRUFBRTtNQUNaLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztNQUNyQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0FB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QXdCLElBQUk7QUFDNUIsa0JBQVEsU0FBUztTQUNwQixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsY0FBYztTQUN6QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsT0FBTztTQUNsQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsT0FBTztTQUNsQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsTUFBTTtTQUNqQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixDQUNKO0FBQ0QsNkNBQXVDLENBQ25DO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsYUFBYTtTQUN4QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsY0FBYztTQUN6QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNE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QUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsYUFBYTtTQUN4QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsTUFBTTtTQUNqQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsT0FBTztTQUNsQixDQUNKO0FBQ0QsK0NBQXlDLENBQ3JDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsU0FBUztTQUNwQixFQUNEO0FBQ0ksa0NBQXdCLElBQUk7QUFDNUIsa0JBQVEsWUFBWTtTQUN2QixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsY0FBYztTQUN6QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFB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O0FBQzVFLDZCQUFtQiwyRUFBMkU7U0FDakcsQ0FDSjtBQUNELDBCQUFrQixFQUFFLENBQ2hCO0FBQ0ksa0JBQVEsbUJBQW1CO0FBQzNCLDRCQUFrQiwyREFBMkQ7QUFDN0UsNkJBQW1CLGlGQUFpRjtTQUN2RyxFQUNEO0FBQ0ksa0JBQVEsMkJBQTJCO0FBQ25DLDRCQUFrQix3RUFBd0U7QUFDMUYsNkJBQW1CLHdFQUF3RTtTQUM5RixFQUNEO0FBQ0ksa0JBQVEsYUFBYTtBQUNyQiw0QkFBa0Isd0VBQXdFO0FBQzFGLDZCQUFtQixzREFBc0Q7U0FDNUUsRUFDRDtBQUNJLGtCQUFRLG9CQUFvQjtBQUM1Qiw0QkFBa0IsMkRBQTJEO0FBQzdFLDZCQUFtQixpRkFBaUY7U0FDdkcsQ0FDSjtLQUNGO0NBQ0YsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENvcHlyaWdodCAyMDE1IElCTSBDb3JwLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZm9ybWF0ID0gcmVxdWlyZSgnLi9mb3JtYXQnKSxcbiAgICBpMThuICAgPSByZXF1aXJlKCcuL2kxOG4nKTtcblxuLyoqXG4gKiBQcm92aWRlcyBhIFRleHQgU3VtbWFyeSBmb3IgcHJvZmlsZXMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGxhbmcpIHtcblxuXG4gIHZhciBzZWxmICA9IHt9LFxuICAgIGRpY3Rpb25hcnkgPSBpMThuLmdldERpY3Rpb25hcnkobGFuZyksXG4gICAgdHBocmFzZSA9IGkxOG4udHJhbnNsYXRvckZhY3RvcnkuY3JlYXRlVHJhbnNsYXRvcihkaWN0aW9uYXJ5LnBocmFzZXMpOyAvLyBpMThuIGZvciBwaHJhc2VzXG5cbiAgLy8gRG93bmxvYWQgYWxsIHN0YXRpYyBkYXRhLlxuICBzZWxmLmNpcmN1bXBsZXhEYXRhID0gZGljdGlvbmFyeS50cmFpdHM7XG4gIHNlbGYuZmFjZXRzRGF0YSA9IGRpY3Rpb25hcnkuZmFjZXRzO1xuICBzZWxmLnZhbHVlc0RhdGEgPSBkaWN0aW9uYXJ5LnZhbHVlcztcbiAgc2VsZi5uZWVkc0RhdGEgPSBkaWN0aW9uYXJ5Lm5lZWRzO1xuXG4gIGZ1bmN0aW9uIGNvbXBhcmVCeVJlbGV2YW5jZShvMSwgbzIpIHtcbiAgICB2YXIgcmVzdWx0ID0gMDtcblxuICAgIGlmIChNYXRoLmFicygwLjUgLSBvMS5wZXJjZW50YWdlKSA+IE1hdGguYWJzKDAuNSAtIG8yLnBlcmNlbnRhZ2UpKSB7XG4gICAgICByZXN1bHQgPSAtMTsgLy8gQSB0cmFpdCB3aXRoIDElIGlzIG1vcmUgaW50ZXJlc3RpbmcgdGhhbiBvbmUgd2l0aCA2MCUuXG4gICAgfVxuXG4gICAgaWYgKE1hdGguYWJzKDAuNSAtIG8xLnBlcmNlbnRhZ2UpIDwgTWF0aC5hYnMoMC41IC0gbzIucGVyY2VudGFnZSkpIHtcbiAgICAgIHJlc3VsdCA9IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBhcmVCeVZhbHVlKG8xLCBvMikge1xuICAgIHZhciByZXN1bHQgPSAwO1xuXG4gICAgaWYgKE1hdGguYWJzKG8xLnBlcmNlbnRhZ2UpID4gTWF0aC5hYnMobzIucGVyY2VudGFnZSkpIHtcbiAgICAgIHJlc3VsdCA9IC0xOyAvLyAxMDAgJSBoYXMgcHJlY2VkZW5jZSBvdmVyIDk5JVxuICAgIH1cblxuICAgIGlmIChNYXRoLmFicyhvMS5wZXJjZW50YWdlKSA8IE1hdGguYWJzKG8yLnBlcmNlbnRhZ2UpKSB7XG4gICAgICByZXN1bHQgPSAxO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDaXJjdW1wbGV4QWRqZWN0aXZlKHAxLCBwMiwgb3JkZXIpIHtcbiAgICAvLyBTb3J0IHRoZSBwZXJzb25hbGl0eSB0cmFpdHMgaW4gdGhlIG9yZGVyIHRoZSBKU09OIGZpbGUgc3RvcmVkIGl0LlxuICAgIHZhciBvcmRlcmVkID0gW3AxLCBwMl0uc29ydChmdW5jdGlvbiAobzEsIG8yKSB7XG4gICAgICB2YXJcbiAgICAgICAgaTEgPSAnRUFOT0MnLmluZGV4T2YobzEuaWQuY2hhckF0KDApKSxcbiAgICAgICAgaTIgPSAnRUFOT0MnLmluZGV4T2YobzIuaWQuY2hhckF0KDApKTtcblxuICAgICAgcmV0dXJuIGkxIDwgaTIgPyAtMSA6IDE7XG4gICAgfSksXG4gICAgICAvLyBBc3NlbWJsZSB0aGUgaWRlbnRpZmllciBhcyB0aGUgSlNPTiBmaWxlIHN0b3JlZCBpdC5cbiAgICAgIGlkZW50aWZpZXIgPSBvcmRlcmVkWzBdLmlkLlxuICAgICAgY29uY2F0KG9yZGVyZWRbMF0ucGVyY2VudGFnZSA+IDAuNSA/ICdfcGx1c18nIDogJ19taW51c18nKS5cbiAgICAgIGNvbmNhdChvcmRlcmVkWzFdLmlkKS5cbiAgICAgIGNvbmNhdChvcmRlcmVkWzFdLnBlcmNlbnRhZ2UgPiAwLjUgPyAnX3BsdXMnIDogJ19taW51cycpLFxuXG4gICAgICB0cmFpdE11bHQgPSBzZWxmLmNpcmN1bXBsZXhEYXRhW2lkZW50aWZpZXJdWzBdLFxuICAgICAgc2VudGVuY2UgPSBcIiVzXCI7XG5cbiAgICBpZiAodHJhaXRNdWx0LnBlcmNlaXZlZF9uZWdhdGl2ZWx5KSB7XG4gICAgICBzd2l0Y2ggKG9yZGVyKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnYSBiaXQgJXMnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnc29tZXdoYXQgJXMnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnY2FuIGJlIHBlcmNlaXZlZCBhcyAlcycpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZm9ybWF0KHNlbnRlbmNlLCB0cmFpdE11bHQud29yZCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRGYWNldEluZm8oZikge1xuICAgIHZhclxuICAgICAgZGF0YSA9IHNlbGYuZmFjZXRzRGF0YVtmLmlkLnJlcGxhY2UoJ18nLCAnLScpLnJlcGxhY2UoJyAnLCAnLScpXSxcbiAgICAgIHQsIGQ7XG5cbiAgICBpZiAoZi5wZXJjZW50YWdlID4gMC41KSB7XG4gICAgICB0ID0gZGF0YS5IaWdoVGVybS50b0xvd2VyQ2FzZSgpO1xuICAgICAgZCA9IGRhdGEuSGlnaERlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQgPSBkYXRhLkxvd1Rlcm0udG9Mb3dlckNhc2UoKTtcbiAgICAgIGQgPSBkYXRhLkxvd0Rlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGYuaWQsXG4gICAgICB0ZXJtOiB0LFxuICAgICAgZGVzY3JpcHRpb246IGRcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gaW50ZXJ2YWxGb3IocCkge1xuICAgIC8vIFRoZSBNSU4gaGFuZGxlcyB0aGUgc3BlY2lhbCBjYXNlIGZvciAxMDAlLlxuICAgIHJldHVybiBNYXRoLm1pbihNYXRoLmZsb29yKHAgKiA0KSwgMyk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJbmZvRm9yVmFsdWUodikge1xuICAgIHZhclxuICAgICAgZGF0YSA9IHNlbGYudmFsdWVzRGF0YVt2LmlkLnJlcGxhY2UoL1tfIF0vZywgJy0nKV1bMF0sXG4gICAgICBkID0gdi5wZXJjZW50YWdlID4gMC41ID8gZGF0YS5IaWdoRGVzY3JpcHRpb24gOiBkYXRhLkxvd0Rlc2NyaXB0aW9uO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHYuaWQsXG4gICAgICB0ZXJtOiBkYXRhLlRlcm0udG9Mb3dlckNhc2UoKSxcbiAgICAgIGRlc2NyaXB0aW9uOiBkXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFdvcmRzRm9yTmVlZChuKSB7XG4gICAgLy8gQXNzZW1ibGUgdGhlIGlkZW50aWZpZXIgYXMgdGhlIEpTT04gZmlsZSBzdG9yZWQgaXQuXG4gICAgdmFyIHRyYWl0TXVsdCA9IHNlbGYubmVlZHNEYXRhW24uaWRdO1xuICAgIHJldHVybiB0cmFpdE11bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NlbWJsZVRyYWl0cyhwZXJzb25hbGl0eVRyZWUpIHtcbiAgICB2YXJcbiAgICAgIHNlbnRlbmNlcyA9IFtdLFxuICAgICAgYmlnNWVsZW1lbnRzID0gW10sXG4gICAgICByZWxldmFudEJpZzUsXG4gICAgICBhZGosIGFkajEsIGFkajIsIGFkajM7XG5cbiAgICAvLyBTb3J0IHRoZSBCaWcgNSBiYXNlZCBvbiBob3cgZXh0cmVtZSB0aGUgbnVtYmVyIGlzLlxuICAgIHBlcnNvbmFsaXR5VHJlZS5jaGlsZHJlblswXS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBiaWc1ZWxlbWVudHMucHVzaCh7XG4gICAgICAgIGlkOiBwLmlkLFxuICAgICAgICBwZXJjZW50YWdlOiBwLnBlcmNlbnRhZ2VcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGJpZzVlbGVtZW50cy5zb3J0KGNvbXBhcmVCeVJlbGV2YW5jZSk7XG5cbiAgICAvLyBSZW1vdmUgZXZlcnl0aGluZyBiZXR3ZWVuIDMyJSBhbmQgNjglLCBhcyBpdCdzIGluc2lkZSB0aGUgY29tbW9uIHBlb3BsZS5cbiAgICByZWxldmFudEJpZzUgPSBiaWc1ZWxlbWVudHMuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICByZXR1cm4gTWF0aC5hYnMoMC41IC0gaXRlbS5wZXJjZW50YWdlKSA+IDAuMTg7XG4gICAgfSk7XG4gICAgaWYgKHJlbGV2YW50QmlnNS5sZW5ndGggPCAyKSB7XG4gICAgICAvLyBFdmVuIGlmIG5vIEJpZyA1IGF0dHJpYnV0ZSBpcyBpbnRlcmVzdGluZywgeW91IGdldCAxIGFkamVjdGl2ZS5cbiAgICAgIHJlbGV2YW50QmlnNSA9IFtiaWc1ZWxlbWVudHNbMF0sIGJpZzVlbGVtZW50c1sxXV07XG4gICAgfVxuXG4gICAgc3dpdGNoIChyZWxldmFudEJpZzUubGVuZ3RoKSB7XG4gICAgY2FzZSAyOlxuICAgICAgLy8gUmVwb3J0IDEgYWRqZWN0aXZlLlxuICAgICAgYWRqID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMF0sIHJlbGV2YW50QmlnNVsxXSwgMCk7XG4gICAgICBzZW50ZW5jZXMucHVzaChmb3JtYXQodHBocmFzZSgnWW91IGFyZSAlcycpLCBhZGopICsgJy4nKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMzpcbiAgICAgIC8vIFJlcG9ydCAyIGFkamVjdGl2ZXMuXG4gICAgICBhZGoxID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMF0sIHJlbGV2YW50QmlnNVsxXSwgMCk7XG4gICAgICBhZGoyID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMV0sIHJlbGV2YW50QmlnNVsyXSwgMSk7XG4gICAgICBzZW50ZW5jZXMucHVzaChmb3JtYXQodHBocmFzZSgnWW91IGFyZSAlcyBhbmQgJXMnKSwgIGFkajEsIGFkajIpICsgJy4nKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgNDpcbiAgICBjYXNlIDU6XG4gICAgICAvLyBSZXBvcnQgMyBhZGplY3RpdmVzLlxuICAgICAgYWRqMSA9IGdldENpcmN1bXBsZXhBZGplY3RpdmUocmVsZXZhbnRCaWc1WzBdLCByZWxldmFudEJpZzVbMV0sIDApO1xuICAgICAgYWRqMiA9IGdldENpcmN1bXBsZXhBZGplY3RpdmUocmVsZXZhbnRCaWc1WzFdLCByZWxldmFudEJpZzVbMl0sIDEpO1xuICAgICAgYWRqMyA9IGdldENpcmN1bXBsZXhBZGplY3RpdmUocmVsZXZhbnRCaWc1WzJdLCByZWxldmFudEJpZzVbM10sIDIpO1xuICAgICAgc2VudGVuY2VzLnB1c2goZm9ybWF0KHRwaHJhc2UoJ1lvdSBhcmUgJXMsICVzIGFuZCAlcycpLCAgYWRqMSwgYWRqMiwgYWRqMykgKyAnLicpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbnRlbmNlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2VtYmxlRmFjZXRzKHBlcnNvbmFsaXR5VHJlZSkge1xuICAgIHZhclxuICAgICAgc2VudGVuY2VzID0gW10sXG4gICAgICBmYWNldEVsZW1lbnRzID0gW10sXG4gICAgICBpbmZvLFxuICAgICAgaTtcblxuICAgIC8vIEFzc2VtYmxlIHRoZSBmdWxsIGxpc3Qgb2YgZmFjZXRzIGFuZCBzb3J0IHRoZW0gYmFzZWQgb24gaG93IGV4dHJlbWVcbiAgICAvLyBpcyB0aGUgbnVtYmVyLlxuICAgIHBlcnNvbmFsaXR5VHJlZS5jaGlsZHJlblswXS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgZmFjZXRFbGVtZW50cy5wdXNoKHtcbiAgICAgICAgICBpZDogZi5pZCxcbiAgICAgICAgICBwZXJjZW50YWdlOiBmLnBlcmNlbnRhZ2UsXG4gICAgICAgICAgcGFyZW50OiBwXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgZmFjZXRFbGVtZW50cy5zb3J0KGNvbXBhcmVCeVJlbGV2YW5jZSk7XG5cbiAgICAvLyBBc3NlbWJsZSBhbiBhZGplY3RpdmUgYW5kIGRlc2NyaXB0aW9uIGZvciB0aGUgdHdvIG1vc3QgaW1wb3J0YW50IGZhY2V0cy5cbiAgICBpbmZvID0gZ2V0RmFjZXRJbmZvKGZhY2V0RWxlbWVudHNbMF0pO1xuICAgIHNlbnRlbmNlcy5wdXNoKGZvcm1hdCh0cGhyYXNlKCdZb3UgYXJlICVzJyksIGluZm8udGVybSkgKyAnOiAnICsgaW5mby5kZXNjcmlwdGlvbiArICcuJyk7XG4gICAgaW5mbyA9IGdldEZhY2V0SW5mbyhmYWNldEVsZW1lbnRzWzFdKTtcbiAgICBzZW50ZW5jZXMucHVzaChmb3JtYXQodHBocmFzZSgnWW91IGFyZSAlcycpLCBpbmZvLnRlcm0pICsgJzogJyArIGluZm8uZGVzY3JpcHRpb24gKyAnLicpO1xuXG4gICAgLy8gSWYgYWxsIHRoZSBmYWNldHMgY29ycmVzcG9uZCB0byB0aGUgc2FtZSBmZWF0dXJlLCBjb250aW51ZSB1bnRpbCBhXG4gICAgLy8gZGlmZmVyZW50IHBhcmVudCBmZWF0dXJlIGlzIGZvdW5kLlxuICAgIGkgPSAyO1xuICAgIGlmIChmYWNldEVsZW1lbnRzWzBdLnBhcmVudCA9PT0gZmFjZXRFbGVtZW50c1sxXS5wYXJlbnQpIHtcbiAgICAgIHdoaWxlIChmYWNldEVsZW1lbnRzWzBdLnBhcmVudCA9PT0gZmFjZXRFbGVtZW50c1tpXS5wYXJlbnQpIHtcbiAgICAgICAgaSArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBpbmZvID0gZ2V0RmFjZXRJbmZvKGZhY2V0RWxlbWVudHNbaV0pO1xuICAgIHNlbnRlbmNlcy5wdXNoKGZvcm1hdCh0cGhyYXNlKCdBbmQgeW91IGFyZSAlcycpLCBpbmZvLnRlcm0pICsgJzogJyArIGluZm8uZGVzY3JpcHRpb24gKyAnLicpO1xuXG4gICAgcmV0dXJuIHNlbnRlbmNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NlbWJsZSB0aGUgbGlzdCBvZiB2YWx1ZXMgYW5kIHNvcnQgdGhlbSBiYXNlZCBvbiByZWxldmFuY2UuXG4gICAqL1xuICBmdW5jdGlvbiBhc3NlbWJsZVZhbHVlcyh2YWx1ZXNUcmVlKSB7XG4gICAgdmFyXG4gICAgICBzZW50ZW5jZXMgPSBbXSxcbiAgICAgIHZhbHVlc0xpc3QgPSBbXSxcbiAgICAgIHNhbWVRSSwgaW5mbzEsIGluZm8yLFxuICAgICAgc2VudGVuY2UsXG4gICAgICB2YWx1ZXNJbmZvLFxuICAgICAgaSwgdGVybTEsIHRlcm0yO1xuXG4gICAgdmFsdWVzVHJlZS5jaGlsZHJlblswXS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICB2YWx1ZXNMaXN0LnB1c2goe1xuICAgICAgICBpZDogcC5pZCxcbiAgICAgICAgcGVyY2VudGFnZTogcC5wZXJjZW50YWdlXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB2YWx1ZXNMaXN0LnNvcnQoY29tcGFyZUJ5UmVsZXZhbmNlKTtcblxuICAgIC8vIEFyZSB0aGUgdHdvIG1vc3QgcmVsZXZhbnQgaW4gdGhlIHNhbWUgcXVhcnRpbGUgaW50ZXJ2YWw/IChlLmcuIDAlLTI1JSlcbiAgICBzYW1lUUkgPSBpbnRlcnZhbEZvcih2YWx1ZXNMaXN0WzBdLnBlcmNlbnRhZ2UpID09PSBpbnRlcnZhbEZvcih2YWx1ZXNMaXN0WzFdLnBlcmNlbnRhZ2UpO1xuXG4gICAgLy8gR2V0IGFsbCB0aGUgdGV4dCBhbmQgZGF0YSByZXF1aXJlZC5cbiAgICBpbmZvMSA9IGdldEluZm9Gb3JWYWx1ZSh2YWx1ZXNMaXN0WzBdKTtcbiAgICBpbmZvMiA9IGdldEluZm9Gb3JWYWx1ZSh2YWx1ZXNMaXN0WzFdKTtcblxuICAgIGlmIChzYW1lUUkpIHtcbiAgICAgIC8vIEFzc2VtYmxlIHRoZSBmaXJzdCAnYm90aCcgc2VudGVuY2UuXG4gICAgICB0ZXJtMSA9IGluZm8xLnRlcm07XG4gICAgICB0ZXJtMiA9IGluZm8yLnRlcm07XG4gICAgICBzd2l0Y2ggKGludGVydmFsRm9yKHZhbHVlc0xpc3RbMF0ucGVyY2VudGFnZSkpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZSgnWW91IGFyZSByZWxhdGl2ZWx5IHVuY29uY2VybmVkIHdpdGggYm90aCAlcyBhbmQgJXMnKSwgdGVybTEsIHRlcm0yKSArICcuJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHNlbnRlbmNlID0gZm9ybWF0KHRwaHJhc2UoXCJZb3UgZG9uJ3QgZmluZCBlaXRoZXIgJXMgb3IgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiKSwgdGVybTEsIHRlcm0yKSArICcuJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHNlbnRlbmNlID0gZm9ybWF0KHRwaHJhc2UoJ1lvdSB2YWx1ZSBib3RoICVzIGFuZCAlcyBhIGJpdCcpLCB0ZXJtMSwgdGVybTIpICsgJy4nO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZSgnWW91IGNvbnNpZGVyIGJvdGggJXMgYW5kICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkbycpLCB0ZXJtMSwgdGVybTIpICsgJy4nO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHNlbnRlbmNlcy5wdXNoKHNlbnRlbmNlKTtcblxuICAgICAgLy8gQXNzZW1ibGUgdGhlIGZpbmFsIHN0cmluZ3MgaW4gdGhlIGNvcnJlY3QgZm9ybWF0LlxuICAgICAgc2VudGVuY2VzLnB1c2goaW5mbzEuZGVzY3JpcHRpb24gKyAnLicpO1xuICAgICAgc2VudGVuY2VzLnB1c2goZm9ybWF0KHRwaHJhc2UoJ0FuZCAlcycpLCBpbmZvMi5kZXNjcmlwdGlvbi50b0xvd2VyQ2FzZSgpKSArICcuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlc0luZm8gPSBbaW5mbzEsIGluZm8yXTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCB2YWx1ZXNJbmZvLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIC8vIFByb2Nlc3MgaXQgdGhpcyB3YXkgYmVjYXVzZSB0aGUgY29kZSBpcyB0aGUgc2FtZS5cbiAgICAgICAgc3dpdGNoIChpbnRlcnZhbEZvcih2YWx1ZXNMaXN0W2ldLnBlcmNlbnRhZ2UpKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICBzZW50ZW5jZSA9IGZvcm1hdCh0cGhyYXNlKCdZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCAlcycpLCB2YWx1ZXNJbmZvW2ldLnRlcm0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZShcIllvdSBkb24ndCBmaW5kICVzIHRvIGJlIHBhcnRpY3VsYXJseSBtb3RpdmF0aW5nIGZvciB5b3VcIiksIHZhbHVlc0luZm9baV0udGVybSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZW50ZW5jZSA9IGZvcm1hdCh0cGhyYXNlKCdZb3UgdmFsdWUgJXMgYSBiaXQgbW9yZScpLCAgdmFsdWVzSW5mb1tpXS50ZXJtKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlbnRlbmNlID0gZm9ybWF0KHRwaHJhc2UoJ1lvdSBjb25zaWRlciAlcyB0byBndWlkZSBhIGxhcmdlIHBhcnQgb2Ygd2hhdCB5b3UgZG8nKSwgIHZhbHVlc0luZm9baV0udGVybSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgc2VudGVuY2UgPSBzZW50ZW5jZS5jb25jYXQoJzogJykuXG4gICAgICAgICAgICBjb25jYXQodmFsdWVzSW5mb1tpXS5kZXNjcmlwdGlvbi50b0xvd2VyQ2FzZSgpKS5cbiAgICAgICAgICAgIGNvbmNhdCgnLicpO1xuICAgICAgICBzZW50ZW5jZXMucHVzaChzZW50ZW5jZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbnRlbmNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NlbWJsZSB0aGUgbGlzdCBvZiBuZWVkcyBhbmQgc29ydCB0aGVtIGJhc2VkIG9uIHZhbHVlLlxuICAgKi9cbiAgZnVuY3Rpb24gYXNzZW1ibGVOZWVkcyhuZWVkc1RyZWUpIHtcbiAgICB2YXJcbiAgICAgIHNlbnRlbmNlcyA9IFtdLFxuICAgICAgbmVlZHNMaXN0ID0gW10sXG4gICAgICB3b3JkLFxuICAgICAgc2VudGVuY2U7XG5cbiAgICBuZWVkc1RyZWUuY2hpbGRyZW5bMF0uY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgbmVlZHNMaXN0LnB1c2goe1xuICAgICAgICBpZDogcC5pZCxcbiAgICAgICAgcGVyY2VudGFnZTogcC5wZXJjZW50YWdlXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBuZWVkc0xpc3Quc29ydChjb21wYXJlQnlWYWx1ZSk7XG5cbiAgICAvLyBHZXQgdGhlIHdvcmRzIHJlcXVpcmVkLlxuICAgIHdvcmQgPSBnZXRXb3Jkc0Zvck5lZWQobmVlZHNMaXN0WzBdKVswXTtcblxuICAgIC8vIEZvcm0gdGhlIHJpZ2h0IHNlbnRlbmNlIGZvciB0aGUgc2luZ2xlIG5lZWQuXG4gICAgc3dpdGNoIChpbnRlcnZhbEZvcihuZWVkc0xpc3RbMF0ucGVyY2VudGFnZSkpIHtcbiAgICBjYXNlIDA6XG4gICAgICBzZW50ZW5jZSA9IHRwaHJhc2UoJ0V4cGVyaWVuY2VzIHRoYXQgbWFrZSB5b3UgZmVlbCBoaWdoICVzIGFyZSBnZW5lcmFsbHkgdW5hcHBlYWxpbmcgdG8geW91Jyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE6XG4gICAgICBzZW50ZW5jZSA9IHRwaHJhc2UoJ0V4cGVyaWVuY2VzIHRoYXQgZ2l2ZSBhIHNlbnNlIG9mICVzIGhvbGQgc29tZSBhcHBlYWwgdG8geW91Jyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDI6XG4gICAgICBzZW50ZW5jZSA9IHRwaHJhc2UoJ1lvdSBhcmUgbW90aXZhdGVkIHRvIHNlZWsgb3V0IGV4cGVyaWVuY2VzIHRoYXQgcHJvdmlkZSBhIHN0cm9uZyBmZWVsaW5nIG9mICVzJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDM6XG4gICAgICBzZW50ZW5jZSA9IHRwaHJhc2UoJ1lvdXIgY2hvaWNlcyBhcmUgZHJpdmVuIGJ5IGEgZGVzaXJlIGZvciAlcycpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHNlbnRlbmNlID0gZm9ybWF0KHNlbnRlbmNlLCB3b3JkKS5jb25jYXQoXCIuXCIpO1xuICAgIHNlbnRlbmNlcy5wdXNoKHNlbnRlbmNlKTtcblxuICAgIHJldHVybiBzZW50ZW5jZXM7XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBUcmFpdFRyZWUgcmV0dXJucyBhIHRleHRcbiAgICogc3VtbWFyeSBkZXNjcmliaW5nIHRoZSByZXN1bHQuXG4gICAqXG4gICAqIEBwYXJhbSB0cmVlIEEgVHJhaXRUcmVlLlxuICAgKiBAcmV0dXJuIEFuIGFycmF5IG9mIHN0cmluZ3MgcmVwcmVzZW50aW5nIHRoZVxuICAgKiAgICAgICAgIHBhcmFncmFwaHMgb2YgdGhlIHRleHQgc3VtbWFyeS5cbiAgICovXG4gIGZ1bmN0aW9uIGFzc2VtYmxlKHRyZWUpIHtcbiAgICByZXR1cm4gW1xuICAgICAgYXNzZW1ibGVUcmFpdHModHJlZS5jaGlsZHJlblswXSksXG4gICAgICBhc3NlbWJsZUZhY2V0cyh0cmVlLmNoaWxkcmVuWzBdKSxcbiAgICAgIGFzc2VtYmxlTmVlZHModHJlZS5jaGlsZHJlblsxXSksXG4gICAgICBhc3NlbWJsZVZhbHVlcyh0cmVlLmNoaWxkcmVuWzJdKVxuICAgIF07XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBUcmFpdFRyZWUgcmV0dXJucyBhIHRleHRcbiAgICogc3VtbWFyeSBkZXNjcmliaW5nIHRoZSByZXN1bHQuXG4gICAqXG4gICAqIEBwYXJhbSB0cmVlIEEgVHJhaXRUcmVlLlxuICAgKiBAcmV0dXJuIEEgU3RyaW5nIGNvbnRhaW5pbmcgdGhlIHRleHQgc3VtbWFyeS5cbiAgICovXG4gIGZ1bmN0aW9uIGdldFN1bW1hcnkocHJvZmlsZSkge1xuICAgIHJldHVybiBhc3NlbWJsZShwcm9maWxlLnRyZWUpLm1hcChmdW5jdGlvbiAocGFyYWdyYXBoKSB7IHJldHVybiBwYXJhZ3JhcGguam9pbihcIiBcIik7IH0pLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICAvKiBUZXh0LVN1bW1hcnkgQVBJICovXG4gIHNlbGYuYXNzZW1ibGVUcmFpdHMgPSBhc3NlbWJsZVRyYWl0cztcbiAgc2VsZi5hc3NlbWJsZUZhY2V0cyA9IGFzc2VtYmxlRmFjZXRzO1xuICBzZWxmLmFzc2VtYmxlTmVlZHMgPSBhc3NlbWJsZU5lZWRzO1xuICBzZWxmLmFzc2VtYmxlVmFsdWVzID0gYXNzZW1ibGVWYWx1ZXM7XG4gIHNlbGYuYXNzZW1ibGUgPSBhc3NlbWJsZTtcbiAgc2VsZi5nZXRTdW1tYXJ5ID0gZ2V0U3VtbWFyeTtcblxuICByZXR1cm4gc2VsZjtcbn07XG4iLCIvKipcbiAqIENvcHlyaWdodCAyMDE1IElCTSBDb3JwLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuXG4vKipcbiAqIEdpdmVuIGEgdGVtcGxhdGUgc3RyaW5nIHRvIGZvcm1hdCBhbmQgc2VydmVyYWwgc3RyaW5nc1xuICogdG8gZmlsbCB0aGUgdGVtcGxhdGUsIGl0IHJldHVybnMgdGhlIGZvcm1hdHRlZCBzdHJpbmcuXG4gKiBAcGFyYW0gdGVtcGxhdGUgVGhpcyBpcyBhIHN0cmluZyBjb250YWluaW5nIHplcm8sIG9uZSBvclxuICogICAgICAgICAgICAgICAgIG1vcmUgb2NjdXJyZW5jZXMgb2YgXCIlc1wiLlxuICogQHBhcmFtIC4uLnN0cmluZ3NcbiAqIEByZXR1cm5zIFRoZSBmb3JtYXR0dGVkIHRlbXBsYXRlLlxuICovXG5mdW5jdGlvbiBmb3JtYXQoc3ViamVjdCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyXG4gICAgcmVwbGFjZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYXJndW1lbnRzLCBbMSwgYXJndW1lbnRzLmxlbmd0aF0pLFxuICAgIHBhcnRzID0gbnVsbCxcbiAgICBvdXRwdXQsXG4gICAgaTtcblxuICBpZiAoKHN1YmplY3QubWF0Y2goLyVzL2cpID09PSBudWxsICYmIHJlcGxhY2VzLmxlbmd0aCA+IDApIHx8IHJlcGxhY2VzLmxlbmd0aCAhPT0gc3ViamVjdC5tYXRjaCgvJXMvZykubGVuZ3RoKSB7XG4gICAgdGhyb3cgJ0Zvcm1hdCBlcnJvcjogVGhlIHN0cmluZyBjb3VudCB0byByZXBsYWNlIGRvIG5vdCBtYXRjaGVzIHRoZSBhcmd1bWVudCBjb3VudC4gU3ViamVjdDogJyArIHN1YmplY3QgKyAnLiBSZXBsYWNlczogJyArIHJlcGxhY2VzO1xuICB9XG5cbiAgb3V0cHV0ID0gc3ViamVjdDtcbiAgZm9yIChpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHBhcnRzID0gb3V0cHV0LnNwbGl0KCclcycpO1xuICAgIG91dHB1dCA9IHBhcnRzWzBdICsgYXJndW1lbnRzW2ldICsgcGFydHMuc2xpY2UoMSwgcGFydHMubGVuZ3RoKS5qb2luKCclcycpO1xuICB9XG5cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtYXQ7XG4iLCIvKipcbiAqIENvcHlyaWdodCAyMDE1IElCTSBDb3JwLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxudmFyIGZvcm1hdCA9IHJlcXVpcmUoJy4vZm9ybWF0Jyk7XG5cbi8qKlxuICogQ3JlYXRlcyB0cmFuc2xhdG9yc1xuICpcbiAqIEBhdXRob3IgQXJ5IFBhYmxvIEJhdGlzdGEgPGJhdGFyeXBhQGFyLmlibS5jb20+XG4gKi9cbnZhciB0cmFuc2xhdG9yRmFjdG9yeSA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIHNlbGYgPSB7XG5cbiAgICAgIC8qKlxuICAgICAgICogR2V0IHRoZSB2YWx1ZSBmb3IgdGhlIGdpdmVuIGtleSBmcm9tIHRoZSBkaWN0aW9uYXJ5LlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSBkaWN0aW9uYXJ5IEEgZGljdGlvbmFyeSB3aXRoIFN0cmluZyBrZXlzIGFuZCBTdHJpbmcgdmFsdWVzLlxuICAgICAgICogQHBhcmFtIGtleSBBIGtleS4gQ2FuIGNvbnRhaW4gJy4nIHRvIGluZGljYXRlIGtleSdzIHByZXNlbnQgaW4gc3ViLWRpY3Rpb25hcmllcy5cbiAgICAgICAqICAgICAgICAgICAgICAgICAgIEZvciBleGFtcGxlICdhcHBsaWNhdGlvbi5uYW1lJyBsb29rcyB1cCBmb3IgdGhlICdhcHBsaWNhdGlvbicga2V5XG4gICAgICAgKiAgICAgICAgICAgICAgICAgICBpbiB0aGUgZGljdGlvbmFyeSBhbmQsIHdpdGggaXQncyB2YWx1ZSwgbG9va3MgdXAgZm9yIHRoZSAnbmFtZScga2V5LlxuICAgICAgICogQHBhcmFtIGRlZmF1bHRWYWx1ZSBBIHZhbHVlIHRvIHJldHVybiBpZiB0aGUga2V5IGlzIG5vdCBpbiB0aGUgZGljdGlvbmFyeS5cbiAgICAgICAqIEByZXR1cm5zIFRoZSB2YWx1ZSBmcm9tIHRoZSBkaWN0aW9uYXJ5LlxuICAgICAgICovXG4gICAgICBnZXRLZXkgOiBmdW5jdGlvbiAoZGljdGlvbmFyeSwga2V5LCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgcGFydHMgPSBrZXkuc3BsaXQoJy4nKSxcbiAgICAgICAgICB2YWx1ZSA9IGRpY3Rpb25hcnk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSA9IGkgKyAxKSB7XG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZVtwYXJ0c1tpXV07XG4gICAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBkZWZhdWx0VmFsdWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBDcmVhdGVzIGEgdHJhbnNsYXRpb24gZnVuY3Rpb24gZ2l2ZW4gYSBkaWN0aW9uYXJ5IG9mIHRyYW5zbGF0aW9uc1xuICAgICAgICogYW5kIGFuIG9wdGlvbmFsIGJhY2t1cCBkaWN0aW9uYXJ5IGlmIHRoZSBrZXkgaXMgbm8gcHJlc2VudCBpbiB0aGVcbiAgICAgICAqIGZpcnN0IG9uZS4gVGhlIGtleSBpcyByZXR1cm5lZCBpZiBub3QgZm91bmQgaW4gdGhlIGRpY3Rpb25hcmllcy5cbiAgICAgICAqIEBwYXJhbSB0cmFuc2xhdGlvbnMgQSB0cmFuc2xhdGlvbiBkaWN0aW9uYXJ5LlxuICAgICAgICogQHBhcmFtIGRlZmF1bHRzIEEgdHJhbnNsYXRpb24gZGljdGlvbmFyeS5cbiAgICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gQSB0cmFuc2xhdG9yLlxuICAgICAgICovXG4gICAgICBjcmVhdGVUcmFuc2xhdG9yIDogZnVuY3Rpb24gKHRyYW5zbGF0aW9ucywgZGVmYXVsdHMpIHtcbiAgICAgICAgZGVmYXVsdHMgPSBkZWZhdWx0cyB8fCB7fTtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBzZWxmLmdldEtleSh0cmFuc2xhdGlvbnMsIGtleSwgbnVsbCk7XG4gICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhmb3JtYXQoJ1BlbmRpbmcgdHJhbnNsYXRpb24gZm9yOiAlcycsIGtleSkpO1xuICAgICAgICAgICAgdmFsdWUgPSBfdGhpcy5nZXRLZXkoZGVmYXVsdHMsIGtleSwga2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc2VsZjtcblxuICB9KCkpLFxuXG5cbi8qKlxuICogUHJvdmlkZSBmaWxlcyBhY2NvcmRpbmcgdG8gdXNlcidzIGxvY2FsZVxuICpcbiAqIEBhdXRob3IgQXJ5IFBhYmxvIEJhdGlzdGEgPGJhdGFyeXBhQGFyLmlibS5jb20+XG4gKi9cbiAgaTE4blByb3ZpZGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgREVGQVVMVF9MT0NBTEUgPSAnZW4nLFxuICAgICAgICBJMThOX0RJUiA9ICcuL2kxOG4nLFxuICAgICAgICBzZWxmID0ge1xuICAgICAgICAgIGRpY3Rpb25hcmllczoge1xuICAgICAgICAgICAgJ2VuJzogcmVxdWlyZSgnLi9pMThuL2VuJyksXG4gICAgICAgICAgICAnZXMnOiByZXF1aXJlKCcuL2kxOG4vZXMnKVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbGwgdGhlIGxvY2FsZSBvcHRpb25zLlxuICAgICAqIGZvciAnZXMtQVInWyd0cmFpdHNfZXMtQVIuanNvbicsICd0cmFpdHNfZXMuanNvbicsICd0cmFpdHMuanNvbiddXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbG9jYWxlIEEgbG9jYWxlIChmb3JtYXQ6IGxsLUNDKVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQW4gYXJyYXkgb2YgdGhlIHBvc3NpYmxlIG5hbWVzIGZvciBkaWN0aW9uYXJ5IGZpbGUuXG4gICAgICovXG4gICAgc2VsZi5nZXRMb2NhbGVPcHRpb25zID0gZnVuY3Rpb24gKGxvY2FsZSkge1xuICAgICAgdmFyXG4gICAgICAgIGxvY2FsZVBhcnRzID0gbG9jYWxlLnNwbGl0KCctJyksXG4gICAgICAgIG9wdGlvbnMgPSBbXTtcblxuICAgICAgb3B0aW9ucy5wdXNoKGxvY2FsZS5yZXBsYWNlKCctJywgJ18nKSk7XG4gICAgICBpZiAobG9jYWxlUGFydHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIG9wdGlvbnMucHVzaChsb2NhbGVQYXJ0c1swXSk7XG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMucHVzaChERUZBVUxUX0xPQ0FMRSk7XG5cbiAgICAgIHJldHVybiBvcHRpb25zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGFwcHJvcGlhdGUgZGljdGlvbmFyeSBmaWxlIGZvciB1c2VyJ3MgbG9jYWxlLlxuICAgICAqL1xuICAgIHNlbGYuZ2V0RGljdGlvbmFyeSA9IGZ1bmN0aW9uIChsb2NhbGUpIHtcbiAgICAgIHZhciBsb2NhbGVzID0gc2VsZi5nZXRMb2NhbGVPcHRpb25zKGxvY2FsZSksXG4gICAgICAgICAgZGljdDtcblxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxvY2FsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHNlbGYuZGljdGlvbmFyaWVzW2xvY2FsZXNbaV1dKSB7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuZGljdGlvbmFyaWVzW2xvY2FsZXNbaV1dO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IG9idGFpbiBhbnkgZGljdGlvbmFyeSBmb3IgbG9jYWxlIFwiJyArIGxvY2FsZSArICdcIicpO1xuICAgIH07XG5cbiAgICByZXR1cm4gc2VsZjtcblxuICB9KCkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaTE4blByb3ZpZGVyIDogaTE4blByb3ZpZGVyLFxuICBnZXREaWN0aW9uYXJ5IDogaTE4blByb3ZpZGVyLmdldERpY3Rpb25hcnksXG4gIHRyYW5zbGF0b3JGYWN0b3J5IDogdHJhbnNsYXRvckZhY3Rvcnlcbn07XG4iLCIvKipcbiAqIENvcHlyaWdodCAyMDE1IElCTSBDb3JwLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFwiZmFjZXRzXCIgOiB7XG4gIFx0XCJGcmllbmRsaW5lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiRXh0cmF2ZXJzaW9uXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJSZXNlcnZlZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIk91dGdvaW5nXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBhIHByaXZhdGUgcGVyc29uIGFuZCBkb24ndCBsZXQgbWFueSBwZW9wbGUgaW5cIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IG1ha2UgZnJpZW5kcyBlYXNpbHkgYW5kIGZlZWwgY29tZm9ydGFibGUgYXJvdW5kIG90aGVyIHBlb3BsZVwiXG4gIFx0fSxcbiAgXHRcIkdyZWdhcmlvdXNuZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkV4dHJhdmVyc2lvblwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiSW5kZXBlbmRlbnRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJTb2NpYWJsZVwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBoYXZlIGEgc3Ryb25nIGRlc2lyZSB0byBoYXZlIHRpbWUgdG8geW91cnNlbGZcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGVuam95IGJlaW5nIGluIHRoZSBjb21wYW55IG9mIG90aGVyc1wiXG4gIFx0fSxcbiAgXHRcIkFzc2VydGl2ZW5lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiRXh0cmF2ZXJzaW9uXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJEZW11cmVcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJBc3NlcnRpdmVcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgcHJlZmVyIHRvIGxpc3RlbiB0aGFuIHRvIHRhbGssIGVzcGVjaWFsbHkgaW4gZ3JvdXAgc2l0dWF0aW9uc1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgdGVuZCB0byBzcGVhayB1cCBhbmQgdGFrZSBjaGFyZ2Ugb2Ygc2l0dWF0aW9ucywgYW5kIHlvdSBhcmUgY29tZm9ydGFibGUgbGVhZGluZyBncm91cHNcIlxuICBcdH0sXG4gIFx0XCJBY3Rpdml0eS1sZXZlbFwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJFeHRyYXZlcnNpb25cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkxhaWQtYmFja1wiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkVuZXJnZXRpY1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcHByZWNpYXRlIGEgcmVsYXhlZCBwYWNlIGluIGxpZmVcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGVuam95IGEgZmFzdC1wYWNlZCwgYnVzeSBzY2hlZHVsZSB3aXRoIG1hbnkgYWN0aXZpdGllc1wiXG4gIFx0fSxcbiAgXHRcIkV4Y2l0ZW1lbnQtc2Vla2luZ1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJFeHRyYXZlcnNpb25cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNhbG0tc2Vla2luZ1wiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkV4Y2l0ZW1lbnQtc2Vla2luZ1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBwcmVmZXIgYWN0aXZpdGllcyB0aGF0IGFyZSBxdWlldCwgY2FsbSwgYW5kIHNhZmVcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBleGNpdGVkIGJ5IHRha2luZyByaXNrcyBhbmQgZmVlbCBib3JlZCB3aXRob3V0IGxvdHMgb2YgYWN0aW9uIGdvaW5nIG9uXCJcbiAgXHR9LFxuICBcdFwiQ2hlZXJmdWxuZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkV4dHJhdmVyc2lvblwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiU29sZW1uXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiQ2hlZXJmdWxcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGdlbmVyYWxseSBzZXJpb3VzIGFuZCBkbyBub3Qgam9rZSBtdWNoXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgYSBqb3lmdWwgcGVyc29uIGFuZCBzaGFyZSB0aGF0IGpveSB3aXRoIHRoZSB3b3JsZFwiXG4gIFx0fSxcbiAgXHRcIlRydXN0XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkFncmVlYWJsZW5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNhdXRpb3VzIG9mIG90aGVyc1wiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlRydXN0aW5nIG9mIG90aGVyc1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgd2FyeSBvZiBvdGhlciBwZW9wbGUncyBpbnRlbnRpb25zIGFuZCBkbyBub3QgdHJ1c3QgZWFzaWx5XCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIHRoZSBiZXN0IGluIG90aGVycyBhbmQgdHJ1c3QgcGVvcGxlIGVhc2lseVwiXG4gIFx0fSxcbiAgXHRcIkNvb3BlcmF0aW9uXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkFncmVlYWJsZW5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNvbnRyYXJ5XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiQWNjb21tb2RhdGluZ1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBkbyBub3Qgc2h5IGF3YXkgZnJvbSBjb250cmFkaWN0aW5nIG90aGVyc1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGVhc3kgdG8gcGxlYXNlIGFuZCB0cnkgdG8gYXZvaWQgY29uZnJvbnRhdGlvblwiXG4gIFx0fSxcbiAgXHRcIkFsdHJ1aXNtXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkFncmVlYWJsZW5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlNlbGYtZm9jdXNlZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkFsdHJ1aXN0aWNcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIG1vcmUgY29uY2VybmVkIHdpdGggdGFraW5nIGNhcmUgb2YgeW91cnNlbGYgdGhhbiB0YWtpbmcgdGltZSBmb3Igb3RoZXJzXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBmZWVsIGZ1bGZpbGxlZCB3aGVuIGhlbHBpbmcgb3RoZXJzLCBhbmQgd2lsbCBnbyBvdXQgb2YgeW91ciB3YXkgdG8gZG8gc29cIlxuICBcdH0sXG4gIFx0XCJNb3JhbGl0eVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJBZ3JlZWFibGVuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDb21wcm9taXNpbmdcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJVbmNvbXByb21pc2luZ1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgY29tZm9ydGFibGUgdXNpbmcgZXZlcnkgdHJpY2sgaW4gdGhlIGJvb2sgdG8gZ2V0IHdoYXQgeW91IHdhbnRcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHRoaW5rIGl0IGlzIHdyb25nIHRvIHRha2UgYWR2YW50YWdlIG9mIG90aGVycyB0byBnZXQgYWhlYWRcIlxuICBcdH0sXG4gIFx0XCJNb2Rlc3R5XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkFncmVlYWJsZW5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlByb3VkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiTW9kZXN0XCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGhvbGQgeW91cnNlbGYgaW4gaGlnaCByZWdhcmQsIHNhdGlzZmllZCB3aXRoIHdobyB5b3UgYXJlXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgdW5jb21mb3J0YWJsZSBiZWluZyB0aGUgY2VudGVyIG9mIGF0dGVudGlvblwiXG4gIFx0fSxcbiAgXHRcIlN5bXBhdGh5XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkFncmVlYWJsZW5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkhhcmRlbmVkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiRW1wYXRoZXRpY1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB0aGluayB0aGF0IHBlb3BsZSBzaG91bGQgZ2VuZXJhbGx5IHJlbHkgbW9yZSBvbiB0aGVtc2VsdmVzIHRoYW4gb24gb3RoZXIgcGVvcGxlXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBmZWVsIHdoYXQgb3RoZXJzIGZlZWwgYW5kIGFyZSBjb21wYXNzaW9uYXRlIHRvd2FyZHMgdGhlbVwiXG4gIFx0fSxcbiAgXHRcIlNlbGYtZWZmaWNhY3lcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQ29uc2NpZW50aW91c25lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlNlbGYtZG91YnRpbmdcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJTZWxmLWFzc3VyZWRcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZnJlcXVlbnRseSBkb3VidCB5b3VyIGFiaWxpdHkgdG8gYWNoaWV2ZSB5b3VyIGdvYWxzXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBmZWVsIHlvdSBoYXZlIHRoZSBhYmlsaXR5IHRvIHN1Y2NlZWQgaW4gdGhlIHRhc2tzIHlvdSBzZXQgb3V0IHRvIGRvXCJcbiAgXHR9LFxuICBcdFwiT3JkZXJsaW5lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQ29uc2NpZW50aW91c25lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlVuc3RydWN0dXJlZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIk9yZ2FuaXplZFwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBkbyBub3QgbWFrZSBhIGxvdCBvZiB0aW1lIGZvciBvcmdhbml6YXRpb24gaW4geW91ciBkYWlseSBsaWZlXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBmZWVsIGEgc3Ryb25nIG5lZWQgZm9yIHN0cnVjdHVyZSBpbiB5b3VyIGxpZmVcIlxuICBcdH0sXG4gIFx0XCJEdXRpZnVsbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJDb25zY2llbnRpb3VzbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ2FyZWZyZWVcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJEdXRpZnVsXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGRvIHdoYXQgeW91IHdhbnQsIGRpc3JlZ2FyZGluZyBydWxlcyBhbmQgb2JsaWdhdGlvbnNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHRha2UgcnVsZXMgYW5kIG9ibGlnYXRpb25zIHNlcmlvdXNseSwgZXZlbiB3aGVuIHRoZXkncmUgaW5jb252ZW5pZW50XCJcbiAgXHR9LFxuICBcdFwiQWNoaWV2ZW1lbnQtc3RyaXZpbmdcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQ29uc2NpZW50aW91c25lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNvbnRlbnRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJEcml2ZW5cIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGNvbnRlbnQgd2l0aCB5b3VyIGxldmVsIG9mIGFjY29tcGxpc2htZW50IGFuZCBkbyBub3QgZmVlbCB0aGUgbmVlZCB0byBzZXQgYW1iaXRpb3VzIGdvYWxzXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBoYXZlIGhpZ2ggZ29hbHMgZm9yIHlvdXJzZWxmIGFuZCB3b3JrIGhhcmQgdG8gYWNoaWV2ZSB0aGVtXCJcbiAgXHR9LFxuICBcdFwiU2VsZi1kaXNjaXBsaW5lXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkNvbnNjaWVudGlvdXNuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJJbnRlcm1pdHRlbnRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJQZXJzaXN0ZW50XCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGhhdmUgYSBoYXJkIHRpbWUgc3RpY2tpbmcgd2l0aCBkaWZmaWN1bHQgdGFza3MgZm9yIGEgbG9uZyBwZXJpb2Qgb2YgdGltZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgY2FuIHRhY2tsZSBhbmQgc3RpY2sgd2l0aCB0b3VnaCB0YXNrc1wiXG4gIFx0fSxcbiAgXHRcIkNhdXRpb3VzbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJDb25zY2llbnRpb3VzbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQm9sZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkRlbGliZXJhdGVcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3Ugd291bGQgcmF0aGVyIHRha2UgYWN0aW9uIGltbWVkaWF0ZWx5IHRoYW4gc3BlbmQgdGltZSBkZWxpYmVyYXRpbmcgbWFraW5nIGEgZGVjaXNpb25cIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGNhcmVmdWxseSB0aGluayB0aHJvdWdoIGRlY2lzaW9ucyBiZWZvcmUgbWFraW5nIHRoZW1cIlxuICBcdH0sXG4gIFx0XCJBbnhpZXR5XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk5ldXJvdGljaXNtXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJTZWxmLWFzc3VyZWRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJQcm9uZSB0byB3b3JyeVwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB0ZW5kIHRvIGZlZWwgY2FsbSBhbmQgc2VsZi1hc3N1cmVkXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSB0ZW5kIHRvIHdvcnJ5IGFib3V0IHRoaW5ncyB0aGF0IG1pZ2h0IGhhcHBlblwiXG4gIFx0fSxcbiAgXHRcIkFuZ2VyXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk5ldXJvdGljaXNtXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJNaWxkLXRlbXBlcmVkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiRmllcnlcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJJdCB0YWtlcyBhIGxvdCB0byBnZXQgeW91IGFuZ3J5XCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBoYXZlIGEgZmllcnkgdGVtcGVyLCBlc3BlY2lhbGx5IHdoZW4gdGhpbmdzIGRvIG5vdCBnbyB5b3VyIHdheVwiXG4gIFx0fSxcbiAgXHRcIkRlcHJlc3Npb25cIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiTmV1cm90aWNpc21cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNvbnRlbnRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJNZWxhbmNob2x5XCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBnZW5lcmFsbHkgY29tZm9ydGFibGUgd2l0aCB5b3Vyc2VsZiBhcyB5b3UgYXJlXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSB0aGluayBxdWl0ZSBvZnRlbiBhYm91dCB0aGUgdGhpbmdzIHlvdSBhcmUgdW5oYXBweSBhYm91dFwiXG4gIFx0fSxcbiAgXHRcIlNlbGYtY29uc2Npb3VzbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJOZXVyb3RpY2lzbVwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ29uZmlkZW50XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiU2VsZi1jb25zY2lvdXNcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGhhcmQgdG8gZW1iYXJyYXNzIGFuZCBhcmUgc2VsZi1jb25maWRlbnQgbW9zdCBvZiB0aGUgdGltZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIHNlbnNpdGl2ZSBhYm91dCB3aGF0IG90aGVycyBtaWdodCBiZSB0aGlua2luZyBhYm91dCB5b3VcIlxuICBcdH0sXG4gIFx0XCJJbW1vZGVyYXRpb25cIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiTmV1cm90aWNpc21cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlNlbGYtY29udHJvbGxlZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkhlZG9uaXN0aWNcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgaGF2ZSBjb250cm9sIG92ZXIgeW91ciBkZXNpcmVzLCB3aGljaCBhcmUgbm90IHBhcnRpY3VsYXJseSBpbnRlbnNlXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBmZWVsIHlvdXIgZGVzaXJlcyBzdHJvbmdseSBhbmQgYXJlIGVhc2lseSB0ZW1wdGVkIGJ5IHRoZW1cIlxuICBcdH0sXG4gIFx0XCJWdWxuZXJhYmlsaXR5XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk5ldXJvdGljaXNtXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDYWxtIHVuZGVyIHByZXNzdXJlXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiU3VzY2VwdGlibGUgdG8gc3RyZXNzXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGhhbmRsZSB1bmV4cGVjdGVkIGV2ZW50cyBjYWxtbHkgYW5kIGVmZmVjdGl2ZWx5XCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZWFzaWx5IG92ZXJ3aGVsbWVkIGluIHN0cmVzc2Z1bCBzaXR1YXRpb25zXCJcbiAgXHR9LFxuICBcdFwiSW1hZ2luYXRpb25cIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiT3Blbm5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkRvd24tdG8tZWFydGhcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJJbWFnaW5hdGl2ZVwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBwcmVmZXIgZmFjdHMgb3ZlciBmYW50YXN5XCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBoYXZlIGEgd2lsZCBpbWFnaW5hdGlvblwiXG4gIFx0fSxcbiAgXHRcIkFydGlzdGljLWludGVyZXN0c1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJPcGVubmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiVW5jb25jZXJuZWQgd2l0aCBhcnRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJBcHByZWNpYXRpdmUgb2YgYXJ0XCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBsZXNzIGNvbmNlcm5lZCB3aXRoIGFydGlzdGljIG9yIGNyZWF0aXZlIGFjdGl2aXRpZXMgdGhhbiBtb3N0IHBlb3BsZSB3aG8gcGFydGljaXBhdGVkIGluIG91ciBzdXJ2ZXlzXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBlbmpveSBiZWF1dHkgYW5kIHNlZWsgb3V0IGNyZWF0aXZlIGV4cGVyaWVuY2VzXCJcbiAgXHR9LFxuICBcdFwiRW1vdGlvbmFsaXR5XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk9wZW5uZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJEaXNwYXNzaW9uYXRlXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiRW1vdGlvbmFsbHkgYXdhcmVcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZG8gbm90IGZyZXF1ZW50bHkgdGhpbmsgYWJvdXQgb3Igb3Blbmx5IGV4cHJlc3MgeW91ciBlbW90aW9uc1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGF3YXJlIG9mIHlvdXIgZmVlbGluZ3MgYW5kIGhvdyB0byBleHByZXNzIHRoZW1cIlxuICBcdH0sXG4gIFx0XCJBZHZlbnR1cm91c25lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiT3Blbm5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNvbnNpc3RlbnRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJBZHZlbnR1cm91c1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBlbmpveSBmYW1pbGlhciByb3V0aW5lcyBhbmQgcHJlZmVyIG5vdCB0byBkZXZpYXRlIGZyb20gdGhlbVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGVhZ2VyIHRvIGV4cGVyaWVuY2UgbmV3IHRoaW5nc1wiXG4gIFx0fSxcbiAgXHRcIkludGVsbGVjdFwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJPcGVubmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ29uY3JldGVcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJQaGlsb3NvcGhpY2FsXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHByZWZlciBkZWFsaW5nIHdpdGggdGhlIHdvcmxkIGFzIGl0IGlzLCByYXJlbHkgY29uc2lkZXJpbmcgYWJzdHJhY3QgaWRlYXNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBvcGVuIHRvIGFuZCBpbnRyaWd1ZWQgYnkgbmV3IGlkZWFzIGFuZCBsb3ZlIHRvIGV4cGxvcmUgdGhlbVwiXG4gIFx0fSxcbiAgXHRcIkxpYmVyYWxpc21cIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiT3Blbm5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlJlc3BlY3RmdWwgb2YgYXV0aG9yaXR5XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiQXV0aG9yaXR5LWNoYWxsZW5naW5nXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHByZWZlciBmb2xsb3dpbmcgd2l0aCB0cmFkaXRpb24gaW4gb3JkZXIgdG8gbWFpbnRhaW4gYSBzZW5zZSBvZiBzdGFiaWxpdHlcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHByZWZlciB0byBjaGFsbGVuZ2UgYXV0aG9yaXR5IGFuZCB0cmFkaXRpb25hbCB2YWx1ZXMgdG8gaGVscCBicmluZyBhYm91dCBwb3NpdGl2ZSBjaGFuZ2VzXCJcbiAgXHR9XG4gIH0sXG4gIFwibmVlZHNcIjoge1xuICAgICAgXCJDaGFsbGVuZ2VcIjogW1xuICAgICAgICAgIFwicHJlc3RpZ2VcIixcbiAgICAgICAgICBcImNvbXBldGl0aW9uXCIsXG4gICAgICAgICAgXCJnbG9yeVwiXG4gICAgICBdLFxuICAgICAgXCJDbG9zZW5lc3NcIjogW1xuICAgICAgICAgIFwiYmVsb25naW5nbmVzc1wiLFxuICAgICAgICAgIFwibm9zdGFsZ2lhXCIsXG4gICAgICAgICAgXCJpbnRpbWFjeVwiXG4gICAgICBdLFxuICAgICAgXCJDdXJpb3NpdHlcIjogW1xuICAgICAgICAgIFwiZGlzY292ZXJ5XCIsXG4gICAgICAgICAgXCJtYXN0ZXJ5XCIsXG4gICAgICAgICAgXCJnYWluaW5nIGtub3dsZWRnZVwiXG4gICAgICBdLFxuICAgICAgXCJFeGNpdGVtZW50XCI6IFtcbiAgICAgICAgICBcInJldmVscnlcIixcbiAgICAgICAgICBcImFudGljaXBhdGlvblwiLFxuICAgICAgICAgIFwiZXhoaWxpcmF0aW9uXCJcbiAgICAgIF0sXG4gICAgICBcIkhhcm1vbnlcIjogW1xuICAgICAgICAgIFwid2VsbC1iZWluZ1wiLFxuICAgICAgICAgIFwiY291cnRlc3lcIixcbiAgICAgICAgICBcInBvbGl0ZW5lc3NcIlxuICAgICAgXSxcbiAgICAgIFwiSWRlYWxcIjogW1xuICAgICAgICAgIFwic29waGlzdGljYXRpb25cIixcbiAgICAgICAgICBcInNwaXJpdHVhbGl0eVwiLFxuICAgICAgICAgIFwic3VwZXJpb3JpdHlcIixcbiAgICAgICAgICBcImZ1bGZpbGxtZW50XCJcbiAgICAgIF0sXG4gICAgICBcIkxpYmVydHlcIjogW1xuICAgICAgICAgIFwibW9kZXJuaXR5XCIsXG4gICAgICAgICAgXCJleHBhbmRpbmcgcG9zc2liaWxpdHlcIixcbiAgICAgICAgICBcImVzY2FwZVwiLFxuICAgICAgICAgIFwic3BvbnRhbmVpdHlcIixcbiAgICAgICAgICBcIm5vdmVsdHlcIlxuICAgICAgXSxcbiAgICAgIFwiTG92ZVwiOiBbXG4gICAgICAgICAgXCJjb25uZWN0ZWRuZXNzXCIsXG4gICAgICAgICAgXCJhZmZpbml0eVwiXG4gICAgICBdLFxuICAgICAgXCJQcmFjdGljYWxpdHlcIjogW1xuICAgICAgICAgIFwiZWZmaWNpZW5jeVwiLFxuICAgICAgICAgIFwicHJhY3RpY2FsaXR5XCIsXG4gICAgICAgICAgXCJoaWdoIHZhbHVlXCIsXG4gICAgICAgICAgXCJjb252ZW5pZW5jZVwiXG4gICAgICBdLFxuICAgICAgXCJTZWxmLWV4cHJlc3Npb25cIjogW1xuICAgICAgICAgIFwic2VsZi1leHByZXNzaW9uXCIsXG4gICAgICAgICAgXCJwZXJzb25hbCBlbXBvd2VybWVudFwiLFxuICAgICAgICAgIFwicGVyc29uYWwgc3RyZW5ndGhcIlxuICAgICAgXSxcbiAgICAgIFwiU3RhYmlsaXR5XCI6IFtcbiAgICAgICAgICBcInN0YWJpbGl0eVwiLFxuICAgICAgICAgIFwiYXV0aGVudGljaXR5XCIsXG4gICAgICAgICAgXCJ0cnVzdHdvcnRoaW5lc3NcIlxuICAgICAgXSxcbiAgICAgIFwiU3RydWN0dXJlXCI6IFtcbiAgICAgICAgICBcIm9yZ2FuaXphdGlvblwiLFxuICAgICAgICAgIFwic3RyYWlnaHRmb3J3YXJkbmVzc1wiLFxuICAgICAgICAgIFwiY2xhcml0eVwiLFxuICAgICAgICAgIFwicmVsaWFiaWxpdHlcIlxuICAgICAgXVxuICB9LFxuICBcInBocmFzZXNcIjoge1xuICAgIFwiWW91IGFyZSAlc1wiOiBcIllvdSBhcmUgJXNcIixcbiAgICBcIllvdSBhcmUgJXMgYW5kICVzXCI6IFwiWW91IGFyZSAlcyBhbmQgJXNcIixcbiAgICBcIllvdSBhcmUgJXMsICVzIGFuZCAlc1wiOiBcIllvdSBhcmUgJXMsICVzIGFuZCAlc1wiLFxuICAgIFwiQW5kIHlvdSBhcmUgJXNcIjogXCJBbmQgeW91IGFyZSAlc1wiLFxuICAgIFwiWW91IGFyZSByZWxhdGl2ZWx5IHVuY29uY2VybmVkIHdpdGggJXNcIjogXCJZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCAlc1wiLFxuICAgIFwiWW91IGFyZSByZWxhdGl2ZWx5IHVuY29uY2VybmVkIHdpdGggYm90aCAlcyBhbmQgJXNcIjogXCJZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCBib3RoICVzIGFuZCAlc1wiLFxuICAgIFwiWW91IGRvbid0IGZpbmQgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiOiBcIllvdSBkb24ndCBmaW5kICVzIHRvIGJlIHBhcnRpY3VsYXJseSBtb3RpdmF0aW5nIGZvciB5b3VcIixcbiAgICBcIllvdSBkb24ndCBmaW5kIGVpdGhlciAlcyBvciAlcyB0byBiZSBwYXJ0aWN1bGFybHkgbW90aXZhdGluZyBmb3IgeW91XCI6IFwiWW91IGRvbid0IGZpbmQgZWl0aGVyICVzIG9yICVzIHRvIGJlIHBhcnRpY3VsYXJseSBtb3RpdmF0aW5nIGZvciB5b3VcIixcbiAgICBcIllvdSB2YWx1ZSBib3RoICVzIGEgYml0XCI6IFwiWW91IHZhbHVlIGJvdGggJXMgYSBiaXRcIixcbiAgICBcIllvdSB2YWx1ZSBib3RoICVzIGFuZCAlcyBhIGJpdFwiOiBcIllvdSB2YWx1ZSBib3RoICVzIGFuZCAlcyBhIGJpdFwiLFxuICAgIFwiWW91IGNvbnNpZGVyICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkb1wiIDogXCJZb3UgY29uc2lkZXIgJXMgdG8gZ3VpZGUgYSBsYXJnZSBwYXJ0IG9mIHdoYXQgeW91IGRvXCIsXG4gICAgXCJZb3UgY29uc2lkZXIgYm90aCAlcyBhbmQgJXMgdG8gZ3VpZGUgYSBsYXJnZSBwYXJ0IG9mIHdoYXQgeW91IGRvXCIgOiBcIllvdSBjb25zaWRlciBib3RoICVzIGFuZCAlcyB0byBndWlkZSBhIGxhcmdlIHBhcnQgb2Ygd2hhdCB5b3UgZG9cIixcbiAgICBcIkFuZCAlc1wiOiBcIkFuZCAlc1wiLFxuICAgIFwiWW91IHZhbHVlICVzIGEgYml0IG1vcmVcIjogXCJZb3UgdmFsdWUgJXMgYSBiaXQgbW9yZVwiLFxuICAgIFwiRXhwZXJpZW5jZXMgdGhhdCBtYWtlIHlvdSBmZWVsIGhpZ2ggJXMgYXJlIGdlbmVyYWxseSB1bmFwcGVhbGluZyB0byB5b3VcIjogXCJFeHBlcmllbmNlcyB0aGF0IG1ha2UgeW91IGZlZWwgaGlnaCAlcyBhcmUgZ2VuZXJhbGx5IHVuYXBwZWFsaW5nIHRvIHlvdVwiLFxuICAgIFwiRXhwZXJpZW5jZXMgdGhhdCBnaXZlIGEgc2Vuc2Ugb2YgJXMgaG9sZCBzb21lIGFwcGVhbCB0byB5b3VcIjogXCJFeHBlcmllbmNlcyB0aGF0IGdpdmUgYSBzZW5zZSBvZiAlcyBob2xkIHNvbWUgYXBwZWFsIHRvIHlvdVwiLFxuICAgIFwiWW91IGFyZSBtb3RpdmF0ZWQgdG8gc2VlayBvdXQgZXhwZXJpZW5jZXMgdGhhdCBwcm92aWRlIGEgc3Ryb25nIGZlZWxpbmcgb2YgJXNcIjogXCJZb3UgYXJlIG1vdGl2YXRlZCB0byBzZWVrIG91dCBleHBlcmllbmNlcyB0aGF0IHByb3ZpZGUgYSBzdHJvbmcgZmVlbGluZyBvZiAlc1wiLFxuICAgIFwiWW91ciBjaG9pY2VzIGFyZSBkcml2ZW4gYnkgYSBkZXNpcmUgZm9yICVzXCIgOiBcIllvdXIgY2hvaWNlcyBhcmUgZHJpdmVuIGJ5IGEgZGVzaXJlIGZvciAlc1wiLFxuICAgIFwiYSBiaXQgJXNcIjogXCJhIGJpdCAlc1wiLFxuICAgIFwic29tZXdoYXQgJXNcIiA6IFwic29tZXdoYXQgJXNcIixcbiAgICBcImNhbiBiZSBwZXJjZWl2ZWQgYXMgJXNcIjogXCJjYW4gYmUgcGVyY2VpdmVkIGFzICVzXCJcbiAgfSxcbiAgXCJ0cmFpdHNcIjoge1xuICAgICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5jb25zaWRlcmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wb2xpdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRpc3RydXN0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmNvb3BlcmF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0aG91Z2h0bGVzc1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInN0cmljdFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJpZ2lkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzdGVyblwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjeW5pY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ3YXJ5IG9mIG90aGVyc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VjbHVzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZXRhY2hlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wZXJzb25hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ2x1bVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImJ1bGxoZWFkZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFicnVwdFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3J1ZGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbWJhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicm91Z2hcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzbHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1hbmlwdWxhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3J1ZmZcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRldmlvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlbnNpdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hZmZlY3Rpb25hdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhc3Npb25sZXNzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmVtb3Rpb25hbFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3JpdGljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGZpc2hcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlsbC10ZW1wZXJlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW50YWdvbmlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJncnVtcHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImJpdHRlclwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlzYWdyZWVhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZW1hbmRpbmdcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb2Fyc2VcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRhY3RsZXNzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjdXJ0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJuYXJyb3ctbWluZGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjYWxsb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJydXRobGVzc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5jaGFyaXRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2aW5kaWN0aXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2hyZXdkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWNjZW50cmljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kaXZpZHVhbGlzdGljXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5wcmV0ZW50aW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtZWZmYWNpbmdcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImhlbHBmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb29wZXJhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnNpZGVyYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVzcGVjdGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBvbGl0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJlYXNvbmFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb3VydGVvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0aG91Z2h0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibG95YWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtb3JhbFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzb2Z0LWhlYXJ0ZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhZ3JlZWFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJvYmxpZ2luZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImh1bWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibGVuaWVudFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVmZmVydmVzY2VudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImhhcHB5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZnJpZW5kbHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtZXJyeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImpvdmlhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImh1bW9yb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ2VuZXJvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwbGVhc2FudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRvbGVyYW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVhY2VmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmbGV4aWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVhc3ktZ29pbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmYWlyXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2hhcml0YWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRydXN0ZnVsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZW50aW1lbnRhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFmZmVjdGlvbmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnNpdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNvZnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXNzaW9uYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicm9tYW50aWNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlcGVuZGVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2ltcGxlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJnZW5pYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0YWN0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlwbG9tYXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlZXBcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpZGVhbGlzdGljXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmFzaFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5jb29wZXJhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5yZWxpYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlzdHJ1c3RmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRob3VnaHRsZXNzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5wcmV0ZW50aW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtZWZmYWNpbmdcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZGVjaXNpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFpbWxlc3NcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ3aXNoeS13YXNoeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm5vbmNvbW1pdHRhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hbWJpdGlvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5ydWx5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYm9pc3Rlcm91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVja2xlc3NcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRldmlsLW1heS1jYXJlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVtb25zdHJhdGl2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5mb3JtYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJsb3cta2V5XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2NhdHRlcmJyYWluZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluY29uc2lzdGVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXJyYXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZm9yZ2V0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbXB1bHNpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZyaXZvbG91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZm9vbGhhcmR5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbGxvZ2ljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltbWF0dXJlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJoYXBoYXphcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJsYXhcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZsaXBwYW50XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuY29udmVudGlvbmFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicXVpcmt5XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzdGVyblwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInN0cmljdFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJpZ2lkXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZXBlbmRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVzcG9uc2libGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyZWxpYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1hbm5lcmx5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uc2lkZXJhdGVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNhdXRpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uZmlkZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHVuY3R1YWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmb3JtYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0aHJpZnR5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJpbmNpcGxlZFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhbWJpdGlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhbGVydFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZpcm1cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwdXJwb3NlZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tcGV0aXRpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGhvcm91Z2hcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzdGVhZHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb25zaXN0ZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1kaXNjaXBsaW5lZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImxvZ2ljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZWNpc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnRyb2xsZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb25jaXNlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFydGljdWxhclwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaGlnaC1zdHJ1bmdcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhZGl0aW9uYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb252ZW50aW9uYWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzb3BoaXN0aWNhdGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyZmVjdGlvbmlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kdXN0cmlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkaWduaWZpZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyZWZpbmVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3VsdHVyZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmb3Jlc2lnaHRlZFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2tlcHRpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwid2FyeSBvZiBvdGhlcnNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlY2x1c2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5jb21tdW5pY2F0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnNvY2lhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJnbHVtXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZXRhY2hlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFsb29mXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fbWludXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuYWdncmVzc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImh1bWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInN1Ym1pc3NpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0aW1pZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbXBsaWFudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm5hw692ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kaXJlY3RcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuZW5lcmdldGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzbHVnZ2lzaFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibm9ucGVyc2lzdGVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmFndWVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9taW51c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJlc3RyYWluZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZXJpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlzY3JlZXRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjYXV0aW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInByaW5jaXBsZWRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9taW51c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0cmFucXVpbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlZGF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBsYWNpZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltcGFydGlhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuYXNzdW1pbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhY3F1aWVzY2VudFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3VhcmRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBlc3NpbWlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VjcmV0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb3dhcmRseVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlY3JldGl2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNvbWJlclwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWVla1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hZHZlbnR1cm91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhc3NpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFwYXRoZXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRvY2lsZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5uZXItZGlyZWN0ZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnRyb3NwZWN0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWVkaXRhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnRlbXBsYXRpbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLWV4YW1pbmluZ1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJvcGluaW9uYXRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZm9yY2VmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRvbWluZWVyaW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJib2FzdGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYm9zc3lcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkb21pbmFudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImN1bm5pbmdcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzb2NpYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlbmVyZ2V0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlbnRodXNpYXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb21tdW5pY2F0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmlicmFudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNwaXJpdGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWFnbmV0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ6ZXN0ZnVsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fcGx1c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJib2lzdGVyb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWlzY2hpZXZvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleGhpYml0aW9uaXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJncmVnYXJpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVtb25zdHJhdGl2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhY3RpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb21wZXRpdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBlcnNpc3RlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhbWJpdGlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwdXJwb3NlZnVsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fcGx1c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb25maWRlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJib2xkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXNzdXJlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuaW5oaWJpdGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY291cmFnZW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImJyYXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1zYXRpc2ZpZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2aWdvcm91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInN0cm9uZ1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleHBsb3NpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIndvcmR5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXh0cmF2YWdhbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZvbGF0aWxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmxpcnRhdGlvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyYm9zZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5zY3J1cHVsb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwb21wb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fcGx1c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4cHJlc3NpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjYW5kaWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkcmFtYXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNwb250YW5lb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwid2l0dHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJvcHBvcnR1bmlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kZXBlbmRlbnRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX21pbnVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmVtb3Rpb25hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZW5zaXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuYWZmZWN0aW9uYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXNzaW9ubGVzc1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fbWludXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhdGllbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyZWxheGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5kZW1hbmRpbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkb3duLXRvLWVhcnRoXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwib3B0aW1pc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmNlaXRsZXNzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5jcml0aWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVucHJldGVudGlvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZm9ybWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibG93LWtleVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fbWludXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyYXRpb25hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm9iamVjdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInN0ZWFkeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImxvZ2ljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZWNpc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBvaXNlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmNpc2VcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0aG9yb3VnaFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVjb25vbWljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLWRpc2NpcGxpbmVkXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9taW51c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hc3N1bWluZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5leGNpdGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwbGFjaWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0cmFucXVpbFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fbWludXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5zZWxmY29uc2Npb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwid2VhcmlsZXNzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kZWZhdGlnYWJsZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fbWludXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wZXJ0dXJiYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZW5zaXRpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX21pbnVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaGVhcnRmZWx0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyc2F0aWxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3JlYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnRlbGxlY3R1YWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnNpZ2h0ZnVsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9wbHVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0ZW1wZXJhbWVudGFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpcnJpdGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInF1YXJyZWxzb21lXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbXBhdGllbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdydW1weVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3JhYmJ5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjcmFua3lcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX3BsdXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVtb3Rpb25hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3VsbGlibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhZmZlY3Rpb25hdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zaXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzb2Z0XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9wbHVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tcHVsc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibm9zZXlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtaW5kdWxnZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmb3JnZXRmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltcHVsc2l2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fcGx1c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhcnRpY3VsYXJcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImhpZ2gtc3RydW5nXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9wbHVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJndWFyZGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmcmV0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlY3VyZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVzc2ltaXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWNyZXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZlYXJmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm5lZ2F0aXZpc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtY3JpdGljYWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX3BsdXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjaXRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ3b3JkeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZsaXJ0YXRpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleHBsb3NpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleHRyYXZhZ2FudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidm9sYXRpbGVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX3BsdXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWFzaWx5IHJhdHRsZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlYXNpbHkgaXJrZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhcHByZWhlbnNpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX3BsdXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleGNpdGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXNzaW9uYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc3VhbFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfbWludXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvYXJzZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGFjdGxlc3NcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImN1cnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm5hcnJvdy1taW5kZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNhbGxvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX21pbnVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNpbXBsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVwZW5kZW50XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19taW51c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNob3J0c2lnaHRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZvb2xoYXJkeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWxsb2dpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbW1hdHVyZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaGFwaGF6YXJkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibGF4XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmbGlwcGFudFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfbWludXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb252ZW50aW9uYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0cmFkaXRpb25hbFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfbWludXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInByZWRpY3RhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmltYWdpbmF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29tYmVyXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhcGF0aGV0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuYWR2ZW50dXJvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyYm9zZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5zY3J1cHVsb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwb21wb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19taW51c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbXBlcnR1cmJhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlbnNpdGl2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfbWludXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlYXNpbHkgcmF0dGxlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVhc2lseSBpcmtlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFwcHJlaGVuc2l2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfcGx1c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNocmV3ZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVjY2VudHJpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZGl2aWR1YWxpc3RpY1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfcGx1c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWRlYWxpc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRpcGxvbWF0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZWVwXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGFjdGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdlbmlhbFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfcGx1c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmNvbnZlbnRpb25hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInF1aXJreVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfcGx1c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFuYWx5dGljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwZXJjZXB0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5mb3JtYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhcnRpY3VsYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlnbmlmaWVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3VsdHVyZWRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImludHJvc3BlY3RpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtZWRpdGF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udGVtcGxhdGluZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtZXhhbWluaW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5uZXItZGlyZWN0ZWRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwid29ybGRseVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRoZWF0cmljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlbG9xdWVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlucXVpc2l0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50ZW5zZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfcGx1c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjcmVhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImludGVsbGVjdHVhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluc2lnaHRmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJzYXRpbGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnZlbnRpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX3BsdXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXNzaW9uYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjaXRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc3VhbFwiXG4gICAgICAgICAgfVxuICAgICAgXVxuICB9LFxuICBcInZhbHVlc1wiOiB7XG4gICAgICBcIkhlZG9uaXNtXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIlRha2luZyBwbGVhc3VyZSBpbiBsaWZlXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgcHJlZmVyIGFjdGl2aXRpZXMgd2l0aCBhIHB1cnBvc2UgZ3JlYXRlciB0aGFuIGp1c3QgcGVyc29uYWwgZW5qb3ltZW50XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBoaWdobHkgbW90aXZhdGVkIHRvIGVuam95IGxpZmUgdG8gaXRzIGZ1bGxlc3RcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIlNlbGYtdHJhbnNjZW5kZW5jZVwiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJIZWxwaW5nIG90aGVyc1wiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHRoaW5rIHBlb3BsZSBjYW4gaGFuZGxlIHRoZWlyIG93biBidXNpbmVzcyB3aXRob3V0IGludGVyZmVyZW5jZVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSB0aGluayBpdCBpcyBpbXBvcnRhbnQgdG8gdGFrZSBjYXJlIG9mIHRoZSBwZW9wbGUgYXJvdW5kIHlvdVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkZhaXJuZXNzXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSB0aGF0IHBlb3BsZSBjcmVhdGUgdGhlaXIgb3duIG9wcG9ydHVuaXRpZXNcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSBpbiBzb2NpYWwganVzdGljZSBhbmQgZXF1YWxpdHkgZm9yIGFsbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIlNvY2lhbCBqdXN0aWNlXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSB0aGF0IHBlb3BsZSBjcmVhdGUgdGhlaXIgb3duIG9wcG9ydHVuaXRpZXNcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSBpbiBzb2NpYWwganVzdGljZSBhbmQgZXF1YWxpdHkgZm9yIGFsbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkVxdWFsaXR5XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSB0aGF0IHBlb3BsZSBjcmVhdGUgdGhlaXIgb3duIG9wcG9ydHVuaXRpZXNcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSBpbiBzb2NpYWwganVzdGljZSBhbmQgZXF1YWxpdHkgZm9yIGFsbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkNvbW11bml0eSBzZXJ2aWNlXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgdGhpbmsgcGVvcGxlIGNhbiBoYW5kbGUgdGhlaXIgb3duIGJ1c2luZXNzIHdpdGhvdXQgaW50ZXJmZXJlbmNlXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHRoaW5rIGl0IGlzIGltcG9ydGFudCB0byB0YWtlIGNhcmUgb2YgdGhlIHBlb3BsZSBhcm91bmQgeW91XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zZXJ2YXRpb25cIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiVHJhZGl0aW9uXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgY2FyZSBtb3JlIGFib3V0IG1ha2luZyB5b3VyIG93biBwYXRoIHRoYW4gZm9sbG93aW5nIHdoYXQgb3RoZXJzIGhhdmUgZG9uZVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBoaWdobHkgcmVzcGVjdCB0aGUgZ3JvdXBzIHlvdSBiZWxvbmcgdG8gYW5kIGZvbGxvdyB0aGVpciBndWlkYW5jZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkhhcm1vbnlcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBkZWNpZGUgd2hhdCBpcyByaWdodCBiYXNlZCBvbiB5b3VyIGJlbGllZnMsIG5vdCB3aGF0IG90aGVyIHBlb3BsZSB0aGlua1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBrbm93IHJ1bGVzIGFyZSB0aGVyZSBmb3IgYSByZWFzb24sIGFuZCB5b3UgdHJ5IG5ldmVyIHRvIGJyZWFrIHRoZW1cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJIdW1pbGl0eVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGRlY2lkZSB3aGF0IGlzIHJpZ2h0IGJhc2VkIG9uIHlvdXIgYmVsaWVmcywgbm90IHdoYXQgb3RoZXIgcGVvcGxlIHRoaW5rXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHNlZSB3b3J0aCBpbiBkZWZlcnJpbmcgdG8gb3RoZXJzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiU29jaWFsIG5vcm1zXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZGVjaWRlIHdoYXQgaXMgcmlnaHQgYmFzZWQgb24geW91ciBiZWxpZWZzLCBub3Qgd2hhdCBvdGhlciBwZW9wbGUgdGhpbmtcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3Uga25vdyBydWxlcyBhcmUgdGhlcmUgZm9yIGEgcmVhc29uLCBhbmQgeW91IHRyeSBuZXZlciB0byBicmVhayB0aGVtXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiU2VjdXJpdHlcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIHRoYXQgc2VjdXJpdHkgaXMgd29ydGggc2FjcmlmaWNpbmcgdG8gYWNoaWV2ZSBvdGhlciBnb2Fsc1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIHRoYXQgc2FmZXR5IGFuZCBzZWN1cml0eSBhcmUgaW1wb3J0YW50IHRoaW5ncyB0byBzYWZlZ3VhcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJTYWZldHlcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIHRoYXQgc2FmZXR5IGlzIHdvcnRoIHNhY3JpZmljaW5nIHRvIGFjaGlldmUgb3RoZXIgZ29hbHNcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSB0aGF0IHNhZmV0eSBhbmQgc2VjdXJpdHkgYXJlIGltcG9ydGFudCB0aGluZ3MgdG8gc2FmZWd1YXJkXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzcy10by1jaGFuZ2VcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiSW5kZXBlbmRlbmNlXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3Ugd2VsY29tZSB3aGVuIG90aGVycyBkaXJlY3QgeW91ciBhY3Rpdml0aWVzIGZvciB5b3VcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgbGlrZSB0byBzZXQgeW91ciBvd24gZ29hbHMgdG8gZGVjaWRlIGhvdyB0byBiZXN0IGFjaGlldmUgdGhlbVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkV4Y2l0ZW1lbnRcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB3b3VsZCByYXRoZXIgc3RpY2sgd2l0aCB0aGluZ3MgeW91IGFscmVhZHkga25vdyB5b3UgbGlrZSB0aGFuIHJpc2sgdHJ5aW5nIHNvbWV0aGluZyBuZXcgYW5kIHJpc2t5XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBlYWdlciB0byBzZWFyY2ggb3V0IG5ldyBhbmQgZXhjaXRpbmcgZXhwZXJpZW5jZXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJDcmVhdGl2aXR5XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3Ugd291bGQgcmF0aGVyIHN0aWNrIHdpdGggdGhpbmdzIHlvdSBhbHJlYWR5IGtub3cgeW91IGxpa2UgdGhhbiByaXNrIHRyeWluZyBzb21ldGhpbmcgbmV3IGFuZCByaXNreVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZWFnZXIgdG8gc2VhcmNoIG91dCBuZXcgYW5kIGV4Y2l0aW5nIGV4cGVyaWVuY2VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiQ3VyaW9zaXR5XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3Ugd291bGQgcmF0aGVyIHN0aWNrIHdpdGggdGhpbmdzIHlvdSBhbHJlYWR5IGtub3cgeW91IGxpa2UgdGhhbiByaXNrIHRyeWluZyBzb21ldGhpbmcgbmV3IGFuZCByaXNreVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZWFnZXIgdG8gc2VhcmNoIG91dCBuZXcgYW5kIGV4Y2l0aW5nIGV4cGVyaWVuY2VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiU2VsZi1kaXJlY3Rpb25cIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB3ZWxjb21lIHdoZW4gb3RoZXJzIGRpcmVjdCB5b3VyIGFjdGl2aXRpZXMgZm9yIHlvdVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBsaWtlIHRvIHNldCB5b3VyIG93biBnb2FscyB0byBkZWNpZGUgaG93IHRvIGJlc3QgYWNoaWV2ZSB0aGVtXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiRnJlZWRvbVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHdlbGNvbWUgd2hlbiBvdGhlcnMgZGlyZWN0IHlvdXIgYWN0aXZpdGllcyBmb3IgeW91XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGxpa2UgdG8gc2V0IHlvdXIgb3duIGdvYWxzIHRvIGRlY2lkZSBob3cgdG8gYmVzdCBhY2hpZXZlIHRoZW1cIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIlNlbGYtZW5oYW5jZW1lbnRcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiQWNoaWV2aW5nIHN1Y2Nlc3NcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBtYWtlIGRlY2lzaW9ucyB3aXRoIGxpdHRsZSByZWdhcmQgZm9yIGhvdyB0aGV5IHNob3cgb2ZmIHlvdXIgdGFsZW50c1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBzZWVrIG91dCBvcHBvcnR1bml0aWVzIHRvIGltcHJvdmUgeW91cnNlbGYgYW5kIGRlbW9uc3RyYXRlIHRoYXQgeW91IGFyZSBhIGNhcGFibGUgcGVyc29uXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiR2FpbmluZyBzb2NpYWwgc3RhdHVzXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGNvbWZvcnRhYmxlIHdpdGggeW91ciBzb2NpYWwgc3RhdHVzIGFuZCBkb24ndCBmZWVsIGEgc3Ryb25nIG5lZWQgdG8gaW1wcm92ZSBpdFwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBwdXQgc3Vic3RhbnRpYWwgZWZmb3J0IGludG8gaW1wcm92aW5nIHlvdXIgc3RhdHVzIGFuZCBwdWJsaWMgaW1hZ2VcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJBbWJpdGlvblwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBjb21mb3J0YWJsZSB3aXRoIHlvdXIgc29jaWFsIHN0YXR1cyBhbmQgZG9uJ3QgZmVlbCBhIHN0cm9uZyBuZWVkIHRvIGltcHJvdmUgaXRcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZmVlbCBpdCBpcyBpbXBvcnRhbnQgdG8gcHVzaCBmb3J3YXJkIHRvd2FyZHMgZ29hbHNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJIaWdoIGFjaGlldmVtZW50XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgbWFrZSBkZWNpc2lvbnMgd2l0aCBsaXR0bGUgcmVnYXJkIGZvciBob3cgdGhleSBzaG93IG9mZiB5b3VyIHRhbGVudHNcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3Ugc2VlayBvdXQgb3Bwb3J0dW5pdGllcyB0byBpbXByb3ZlIHlvdXJzZWxmIGFuZCBkZW1vbnN0cmF0ZSB0aGF0IHlvdSBhcmUgYSBjYXBhYmxlIHBlcnNvblwiXG4gICAgICAgICAgfVxuICAgICAgXVxuICB9XG59XG4iLCIvKipcbiAqIENvcHlyaWdodCAyMDE1IElCTSBDb3JwLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFwiZmFjZXRzXCI6e1xuICAgIFwiQXJ0aXN0aWMtaW50ZXJlc3RzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlVuYSBwZXJzb25hIHF1ZSBhcHJlY2lhIGVsIGFydGVcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQXBlcnR1cmEgYSBleHBlcmllbmNpYXNcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJEaXNmcnV0YSBkZSBsYSBiZWxsZXphIHkgYnVzY2EgZXhwZXJpZW5jaWFzIGNyZWF0aXZhc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiTGUgaW50ZXJlc2FuIG1lbm9zIGxhcyBhY3RpdmlkYWRlcyBhcnTDrXN0aWNhcyBvIGNyZWF0aXZhcyBxdWUgbGEgbWF5b3LDrWEgZGUgbGFzIHBlcnNvbmFzIHF1ZSBwYXJ0aWNpcGFyb24gZGUgbnVlc3RyYXMgZW5jdWVzdGFzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlVuYSBwZXJzb25hIGRlc2ludGVyZXNhZGEgcG9yIGVsIGFydGVcIlxuICAgIH0sXG4gICAgXCJEdXRpZnVsbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJVbmEgcGVyc29uYSBxdWUgY3VtcGxlIGNvbiBzdSBkZWJlclwiLFxuICAgICAgICBcIkJpZzVcIjogXCJSZXNwb25zYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJUb21hIGxhcyByZWdsYXMgeSBsYXMgb2JsaWdhY2lvbmVzIHNlcmlhbWVudGUsIGHDum4gY3VhbmRvIHNvbiBpbmNvbnZlbmllbnRlc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiSGFjZSBsbyBxdWUgcXVpZXJlIHNpbiBpbXBvcnRhciBsYXMgcmVnbGFzIHkgbGFzIG9ibGlnYWNpb25lc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJEZXNwcmVvY3VwYWRvXCJcbiAgICB9LFxuICAgIFwiQ29vcGVyYXRpb25cIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiQWNvbW9kYXRpY2lvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFmYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFcyBmw6FjaWwgZGUgY29tcGxhY2VyIGUgaW50ZW50YSBldml0YXIgcG9zaWJsZXMgY29uZnJvbnRhY2lvbmVzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJObyB0ZSBpbXBvcnRhIGNvbnRyYWRlY2lyIGEgbG9zIGRlbcOhc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJDb250cmFyaW9cIlxuICAgIH0sXG4gICAgXCJTZWxmLWNvbnNjaW91c25lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiQ29uc2NpZW50ZSBkZSBzw60gbWlzbW9cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmFuZ28gZW1vY2lvbmFsXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXMgc2Vuc2libGUgYSBsbyBxdWUgbGFzIGRlbcOhcyBwZXJzb25hcyBwb2Ryw61hbiBlc3RhciBwZW5zYW5kbyBhY2VyY2EgZGUgdXN0ZWRcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkVzIGRpZsOtY2lsIGRlIGF2ZXJnb256YXIgeSBjb25mw61hIGVuIHPDrSBtaXNtbyBsYSBtYXlvciBwYXJ0ZSBkZWwgdGllbXBvXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkNvbmZpYWRvXCJcbiAgICB9LFxuICAgIFwiT3JkZXJsaW5lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiT3JnYW5pemFkb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJSZXNwb25zYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTaWVudGUgdW5hIGZ1ZXJ0ZSBuZWNlc2lkYWQgZGUgbWFudGVuZXIgdW5hIHZpZGEgZXN0cnVjdHVyYWRhXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJObyBsZSBkZWRpY2EgbXVjaG8gdGllbXBvIGEgb3JnYW5pemFyc2UgZW4gc3UgdmlkYSBkaWFyaWFcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiRGVzZXN0cnVjdHVyYWRvXCJcbiAgICB9LFxuICAgIFwiU3ltcGF0aHlcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiRW1ww6F0aWNvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFmYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTaWVudGUgbG8gcXVlIG90cm9zIHNpZW50ZW4geSBlcyBjb21wYXNpdm8gY29uIGVsbG9zXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBsYXMgcGVyc29uYXMgZGViZXLDrWFuIGNvbmZpYXIgbcOhcyBlbiBzw60gbWlzbW9zIHF1ZSBlbiBvdHJhcyBwZXJzb25hc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJVbmEgcGVyc29uYSBkZSBncmFuIGZvcnRhbGV6YVwiXG4gICAgfSxcbiAgICBcIkFjdGl2aXR5LWxldmVsXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkVuZXJnw6l0aWNvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkV4dHJhdmVyc2nDs25cIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJEaXNmcnV0YSBsbGV2YXIgdW4gcml0bW8gZGUgdmlkYSBhY2VsZXJhZG8sIHVuYSBhZ2VuZGEgb2N1cGFkYSBjb24gbXVjaGFzIGFjdGl2aWRhZGVzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJBcHJlY2lhIGxsZXZhciB1biByaXRtbyBkZSB2aWRhIHJlbGFqYWRvXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlJlbGFqYWRvXCJcbiAgICB9LFxuICAgIFwiU2VsZi1lZmZpY2FjeVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJTZWd1cm8gZGUgc8OtIG1pc21vXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJlc3BvbnNhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNpZW50ZSBxdWUgdGllbmUgbGEgaGFiaWxpZGFkIGRlIHRyaXVuZmFyIGVuIGxhcyB0YXJlYXMgcXVlIHNlIHByb3BvbmUgcmVhbGl6YXJcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkZyZWN1ZW50ZW1lbnRlIGR1ZGEgYWNlcmNhIGRlIHN1IGhhYmlsaWRhZCBwYXJhIGFsY2FuemFyIHN1cyBtZXRhc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJJbnNlZ3VybyBkZSBzw60gbWlzbWFcIlxuICAgIH0sXG4gICAgXCJTZWxmLWRpc2NpcGxpbmVcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiUGVyc2lzdGVudGVcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmVzcG9uc2FiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiUHVlZGUgaGFjZXIgZnJlbnRlIHkgbGxldmFyIGEgY2FibyB0YXJlYXMgZGlmw61jaWxlc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiTGUgZGEgdHJhYmFqbyBsbGV2YXIgYWRlbGFudGUgdGFyZWFzIGRpZsOtY2lsZXMgcG9yIHVuIGxhcmdvIHBlcmlvZG8gZGUgdGllbXBvXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkludGVybWl0ZW50ZVwiXG4gICAgfSxcbiAgICBcIkFsdHJ1aXNtXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkFsdHJ1aXN0YVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJBZmFiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2Ugc2llbnRlIHJlYWxpemFkbyBheXVkYW5kbyBhIG90cm9zIHkgZGVqYXLDoSBzdXMgY29zYXMgZGUgbGFkbyBwYXJhIGhhY2VybG9cIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkVzdMOhIG3DoXMgZW5mb2NhZG8gZW4gY3VpZGFyIGRlIHVzdGVkIG1pc21vIHF1ZSBlbiBkZWRpY2FyIHRpZW1wbyBhIG90cmFzIHBlcnNvbmFzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkluZGl2aWR1YWxpc3RhXCJcbiAgICB9LFxuICAgIFwiQ2F1dGlvdXNuZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlBydWRlbnRlXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJlc3BvbnNhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlBpZW5zYSBjdWlkYWRvc2FtZW50ZSBhY2VyY2EgZGUgc3VzIGRlY2lzaW9uZXMgYW50ZXMgZGUgdG9tYXJsYXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIHRvbWFyIGFjY2nDs24gaW5tZWRpYXRhbWVudGUgYW50ZXMgcXVlIGludmVydGlyIHRpZW1wbyBkZWxpYmVyYW5kbyBxdcOpIGRlY2lzacOzbiB0b21hclwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJBdWRhelwiXG4gICAgfSxcbiAgICBcIk1vcmFsaXR5XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkludHJhbnNpZ2VudGVcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQWZhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlBpZW5zYSBxdWUgZXN0w6EgbWFsIHRvbWFyIHZlbnRhamEgZGUgbG9zIGRlbcOhcyBwYXJhIGF2YW56YXJcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlV0aWxpemEgY3VhbHF1aWVyIG1lZGlvIHBvc2libGUgcGFyYSBjb25zZWd1aXIgbG8gcXVlIHF1aWVyZSB5IGVzdMOhIGPDs21vZG8gY29uIGVsbG9cIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiVW5hIHBlcnNvbmEgY29tcHJvbWV0aWRhXCJcbiAgICB9LFxuICAgIFwiQW54aWV0eVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJQcm9wZW5zbyBhIHByZW9jdXBhcnNlXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJhbmdvIGVtb2Npb25hbFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlRpZW5kZSBhIHByZW9jdXBhcnNlIGFjZXJjYSBkZSBsYXMgY29zYXMgcXVlIHBvZHLDrWFuIHBhc2FyXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJUaWVuZGUgYSBzZW50aXJzZSB0cmFucXVpbG8geSBhIGNvbmZpYXIgZW4gc8OtIG1pc21vXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlNlZ3VybyBkZSBzw60gbWlzbW9cIlxuICAgIH0sXG4gICAgXCJFbW90aW9uYWxpdHlcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiRW1vY2lvbmFsbWVudGUgY29uc2NpZW50ZVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJBcGVydHVyYSBhIGV4cGVyaWVuY2lhc1wiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzIGNvbnNjaWVudGUgZGUgc3VzIHNlbnRpbWllbnRvcyB5IGRlIGPDs21vIGV4cHJlc2FybG9zXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJObyBwaWVuc2EgZnJlY3VlbnRlbWVudGUgYWNlcmNhIGRlIHN1cyBlbW9jaW9uZXMgbmkgbGFzIGV4cHJlc2EgYWJpZXJ0YW1lbnRlXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkRlc2FwYXNpb25hZG9cIlxuICAgIH0sXG4gICAgXCJWdWxuZXJhYmlsaXR5XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlN1c2NlcHRpYmxlIGFsIGVzdHLDqXNcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmFuZ28gZW1vY2lvbmFsXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2UgYWJydW1hIGbDoWNpbG1lbnRlIGVuIHNpdHVhY2lvbmVzIGRlIGVzdHLDqXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIk1hbmVqYSBldmVudG9zIGluZXNwZXJhZG9zIGNvbiBjYWxtYSB5IGVmZWN0aXZhbWVudGVcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiVW5hIHBlcnNvbmEgcXVlIG1hbnRpZW5lIGxhIGNhbG1hIGJham8gcHJlc2nDs25cIlxuICAgIH0sXG4gICAgXCJJbW1vZGVyYXRpb25cIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiSGVkb25pc3RhXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJhbmdvIGVtb2Npb25hbFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNpZW50ZSBmdWVydGVtZW50ZSBzdXMgZGVzZW9zIHkgZXMgZsOhY2lsbWVudGUgdGVudGFkbyBwb3IgZWxsb3NcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkNvbnRyb2xhIHN1cyBkZXNlb3MsIGxvcyBjdWFsZXMgbm8gc29uIHBhcnRpY3VsYXJtZW50ZSBpbnRlbnNvc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJTZXJlbm9cIlxuICAgIH0sXG4gICAgXCJGcmllbmRsaW5lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiRXh0cm92ZXJ0aWRvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkV4dHJhdmVyc2nDs25cIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJIYWNlIGFtaWdvcyBmw6FjaWxtZW50ZSB5IHNlIHNpZW50ZSBjw7Ntb2RvIGVzdGFuZG8gY29uIG90cmFzIHBlcnNvbmFzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJFcyB1bmEgcGVyc29uYSByZXNlcnZhZGEgeSBubyBkZWphIGEgbXVjaGFzIHBlcnNvbmFzIGVudHJhclwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJSZXNlcnZhZG9cIlxuICAgIH0sXG4gICAgXCJBY2hpZXZlbWVudC1zdHJpdmluZ1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJVbmEgcGVyc29uYSBtb3RpdmFkYVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJSZXNwb25zYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTZSBwcm9wb25lIGdyYW5kZXMgbWV0YXMgeSB0cmFiYWphIGR1cm8gcGFyYSBhbGNhbnphcmxhc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRXN0w6EgY29uZm9ybWUgY29uIHN1cyBsb2dyb3MgeSBubyBzaWVudGUgbGEgbmVjZXNpZGFkIGRlIHBvbmVyc2UgbWV0YXMgbcOhcyBhbWJpY2lvc2FzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlVuYSBwZXJzb25hIHNhdGlzZmVjaGFcIlxuICAgIH0sXG4gICAgXCJNb2Rlc3R5XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIk1vZGVzdG9cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQWZhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNlIHNpZW50ZSBjw7Ntb2RvIHNpZW5kbyBlbCBjZW50cm8gZGUgYXRlbmNpw7NuXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJTZSB0aWVuZSB1bmEgZXN0aW1hIGFsdGEsIHNlIGVuY3VlbnRyYSBzYXRpc2ZlY2hvIGNvbiBxdWnDqW4gZXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiT3JndWxsb3NvXCJcbiAgICB9LFxuICAgIFwiRXhjaXRlbWVudC1zZWVraW5nXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlVuYSBwZXJzb25hIHF1ZSBidXNjYSBsYSBlbW9jacOzblwiLFxuICAgICAgICBcIkJpZzVcIjogXCJFeHRyYXZlcnNpw7NuXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiTGUgZW1vY2lvbmEgdG9tYXIgcmllc2dvcyB5IHNlIGFidXJyZSBzaSBubyBzZSB2ZSBlbnZ1ZWx0byBlbiBtdWNoYSBhY2Npw7NuXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBsYXMgYWN0aXZpZGFkZXMgdHJhbnF1aWxhcywgcGFjw61maWNhcyB5IHNlZ3VyYXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiVW5hIHBlcnNvbmEgcXVlIGJ1c2NhIGxhIGNhbG1hXCJcbiAgICB9LFxuICAgIFwiQXNzZXJ0aXZlbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJBc2VydGl2b1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJFeHRyYXZlcnNpw7NuXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiVGllbmRlIGEgZXhwcmVzYXJzZSB5IGEgaGFjZXJzZSBjYXJnbyBkZSBsYXMgc2l0dWFjaW9uZXMsIHkgc2UgZW5jdWVudHJhIGPDs21vZG8gbGlkZXJhbmRvIGdydXBvc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgZXNjdWNoYXIgYW50ZXMgcXVlIGhhYmxhciwgZXNwZWNpYWxtZW50ZSBlbiBzaXR1YWNpb25lcyBkZSBncnVwb1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJDYWxsYWRvXCJcbiAgICB9LFxuICAgIFwiQWR2ZW50dXJvdXNuZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkF1ZGF6XCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFwZXJ0dXJhIGEgZXhwZXJpZW5jaWFzXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXN0w6EgZGVzZW9zbyBkZSB0ZW5lciBudWV2YXMgZXhwZXJpZW5jaWFzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJEaXNmcnV0YSBkZSBsYXMgcnV0aW5hcyBmYW1pbGlhcmVzIHkgcHJlZmllcmUgbm8gZGVzdmlhcnNlIGRlIGVsbGFzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkNvbnNpc3RlbnRlXCJcbiAgICB9LFxuICAgIFwiR3JlZ2FyaW91c25lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiU29jaWFibGVcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiRXh0cmF2ZXJzacOzblwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkRpc2ZydXRhIGVzdGFuZG8gZW4gY29tcGHDscOtYSBkZSBvdHJvc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiVGllbmUgdW4gZnVlcnRlIGRlc2VvIGRlIHRlbmVyIHRpZW1wbyBwYXJhIHVzdGVkIG1pc21vXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkluZGVwZW5kaWVudGVcIlxuICAgIH0sXG4gICAgXCJDaGVlcmZ1bG5lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiQWxlZ3JlXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkV4dHJhdmVyc2nDs25cIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFcyB1bmEgcGVyc29uYSBhbGVncmUgeSBjb21wYXJ0ZSBlc2EgYWxlZ3LDrWEgY29uIGVsIG11bmRvXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJHZW5lcmFsbWVudGUgZXMgc2VyaW8geSBubyBoYWNlIG11Y2hhcyBicm9tYXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiU29sZW1uZVwiXG4gICAgfSxcbiAgICBcIkltYWdpbmF0aW9uXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkltYWdpbmF0aXZvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFwZXJ0dXJhIGEgZXhwZXJpZW5jaWFzXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU3UgaW1hZ2luYWNpw7NuIHZ1ZWxhIGxpYnJlXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBoZWNob3MgYW50ZXMgcXVlIGxhIGZhbnRhc8OtYVwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJVbmEgcGVyc29uYSBjb24gbG9zIHBpZXMgZW4gbGEgdGllcnJhXCJcbiAgICB9LFxuICAgIFwiRGVwcmVzc2lvblwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJNZWxhbmPDs2xpY29cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmFuZ28gZW1vY2lvbmFsXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiUGllbnNhIGJhc3RhbnRlIHNlZ3VpZG8gZW4gbGFzIGNvc2FzIGNvbiBsYXMgcXVlIGVzdMOhIGRpc2NvbmZvcm1lXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJHZW5lcmFsbWVudGUgc2UgYWNlcHRhIGEgdXN0ZWQgbWlzbW8gdGFsIGN1YWwgZXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiVW5hIHBlcnNvbmEgc2F0aXNmZWNoYVwiXG4gICAgfSxcbiAgICBcIkFuZ2VyXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkludGVuc29cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmFuZ28gZW1vY2lvbmFsXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiVGllbmUgdW4gdGVtcGVyYW1lbnRvIGZ1ZXJ0ZSwgZXNwZWNpYWxtZW50ZSBjdWFuZG8gbGFzIGNvc2FzIG5vIGZ1bmNpb25hbiBjb21vIGVzcGVyYVwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRXMgZGlmw61jaWwgaGFjZXJsZSBlbm9qYXJcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiQXBhY2libGVcIlxuICAgIH0sXG4gICAgXCJUcnVzdFwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJVbmEgcGVyc29uYSBxdWUgY29uZsOtYSBlbiBsb3MgZGVtw6FzXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFmYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIGxvIG1lam9yIGRlIGxvcyBkZW3DoXMgeSBjb25mw61hIGbDoWNpbG1lbnRlIGVuIGxhcyBwZXJzb25hc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiU2UgY3VpZGEgZGUgbGFzIGludGVuY2lvbmVzIGRlIGxvcyBkZW3DoXMgeSBubyBjb25mw61hIGbDoWNpbG1lbnRlXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkN1aWRhZG9zbyBjb24gbG9zIGRlbcOhc1wiXG4gICAgfSxcbiAgICBcIkludGVsbGVjdFwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJGaWxvc8OzZmljb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJBcGVydHVyYSBhIGV4cGVyaWVuY2lhc1wiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzdMOhIGFiaWVydG8gYSBudWV2YXMgaWRlYXMsIGxlIGludHJpZ2FuIHkgYW1hIGV4cGxvcmFybGFzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBsaWRpYXIgY29uIGVsIG11bmRvIHRhbCBjdWFsIGVzLCByYXJhbWVudGUgY29uc2lkZXJhbmRvIGlkZWFzIGFic3RyYWN0YXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiQ29uY3JldG9cIlxuICAgIH0sXG4gICAgXCJMaWJlcmFsaXNtXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkRlc2FmaWFudGUgYW50ZSBsYSBhdXRvcmlkYWRcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQXBlcnR1cmEgYSBleHBlcmllbmNpYXNcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBkZXNhZmlhciBhIGxhIGF1dG9yaWRhZCB5ICBhIGxvcyB2YWxvcmVzIHRyYWRpY2lvbmFsZXMgcGFyYSBsb2dyYXIgY2FtYmlvcyBwb3NpdGl2b3NcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIHNlZ3VpciB0cmFkaWNpb25lcyBwYXJhIG1hbnRlbmVyIHVuYSBzZW5zYWNpw7NuIGRlIGVzdGFiaWxpZGFkXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlJlc3BldHVvc28gZGUgbGEgYXV0b3JpZGFkXCJcbiAgICB9XG4gIH0sXG4gIFwibmVlZHNcIjoge1xuICAgIFwiU3RhYmlsaXR5XCI6IFtcbiAgICAgICAgXCJlc3RhYmlsaWRhZFwiLFxuICAgICAgICBcImF1dGVudGljaWRhZFwiLFxuICAgICAgICBcImludGVncmlkYWRcIlxuICAgIF0sXG4gICAgXCJQcmFjdGljYWxpdHlcIjogW1xuICAgICAgICBcImVmaWNpZW5jaWFcIixcbiAgICAgICAgXCJwcmFjdGljaWRhZFwiLFxuICAgICAgICBcInZhbG9yIGFncmVnYWRvXCIsXG4gICAgICAgIFwiY29udmVuaWVuY2lhXCJcbiAgICBdLFxuICAgIFwiTG92ZVwiOiBbXG4gICAgICAgIFwiYWZpbmlkYWRcIixcbiAgICAgICAgXCJjb25leGnDs25cIlxuICAgIF0sXG4gICAgXCJTZWxmLWV4cHJlc3Npb25cIjogW1xuICAgICAgICBcImF1dG8tZXhwcmVzacOzblwiLFxuICAgICAgICBcImVtcG9kZXJhbWllbnRvIHBlcnNvbmFsXCIsXG4gICAgICAgIFwiZm9ydGFsZXphIHBlcnNvbmFsXCJcbiAgICBdLFxuICAgIFwiQ2hhbGxlbmdlXCI6IFtcbiAgICAgICAgXCJwcmVzdGlnaW9cIixcbiAgICAgICAgXCJjb21wZXRlbmNpYVwiLFxuICAgICAgICBcImdsb3JpYVwiXG4gICAgXSxcbiAgICBcIkNsb3NlbmVzc1wiOiBbXG4gICAgICAgIFwicGVydGVuZW5jaWFcIixcbiAgICAgICAgXCJub3N0YWxnaWFcIixcbiAgICAgICAgXCJpbnRpbWlkYWRcIlxuICAgIF0sXG4gICAgXCJMaWJlcnR5XCI6IFtcbiAgICAgICAgXCJtb2Rlcm5pZGFkXCIsXG4gICAgICAgIFwiZXhwYW5zacOzbiBkZSBwb3NpYmlsaWRhZGVzXCIsXG4gICAgICAgIFwicG9kZXIgZXNjYXBhclwiLFxuICAgICAgICBcImVzcG9udGFuZWlkYWRcIixcbiAgICAgICAgXCJub3ZlZGFkXCJcbiAgICBdLFxuICAgIFwiRXhjaXRlbWVudFwiOiBbXG4gICAgICAgIFwicmVnb2Npam9cIixcbiAgICAgICAgXCJhbnRpY2lwYWNpw7NuXCIsXG4gICAgICAgIFwiY2VicmFjacOzblwiXG4gICAgXSxcbiAgICBcIklkZWFsXCI6IFtcbiAgICAgICAgXCJzb2Zpc3RpY2FjacOzblwiLFxuICAgICAgICBcImVzcGlyaXR1YWxpZGFkXCIsXG4gICAgICAgIFwic3VwZXJpb3JpZGFkXCIsXG4gICAgICAgIFwicmVhbGl6YWNpw7NuXCJcbiAgICBdLFxuICAgIFwiSGFybW9ueVwiOiBbXG4gICAgICAgIFwiYmllbmVzdGFyXCIsXG4gICAgICAgIFwiY29ydGVzw61hXCIsXG4gICAgICAgIFwiY2l2aWxpZGFkXCJcbiAgICBdLFxuICAgIFwiQ3VyaW9zaXR5XCI6IFtcbiAgICAgICAgXCJkZXNjdWJyaW1pZW50b1wiLFxuICAgICAgICBcIm1hZXN0csOtYVwiLFxuICAgICAgICBcImFkcXVpc2ljacOzbiBkZSBjb25vY2ltaWVudG9cIlxuICAgIF0sXG4gICAgXCJTdHJ1Y3R1cmVcIjogW1xuICAgICAgICBcIm9yZ2FuaXphY2nDs25cIixcbiAgICAgICAgXCJmcmFucXVlemFcIixcbiAgICAgICAgXCJjbGFyaWRhZFwiLFxuICAgICAgICBcImNvbmZpYWJpbGlkYWRcIlxuICAgIF1cbiAgfSxcbiAgXCJwaHJhc2VzXCI6IHtcbiAgICBcIllvdSBhcmUgJXNcIjogXCJVc3RlZCBlcyAlc1wiLFxuICAgIFwiWW91IGFyZSAlcyBhbmQgJXNcIjogXCJVc3RlZCBlcyAlcyB5ICVzXCIsXG4gICAgXCJZb3UgYXJlICVzLCAlcyBhbmQgJXNcIjogXCJVc3RlZCBlcyAlcywgJXMgeSAlc1wiLFxuICAgIFwiQW5kIHlvdSBhcmUgJXNcIjogXCJZIHVzdGVkIGVzICVzXCIsXG4gICAgXCJZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCAlc1wiOiBcIlVzdGVkIGVzIHJlbGF0aXZhbWVudGUgaW5kaWZlcmVudGUgY29uICVzXCIsXG4gICAgXCJZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCBib3RoICVzIGFuZCAlc1wiOiBcIlVzdGVkIGVzIHJlbGF0aXZhbWVudGUgaW5kaWZlcmVudGUgY29uICVzIHkgJXNcIixcbiAgICBcIllvdSBkb24ndCBmaW5kICVzIHRvIGJlIHBhcnRpY3VsYXJseSBtb3RpdmF0aW5nIGZvciB5b3VcIjogXCJVc3RlZCBubyBlbmN1ZW50cmEgYSAlcyBwYXJ0aWN1bGFybWVudGUgbW90aXZhbnRlIHBhcmEgdXN0ZWRcIixcbiAgICBcIllvdSBkb24ndCBmaW5kIGVpdGhlciAlcyBvciAlcyB0byBiZSBwYXJ0aWN1bGFybHkgbW90aXZhdGluZyBmb3IgeW91XCI6IFwiVXN0ZWQgbm8gZW5jdWVudHJhIGEgJXMgbyAlcyBwYXJ0aWN1bGFybWVudGUgbW90aXZhbnRlcyBwYXJhIHVzdGVkXCIsXG4gICAgXCJZb3UgdmFsdWUgYm90aCAlcyBhIGJpdFwiOiBcIlVzdGVkIHZhbG9yYSBhICVzIHVuIHBvY29cIixcbiAgICBcIllvdSB2YWx1ZSBib3RoICVzIGFuZCAlcyBhIGJpdFwiOiBcIlVzdGVkIHZhbG9yYSBhICVzIHkgJXMgdW4gcG9jb1wiLFxuICAgIFwiWW91IGNvbnNpZGVyICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkb1wiIDogXCJVc3RlZCBjb25zaWRlcmEgcXVlICVzIGxvIGd1aWEgZW4gZ3JhbiBwYXJ0ZSBkZSBsbyBxdWUgaGFjZVwiLFxuICAgIFwiWW91IGNvbnNpZGVyIGJvdGggJXMgYW5kICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkb1wiIDogXCJVc3RlZCBjb25zaWRlcmEgcXVlICVzIHkgJXMgbG8gZ3VpYW4gZW4gZ3JhbiBwYXJ0ZSBkZSBsbyBxdWUgaGFjZVwiLFxuICAgIFwiQW5kICVzXCI6IFwiWSAlc1wiLFxuICAgIFwiRXhwZXJpZW5jZXMgdGhhdCBtYWtlIHlvdSBmZWVsIGhpZ2ggJXMgYXJlIGdlbmVyYWxseSB1bmFwcGVhbGluZyB0byB5b3VcIjogXCJObyBsZSBhZ3JhZGFuIGxhcyBleHBlcmllbmNpYXMgcXVlIGxlIGRhbiB1bmEgZ3JhbiBzZW5zYWNpw7NuIGRlICVzXCIsXG4gICAgXCJFeHBlcmllbmNlcyB0aGF0IGdpdmUgYSBzZW5zZSBvZiAlcyBob2xkIHNvbWUgYXBwZWFsIHRvIHlvdVwiOiBcIkxlIGFncmFkYW4gbGFzIGV4cGVyaWVuY2lhcyBxdWUgbGUgZGFuIHVuYSBzZW5zYWNpw7NuIGRlICVzXCIsXG4gICAgXCJZb3UgYXJlIG1vdGl2YXRlZCB0byBzZWVrIG91dCBleHBlcmllbmNlcyB0aGF0IHByb3ZpZGUgYSBzdHJvbmcgZmVlbGluZyBvZiAlc1wiOiBcIkVzdMOhIG1vdGl2YWRvIGEgYnVzY2FyIGV4cGVyaWVuY2lhcyBxdWUgbG8gcHJvdmVhbiBkZSB1bmEgZnVlcnRlIHNlbnNhY2nDs24gZGUgJXNcIixcbiAgICBcIllvdXIgY2hvaWNlcyBhcmUgZHJpdmVuIGJ5IGEgZGVzaXJlIGZvciAlc1wiIDogXCJTdXMgZWxlY2Npb25lcyBlc3TDoW4gZGV0ZXJtaW5hZGFzIHBvciB1biBkZXNlbyBkZSAlc1wiLFxuICAgIFwiYSBiaXQgJXNcIjogXCJ1biBwb2NvICVzXCIsXG4gICAgXCJzb21ld2hhdCAlc1wiIDogXCJhbGdvICVzXCIsXG4gICAgXCJjYW4gYmUgcGVyY2VpdmVkIGFzICVzXCI6IFwicHVlZGUgc2VyIHBlcmNpYmlkbyBjb21vICVzXCJcbiAgfSxcbiAgXCJ0cmFpdHNcIjoge1xuICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2NvbnNpZGVyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzY29ydMOpc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2NvbmZpYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBjb29wZXJhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlycmVmbGV4aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXN0cmljdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicsOtZ2lkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImR1cm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY8Otbmljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNhdXRvIGNvbiBsb3MgZGVtw6FzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29saXRhcmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzYXBlZ2Fkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImltcGVyc29uYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb21icsOtb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm9ic3RpbmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFicnVwdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjcnVkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbWJhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImR1cm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXN0dXRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWFuaXB1bGFkb3JcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJob3Njb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRhaW1hZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlbnNpYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBhZmVjdHVvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNhcGFzaW9uYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgc2luIGVtb2Npb25lc1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3LDrXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlZ2/DrXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlIG1hbCBnZW5pb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFudGFnb25pc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3J1w7HDs25cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbWFyZ2Fkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2FncmFkYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4aWdlbnRlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidG9zY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBzaW4gdGFjdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJicnVzY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjZXJyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiw6FzcGVyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImltcGxhY2FibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGNhcml0YXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2ZW5nYXRpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXJzcGljYXpcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjw6ludHJpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kaXZpZHVhbGlzdGFcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb2JyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibW9kZXN0b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VydmljaWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvb3BlcmF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnNpZGVyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJlc3BldHVvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29ydMOpc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zYXRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImF0ZW50b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25zaWRlcmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJsZWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1vcmFsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbm1vdmlibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWdyYWRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlcnZpY2lhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJodW1pbGRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kdWxnZW50ZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVmZXJ2ZXNjZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbGVncmVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW1pc3Rvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWxlZ3JlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImpvdmlhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJqb2Nvc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJnZW5lcm9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhZ3JhZGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidG9sZXJhbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBhY8OtZmljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJmbGV4aWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJmw6FjaWwgZGUgdHJhdGFyXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImp1c3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNhcml0YXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uZmlhYmxlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZW50aW1lbnRhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjYXJpw7Fvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc2libGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGllcm5vXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFwYXNpb25hZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicm9tw6FudGljb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVwZW5kaWVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzaW1wbGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFtaXN0b3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIGNvbiB0YWN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkaXBsb23DoXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJvZnVuZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWRlYWxpc3RhXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXJyZWJhdGFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gY29vcGVyYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGZpYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2NvbmZpYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyZWZsZXhpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIHByZXRlbmNpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1vZGVzdG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZGVjaXNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgc2luIHByb3DDs3NpdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgc2luIGNhcsOhY3RlclwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBzaW4gY29tcHJvbWlzb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gYW1iaWNpb3NvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJldm9sdG9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJidWxsaWNpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGVtZXJhcmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHVtdWx0dW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZW1vc3RyYXRpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZm9ybWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlIGJham8gcGVyZmlsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXRvbG9uZHJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmNvbnNpc3RlbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXJyw6F0aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwib2x2aWRhZGl6b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImltcHVsc2l2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImZyw612b2xvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0ZW1lcmFyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbMOzZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlubWFkdXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXphcm9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJsYXhvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kaXNjaXBsaW5hZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBjb252ZW5jaW9uYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVjdWxpYXJcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZmxleGlibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXN0cmljdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicsOtZ2lkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uZmlhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJlc3BvbnNhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlZ3Vyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlZHVjYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnNpZGVyYWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjYXV0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZWd1cm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhhY3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImZvcm1hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhaG9ycmF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInByaW5jaXBpc3RhXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFtYmljaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbGVydGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmlybWVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVjaWRpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tcGV0aXRpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWludWNpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVzdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uc2lzdGVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlzY2lwbGluYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImzDs2dpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVjaWRpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udHJvbGFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25jaXNvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGV0YWxsaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y2l0YWJsZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0cmFkaWNpb25hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb252ZW5jaW9uYWxcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb2Zpc3RpY2Fkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXJmZWNjaW9uaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmR1c3RyaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkaWdub1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyZWZpbmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjdWx0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwcmV2aXNvclwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXNjw6lwdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjYXV0byBjb24gbG9zIGRlbcOhc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvbGl0YXJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gY29tdW5pY2F0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW50aXNvY2lhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvbWJyw61vXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzaW50ZXJlc2Fkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcGFydGFkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwYWPDrWZpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaHVtaWxkZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzdW1pc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidMOtbWlkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJvYmVkaWVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5nZW51b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kaXJlY3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZMOpYmlsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyZXpvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIHBlcnNpc3RlbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmFnb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibW9kZXJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlzY3JldG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2F1dGVsb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInByaW5jaXBpc3RhXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fbWludXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhbnF1aWxvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvc2VnYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBsw6FjaWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImltcGFyY2lhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtb2Rlc3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmRlc2NlbmRpZW50ZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzY29uZmlhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVzaW1pc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJlc2VydmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvYmFyZGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2FsbGFkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvbWJyw61vXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWFuc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGF2ZW50dXJlcm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFzaXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXDDoXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZMOzY2lsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fbWludXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBndWlhZGEgcG9yIHN1IHByb3BpYSBjb25zY2llbmNpYSB5IHZhbG9yZXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50cm9zcGVjdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZW5zYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udGVtcGxhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnRyb3NwZWN0aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fcGx1c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGVyY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2aWdvcm9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRvbWluYWRvclwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInByZXN1bWlkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1hbmTDs25cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZG9taW5hbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFzdHV0b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvY2lhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlbsOpcmdpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZW50dXNpYXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb211bmljYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmlicmFudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXNwaXJpdHVvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWFnbsOpdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlbnR1c2lhc3RhXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fcGx1c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJidWxsaWNpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRyYXZpZXNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4aGliaWNpb25pc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImdyZWdhcmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlbW9zdHJhdGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhY3Rpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tcGV0aXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyc2lzdGVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW1iaWNpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlY2lkaWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fcGx1c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25maWFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhdWRhelwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZWd1cm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzaW5oaWJpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmFsaWVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmFsaWVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgc2F0aXNmZWNoYSBkZSBzaSBtaXNtYVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2aWdvcm9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJmdWVydGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhwbG9zaXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyYm9ycsOhZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleHRyYXZhZ2FudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2b2zDoXRpbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb3F1ZXRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fcGx1c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZlcmJvcnLDoWdpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmVzY3J1cHVsb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9tcG9zb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleHByZXNpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY8OhbmRpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZHJhbcOhdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlc3BvbnTDoW5lb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmdlbmlvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwib3BvcnR1bmlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kZXBlbmRpZW50ZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fbWludXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gZW1vY2lvbmFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZW5zaWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gY2FyacOxb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzYXBhc2lvbmFkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fbWludXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBhY2llbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJlbGFqYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gZXhpZ2VudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVhbGlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwib3B0aW1pc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1vZGVzdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBjcsOtdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIHByZXRlbmNpb3NvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9taW51c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmZvcm1hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZSBwZXJmaWwgYmFqb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fbWludXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyYWNpb25hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJvYmpldGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlc3RhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImzDs2dpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVjaWRpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJlcGFyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmNpc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhoYXVzdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlY29uw7NtaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRpc2NpcGxpbmFkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fbWludXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1vZGVzdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGV4Y2l0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwbMOhY2lkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0cmFucXVpbG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX21pbnVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluY29uc2NpZW50ZSBkZSBzaSBtaXNtb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmNhbnNhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZmF0aWdhYmxlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9taW51c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbXBlcnR1cmJhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZW5zaWJsZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fbWludXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZW50aWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZlcnPDoXRpbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjcmVhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnRlbGVjdHVhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXJzcGljYXpcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX3BsdXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRlbXBlcmFtZW50YWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpcnJpdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZWxlYWRvclwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImltcGFjaWVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJncnXDscOzblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1hbGh1bW9yYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyaXRhYmxlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9wbHVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlbW90aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3LDqWR1bG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2FyacOxb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnNpYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImJsYW5kb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fcGx1c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbXB1bHNpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnF1aXNpdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2VuZnJlbmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm9sdmlkYWRpem9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbXB1bHNpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX3BsdXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXRhbGxpc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjaXRhYmxlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9wbHVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJndWFyZGFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlycml0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluc2VndXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVzaW1pc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJlc2VydmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRlbWVyb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibmVnYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXV0by1jcsOtdGljb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fcGx1c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGNpdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJib3Jyw6FnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvcXVldG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleHBsb3Npdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXh0cmF2YWdhbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidm9sw6F0aWxcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX3BsdXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyaXRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImZhc3RpZGlvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXByZW5zaXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9wbHVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjaXRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFwYXNpb25hZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc3VhbFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfbWludXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm9yZGluYXJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNpbiB0YWN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImJydXNjb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNlcnJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkdXJvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19taW51c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzaW1wbGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXBlbmRpZW50ZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfbWludXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb3J0b3BsYWNpc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRlbWVyYXJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlsw7NnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5tYWR1cm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhemFyb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImxheG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpcnJlc3BldHVvc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udmVuY2lvbmFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRyYWRpY2lvbmFsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19taW51c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJlZGVjaWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gaW1hZ2luYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29tYnLDrW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcMOhdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gYXZlbnR1cmVyb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfbWludXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJib3Jyw6FnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5lc2NydXB1bG9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvbXBvc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX21pbnVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImltcGVydHVyYmFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlbnNpYmxlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19taW51c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlycml0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJmYXN0aWRpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFwcmVuc2l2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfcGx1c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlcnNwaWNhelwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGPDqW50cmljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmRpdmlkdWFsaXN0YVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfcGx1c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWRlYWxpc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRpcGxvbcOhdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwcm9mdW5kb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBjb24gdGFjdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW1pc3Rvc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX3BsdXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBjb252ZW5jaW9uYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVjdWxpYXJcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX3BsdXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbmFsw610aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlcmNlcHRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5mb3JtYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3JhbmRpbG9jdWVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlnbm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3VsdG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImludHJvc3BlY3Rpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWVkaXRhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb250ZW1wbGF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImludHJvc3BlY3Rpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVuc2F0aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19wbHVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm11bmRhbm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhhZ2VyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVsb2N1ZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnF1aXNpdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnRlbnNvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19wbHVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNyZWF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImludGVsZWN0dWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlcnNwaWNhelwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJzw6F0aWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW52ZW50aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19wbHVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXBhc2lvbmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGNpdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc3VhbFwiXG4gICAgICAgIH1cbiAgICBdXG59LFxuXCJ2YWx1ZXNcIjoge1xuICAgIFwiSGVkb25pc21cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJEaXNmcnV0YXIgZGUgbGEgdmlkYVwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIGFjdGl2aWRhZGVzIGNvbiB1biBwcm9ww7NzaXRvIG3DoXMgZ3JhbmRlIHF1ZSBlbCBzw7NsbyBkZWxlaXRlIHBlcnNvbmFsXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlRpZW5lIGdyYW4gbW90aXZhY2nDs24gcG9yIGRpc2ZydXRhciBsYSB2aWRhIGVuIHN1IHBsZW5pdHVkXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJTZWxmLXRyYW5zY2VuZGVuY2VcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJBeXVkYXIgYSBsb3MgZGVtw6FzXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgbGFzIHBlcnNvbmFzIHB1ZWRlbiBlbmNhcmdhcnNlIGRlIHN1cyBwcm9waW9zIGFzdW50b3Mgc2luIGludGVyZmVyZW5jaWFcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgZXMgaW1wb3J0YW50ZSBjdWlkYXIgZGUgbGFzIHBlcnNvbmFzIHF1ZSBsbyByb2RlYW5cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBqdXN0aWNpYVwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIHNvbiBsYXMgcGVyc29uYXMgY3JlYW4gc3VzIG9wb3J0dW5pZGFkZXNcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBlbiBsYSBqdXN0aWNpYSBzb2NpYWwgeSBsYSBpZ3VhbGRhZCBwYXJhIHRvZG9zXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEganVzdGljaWEgc29jaWFsXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgc29uIGxhcyBwZXJzb25hcyBjcmVhbiBzdXMgb3BvcnR1bmlkYWRlc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIGVuIGxhIGp1c3RpY2lhIHNvY2lhbCB5IGxhIGlndWFsZGFkIHBhcmEgdG9kb3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBpZ3VhbGRhZFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIHNvbiBsYXMgcGVyc29uYXMgY3JlYW4gc3VzIG9wb3J0dW5pZGFkZXNcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBlbiBsYSBqdXN0aWNpYSBzb2NpYWwgeSBsYSBpZ3VhbGRhZCBwYXJhIHRvZG9zXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiRWwgc2VydmljaW8gY29tdW5pdGFyaW9cIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBsYXMgcGVyc29uYXMgcHVlZGVuIGVuY2FyZ2Fyc2UgZGUgc3VzIHByb3Bpb3MgYXN1bnRvcyBzaW4gaW50ZXJmZXJlbmNpYVwiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBlcyBpbXBvcnRhbnRlIGN1aWRhciBkZSBsYXMgcGVyc29uYXMgcXVlIGxvIHJvZGVhblwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2VydmF0aW9uXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGFzIHRyYWRpY2lvbmVzXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiTGUgaW1wb3J0YSBtw6FzIHNlZ3VpciBzdSBwcm9waW8gY2FtaW5vIHF1ZSBzZWd1aXIgZWwgY2FtaW5vIGRlIG90cm9zXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlRpZW5lIG11Y2hvIHJlc3BldG8gcG9yIGxvcyBncnVwb3MgYSBsb3MgcXVlIHBlcnRlbmVjZSB5IHNpZ3VlIHN1IGd1w61hXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgYXJtb27DrWFcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJEZWNpZGUgcXXDqSBlcyBsbyBjb3JyZWN0byBiYXNhZG8gZW4gc3VzIGNyZWVuY2lhcywgbm8gZW4gbG8gcXVlIGxhIGdlbnRlIHBpZW5zYVwiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBsYXMgcmVnbGFzIGV4aXN0ZW4gcG9yIHVuYSByYXrDs24geSBudW5jYSBpbnRlbnRhIHRyYXNncmVkaXJsYXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBodW1pbGRhZFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkRlY2lkZSBxdcOpIGVzIGxvIGNvcnJlY3RvIGJhc2FkbyBlbiBzdXMgY3JlZW5jaWFzLCBubyBlbiBsbyBxdWUgbGEgZ2VudGUgcGllbnNhXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlZlIHZhbG9yIGVuIGRlZmVyaXIgYSBvdHJvc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhcyBub3JtYXMgc29jaWFsZXNcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJEZWNpZGUgcXXDqSBlcyBsbyBjb3JyZWN0byBiYXNhZG8gZW4gc3VzIGNyZWVuY2lhcywgbm8gZW4gbG8gcXVlIGxhIGdlbnRlIHBpZW5zYVwiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBsYXMgcmVnbGFzIGV4aXN0ZW4gcG9yIHVuYSByYXrDs24geSBudW5jYSBpbnRlbnRhIHRyYXNncmVkaXJsYXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBzZWd1cmlkYWRcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBsYSBzZWd1cmlkYWQgYSBjb3N0YSBkZSBkZWphciBhIHVuIGxhZG8gc3VzIG1ldGFzXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGVzIGltcG9ydGFudGUgc2FsdmFndWFyZGFyIGxhIHNlZ3VyaWRhZFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIHNlZ3VyaWRhZFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIGVzdGFyIHNlZ3VybyBhIGNvc3RhIGRlIGRlamFyIGEgdW4gbGFkbyBzdXMgbWV0YXNcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgZXMgaW1wb3J0YW50ZSBzYWx2YWd1YXJkYXIgbGEgc2VndXJpZGFkXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzcy10by1jaGFuZ2VcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJTZXIgaW5kZXBlbmRpZW50ZVwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlJlY2liZSBkZSBidWVuYSBtYW5lcmEgcXVlIG90cm9zIGRpcmlqYW4gc3VzIGFjdGl2aWRhZGVzXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkxlIGd1c3RhIGVzdGFibGVjZXIgc3VzIHByb3BpYXMgbWV0YXMgcGFyYSBkZWNpZGlyIGPDs21vIGFsY2FuemFybGFzIG1lam9yXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgZW1vY2nDs25cIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJTZSBhcGVnYSBhIGxhcyBjb3NhcyBxdWUgY29ub2NlIGFudGVzIHF1ZSBhcnJpZXNnYXJzZSBhIHByb2JhciBhbGdvIG51ZXZvIHkgcmllc2dvc29cIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXN0w6EgYW5zaW9zbyBwb3IgYnVzY2FyIGV4cGVyaWVuY2lhcyBudWV2YXMgeSBlbW9jaW9uYW50ZXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBjcmVhdGl2aWRhZFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlNlIGFwZWdhIGEgbGFzIGNvc2FzIHF1ZSBjb25vY2UgYW50ZXMgcXVlIGFycmllc2dhcnNlIGEgcHJvYmFyIGFsZ28gbnVldm8geSByaWVzZ29zb1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFc3TDoSBhbnNpb3NvIHBvciBidXNjYXIgZXhwZXJpZW5jaWFzIG51ZXZhcyB5IGVtb2Npb25hbnRlc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGN1cmlvc2lkYWRcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJTZSBhcGVnYSBhIGxhcyBjb3NhcyBxdWUgY29ub2NlIGFudGVzIHF1ZSBhcnJpZXNnYXJzZSBhIHByb2JhciBhbGdvIG51ZXZvIHkgcmllc2dvc29cIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXN0w6EgYW5zaW9zbyBwb3IgYnVzY2FyIGV4cGVyaWVuY2lhcyBudWV2YXMgeSBlbW9jaW9uYW50ZXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBhdXRvbm9tw61hXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUmVjaWJlIGRlIGJ1ZW5hIG1hbmVyYSBxdWUgb3Ryb3MgZGlyaWphbiBzdXMgYWN0aXZpZGFkZXNcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiTGUgZ3VzdGEgZXN0YWJsZWNlciBzdXMgcHJvcGlhcyBtZXRhcyBwYXJhIGRlY2lkaXIgY8OzbW8gYWxjYW56YXJsYXMgbWVqb3JcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBsaWJlcnRhZFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlJlY2liZSBkZSBidWVuYSBtYW5lcmEgcXVlIG90cm9zIGRpcmlqYW4gc3VzIGFjdGl2aWRhZGVzXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkxlIGd1c3RhIGVzdGFibGVjZXIgc3VzIHByb3BpYXMgbWV0YXMgcGFyYSBkZWNpZGlyIGPDs21vIGFsY2FuemFybGFzIG1lam9yXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJTZWxmLWVuaGFuY2VtZW50XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiQWxjYW56YXIgZWwgw6l4aXRvXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiVG9tYSBkZWNpc2lvbmVzIHNpbiBjb25zaWRlcmFyIGPDs21vIG11ZXN0cmFuIHN1cyB0YWxlbnRvc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJCdXNjYSBvcG9ydHVuaWRhZGVzIHBhcmEgYXV0b3N1cGVyYXNlIHkgcGFyYSBkZW1vc3RyYXIgcXVlIGVzIHVuYSBwZXJzb25hIGNhcGF6XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTWVqb3JhciBzdSBlc3RhdHVzIHNvY2lhbFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkVzdMOhIGNvbmZvcm1lIGNvbiBzdSBlc3RhdHVzIHNvY2lhbCB5IG5vIHNpZW50ZSBuZWNlc2lkYWQgZGUgbWVqb3JhcmxvXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNlIGVzZnVlcnphIGNvbnNpZGVyYWJsZW1lbnRlIHBhcmEgbWVqb3JhciBzdSBlc3RhdHVzIGUgaW1hZ2VuIHDDumJsaWNhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgYW1iaWNpw7NuXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRXN0w6EgY29uZm9ybWUgY29uIHN1IGVzdGF0dXMgc29jaWFsIHkgbm8gc2llbnRlIG5lY2VzaWRhZCBkZSBtZWpvcmFybG9cIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2llbnRlIHF1ZSBlcyBpbXBvcnRhbnRlIGF2YW56YXIgcGFyYSBhbGNhbnphciBtZXRhc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxvcyBncmFuZGVzIGxvZ3Jvc1wiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlRvbWEgZGVjaXNpb25lcyBzaW4gY29uc2lkZXJhciBjw7NtbyBtdWVzdHJhbiBzdXMgdGFsZW50b3NcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQnVzY2Egb3BvcnR1bmlkYWRlcyBwYXJhIGF1dG9zdXBlcmFzZSB5IHBhcmEgZGVtb3N0cmFyIHF1ZSBlcyB1bmEgcGVyc29uYSBjYXBhelwiXG4gICAgICAgIH1cbiAgICBdXG4gIH1cbn1cbiJdfQ==
(1)
});
