let ACTION_SETTING = {};
let form = '';

$UD.connect('com.ulanzi.ulanzideck.cryptoticker.tether');

$UD.onConnected(conn => {
  form = document.querySelector('#property-inspector');

  const el = document.querySelector('.udpi-wrapper');
  el.classList.remove('hidden');

  setupColorSync('bgColorPicker', 'bgColorText');
  setupColorSync('textColorPicker', 'textColorText');

  setupPresets('bgPresets', 'bgColorPicker', 'bgColorText');
  setupPresets('textPresets', 'textColorPicker', 'textColorText');

  setupRangeSync('labelSizeRange', 'labelSizeNum');
  setupRangeSync('valueSizeRange', 'valueSizeNum');
  setupRangeSync('kimchiSizeRange', 'kimchiSizeNum');
  setupRangeSync('labelGapRange', 'labelGapNum');
  setupRangeSync('textOffsetYRange', 'textOffsetYNum');
  setupRangeSync('kimchiOffsetYRange', 'kimchiOffsetYNum');

  initFontSelect();

  form.addEventListener(
    'input',
    Utils.debounce(() => {
      const value = Utils.getFormValue(form);
      ACTION_SETTING = value;
      $UD.sendParamFromPlugin(ACTION_SETTING);
    })
  );
  form.addEventListener('change', Utils.debounce(() => {
    const value = Utils.getFormValue(form);
    ACTION_SETTING = value;
    $UD.sendParamFromPlugin(ACTION_SETTING);
  }));
});

$UD.onAdd(jsonObj => {
  if (jsonObj && jsonObj.param) {
    settingSaveParam(jsonObj.param);
  }
});

$UD.onParamFromApp(jsonObj => {
  if (jsonObj && jsonObj.param) {
    settingSaveParam(jsonObj.param);
  }
});

function settingSaveParam(params) {
  ACTION_SETTING = params;
  Utils.setFormValue(ACTION_SETTING, form);

  if (params.bgColor) {
    const bgPicker = document.getElementById('bgColorPicker');
    if (bgPicker) bgPicker.value = params.bgColor;
  }
  if (params.textColor) {
    const textPicker = document.getElementById('textColorPicker');
    if (textPicker) textPicker.value = params.textColor;
  }
  var syncRange = function (key, rangeId) {
    if (params[key] !== undefined && params[key] !== '') {
      var range = document.getElementById(rangeId);
      if (range) range.value = params[key];
    }
  };
  syncRange('labelFontSize', 'labelSizeRange');
  syncRange('valueFontSize', 'valueSizeRange');
  syncRange('kimchiFontSize', 'kimchiSizeRange');
  syncRange('labelGap', 'labelGapRange');
  syncRange('textOffsetY', 'textOffsetYRange');
  syncRange('kimchiOffsetY', 'kimchiOffsetYRange');
  if (params.customFont !== undefined) {
    var sel = document.getElementById('fontSelect');
    if (sel) sel.value = params.customFont || '';
    updateFontPreview(params.customFont);
  }
}

function setupColorSync(pickerId, textId) {
  const picker = document.getElementById(pickerId);
  const text = document.getElementById(textId);
  if (!picker || !text) return;

  picker.addEventListener('input', () => {
    text.value = picker.value;
    text.dispatchEvent(new Event('input', { bubbles: true }));
  });

  text.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(text.value)) {
      picker.value = text.value;
    }
  });
}

function setupRangeSync(rangeId, numId) {
  const range = document.getElementById(rangeId);
  const num = document.getElementById(numId);
  if (!range || !num) return;

  range.addEventListener('input', () => {
    num.value = range.value;
    num.dispatchEvent(new Event('input', { bubbles: true }));
  });

  num.addEventListener('input', () => {
    const v = parseInt(num.value);
    if (v >= parseInt(range.min) && v <= parseInt(range.max)) {
      range.value = v;
    }
  });
}

function setupPresets(containerId, pickerId, textId) {
  const container = document.getElementById(containerId);
  const picker = document.getElementById(pickerId);
  const text = document.getElementById(textId);
  if (!container || !picker || !text) return;

  container.addEventListener('click', (e) => {
    const target = e.target.closest('.preset-color');
    if (!target) return;
    const color = target.dataset.color;
    picker.value = color;
    text.value = color;
    text.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

var FONT_CANDIDATES = [
  'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Consolas', 'Courier New',
  'Georgia', 'Impact', 'Lucida Console', 'Segoe UI', 'Segoe UI Black',
  'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
  'Malgun Gothic', 'Batang', 'Dotum', 'Gulim', 'Gungsuh',
  'Nanum Gothic', 'NanumGothic', 'Nanum Myeongjo', 'NanumMyeongjo',
  'Nanum Barun Gothic', 'NanumBarunGothic', 'Nanum Square', 'NanumSquare',
  'Nanum Square Round', 'NanumSquareRound',
  'D2Coding', 'Pretendard', 'Pretendard Variable',
  'Source Han Sans', 'Source Han Sans SC', 'Source Han Sans K',
  'Noto Sans CJK KR', 'Noto Sans KR', 'Noto Serif CJK KR',
  'Microsoft YaHei', 'SimHei', 'SimSun', 'Yu Gothic', 'Meiryo',
  'Cascadia Code', 'Cascadia Mono', 'Fira Code', 'JetBrains Mono',
  'SF Pro', 'Helvetica Neue', 'Apple SD Gothic Neo',
  'Comic Sans MS', 'Papyrus', 'Rockwell', 'Century Gothic',
  'Franklin Gothic Medium', 'Garamond', 'Palatino Linotype',
  'Book Antiqua', 'Lucida Sans Unicode'
];

function detectInstalledFonts() {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var testStr = 'mmmmmmmmmmlli10.';
  ctx.font = '72px monospace';
  var monoW = ctx.measureText(testStr).width;
  ctx.font = '72px sans-serif';
  var sansW = ctx.measureText(testStr).width;
  var installed = [];
  for (var i = 0; i < FONT_CANDIDATES.length; i++) {
    var name = FONT_CANDIDATES[i];
    ctx.font = '72px "' + name + '", monospace';
    var w1 = ctx.measureText(testStr).width;
    ctx.font = '72px "' + name + '", sans-serif';
    var w2 = ctx.measureText(testStr).width;
    if (w1 !== monoW || w2 !== sansW) {
      installed.push(name);
    }
  }
  return installed;
}

function initFontSelect() {
  var select = document.getElementById('fontSelect');
  if (!select) return;
  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Default (Source Han Sans)';
  select.appendChild(defaultOpt);
  var fonts = detectInstalledFonts();
  for (var i = 0; i < fonts.length; i++) {
    var opt = document.createElement('option');
    opt.value = fonts[i];
    opt.textContent = fonts[i];
    select.appendChild(opt);
  }
  select.addEventListener('change', function() {
    updateFontPreview(select.value);
  });
}

function updateFontPreview(fontName) {
  var preview = document.getElementById('fontPreview');
  var previewText = document.getElementById('fontPreviewText');
  if (!fontName) {
    if (preview) preview.style.display = 'none';
    return;
  }
  if (preview) preview.style.display = 'block';
  if (previewText) previewText.style.fontFamily = '"' + fontName + '", "Source Han Sans", sans-serif';
}
