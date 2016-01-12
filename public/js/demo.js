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
/* global $:false,TextSummary, Profile,_, $Q*/
'use strict';

var markdown = window.markdownit();

function isDefined(v) {
  return typeof v !== 'undefined';
}

function renderMarkdown(s) {
  var
    rendered = markdown.render(s ? s : ''),
    replaces = [
      ['<a', '<a class="base--a" target="_blank"']
    ];

  replaces.forEach(function(p) {
    rendered = rendered.replace(p[0], p[1]);
  });

  return rendered;
}

function id(x) { return x; }

function removeHidden(d) {
  d.scenarios = d.scenarios.filter(function (s) {
    return !s.hidden;
  });
  return d;
}

function inString(sub, str) {
  var normalize = function (s) { return s.toLowerCase(); };
  return normalize(str).indexOf(normalize(sub)) > -1;
}

function toDict(d) { return new Dictionary(d); }

$(document).ready(function () {



  var
    SAMPLE_TEXTS = [
        'sample1',
        'sample2',
        'sample3',
        'ar'
      ],
    globalState = {
        selectedSample: SAMPLE_TEXTS[0],
        languageSelected: undefined
      },
    textCache = {},
    Resources = {
        _autoload : [ { name: 'scenarios', loader: removeHidden }, { name: 'names', loader: toDict } ]
      };

  var $big5Traits = $('.output-big-5--traits');
  var $needsTraits = $('.output-needs--traits');
  var $needsMoreTraits = $('.output-needs--more-traits');
  var $valuesTraits = $('.output-values--traits');
  var $needsToggle = $('.output-needs--toggle');
  var $outputSummaryText = $('.output-summary--summary');
  var $outputLikelyBehaviors = $('.output-summary--likely-behaviors');
  var $outputLikelyBehaviorsSection = $('.output-summary--likely-behaviors--section');
  var $outputUnlikelyBehaviors = $('.output-summary--unlikely-behaviors');
  var $outputUnlikelyBehaviorsSection = $('.output-summary--unlikely-behaviors--section');
  var $outputNoBehaviorsSection = $('.output-summary--no-behaviors--section');
  var $inputTextArea = $('.input--text-area');
  var $inputWordCount = $('.input--word-count-number');
  var $inputForm1 = $('.input--form1');
  var $inputForm2 = $('.input--form2');
  var $resetButton = $('.input--reset-button');
  var $loading = $('.loading');
  var $output = $('.output');
  var $outputHeader = $('.output--header');
  var $outputJSON = $('.output--json');
  var $outputJSONCode = $('.output--json-code');
  var $outputJSONButton = $('.output--json-button');
  var $error = $('.error');
  var $errorMessage = $('.error--message');

  function setTextSample(value, readonly) {
    $('#inputText').val(value);
    if (readonly) {
      $('#inputText').attr('readonly', 'readonly');
    } else {
      $('#inputText').removeAttr('readonly');
    }
  }

  function registerHandlers() {

    $('input[name="text-lang"]').click(function() {
      globalState.selectedLanguage = $(this).attr('value');
    });

    $('input[name="text-sample"]').click(function() {
      var
        textFile = $(this).attr('data-file'),
        orientation = $(this).attr('data-orientation');
      globalState.selectedSample = textFile;

      if (orientation === 'right-to-left') {
        $inputTextArea.removeClass('left-to-right');
        $inputTextArea.addClass('right-to-left');
      } else {
        $inputTextArea.removeClass('right-to-left');
        $inputTextArea.addClass('left-to-right');
      }

      $('#languageChooser').hide();

      loadSampleText(textFile);
      updateWordCount();
    });

    $(window).resize(function () {
      if ($(window).width() < 800) {
        $('.smartphone-hidden').hide();
        if (globalState.selectedSample == 'custom') {
          $('input[name="text-sample"]:first').trigger('click');
        }
      } else {
        $('label[for="text-custom"]').show();
      }
    });

    $('input#text-custom').unbind('click').click(function() {
      globalState.selectedSample = 'custom';

      $inputTextArea.removeClass('right-to-left');
      $inputTextArea.addClass('left-to-right');

      $('#languageChooser').show();
      setTextSample('', false);
      updateWordCount();

      if (!globalState.selectedLanguage) {
        $('input#lang-en').trigger('click');
      }
    });

    $('input[name="twitter"]').click(function() {
      var twitterId = $(this).val();
      globalState.selectedTwitterUser = twitterId;
    });

    $inputForm1.submit(function(e) {
      e.preventDefault();
      e.stopPropagation();

      resetOutputs();
      $loading.show();
      scrollTo($loading);
      getProfileForTwitterUser(globalState.selectedTwitterUser, 'en');
    });

    $inputForm2.submit(function(e) {
      e.preventDefault();
      e.stopPropagation();

      resetOutputs();
      $loading.show();
      scrollTo($loading);

      var lang = globalState.selectedSample == 'custom' ? globalState.selectedLanguage : $('input#text-'+ globalState.selectedSample).attr('data-lang');
      getProfileForText($('.input--text-area').val(), lang);
    });
  }

  function assembleTextSummary(text) {
    return '<p class="base--p">' + text.split('\n').join('</p><p class="base--p">') + '</p>';
  }

  function setTextSummary(profile, locale) {
    var textSummary = new TextSummary(locale),
        summary = textSummary.getSummary(profile);
    $('#personalitySummary').empty();
    $('#personalitySummary').append(assembleTextSummary(summary));
  }


  /**
   * Toggle Big 5 Subtraits
   */
  $(document).on('click', '.output-big-5--trait-label', function() {
    $(this).closest('.percent-bar-and-score').toggleClass('toggled');
  });

  $resetButton.click(function() {
    $('input[name="twitter"]:first').trigger('click');
    $('input[name="text-sample"]:first').trigger('click');
    $('.tab-panels--tab:first').trigger('click');
    resetOutputs();
  });

  // toggleNeedsTraits
  $needsToggle.click(function() {
    $needsMoreTraits.toggle();
    $needsToggle.text($needsToggle.text() == 'See more' ? 'See less' : 'See more');
  });

  $outputJSONButton.click(function() {
    $outputJSON.toggle();
    scrollTo($outputJSON);
  });

  function getProfileForTwitterUser(userId, language) {
    getProfile(userId, language, 'twitter');
  }

  function getProfileForText(text, language) {
    getProfile(text, language, 'text');
  }

  function changeProfileLabels(data) {
    var clonned = JSON.parse(JSON.stringify(data)),
      replacements = {
        'Extraversion' : 'Introversion/Extraversion',
        'Outgoing' : 'Warmth',
        'Uncompromising': 'Straightforwardness',
        'Immoderation': 'Impulsiveness',
        'Susceptible to stress': 'Sensitivity to stress',
        'Conservation': 'Tradition',
        'Openness to change': 'Stimulation',
        'Hedonism': 'Taking pleasure in life',
        'Self-enhancement': 'Achievement',
        'Self-transcendence': 'Helping others'
      };

    function walkTree(f, tree) {
      f(tree);
      if (tree.children) {
        tree.children.forEach(walkTree.bind(this, f));
      }
    }

    walkTree(function (node) {
      if (node.id && replacements[node.id.replace('_parent', '')]) {
        node.name = replacements[node.id.replace('_parent', '')];
      }
    }, clonned.tree);

    return clonned;
  }

  function getErrorMapping(err) {
    var errorMapping = {
      '400' : {
        'minimum number of words required for analysis' : 'We need at least 100 words for analysis. Watson doesn\'t like to judge a book by its cover.'
      },
      '401' : {
        'invalid credentials' : 'There was a problem processing the personality. Please check your credentials.'
      },
      '500' : {
        'missing required parameters' : 'Please input some text to analyze.'
      }
    };

    var message = err.error;
    if (errorMapping[err.code]) {
      Object.keys(errorMapping[err.code]).forEach(
        function (errorString) {
          if (inString(errorString, err.error)) {
            message = errorMapping[err.code][errorString];
          }
        }
      );
    }
    return message;
  }

  function getErrorMessage(error) {
    var message = 'Error processing the request, please try again.';
    if (error.responseJSON && error.responseJSON.error) {
      message = getErrorMapping(error.responseJSON);
    }
    return message;
  }

  function getProfile(data, language, sourceType) {
    // Source Types: (text|twitter)
    sourceType = sourceType || 'text';

    var postData = {
        language: language,
        include_raw: true
      },
      url = '/api/profile/' + sourceType;

    if (sourceType === 'twitter')
      postData.userId = data;
    else
      postData.text = data;


    $.ajax({
      headers:{
        'csrf-token': $('meta[name="ct"]').attr('content')
      },
      type: 'POST',
      data: postData,
      url: url,
      dataType: 'json',
      success: function(data) {
        $loading.hide();
        $output.show();
        scrollTo($outputHeader);
        loadOutput(data);
      },
      error: function(err) {
        $loading.hide();
        $error.show();
        console.error(err);
        $errorMessage.text(getErrorMessage(err));
      }
    });
  }

  function testScenario(scenario, premise, predicate) {
    return scenario.traits.reduce(predicate, premise);
  }

  function byId(xs, id) {
    return xs.filter(function (x) {
      return x.id === id;
    })[0];
  }

  function inThreshold(threshold, value) {
    return value >= threshold.min && value <= threshold.max;
  }

  function toScoringFunction(target) {
    return function (p) {
      return eval(target.score);
    };
  }

  function targetTraitScore(targets, id, trait) {
    return toScoringFunction(byId(targets,id))(trait.percentage);
  }

  function scenarioScore(profile, scenario, targets) {
    return (testScenario(scenario, 0, function(acc, trait) {
      return acc + targetTraitScore(targets, trait.target, profile.getTrait(trait.id));
    }) / scenario.traits.length);
  }

  function matchingScenarios(targets, scenarios, profile) {
    return scenarios.map(function (scenario) {
      return {
        score: scenarioScore(profile, scenario, targets),
        scenario: scenario
      }
    });
  }

  function getScenarioInfo(category, scenario) {
    var scenarioInfo = Resources.names.get(category)
      .filter(function (otherScenario) {
        return otherScenario.id == scenario.id;
      })[0];

    return scenarioInfo;
  }

  function getUniqueBehaviorsFor(profile) {
    var found = {};
    var behaviors = getBehaviorsFor(profile).filter(function (b) {
      var hold = false;
      if (!found[b.name]) {
        found[b.name] = true;
        hold = true;
      }
      return hold;
    });
    return behaviors;
  }

  function getBehaviorsFor(profile) {
    var targets = Resources.scenarios.targets,
        scenarios  = Resources.scenarios.scenarios,
        _profile   = new Profile(profile);
    return matchingScenarios(targets, scenarios, _profile).map(function (scenarioMatching) {
      var scenarioInfo = getScenarioInfo('scenarios', scenarioMatching.scenario);
      return {
        name : scenarioInfo.verb,
        score : scenarioMatching.score,
        tooltip: renderMarkdown(scenarioInfo.tooltip)
      };
    });
  }

  function dictToArray(dict) {
    var arr = [];
    Object.keys(dict).forEach(function(key) {
      arr.push({ key: key, value: dict[key] });
    });
    return arr;
  }

  function loadOutput(rawData) {
    var data = changeProfileLabels(rawData);
    setTextSummary(data, 'en');
    loadWordCount(data);
    var big5Data = data.tree.children[0].children[0].children;
    var needsData = data.tree.children[1].children[0].children;
    var valuesData = data.tree.children[2].children[0].children;

    var statsPercent_template = outputStatsPercentTemplate.innerHTML;
    var big5_template = big5PercentTemplate.innerHTML;

    var big5Data_curated = big5Data.map(function(obj) {
      var newObj = {};
      newObj.name = obj.name;
      newObj.id = obj.id;
      newObj.score = Math.round(obj.percentage * 100);
      newObj.children = obj.children.map(function(obj2) {
        var newObj2 = {};
        newObj2.name = obj2.name;
        newObj2.id = obj2.id;
        newObj2.score = Math.round(obj2.percentage * 100);
        return newObj2;
      }).sort(function(a, b) {
        return b.score - a.score;
      });
      return newObj;
    });

    var needsData_curated = needsData.map(function(obj) {
      var newObj = {};
      newObj.id = obj.id;
      newObj.name = obj.name;
      newObj.score = Math.round(obj.percentage * 100);
      return newObj;
    });

    var valuesData_curated = valuesData.map(function(obj) {
      var newObj = {};
      newObj.id = obj.id;
      newObj.name = obj.name;
      newObj.score = Math.round(obj.percentage * 100);
      return newObj;
    });

    function mapObject(o, f) {
      var u = {};
      Object.keys(o).forEach(function (key) {
        u[key] = f(key, o[key]);
      });
      return u;
    }

    function toHtml(markdownDict) {
      return mapObject(markdownDict, function(key, value) {
        return renderMarkdown(value);
      });
    }

    $big5Traits.append(_.template(big5_template, {
      items: big5Data_curated.sort(sortScores),
      tooltips: toHtml(PITooltips.big5().getValue())
    }));

    $needsTraits.append(_.template(statsPercent_template, {
      items: needsData_curated.sort(sortScores).slice(0,5),
      tooltips: toHtml(PITooltips.needs().getValue())
    }));

    $needsMoreTraits.append(_.template(statsPercent_template, {
      items: needsData_curated.sort(sortScores).slice(5, needsData_curated.length),
      tooltips: toHtml(PITooltips.needs().getValue())
    }));

    $valuesTraits.append(_.template(statsPercent_template, {
      items: valuesData_curated.sort(sortScores),
      tooltips: toHtml(PITooltips.values().getValue())
    }));

    loadBehaviors(data);

    updateJSON(rawData);
  }

  function loadBehaviors(profile) {
    var behaviors_template = outputBehaviorsTemplate.innerHTML;

    var behaviors = getUniqueBehaviorsFor(profile);

    var likely   = behaviors.filter(isPositive),
        unlikely = behaviors.filter(isNegative);

    if (likely.length > 0) {
      $outputLikelyBehaviors.append(_.template(behaviors_template, {
        items: likely.sort(sortScoresDESC).filter(top3)
      }));
      $outputLikelyBehaviorsSection.show();
    } else {
      $outputLikelyBehaviorsSection.hide();
    }

    if (unlikely.length > 0) {
      $outputUnlikelyBehaviors.append(_.template(behaviors_template, {
        items: unlikely.sort(sortScoresASC).filter(top3)
      }));
      $outputUnlikelyBehaviorsSection.show();
    } else {
      $outputUnlikelyBehaviorsSection.hide();
    }

    if (unlikely.length == 0 && likely.length == 0) {
      $outputNoBehaviorsSection.show();
    } else {
      $outputNoBehaviorsSection.hide();
    }
  }

  $inputTextArea.on('propertychange change click keyup input paste', function() {
    updateWordCount();
  });

  function loadWordCount(data) {
    $('.output--word-count-number').text(data.word_count);
    $('.output--word-count-message').removeClass('show');
    if (data.word_count > 6000)
      $('.output--word-count-message_VERY-STRONG').addClass('show');
    else if (data.word_count <= 6000 && data.word_count >= 3500)
      $('.output--word-count-message_STRONG').addClass('show');
    else if (data.word_count < 3500 && data.word_count >= 1500)
      $('.output--word-count-message_DECENT').addClass('show');
    else
      $('.output--word-count-message_WEAK').addClass('show');
  }

  function scrollTo(element) {
    $('html, body').animate({ scrollTop: element.offset().top }, 'fast');
  }

  function resetOutputs() {
    $output.hide();
    $error.hide();
    $loading.hide();
    $big5Traits.empty();
    $needsTraits.empty();
    $needsMoreTraits.empty();
    $valuesTraits.empty();
    $('.output-big-5--sub-tree').hide();
    $needsMoreTraits.hide();
    $outputSummaryText.empty();
    $outputLikelyBehaviors.empty();
    $outputUnlikelyBehaviors.empty();
    $outputJSONCode.empty();
  }

  function isPositive(behavior) {
    return behavior.score > 0.60;
  }

  function isNegative(behavior) {
    return behavior.score < 0.40;
  }

  function top3(behavior, index) {
    return index < 3;
  }

  function sortScores(obj1, obj2) {
    return obj2.score - obj1.score;
  }

  function sortScoresDESC(obj1, obj2) {
    return obj2.score - obj1.score;
  }

  function sortScoresASC(obj1, obj2) {
    return obj1.score - obj2.score;
  }

  function preloadSampleTexts(callback) {
    var shared = { done : 0 };
    SAMPLE_TEXTS.forEach(function(name) {
      $Q.get('data/text/' + name + '.txt')
        .then(function (text) {
          shared.done = shared.done + 1;
          textCache[name] = text;

          if (shared.done == SAMPLE_TEXTS.length && callback) {
            callback();
          }
        })
        .done();
    });
  }

  function loadSampleText(name) {
    if (textCache[name]) {
      setTextSample(textCache[name], true);
      updateWordCount();
    } else {
      $Q.get('data/text/' + name + '.txt')
        .then(function (text) {
          setTextSample(text, true);
          textCache[name] = text;
        })
        .then(function() {
          updateWordCount();
        })
        .done();
    }
  }

  function showHiddenLanguages() {
    var enableLang = {
      'ar' : function () {
        $('label[for="text-ar"]').show();
        $('label[for="lang-ar"]').show();
      }
    };

    Object.keys($.url().param())
      .filter(function(p) { return p.slice(0,5) === 'lang-'; })
      .map(function(p) { return p.slice(5,p.length); })
      .forEach(function(lang) {
        if (enableLang[lang]) {
          enableLang[lang]();
        }
      });
  }

  function loadResources() {
    Resources._autoload.forEach(function (resource) {
      if (!resource.name) {
        resource = {
          name : resource,
          loader : id
        };
      }

      $Q.get('data/' + resource.name + '.json')
        .then(function(data) {
          Resources[resource.name] = resource.loader(data);
        })
        .catch(console.error.bind(console, 'Error loading data/' + resource.name + '.json'))
        .done();
    });
  }

  function initialize() {
    $('input[name="twitter"]:first').attr('checked', true);
    $('input[name="text-sample"]:first').attr('checked', true);
    globalState.selectedTwitterUser = $('input[name="twitter"]:first').val();
    showHiddenLanguages();
    preloadSampleTexts(function () {
      loadSampleText(globalState.selectedSample);
    });
    loadResources();
    registerHandlers();
    $inputTextArea.addClass('orientation', 'left-to-right');
  }

  function countWords(str) {
    return str.split(' ').length;
  }

  function updateWordCount() {
    $inputWordCount.text(countWords($inputTextArea.val()));
  }

  function updateJSON(results) {
    $outputJSONCode.html(JSON.stringify(results, null, 2));
    $('.code--json').each(function (i,b) { hljs.highlightBlock(b); });
  }

  initialize();
});
