let ACTION_SETTING = {};
let form = '';

$UD.connect('com.ulanzi.ulanzideck.cryptoticker.config');

$UD.onConnected(conn => {
  form = document.querySelector('#property-inspector');

  const el = document.querySelector('.udpi-wrapper');
  el.classList.remove('hidden');

  // 컬러 피커 <-> 텍스트 입력 동기화
  setupColorSync('bgColorPicker', 'bgColorText');
  setupColorSync('textColorPicker', 'textColorText');

  // 프리셋 컬러 클릭 핸들러
  setupPresets('bgPresets', 'bgColorPicker', 'bgColorText');
  setupPresets('textPresets', 'textColorPicker', 'textColorText');

  // 슬라이더 <-> 숫자 입력 동기화
  setupRangeSync('fontSizeRange', 'fontSizeNum');
  setupRangeSync('textOffsetYRange', 'textOffsetYNum');

  // 폼 변경 감지 -> 설정 전송
  form.addEventListener(
    'input',
    Utils.debounce(() => {
      const value = Utils.getFormValue(form);
      ACTION_SETTING = value;
      $UD.sendParamFromPlugin(ACTION_SETTING);
    })
  );
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

  // 컬러 피커도 동기화
  if (params.bgColor) {
    const bgPicker = document.getElementById('bgColorPicker');
    if (bgPicker) bgPicker.value = params.bgColor;
  }
  if (params.textColor) {
    const textPicker = document.getElementById('textColorPicker');
    if (textPicker) textPicker.value = params.textColor;
  }
  if (params.fontSize) {
    const range = document.getElementById('fontSizeRange');
    if (range) range.value = params.fontSize;
  }
  if (params.textOffsetY !== undefined) {
    const range = document.getElementById('textOffsetYRange');
    if (range) range.value = params.textOffsetY;
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
