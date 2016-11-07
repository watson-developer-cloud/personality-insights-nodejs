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
        loadConsumptionPreferences(data);
      },
      error: function(err) {
        console.error(err);
        $loading.hide();
        $error.show();
        $errorMessage.text(getErrorMessage(err));
      }
    });
  }

  function cpIdSorting(cpid) {
    return ["consumption_preferences_music_rap",
      "consumption_preferences_music_country",
      "consumption_preferences_concerned_environment",
      "consumption_preferences_read_frequency",
      "consumption_preferences_music_r_b",
      "consumption_preferences_volunteer_learning",
      "consumption_preferences_automobile_ownership_cost",
      "consumption_preferences_automobile_safety",
      "consumption_preferences_volunteer",
      "consumption_preferences_movie_romance",
      "consumption_preferences_eat_out",
      "consumption_preferences_music_hip_hop",
      "consumption_preferences_movie_adventure",
      "consumption_preferences_movie_horror",
      "consumption_preferences_influence_brand_name",
      "consumption_preferences_music_live_event",
      "consumption_preferences_clothes_quality",
      "consumption_preferences_automobile_resale_value",
      "consumption_preferences_clothes_style",
      "consumption_preferences_read_motive_enjoyment",
      "consumption_preferences_music_christian_gospel",
      "consumption_preferences_read_motive_information",
      "consumption_preferences_books_entertainment_magazines",
      "consumption_preferences_books_non_fiction",
      "consumption_preferences_start_business",
      "consumption_preferences_read_motive_mandatory",
      "consumption_preferences_gym_membership",
      "consumption_preferences_influence_family_members",
      "consumption_preferences_adventurous_sports",
      "consumption_preferences_movie_musical",
      "consumption_preferences_movie_historical",
      "consumption_preferences_movie_science_fiction",
      "consumption_preferences_volunteering_time",
      "consumption_preferences_spur_of_moment",
      "consumption_preferences_movie_war",
      "consumption_preferences_credit_card_payment",
      "consumption_preferences_movie_drama",
      "consumption_preferences_read_motive_relaxation",
      "consumption_preferences_influence_utility",
      "consumption_preferences_music_playing",
      "consumption_preferences_books_financial_investing",
      "consumption_preferences_fast_food_frequency",
      "consumption_preferences_movie_action",
      "consumption_preferences_influence_online_ads",
      "consumption_preferences_books_autobiographies",
      "consumption_preferences_influence_social_media",
      "consumption_preferences_music_latin",
      "consumption_preferences_music_rock",
      "consumption_preferences_outdoor",
      "consumption_preferences_music_classical",
      "consumption_preferences_movie_documentary",
      "consumption_preferences_clothes_comfort" ].indexOf(cpid);
  }

  function getLikelyToLabel() {
    var lang = globalState.userLocale || OUTPUT_LANG || 'en';

    if(lang == "ja")
    {
      //Japanese
      return "下記のような傾向がありそうです______ ";
    }
    if(lang == "es")
    {
      //Spanish
      return "Usted es más propenso a______ ";
    }
    else {
      //Default to English
      return "You are likely to______ ";
    }
  }

  function getUnlikelyToLabel() {
    var lang = globalState.userLocale || OUTPUT_LANG || 'en';

    if(lang == "ja")
    {
      //Japanese
      return "下記の傾向は低そうです______ ";
    }
    if(lang == "es")
    {
      //Spanish
      return "Usted es menos propenso a______ ";
    }
    else {
      //Default to English
      return "You are unlikely to______ ";
    }
  }

  function cpIdMapping(cpid) {

    var lang = globalState.userLocale || OUTPUT_LANG || 'en';

    if(lang == "ja")
    {
      //Japanese
      return {
          "consumption_preferences_automobile_ownership_cost": "自動車を買うときは維持費用を重視する",
	      "consumption_preferences_automobile_safety": "自動車を買うときは安全性を優先する",
	      "consumption_preferences_automobile_resale_value": "自動車を買うときはリセールバリューを優先する",
	      "consumption_preferences_clothes_quality": "衣服を買うときは品質を優先する",
	      "consumption_preferences_clothes_style": "衣服を買うときはスタイルを優先する",
	      "consumption_preferences_clothes_comfort": "衣服を買うときは着心地を優先する",
	      "consumption_preferences_influence_brand_name": "商品を購入するときはブランド名に左右される",
	      "consumption_preferences_influence_utility": "商品を購入するときは商品の実用性を重視する",
	      "consumption_preferences_influence_online_ads": "商品を購入するときはオンライン広告に左右される",
	      "consumption_preferences_influence_social_media": "製品の購入中にソーシャル・メディアに左右される",
	      "consumption_preferences_influence_family_members": "商品を購入するときは家族の影響を受ける",
	      "consumption_preferences_spur_of_moment": "衝動買いに走る",
	      "consumption_preferences_credit_card_payment": "買い物にクレジット・カードを使うことが多い",
	      "consumption_preferences_eat_out": "頻繁に外食する",
	      "consumption_preferences_fast_food_frequency": "頻繁にファースト・フードを食べる",
	      "consumption_preferences_gym_membership": "スポーツ・ジムの会員である",
	      "consumption_preferences_adventurous_sports": "アドベンチャー・スポーツを好む",
	      "consumption_preferences_outdoor": "アウトドア活動を好む",
	      "consumption_preferences_concerned_environment": "環境問題について心配している",
	      "consumption_preferences_start_business": "数年後に起業することを考えている",
	      "consumption_preferences_movie_romance": "ロマンス映画を好む",
	      "consumption_preferences_movie_adventure": "アドベンチャー映画を好む",
	      "consumption_preferences_movie_horror": "ホラー映画を好む",
	      "consumption_preferences_movie_musical": "ミュージカル映画を好む",
	      "consumption_preferences_movie_historical": "歴史映画を好む",
	      "consumption_preferences_movie_science_fiction": "SF 映画を好む",
	      "consumption_preferences_movie_war": "戦争映画を好む",
	      "consumption_preferences_movie_drama": "ドラマ映画を好む",
	      "consumption_preferences_movie_action": "アクション映画を好む",
	      "consumption_preferences_movie_documentary": "ドキュメンタリー映画を好む",
	      "consumption_preferences_music_rap": "ラップ・ミュージックを好む",
	      "consumption_preferences_music_country": "カントリー・ミュージックを好む",
	      "consumption_preferences_music_r_b": "R&B ミュージックを好む",
	      "consumption_preferences_music_hip_hop": "ヒップ・ホップ・ミュージックを好む",
	      "consumption_preferences_music_live_event": "ライブの音楽イベントに行く",
	      "consumption_preferences_music_christian_gospel": "キリスト教音楽/ゴスペル音楽を好む",
	      "consumption_preferences_music_playing": "楽器演奏の経験がある",
	      "consumption_preferences_music_latin": "ラテン音楽を好む",
	      "consumption_preferences_music_rock": "ロック音楽を好む",
	      "consumption_preferences_music_classical": "クラシック音楽を好む",
	      "consumption_preferences_read_frequency": "いつも読書している",
	      "consumption_preferences_read_motive_enjoyment": "楽しみのために読書する",
	      "consumption_preferences_read_motive_information": "情報収集のために読書する",
	      "consumption_preferences_books_entertainment_magazines": "娯楽雑誌を読む",
	      "consumption_preferences_books_non_fiction": "ノンフィクション作品を読む",
	      "consumption_preferences_read_motive_mandatory": "必読書だけを読む",
	      "consumption_preferences_read_motive_relaxation": "気晴らしに読書する",
	      "consumption_preferences_books_financial_investing": "投資関連書籍を読む",
	      "consumption_preferences_books_autobiographies": "自伝や伝記を読む",
	      "consumption_preferences_volunteer": "社会貢献のためにボランティア活動をする",
	      "consumption_preferences_volunteering_time": "ボランティア活動に参加したことがある",
	      "consumption_preferences_volunteer_learning": "社会貢献について学ぶためにボランティア活動をする",
      }[cpid]
    }
    else if (lang == "es") {
      //Spanish
      return {
          "consumption_preferences_automobile_ownership_cost": "sea sensible al coste de propiedad al comprar automóviles",
	      "consumption_preferences_automobile_safety": "prefiera la seguridad al comprar automóviles",
	      "consumption_preferences_automobile_resale_value": "prefiera el valor de reventa al comprar automóviles",
	      "consumption_preferences_clothes_quality": "prefiera la calidad al comprar ropa",
	      "consumption_preferences_clothes_style": "prefiera el estilo al comprar ropa",
	      "consumption_preferences_clothes_comfort": "prefiera la comodidad al comprar ropa",
	      "consumption_preferences_influence_brand_name": "se deje influenciar por la marca al comprar productos",
	      "consumption_preferences_influence_utility": "se deje influenciar por la utilidad al comprar productos",
	      "consumption_preferences_influence_online_ads": "se deje influenciar por los anuncios en línea al comprar productos",
	      "consumption_preferences_influence_social_media": "se deje influenciar por las redes sociales al comprar productos",
	      "consumption_preferences_influence_family_members": "se deje influenciar por la familia al comprar productos",
	      "consumption_preferences_spur_of_moment": "se dé algún capricho en el momento de hacer las compras",
	      "consumption_preferences_credit_card_payment": "prefiera utilizar tarjetas de crédito en sus compras",
	      "consumption_preferences_eat_out": "coma fuera con frecuencia",
	      "consumption_preferences_fast_food_frequency": "consuma comida rápida con frecuencia",
	      "consumption_preferences_gym_membership": "esté inscrito en un gimnasio",
	      "consumption_preferences_adventurous_sports": "le gusten los deportes de aventura",
	      "consumption_preferences_outdoor": "le gusten las actividades al aire libre",
	      "consumption_preferences_concerned_environment": "le preocupe el medioambiente",
	      "consumption_preferences_start_business": "esté pensando en iniciar un negocio en los próximos años",
	      "consumption_preferences_movie_romance": "le gusten las películas románticas",
	      "consumption_preferences_movie_adventure": "le gusten las películas de aventuras",
	      "consumption_preferences_movie_horror": "le gusten las películas de terror",
	      "consumption_preferences_movie_musical": "le gusten las películas musicales",
	      "consumption_preferences_movie_historical": "le gusten las películas históricas",
	      "consumption_preferences_movie_science_fiction": "le gusten las películas de ciencia ficción",
	      "consumption_preferences_movie_war": "le gusten las películas bélicas",
	      "consumption_preferences_movie_drama": "le gusten las películas dramáticas",
	      "consumption_preferences_movie_action": "le gusten las películas de acción",
	      "consumption_preferences_movie_documentary": "le gusten los documentales",
	      "consumption_preferences_music_rap": "le guste la música rap",
	      "consumption_preferences_music_country": "le guste la música country",
	      "consumption_preferences_music_r_b": "le guste el rythm and blues",
	      "consumption_preferences_music_hip_hop": "le guste la música hip hop",
	      "consumption_preferences_music_live_event": "acuda a eventos musicales en directo",
	      "consumption_preferences_music_christian_gospel": "le guste la música gospel/religiosa",
	      "consumption_preferences_music_playing": "tenga experiencia interpretando música",
	      "consumption_preferences_music_latin": "le guste la música latina",
	      "consumption_preferences_music_rock": "le guste el rock",
	      "consumption_preferences_music_classical": "le guste la música clásica",
	      "consumption_preferences_read_frequency": "lea con frecuencia",
	      "consumption_preferences_read_motive_enjoyment": "lea por el placer de hacerlo",
	      "consumption_preferences_read_motive_information": "lea para informarse",
	      "consumption_preferences_books_entertainment_magazines": "lea revistas de entretenimiento",
	      "consumption_preferences_books_non_fiction": "lea libros que no sean de ficción",
	      "consumption_preferences_read_motive_mandatory": "lea únicamente lo que le obligan a leer",
	      "consumption_preferences_read_motive_relaxation": "lea para relajarse",
	      "consumption_preferences_books_financial_investing": "lea libros de inversión financiera",
	      "consumption_preferences_books_autobiographies": "lea libros autobiográficos",
	      "consumption_preferences_volunteer": "sea voluntario en obras sociales",
	      "consumption_preferences_volunteering_time": "haya dedicado parte de su tiempo al voluntariado",
	      "consumption_preferences_volunteer_learning": "sea voluntario para saber más sobre las obras sociales",
      }[cpid]
    }
    else {
      //Default to english
      return {
          "consumption_preferences_automobile_ownership_cost": "be sensitive to ownership cost when buying automobiles",
          "consumption_preferences_automobile_safety": "prefer safety when buying automobiles",
          "consumption_preferences_automobile_resale_value": "prefer resale value when buying automobiles",
          "consumption_preferences_clothes_quality": "prefer quality when buying clothes",
          "consumption_preferences_clothes_style": "prefer style when buying clothes",
          "consumption_preferences_clothes_comfort": "prefer comfort when buying clothes",
          "consumption_preferences_influence_brand_name": "be influenced by brand name when making product purchases",
          "consumption_preferences_influence_utility": "be influenced by product utility when making product purchases",
          "consumption_preferences_influence_online_ads": "be influenced by online ads when making product purchases",
          "consumption_preferences_influence_social_media": "be influenced by social media during product purchases",
          "consumption_preferences_influence_family_members": "be influenced by family when making product purchases",
          "consumption_preferences_spur_of_moment": "indulge in spur of the moment purchases",
          "consumption_preferences_credit_card_payment": "prefer using credit cards for shopping",
          "consumption_preferences_eat_out": "eat out frequently",
          "consumption_preferences_fast_food_frequency": "eat fast food frequently",
          "consumption_preferences_gym_membership": "have a gym membership",
          "consumption_preferences_adventurous_sports": "like adventurous sports",
          "consumption_preferences_outdoor": "like outdoor activities",
          "consumption_preferences_concerned_environment": "be concerned about the environment",
          "consumption_preferences_start_business": "consider starting a business in next few years",
          "consumption_preferences_movie_romance": "like romance movies",
          "consumption_preferences_movie_adventure": "like adventure movies",
          "consumption_preferences_movie_horror": "like horror movies",
          "consumption_preferences_movie_musical": "like musical movies",
          "consumption_preferences_movie_historical": "like historical movies",
          "consumption_preferences_movie_science_fiction": "like science-fiction movies",
          "consumption_preferences_movie_war": "like war movies",
          "consumption_preferences_movie_drama": "like drama movies",
          "consumption_preferences_movie_action": "like action movies",
          "consumption_preferences_movie_documentary": "like documentary movies",
          "consumption_preferences_music_rap": "like rap music",
          "consumption_preferences_music_country": "like country music",
          "consumption_preferences_music_r_b": "like R&B music",
          "consumption_preferences_music_hip_hop": "like hip hop music",
          "consumption_preferences_music_live_event": "attend live musical events",
          "consumption_preferences_music_christian_gospel": "like Christian/gospel music",
          "consumption_preferences_music_playing": "have experience playing music",
          "consumption_preferences_music_latin": "like Latin music",
          "consumption_preferences_music_rock": "like rock music",
          "consumption_preferences_music_classical": "like classical music",
          "consumption_preferences_read_frequency": "read often",
          "consumption_preferences_read_motive_enjoyment": "read for enjoyment",
          "consumption_preferences_read_motive_information": "read for information",
          "consumption_preferences_books_entertainment_magazines": "read entertainment magazines",
          "consumption_preferences_books_non_fiction": "read non-fiction books",
          "consumption_preferences_read_motive_mandatory": "do mandatory reading only",
          "consumption_preferences_read_motive_relaxation": "read for relaxation",
          "consumption_preferences_books_financial_investing": "read financial investment books",
          "consumption_preferences_books_autobiographies": "read autobiographical books",
          "consumption_preferences_volunteer": "volunteer for social causes",
          "consumption_preferences_volunteering_time": "have spent time volunteering",
          "consumption_preferences_volunteer_learning": "volunteer to learn about social causes",
      }[cpid]
    }
  }

  var consumptionPrefMusic = new Set(["consumption_preferences_music_rap",
    "consumption_preferences_music_country",
    "consumption_preferences_music_r_b",
    "consumption_preferences_music_hip_hop",
    "consumption_preferences_music_live_event",
    "consumption_preferences_music_playing",
    "consumption_preferences_music_latin",
    "consumption_preferences_music_rock",
    "consumption_preferences_music_classical" ]);

  var consumptionPrefMovie = new Set(["consumption_preferences_movie_romance",
    "consumption_preferences_movie_adventure",
    "consumption_preferences_movie_horror",
    "consumption_preferences_movie_musical",
    "consumption_preferences_movie_historical",
    "consumption_preferences_movie_science_fiction",
    "consumption_preferences_movie_war",
    "consumption_preferences_movie_drama",
    "consumption_preferences_movie_action",
    "consumption_preferences_movie_documentary"]);

  function addIfAllowedReducer(accumulator, toadd) {
    if (consumptionPrefMusic.has(toadd.cpid)) {
      if (accumulator.reduce(function(k,v) {
            return consumptionPrefMusic.has(v.cpid) ? k + 1 : k;
          },0) < 1) {
        accumulator.push(toadd);
      }
    } else if (consumptionPrefMovie.has(toadd.cpid)) {

      if(accumulator.reduce(function(k,v) {
          return consumptionPrefMovie.has(v.cpid) ? k + 1 : k;
        },0) < 1) {
        accumulator.push(toadd);
      }
    } else {
      accumulator.push(toadd);
    }
    return accumulator;
  }

  function sortIdxComparator(a, b) {
    if (a < b) {
      return -1;
    }

    if (a > b) {
      return 1;
    }

    if (a === b) {
      return 0;
    }
  }

  function loadConsumptionPreferences(data) {
    var cpsect = $(".output-summary--consumption-behaviors--section")
    var behaviors = $(".output-summary--consumption-behaviors--section")
    if (data.consumption_preferences) {
      var likelycps = data.consumption_preferences.reduce(function(k,v) {
        v.consumption_preferences.map(function(child_item) {
          if (child_item.score === 1) {
            k.push({ name: cpIdMapping(child_item.consumption_preference_id),
              idx: cpIdSorting(child_item.consumption_preference_id),
              cpid: child_item.consumption_preference_id
            });
          }
        });
        return k;
      },[]);

      var unlikelycps = data.consumption_preferences.reduce(function(k,v) {
        v.consumption_preferences.map(function(child_item) {
          if (child_item.score === 0) {
            k.push({ name: cpIdMapping(child_item.consumption_preference_id),
              idx: cpIdSorting(child_item.consumption_preference_id),
              cpid: child_item.consumption_preference_id
            });
          }
        });
        return k;
      },[]);
      behaviors.html("");
      behaviors.append("<h4 class=\"base--h4\">" + getLikelyToLabel() + "</h4>");
      behaviors.append("<div class=\"output-summary--likely-behaviors\">");
      likelycps.sort(sortIdxComparator).reduce(addIfAllowedReducer,[]).slice(0,3).map(function(item) {
        behaviors.append("<div class=\"output-summary--behavior output-summary--behavior_POSITIVE\"><i class=\"icon icon-likely\"></i>" + item.name + "</div>\n");
      });
      behaviors.append("</div>");
      behaviors.append("<h4 class=\"base--h4\">" + getUnlikelyToLabel() + "</h4>");
      behaviors.append("<div class=\"output-summary--unlikely-behaviors\">");
      unlikelycps.sort(sortIdxComparator).reduce(addIfAllowedReducer,[]).slice(0,3).map(function(item) {
        behaviors.append("<div class=\"output-summary--behavior output-summary--behavior_NEGATIVE\"><i class=\"icon icon-not-likely\"></i>" + item.name + "</div>\n");
      });
      behaviors.append("</div>");
      cpsect.show();
    } else {
      cpsect.hide();
    }
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

    updateJSON(rawData);

    globalState.currentProfile = rawData;

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
    $outputJSONCode.html(JSON.stringify(results['raw_v3_response'], null, 2));
    $('.code--json').each(function (i,b) { hljs.highlightBlock(b); });
  }

  initialize();
});
