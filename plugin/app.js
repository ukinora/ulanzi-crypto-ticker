const ACTION_CACHES = {}
$UD.connect('com.ulanzi.ulanzideck.cryptoticker')
$UD.onConnected(conn => {})

$UD.onAdd(jsn => {
  const context = jsn.context;
  const instance = ACTION_CACHES[context];
  if (!instance) {
    ACTION_CACHES[context] = new CryptoTicker(context);
    onSetSettings(jsn);
  } else {
    instance.add();
  }
})

$UD.onSetActive(jsn => {
  const context = jsn.context;
  const instance = ACTION_CACHES[context];
  if (instance) {
    instance.setActive(jsn.active);
  }
})

$UD.onRun(jsn => {
  const context = jsn.context;
  const instance = ACTION_CACHES[context];
  if (!instance) $UD.emit('add', jsn);
  else instance.run();
})

$UD.onClear(jsn => {
  if (jsn.param) {
    for (let i = 0; i < jsn.param.length; i++) {
      const context = jsn.param[i].context;
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
  const settings = jsn.param || {};
  const context = jsn.context;
  const instance = ACTION_CACHES[context];
  if (!settings || !instance || JSON.stringify(settings) === '{}') return;
  if (typeof instance.setParams === 'function') instance.setParams(settings);
}
