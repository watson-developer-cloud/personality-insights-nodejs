/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
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
/* jslint jquery:true */
'use strict';

// These functions load the strings for the given language.
function download(feature, lang, success_function) {
  return $.ajax({
    dataType: 'json',
    type: 'GET',
    contentType: 'application/json',
    url: format('json/{0}_{1}.json', feature, lang),
    success: success_function
  });
}

var strings = {};
function initLang(lang) {
  // Download all objects and continue. It is presumed that all will
  // stop downloading fast enough.
  download('messages', lang, function(response) {
    strings.messagesData = response;
  });

  download('traits', lang, function(response) {
    strings.traitsData = response;
  });

  download('facets', lang, function(response) {
    strings.facetsData = response;
  });

  download('values', lang, function(response) {
    strings.valuesData = response;
  });

  download('needs', lang, function(response) {
    strings.needsData = response;
  });
}

// These two functions sort features based on its percentage.
function compareByRelevance(o1, o2) {
  if (Math.abs(0.5 - o1.percentage) > Math.abs(0.5 - o2.percentage)) {
    return -1; // A trait with 1% is more interesting than one with 60%.
  } else if (Math.abs(0.5 - o1.percentage) < Math.abs(0.5 - o2.percentage)) {
    return 1;
  } else {
    return 0;
  }
}

function compareByValue(o1, o2) {
  if (Math.abs(o1.percentage) > Math.abs(o2.percentage)) {
    return -1; // 100 % has precedence over 99%
  } else if (Math.abs(o1.percentage) < Math.abs(o2.percentage)) {
    return 1;
  } else {
    return 0;
  }
}

// These functions assemble the sentences for each summarization.
function assembleTraits(personalityTree) {
  var sentences = [];
  var big5elements = [];

  // Sort the Big 5 based on how extreme the number is.
  personalityTree.children[0].children.forEach(function(p) {
    big5elements.push({
      id: p.id,
      percentage: p.percentage
    });
  });
  big5elements.sort(compareByRelevance);

  // Remove everything between 32% and 68%, as it's inside the common people.
  var relevantBig5 = big5elements.filter(function(item) {
    return Math.abs(0.5 - item.percentage) > 0.18;
  });
  if (relevantBig5.length < 2) {
    // Even if no Big 5 attribute is interesting, you get 1 adjective.
    relevantBig5 = [big5elements[0], big5elements[1]];
  }

  var t, adj, adj1, adj2, adj3;

  switch (relevantBig5.length) {
    case 2:
      // Report 1 adjective.
      t = getMessageTemplate('YOU_ARE_TERM');
      adj = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
      sentences.push(format(t, adj));
      break;
    case 3:
      // Report 2 adjectives.
      t = getMessageTemplate('YOU_ARE_TERM_TERM');
      adj1 = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
      adj2 = getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1);
      sentences.push(format(t, adj1, adj2));
      break;
    case 4:
    case 5:
      // Report 3 adjectives.
      t = getMessageTemplate('YOU_ARE_TERM_TERM_TERM');
      adj1 = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
      adj2 = getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1);
      adj3 = getCircumplexAdjective(relevantBig5[2], relevantBig5[3], 2);
      sentences.push(format(t, adj1, adj2, adj3));
      break;
  }

  return sentences;
}

function assembleFacets(personalityTree) {
  var sentences = [];
  var facetElements = [];

  // Assemble the full list of facets and sort them based on how extreme
  // is the number.
  personalityTree.children[0].children.forEach(function(p) {
    p.children.forEach(function(f) {
      facetElements.push({
        id: f.id,
        percentage: f.percentage,
        parent: p
      });
    });
  });
  facetElements.sort(compareByRelevance);

  // Assemble an adjective and description for the two most important facets.
  var info = getFacetInfo(facetElements[0]);
  var t = getMessageTemplate('YOU_ARE_TERM_DESC');
  sentences.push(format(t, info.term, info.description));
  info = getFacetInfo(facetElements[1]);
  sentences.push(format(t, info.term, info.description));

  // If all the facets correspond to the same feature, continue until a
  // different parent feature is found.
  var i = 2;
  if (facetElements[0].parent === facetElements[1].parent) {
    while (facetElements[0].parent === facetElements[i].parent) {
      i++;
    }
  }
  info = getFacetInfo(facetElements[i]);
  t = getMessageTemplate('AND_YOU_ARE_TERM_DESC');
  sentences.push(format(t, info.term, info.description));

  return sentences;
}

