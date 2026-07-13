class CryptoTicker {
  constructor(context) {
    this.context = context;
    this.lastIcon = '';

    this.settings = {
      symbol: 'BTC',
      bgColor: '#1a1a2e',
      textColor: '#ffffff',
      fontSize: 32,
      textOffsetY: 0,
      refreshDuration: 30
    };
    this.allowSend = true;
    this.debounceTimer = 0;
    this.refreshTimer = 0;
    this.lastPrice = null;
    this.prevPrice = null;
    this.kimchiPremium = null;

    this.fontReady = false;
    this.loadFont().then(() => {
      this.fontReady = true;
      this.run();
    });
  }

  loadFont() {
    return document.fonts.ready.then(() => {
      var canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      var ctx = canvas.getContext('2d');
      ctx.font = '10px "Source Han Sans"';
      ctx.fillText('.', 0, 0);
      return document.fonts.ready;
    });
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
      this.createIcon(null, true);

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
          const url = 'https://data-api.binance.vision/api/v3/ticker/price?symbol=' + sym + 'USDT';
          const result = await Utils.fetchData(url);
          if (result && result.price) {
            price = parseFloat(result.price);
          }
        }

        if (price !== null) {
          this.prevPrice = this.lastPrice;
          this.lastPrice = price;
          this.createIcon(this.lastPrice, false);
        } else {
          this.createIcon(null, false, true);
        }
      } catch (e) {
        this.createIcon(null, false, true);
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

  getPriceDirection() {
    if (this.prevPrice === null || this.lastPrice === null) return 0;
    if (this.lastPrice > this.prevPrice) return 1;
    if (this.lastPrice < this.prevPrice) return -1;
    return 0;
  }

  async createIcon(price, loading, error) {
    if (!this.fontReady) await this.loadFont();
    const canvas = document.createElement('canvas');
    const size = 196;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const bgColor = this.settings.bgColor || '#1a1a2e';
    const textColor = this.settings.textColor || '#ffffff';
    const fontSize = parseInt(this.settings.fontSize) || 32;
    const offsetY = parseInt(this.settings.textOffsetY) || 0;
    const cx = size / 2;
    const cy = size / 2 + offsetY;
    const sym = this.settings.symbol.toUpperCase();
    const showKimchi = sym === 'USDT_KRW' && this.kimchiPremium !== null && !loading && !error && price !== null;

    // 배경
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    if (loading) {
      ctx.fillStyle = textColor;
      ctx.font = fontSize + 'px "Source Han Sans"';
      ctx.fillText('...', cx, cy);
    } else if (error) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold ' + fontSize + 'px "Source Han Sans"';
      ctx.fillText('ERR', cx, cy);
    } else {
      const symbolSize = Math.round(fontSize * 0.6);
      const lineGap = Math.round(fontSize * 0.3);

      // 3줄(김프 있을 때) vs 2줄 레이아웃 계산
      let totalHeight, topY, priceY, kimchiY;
      if (showKimchi) {
        totalHeight = symbolSize + lineGap + fontSize + lineGap + symbolSize;
        topY = cy - totalHeight / 2 + symbolSize / 2;
        priceY = topY + symbolSize / 2 + lineGap + fontSize / 2;
        kimchiY = priceY + fontSize / 2 + lineGap + symbolSize / 2;
      } else {
        totalHeight = symbolSize + lineGap + fontSize;
        topY = cy - totalHeight / 2 + symbolSize / 2;
        priceY = topY + symbolSize / 2 + lineGap + fontSize / 2;
      }

      // 심볼 이름
      ctx.fillStyle = textColor;
      ctx.font = 'bold ' + symbolSize + 'px "Source Han Sans"';
      ctx.fillText(this.getDisplayName(), cx, topY);

      // 가격
      const priceStr = this.formatPrice(price);
      ctx.font = 'bold ' + fontSize + 'px "Source Han Sans"';
      ctx.fillStyle = textColor;
      ctx.fillText(priceStr, cx, priceY);

      // 김치프리미엄
      if (showKimchi) {
        const kp = parseFloat(this.kimchiPremium);
        const sign = kp >= 0 ? '+' : '';
        const kpColor = kp >= 0 ? '#22c55e' : '#ef4444';
        ctx.fillStyle = kpColor;
        ctx.font = 'bold ' + symbolSize + 'px "Source Han Sans"';
        ctx.fillText(sign + this.kimchiPremium + '%', cx, kimchiY);
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
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
    this.settings = {
      ...this.settings,
      ...jsn
    };
    this.run();
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
