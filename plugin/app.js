const ACTION_CACHES = {}
const TICKER2_UUID = 'com.ulanzi.ulanzideck.cryptoticker.ticker2'
const STOCK_UUID = 'com.ulanzi.ulanzideck.cryptoticker.stock'
const TETHER_UUID = 'com.ulanzi.ulanzideck.cryptoticker.tether'

function loadTickerFont(fontSetting) {
  if (!fontSetting) return '"Source Han Sans"';
  return '"' + fontSetting + '", "Source Han Sans"';
}

$UD.connect('com.ulanzi.ulanzideck.cryptoticker')
$UD.onConnected(conn => {})

function createAction(context, jsn) {
  // SDK delivers the action UUID in jsn.uuid (jsn.action does not exist).
  var actionUuid = (jsn && (jsn.uuid || jsn.action)) || '';
  var actionType = (jsn && jsn.param && jsn.param.actionType) || '';
  console.warn('[CryptoTicker] createAction:', JSON.stringify({ uuid: actionUuid, actionType: actionType }));

  if (actionUuid === STOCK_UUID || actionType === 'stock') {
    return new StockTicker(context);
  }
  if (actionUuid === TETHER_UUID || actionType === 'tether') {
    return new TetherTicker(context);
  }
  if (actionUuid === TICKER2_UUID || actionType === 'ticker2') {
    return new CryptoTicker2(context);
  }
  return new CryptoTicker(context);
}

$UD.onAdd(jsn => {
  var context = jsn.context;
  var instance = ACTION_CACHES[context];
  if (!instance) {
    ACTION_CACHES[context] = createAction(context, jsn);
    onSetSettings(jsn);
  } else {
    instance.add();
  }
})

$UD.onSetActive(jsn => {
  var context = jsn.context;
  var instance = ACTION_CACHES[context];
  if (instance) {
    instance.setActive(jsn.active);
  }
})

$UD.onRun(jsn => {
  var context = jsn.context;
  var instance = ACTION_CACHES[context];
  if (!instance) $UD.emit('add', jsn);
  else instance.run();
})

$UD.onClear(jsn => {
  if (jsn.param) {
    for (var i = 0; i < jsn.param.length; i++) {
      var context = jsn.param[i].context;
      if (ACTION_CACHES[context]) {
        ACTION_CACHES[context].clear();
        delete ACTION_CACHES[context];
      }
    }
  }
})

$UD.onParamFromApp(jsn => {
  onSetSettings(jsn);
})

$UD.onParamFromPlugin(jsn => {
  onSetSettings(jsn);
})

function onSetSettings(jsn) {
  var settings = jsn.param || {};
  var context = jsn.context;
  var instance = ACTION_CACHES[context];
  if (!settings || !instance || JSON.stringify(settings) === '{}') return;

  if (settings.actionType === 'stock' && !(instance instanceof StockTicker)) {
    instance.clear();
    ACTION_CACHES[context] = new StockTicker(context);
    instance = ACTION_CACHES[context];
  } else if (settings.actionType === 'tether' && !(instance instanceof TetherTicker)) {
    instance.clear();
    ACTION_CACHES[context] = new TetherTicker(context);
    instance = ACTION_CACHES[context];
  } else if (settings.actionType === 'ticker2' && !(instance instanceof CryptoTicker2)) {
    instance.clear();
    ACTION_CACHES[context] = new CryptoTicker2(context);
    instance = ACTION_CACHES[context];
  }

  if (typeof instance.setParams === 'function') instance.setParams(settings);
}
