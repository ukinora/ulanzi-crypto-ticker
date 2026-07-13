let ACTION_SETTING = {};
let form = '';

$UD.connect('com.ulanzi.ulanzideck.cryptoticker.stock');

$UD.onConnected(conn => {
  form = document.querySelector('#property-inspector');

  var el = document.querySelector('.udpi-wrapper');
  el.classList.remove('hidden');

  setupColorSync('bgColorPicker', 'bgColorText');
  setupPresets('bgPresets', 'bgColorPicker', 'bgColorText');
  setupRangeSync('symbolFontSizeRange', 'symbolFontSizeNum');
  setupRangeSync('priceFontSizeRange', 'priceFontSizeNum');
  setupRangeSync('changeFontSizeRange', 'changeFontSizeNum');
  setupRangeSync('lineGapRange', 'lineGapNum');
  setupRangeSync('textOffsetYRange', 'textOffsetYNum');
  setupRangeSync('scrollSpeedRange', 'scrollSpeedNum');

  // 폰트 선택
  initFontSelect();

  function sendSettings() {
    var value = Utils.getFormValue(form);
    var cb = document.getElementById('showChangeToggle');
    if (cb) value.showChange = cb.checked;
    var cbUnder = document.getElementById('alertUnderToggle');
    if (cbUnder) value.alertUnderEnabled = cbUnder.checked;
    var cbOver = document.getElementById('alertOverToggle');
    if (cbOver) value.alertOverEnabled = cbOver.checked;
    var cbPre = document.getElementById('sessionPreMarketToggle');
    if (cbPre) value.sessionPreMarket = cbPre.checked;
    var cbReg = document.getElementById('sessionRegularToggle');
    if (cbReg) value.sessionRegular = cbReg.checked;
    var cbAfter = document.getElementById('sessionAfterHoursToggle');
    if (cbAfter) value.sessionAfterHours = cbAfter.checked;
    var cbOff = document.getElementById('sessionOffHoursToggle');
    if (cbOff) value.sessionOffHours = cbOff.checked;
    if (value.symbol) value.symbol = value.symbol.toUpperCase().trim();
    ACTION_SETTING = value;
    $UD.sendParamFromPlugin(ACTION_SETTING);
  }

  form.addEventListener('input', Utils.debounce(sendSettings));
  form.addEventListener('change', Utils.debounce(sendSettings));
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
    var bgPicker = document.getElementById('bgColorPicker');
    if (bgPicker) bgPicker.value = params.bgColor;
  }
  if (params.symbolFontSize) {
    var r1 = document.getElementById('symbolFontSizeRange');
    if (r1) r1.value = params.symbolFontSize;
  }
  if (params.priceFontSize) {
    var r2 = document.getElementById('priceFontSizeRange');
    if (r2) r2.value = params.priceFontSize;
  }
  if (params.changeFontSize) {
    var r3 = document.getElementById('changeFontSizeRange');
    if (r3) r3.value = params.changeFontSize;
  }
  if (params.lineGap !== undefined) {
    var r4 = document.getElementById('lineGapRange');
    if (r4) r4.value = params.lineGap;
  }
  if (params.showChange !== undefined) {
    var cb = document.getElementById('showChangeToggle');
    if (cb) cb.checked = params.showChange !== false && params.showChange !== 'false';
  }
  if (params.textOffsetY !== undefined) {
    var range = document.getElementById('textOffsetYRange');
    if (range) range.value = params.textOffsetY;
  }
  if (params.scrollSpeed !== undefined) {
    var rSpeed = document.getElementById('scrollSpeedRange');
    if (rSpeed) rSpeed.value = params.scrollSpeed;
  }
  if (params.alertUnderEnabled !== undefined) {
    var cbU = document.getElementById('alertUnderToggle');
    if (cbU) cbU.checked = params.alertUnderEnabled === true || params.alertUnderEnabled === 'true';
  }
  if (params.alertUnderPrice !== undefined) {
    var inpU = document.getElementById('alertUnderPriceInput');
    if (inpU) inpU.value = params.alertUnderPrice;
  }
  if (params.alertOverEnabled !== undefined) {
    var cbO = document.getElementById('alertOverToggle');
    if (cbO) cbO.checked = params.alertOverEnabled === true || params.alertOverEnabled === 'true';
  }
  if (params.alertOverPrice !== undefined) {
    var inpO = document.getElementById('alertOverPriceInput');
    if (inpO) inpO.value = params.alertOverPrice;
  }
  if (params.customFont !== undefined) {
    var sel = document.getElementById('fontSelect');
    if (sel) sel.value = params.customFont || '';
    updateFontPreview(params.customFont);
  }

  var sessionMap = {
    sessionPreMarket: 'sessionPreMarketToggle',
    sessionRegular: 'sessionRegularToggle',
    sessionAfterHours: 'sessionAfterHoursToggle',
    sessionOffHours: 'sessionOffHoursToggle'
  };
  for (var key in sessionMap) {
    if (params[key] !== undefined) {
      var cb = document.getElementById(sessionMap[key]);
      if (cb) cb.checked = params[key] !== false && params[key] !== 'false';
    }
  }
}

function setupColorSync(pickerId, textId) {
  var picker = document.getElementById(pickerId);
  var text = document.getElementById(textId);
  if (!picker || !text) return;

  picker.addEventListener('input', function() {
    text.value = picker.value;
    text.dispatchEvent(new Event('input', { bubbles: true }));
  });

  text.addEventListener('input', function() {
    if (/^#[0-9a-fA-F]{6}$/.test(text.value)) {
      picker.value = text.value;
    }
  });
}

function setupRangeSync(rangeId, numId) {
  var range = document.getElementById(rangeId);
  var num = document.getElementById(numId);
  if (!range || !num) return;

  range.addEventListener('input', function() {
    num.value = range.value;
    num.dispatchEvent(new Event('input', { bubbles: true }));
  });

  num.addEventListener('input', function() {
    var v = parseInt(num.value);
    if (v >= parseInt(range.min) && v <= parseInt(range.max)) {
      range.value = v;
    }
  });
}

function setupPresets(containerId, pickerId, textId) {
  var container = document.getElementById(containerId);
  var picker = document.getElementById(pickerId);
  var text = document.getElementById(textId);
  if (!container || !picker || !text) return;

  container.addEventListener('click', function(e) {
    var target = e.target.closest('.preset-color');
    if (!target) return;
    var color = target.dataset.color;
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
