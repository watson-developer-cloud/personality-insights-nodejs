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

var markdown = function (s) { return window.markdownit().render(s); };

var OUTPUT_LANG = 'en';

var globalState = {
    twitterUserId: undefined,
    selectedTwitterUser: undefined,
    selectedTwitterImage: undefined,
    selectedTwitterUserLang: undefined,
    selectedSample: undefined,
    languageSelected: undefined,
    currentProfile: undefined,
    userLocale: undefined
  };

var QUERY_PARAMS = (function(a) {
  if (a == "") return {};
  var b = {};
  for (var i = 0; i < a.length; ++i)
  {
      var p=a[i].split('=', 2);
      if (p.length == 1)
          b[p[0]] = "";
      else
          b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
  }
  return b;
})(window.location.search.substr(1).split('&'));

function getBrowserLang() {
 if (navigator.languages != undefined)
  return navigator.languages[0];
 else
  return navigator.language;
};

function getBrowserLangNoLocale() {
  var lang = getBrowserLang();
  return lang.substring(0, 2);
}

function extend(target, source) {
  Object.keys(source).forEach(function (k) {
    target[k] = source[k];
  });
  return target;
}

function clone(o) {
  return extend({}, o);
}

function isDefined(v) {
  return typeof v !== 'undefined';
}

function replaces(s, replaces) {
  var out = s;
  replaces.forEach(function(r) {
    out = out.replace(r.search, r.replace);
  });

  return out;
}

function renderMarkdown(s) {
  return replaces(markdown(s || ''), [{ search: /\<\a /g, replace: '<a class="base--a" target="_blank" ' }]);
}

function inString(sub, str) {
  var normalize = function (s) { return s.toLowerCase(); };
  return normalize(str).indexOf(normalize(sub)) > -1;
}