function assembleValues(valuesTree) {
  var sentences = [];
  var valuesList = [];

  valuesTree.children[0].children.forEach(function(p) {
    valuesList.push({
      id: p.id,
      percentage: p.percentage
    });
  });
  valuesList.sort(compareByRelevance);

  // Are the two most relevant in the same quartile interval? (e.g. 0%-25%)
  var sameQI = intervalFor(valuesList[0].percentage) === intervalFor(valuesList[1].percentage);

  // Get all the text and data required.
  var info1 = getInfoForValue(valuesList[0]);
  var info2 = getInfoForValue(valuesList[1]);

  var t, t_id;

  if (sameQI) {
    // Assemble the first 'both' sentence.
    t_id = format('QUARTILE{0}_NAME_NAME', intervalFor(valuesList[0].percentage));
    t = getMessageTemplate(t_id); 
    sentences.push(format(t, info1.term, info2.term));

    // Assemble the final strings in the correct format.
    sentences.push(info1.description + '.');
    t = getMessageTemplate('AND_DESC'); 
    sentences.push(format(t, info2.description.toLowerCase()));
  } else {
    var valuesInfo = [info1, info2];
    for (var i = 0; i < valuesInfo.length; i++) {
      // Process it this way because the code is the same.
      t_id = format('QUARTILE{0}_NAME_DESC', intervalFor(valuesList[i].percentage));
      t = getMessageTemplate(t_id); 
      sentences.push(format(t, valuesInfo[i].term, valuesInfo[i].description.toLowerCase()));
    }
  }

  return sentences;
}

function assembleNeeds(needsTree) {
  var sentences = [];
  var needsList = [];

  needsTree.children[0].children.forEach(function(p) {
    needsList.push({
      id: p.id,
      percentage: p.percentage
    });
  });
  needsList.sort(compareByValue);

  // Get the words required.
  var word = getWordsForNeed(needsList[0])[0];

  // Form the right sentence for the single need.
  var t, t_id;
  t_id = format('NEEDS_QUARTILE{0}', intervalFor(needsList[0].percentage));
  t = getMessageTemplate(t_id);
  sentences.push(format(t, word));

  return sentences;
}

function intervalFor(p) {
  // The MIN handles the special case for 100%.
  return Math.min(Math.floor(p * 4), 3);
}

// From here on, all functions have to do with getting the correct strings.
function getCircumplexAdjective(p1, p2, order) {
  var traitsData = strings.traitsData;

  // Sort the personality traits in the order the JSON file stored it.
  var ordered = [p1, p2].sort(function(o1, o2) {
    var i1 = 'EANOC'.indexOf(o1.id.charAt(0));
    var i2 = 'EANOC'.indexOf(o2.id.charAt(0));
    return i1 < i2 ? -1 : 1;
  });

  // Assemble the identifier as the JSON file stored it.
  var identifier = ordered[0].id.
  concat(ordered[0].percentage > 0.5 ? '_plus_' : '_minus_').
  concat(ordered[1].id).
  concat(ordered[1].percentage > 0.5 ? '_plus' : '_minus');

  var traitMult = traitsData[identifier][0];

  if (traitMult.perceived_negatively) {
    switch (order) {
      case 0:
        return 'a bit ' + traitMult.word;
      case 1:
        return 'somewhat ' + traitMult.word;
      case 2:
        return 'can be perceived as ' + traitMult.word;
    }
  } else {
    return traitMult.word;
  }
}

function getFacetInfo(f) {
  var facetsData = strings.facetsData;
  var data = facetsData[f.id.replace('_', '-').replace(' ', '-')];
  var t, d;

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

function getInfoForValue(v) {
  var valuesData = strings.valuesData;
  var data = valuesData[v.id.replace(/[_ ]/g, '-')][0];
  var d = v.percentage > 0.5 ? data.HighDescription : data.LowDescription;

  return {
    name: v.id,
    term: data.Term.toLowerCase(),
    description: d
  };
}

function getWordsForNeed(n) {
  var needsData = strings.needsData;
  var traitMult = needsData[n.id];
  return traitMult;
}

function getMessageTemplate(id) {
  var messagesData = strings.messagesData;
  var message = messagesData[id];
  return message;
}

// This is a poor man's version of printf, which nicely does the job.
function format(str) {
  // Keep all the arguments except for the string.
  var args = Array.prototype.slice.call(arguments, 1);
  return str.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined' ?
      args[number] :
      match;
  });
}
