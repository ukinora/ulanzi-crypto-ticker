class CryptoTicker2 {
  constructor(context) {
    this.context = context;
    this.lastIcon = '';

    this.settings = {
      symbol: 'BTC',
      bgColor: '#000000',
      symbolFontSize: 16,
      priceFontSize: 32,
      changeFontSize: 14,
      lineGap: 8,
      showChange: true,
      textOffsetY: 0,
      refreshDuration: 30,
      alertUnderEnabled: false,
      alertUnderPrice: 0,
      alertOverEnabled: false,
      alertOverPrice: 0
    };
    this.allowSend = true;
    this.debounceTimer = 0;
    this.refreshTimer = 0;
    this.lastPrice = null;
    this.candleOpen = null;
    this.kimchiPremium = null;
    this.hasData = false;         // true after the first real (non-loading/error) render
    this.fontFamily = '"Source Han Sans"';

    this.run();
  }

  run() {
    this.clear();
    this.fetchData();
    this.refreshTimer = setInterval(() => {
      this.fetchData();
    }, this.settings.refreshDuration * 1000);
  }

  fetchData() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(async () => {
      this.showLoading();

      const sym = this.settings.symbol.toUpperCase();

      try {
        let price = null;

        if (sym === 'USD_KRW') {
          const result = await Utils.fetchData('https://api.manana.kr/exchange/rate/KRW/USD.json');
          if (Array.isArray(result) && result[0] && result[0].rate) {
            price = parseFloat(result[0].rate);
          }
        } else if (sym === 'USDT_KRW') {
          const results = await Promise.all([
            Utils.fetchData('https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=KRW'),
            Utils.fetchData('https://api.manana.kr/exchange/rate/KRW/USD.json')
          ]);
          const usdtKrw = results[0] && results[0].KRW ? parseFloat(results[0].KRW) : null;
          const usdKrw = Array.isArray(results[1]) && results[1][0] ? parseFloat(results[1][0].rate) : null;
          if (usdtKrw !== null) {
            price = usdtKrw;
            if (usdKrw !== null && usdKrw > 0) {
              this.kimchiPremium = ((usdtKrw - usdKrw) / usdKrw * 100).toFixed(2);
            }
          }
        } else {
          var interval = this.getKlineInterval();
          var klineUrl = 'https://data-api.binance.vision/api/v3/klines?symbol=' + sym + 'USDT&interval=' + interval + '&limit=1';
          var kline = await Utils.fetchData(klineUrl);
          if (Array.isArray(kline) && kline[0]) {
            this.candleOpen = parseFloat(kline[0][1]);
            price = parseFloat(kline[0][4]);
          }
        }

        if (price !== null) {
          this.lastPrice = price;
          this.createIcon(this.lastPrice, false);
        } else {
          this.showError();
        }
      } catch (e) {
        this.showError();
      }
    }, 150);
  }

  getDisplayName() {
    const sym = this.settings.symbol.toUpperCase();
    if (sym === 'USD_KRW') return '\uB2EC\uB7EC';
    if (sym === 'USDT_KRW') return 'USDT';
    return sym;
  }

  formatPrice(price) {
    if (price === null || price === undefined) return '--';
    const sym = this.settings.symbol.toUpperCase();
    if (sym === 'USD_KRW' || sym === 'USDT_KRW') {
      return price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  }

  getKlineInterval() {
    var dur = parseInt(this.settings.refreshDuration) || 30;
    if (dur <= 60) return '1m';
    if (dur <= 300) return '5m';
    return '15m';
  }

  isAlertTriggered(price) {
    if (price === null || price === undefined) return false;
    var underEnabled = this.settings.alertUnderEnabled === true || this.settings.alertUnderEnabled === 'true';
    var overEnabled = this.settings.alertOverEnabled === true || this.settings.alertOverEnabled === 'true';
    var underPrice = parseFloat(this.settings.alertUnderPrice) || 0;
    var overPrice = parseFloat(this.settings.alertOverPrice) || 0;
    if (underEnabled && underPrice > 0 && price < underPrice) return true;
    if (overEnabled && overPrice > 0 && price > overPrice) return true;
    return false;
  }

  invertColor(hex) {
    var h = (hex || '#000000').replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = 255 - parseInt(h.slice(0, 2), 16);
    var g = 255 - parseInt(h.slice(2, 4), 16);
    var b = 255 - parseInt(h.slice(4, 6), 16);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  getChangeInfo() {
    if (this.candleOpen === null || this.lastPrice === null || this.candleOpen === 0) {
      return { direction: 0, pct: 0 };
    }
    var diff = this.lastPrice - this.candleOpen;
    var pct = (diff / this.candleOpen) * 100;
    if (diff > 0) return { direction: 1, pct: pct };
    if (diff < 0) return { direction: -1, pct: pct };
    return { direction: 0, pct: 0 };
  }

  createIcon(price, loading, error) {
    if (!loading && !error) this.hasData = true;
    const canvas = document.createElement('canvas');
    const size = 196;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const bgColor = this.settings.bgColor || '#000000';
    const symbolFontSize = parseInt(this.settings.symbolFontSize) || 16;
    const priceFontSize = parseInt(this.settings.priceFontSize) || 32;
    const changeFontSize = parseInt(this.settings.changeFontSize) || 14;
    const offsetY = parseInt(this.settings.textOffsetY) || 0;
    const cx = size / 2;
    const cy = size / 2 + offsetY;

    const upColor = '#22c55e';
    const downColor = '#ef4444';
    const neutralColor = '#9ca3af';

    // Alert: 배경/텍스트 색상 반전
    const alertActive = !loading && !error && this.isAlertTriggered(price);
    const actualBg = alertActive ? this.invertColor(bgColor) : bgColor;
    const baseTextColor = alertActive ? bgColor : '#ffffff';

    // 배경
    ctx.fillStyle = actualBg;
    ctx.fillRect(0, 0, size, size);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    if (loading) {
      ctx.fillStyle = '#ffffff';
      ctx.font = priceFontSize + 'px ' + this.fontFamily;
      ctx.fillText('...', cx, cy);
    } else if (error) {
      ctx.fillStyle = downColor;
      ctx.font = 'bold ' + priceFontSize + 'px ' + this.fontFamily;
      ctx.fillText('ERR', cx, cy);
    } else {
      const change = this.getChangeInfo();
      const dir = change.direction;
      const pctStr = Math.abs(change.pct).toFixed(2);
      const changeColor = alertActive
        ? (dir > 0 ? '#007700' : dir < 0 ? '#aa0000' : bgColor)
        : (dir > 0 ? upColor : dir < 0 ? downColor : neutralColor);

      var lineGap = parseInt(this.settings.lineGap);
      if (isNaN(lineGap)) lineGap = 8;
      var showChange = this.settings.showChange !== false && this.settings.showChange !== 'false';

      // 레이아웃: 2줄 또는 3줄
      var totalHeight, topY, priceY, pctY;
      if (showChange) {
        totalHeight = symbolFontSize + lineGap + priceFontSize + lineGap + changeFontSize;
        topY = cy - totalHeight / 2 + symbolFontSize / 2;
        priceY = topY + symbolFontSize / 2 + lineGap + priceFontSize / 2;
        pctY = priceY + priceFontSize / 2 + lineGap + changeFontSize / 2;
      } else {
        totalHeight = symbolFontSize + lineGap + priceFontSize;
        topY = cy - totalHeight / 2 + symbolFontSize / 2;
        priceY = topY + symbolFontSize / 2 + lineGap + priceFontSize / 2;
      }

      // 1줄: 심볼명(흰색) + 삼각형(방향색)
      var symbolName = this.getDisplayName();
      ctx.font = 'bold ' + symbolFontSize + 'px ' + this.fontFamily;

      if (dir !== 0) {
        var symbolWidth = ctx.measureText(symbolName).width;
        var triangleStr = dir > 0 ? '\u25B2' : '\u25BC';
        var triangleSize = Math.round(symbolFontSize * 0.7);
        ctx.font = triangleSize + 'px ' + this.fontFamily;
        var triWidth = ctx.measureText(triangleStr).width;
        var gap = 4;
        var totalWidth = symbolWidth + gap + triWidth;
        var startX = cx - totalWidth / 2;

        ctx.fillStyle = baseTextColor;
        ctx.font = 'bold ' + symbolFontSize + 'px ' + this.fontFamily;
        ctx.textAlign = 'left';
        ctx.fillText(symbolName, startX, topY);

        ctx.fillStyle = changeColor;
        ctx.font = triangleSize + 'px ' + this.fontFamily;
        ctx.fillText(triangleStr, startX + symbolWidth + gap, topY);
        ctx.textAlign = 'center';
      } else {
        ctx.fillStyle = baseTextColor;
        ctx.font = 'bold ' + symbolFontSize + 'px ' + this.fontFamily;
        ctx.fillText(symbolName, cx, topY);
      }

      // 2줄: 가격 (방향색)
      var priceStr = this.formatPrice(price);
      ctx.fillStyle = dir !== 0 ? changeColor : baseTextColor;
      ctx.font = 'bold ' + priceFontSize + 'px ' + this.fontFamily;
      ctx.fillText(priceStr, cx, priceY);

      // 3줄: 변동률 (방향색) - showChange가 true일 때만
      if (showChange && dir !== 0) {
        var sign = dir > 0 ? '+' : '-';
        var pctDisplay = '(' + sign + pctStr + '%)';
        ctx.fillStyle = changeColor;
        ctx.font = 'bold ' + changeFontSize + 'px ' + this.fontFamily;
        ctx.fillText(pctDisplay, cx, pctY);
      }
    }

    var dataUrl = canvas.toDataURL('image/png');
    this.setIcon(dataUrl);
  }

  setIcon(icon) {
    if (!this.allowSend) return;
    this.lastIcon = icon || this.lastIcon;
    if (this.lastIcon) $UD.setBaseDataIcon(this.context, this.lastIcon);
  }

  add() {
    this.run();
  }

  setActive(active) {
    this.allowSend = true;
    this.setIcon();
    this.allowSend = active;
  }

  setParams(jsn) {
    var prevSymbol = this.settings.symbol;
    this.settings = {
      ...this.settings,
      ...jsn
    };
    // On symbol change, start fresh so the new symbol shows a brief loading frame
    // rather than briefly displaying the previous symbol's value.
    if (this.settings.symbol !== prevSymbol) {
      this.hasData = false;
      this.lastPrice = null;
      this.candleOpen = null;
    }
    this.fontFamily = loadTickerFont(this.settings.customFont);
    this.run();
  }

  // Loading frame ONLY before the first successful render. On refreshes we keep
  // the last rendered value so numbers update in place — no "..." flash/flicker.
  showLoading() {
    if (!this.hasData) this.createIcon(null, true);
  }

  // On a fetch failure keep the last good value (no ERR flash); show the error
  // frame only when there is nothing to display yet.
  showError() {
    if (!this.hasData) this.createIcon(null, false, true);
  }

  clear() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = 0;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = 0;
    }
  }
}