$(document).ready(function () {



  var
    SAMPLE_TEXTS = [
        'sample1',
        'sample2',
        'sample3',
        'ar',
        'ja'
      ],
    textCache = {};

  globalState.selectedSample = SAMPLE_TEXTS[0];
  globalState.languageSelected = undefined;

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

  function setLoadingState() {
    resetOutputs();
    $loading.show();
    scrollTo($loading);
  }

  function loadTwitterUser(twitterHandle, options) {
    setLoadingState();
    getProfileForTwitterUser(twitterHandle, options);
  }

  function registerHandlers() {

    globalState.userLocale = getBrowserLangNoLocale();

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
      var twitterLang = $(this).attr("data-lang");
      globalState.selectedTwitterUser = twitterId;
      globalState.selectedTwitterImage = $('label[for="'+$(this).attr('id')+'"] img').attr('src');
      globalState.selectedTwitterUserLang = twitterLang;
    });

    $inputForm1.submit(function(e) {
      e.cancelBubble = true;
      e.preventDefault();
      if (e.stopPropagation)
        e.stopPropagation();

      loadTwitterUser(globalState.selectedTwitterUser, {language: globalState.selectedTwitterUserLang});
    });

    $inputForm2.submit(function(e) {
      e.cancelBubble = true;
      e.preventDefault();
      if (e.stopPropagation)
        e.stopPropagation();

      var lang = globalState.selectedSample == 'custom' ? globalState.selectedLanguage : $('input#text-'+ globalState.selectedSample).attr('data-lang');

      setLoadingState();
      
      getProfileForText($('.input--text-area').val(), { language: lang });
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
    $('#your-twitter-panel .auth-form').show();
    $('#your-twitter-panel .analysis-form').hide();
    resetOutputs();
  });

  // toggleNeedsTraits
  $needsToggle.click(function() {
    $needsMoreTraits.toggle();
    $needsToggle.text($needsToggle.text() == '<<' ? '>>' : '<<');
  });

  $outputJSONButton.click(function() {
    $outputJSON.toggle();
    scrollTo($outputJSON);
  });

  function getProfileForTwitterUser(userId, options) {
    getProfile(userId, extend(options || {}, { source_type: 'twitter'}));
  }

  function getProfileForText(text, options) {
    getProfile(text, extend(options || {}, { source_type: 'text'}));
  }

  function replacementsForLang(lang) {
    var replacements = {
      'en' : {
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
      },
      'ja' : {
        'Openness': '知的好奇心',
        'Friendliness': '友好性'
      }
    };

    return replacements[lang] || {};
  }

  function changeProfileLabels(data) {
    var clonned = JSON.parse(JSON.stringify(data)),
      replacements = replacementsForLang(globalState.userLocale || OUTPUT_LANG || 'en');

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

  function getErrorMessage(error) {
    var message = GENERIC_REQUEST_ERROR;
    if (error.responseJSON && error.responseJSON.error) {
      message = error.responseJSON.error.error;
    }
    return message;
  }

  function defaultProfileOptions(options) {
    var defaults = extend({
      source_type: 'text',
      accept_language: globalState.userLocale || OUTPUT_LANG || 'en',
      include_raw: false
    }, options || {});

    var lang = globalState.userLocale || OUTPUT_LANG || 'en';

    if (defaults.source_type !== 'twitter') {
      defaults = extend({language: lang}, defaults);
    }

    return defaults;
  }

  function getProfile(data, options) {
    options = defaultProfileOptions(options);

    var
      payload = clone(options),
      url = '/api/profile/' + options.source_type;

    if (options.source_type === 'twitter')
      payload.userId = data;
    else
      payload.text = data;

    $.ajax({
      headers: {
        'csrf-token': $('meta[name="ct"]').attr('content')
      },
      type: 'POST',
      data: payload,
      url: url,
      dataType: 'json',
      success: function(data) {
        $loading.hide();
        $output.show();
        scrollTo($outputHeader);
        loadOutput(data);
      },
      error: function(err) {
        console.error(err);
        $loading.hide();
        $error.show();
        $errorMessage.text(getErrorMessage(err));
      }
    });
  }

  function loadOutput(rawData) {
    var data = changeProfileLabels(rawData);
    setTextSummary(data, globalState.userLocale || OUTPUT_LANG || 'en');
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

    var descriptions = new PersonalityTraitDescriptions({
      format: 'markdown',
      locale: globalState.userLocale || OUTPUT_LANG || 'en'
    });

    var tooltips = function (traitId) {
      return renderMarkdown(descriptions.description(traitId));
    };

    $big5Traits.append(_.template(big5_template, {
      items: big5Data_curated.sort(sortScores),
      tooltips: tooltips
    }));

    $needsTraits.append(_.template(statsPercent_template, {
      items: needsData_curated.sort(sortScores).slice(0,5),
      tooltips: tooltips
    }));

    $needsMoreTraits.append(_.template(statsPercent_template, {
      items: needsData_curated.sort(sortScores).slice(5, needsData_curated.length),
      tooltips: tooltips
    }));

    $valuesTraits.append(_.template(statsPercent_template, {
      items: valuesData_curated.sort(sortScores),
      tooltips: tooltips
    }));

    loadBehaviors(data, globalState.userLocale || OUTPUT_LANG || 'en');

    updateJSON(rawData);

    globalState.currentProfile = rawData;

  }

  function loadBehaviors(profile, lang) {
    var behaviors_template = outputBehaviorsTemplate.innerHTML;


    var personalityBehaviors = new PersonalityBehaviors({ locale: lang, format: 'markdown' });
    var behaviors = personalityBehaviors.behaviors(profile);
    behaviors = behaviors.map(function (b) {
      b.description = renderMarkdown(b.description);
      return b;
    });

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
    if(data.processed_lang === 'en') { 
     if (data.word_count >= 3000)
       $('.output--word-count-message_VERY-STRONG_NEW_MODEL').addClass('show');
     else if (data.word_count < 3000 && data.word_count >= 1200)
       $('.output--word-count-message_STRONG_NEW_MODEL').addClass('show');
     else if (data.word_count < 1200 && data.word_count >= 600)
       $('.output--word-count-message_DECENT_NEW_MODEL').addClass('show');
     else
       $('.output--word-count-message_WEAK_NEW_MODEL').addClass('show');
    } else {
     if (data.word_count > 6000)
       $('.output--word-count-message_VERY-STRONG').addClass('show');
     else if (data.word_count <= 6000 && data.word_count >= 3500)
       $('.output--word-count-message_STRONG').addClass('show');
     else if (data.word_count < 3500 && data.word_count >= 1500)
       $('.output--word-count-message_DECENT').addClass('show');
     else
       $('.output--word-count-message_WEAK').addClass('show');
    }
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
    selectDefaultLanguage();
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

  function selfAnalysis() {
    return QUERY_PARAMS.source == 'myself';
  }

  function setSelfAnalysis() {
    console.log('Analyzing twitter user ', '@'+TWITTER_USER);
    globalState.twitterUserId = TWITTER_USER.handle;
    globalState.twitterUserImage = TWITTER_USER.image;
    loadTwitterUser(TWITTER_USER.handle, {live_crawling : true});
    $('#self-analysis-tab').trigger('click');
    $('#your-twitter-panel .auth-form').hide();
    $('#your-twitter-panel .analysis-form label').remove();
    $('#your-twitter-panel .analysis-form').append([
        '<label class="base--inline-label input--radio" for="my-twitter">',
          '<img class="input--thumb" src="',
          TWITTER_USER.image || '/images/no-image.png',
          '">@', TWITTER_USER.handle,
        '</label>'
      ].join(''));
    $('#my-twitter').trigger('click');
    $('#your-twitter-panel .analysis-form').show();
  }

  function initialize() {
    $('input[name="twitter"]:first').attr('checked', true);
    $('input[name="text-sample"]:first').attr('checked', true);

    globalState.selectedTwitterUser = $('input[name="twitter"]:first').val();
    showHiddenLanguages();
    preloadSampleTexts(function () {
      loadSampleText(globalState.selectedSample);
    });
    registerHandlers();
    $inputTextArea.addClass('orientation', 'left-to-right');

    if (selfAnalysis() && TWITTER_USER.handle) {
      setSelfAnalysis();
    }
    selectDefaultLanguage();
  }

  function selectDefaultLanguage(){
    if (['en', 'es', 'ja', 'ar'].indexOf(globalState.userLocale) >= 0) {
      $('#lang-' + globalState.userLocale).prop('checked', true).trigger('click');
    }
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
