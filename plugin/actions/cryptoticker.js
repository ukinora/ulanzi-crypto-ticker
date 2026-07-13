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
    this.hasData = false;         // true after the first real (non-loading/error) render
    this.usdKrw = null;   // for USD_USDT_COMBO
    this.usdtKrw = null;  // for USD_USDT_COMBO
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
        // 달러+USDT 합본: USD/KRW, USDT/KRW, 김치프리미엄을 한 화면에
        // 한쪽 소스가 일시적으로 실패해도 마지막 값(캐시)을 유지해 "오류"가 깜빡이지 않게 한다.
        if (sym === 'USD_USDT_COMBO') {
          const [usdtKrw, usdKrw] = await Promise.all([this.fetchUsdtKrw(), this.fetchUsdKrw()]);
          if (usdtKrw !== null) this.usdtKrw = usdtKrw;   // 성공 시에만 갱신
          if (usdKrw !== null) this.usdKrw = usdKrw;

          if (this.usdKrw !== null && this.usdtKrw !== null && this.usdKrw > 0) {
            this.kimchiPremium = ((this.usdtKrw - this.usdKrw) / this.usdKrw * 100).toFixed(2);
          }

          // 캐시 포함 어느 값이라도 있으면 표시, 둘 다 없을 때만 오류
          if (this.usdKrw !== null || this.usdtKrw !== null) {
            this.createIcon(null, false);
          } else {
            this.showError();
          }
          return;
        }

        let price = null;

        if (sym === 'USD_KRW') {
          const v = await this.fetchUsdKrw();
          if (v !== null) { this.usdKrw = v; }
          price = (v !== null) ? v : (this.usdKrw !== null ? this.usdKrw : null);
        } else if (sym === 'USDT_KRW') {
          const [usdtKrw, usdKrw] = await Promise.all([this.fetchUsdtKrw(), this.fetchUsdKrw()]);
          if (usdtKrw !== null) this.usdtKrw = usdtKrw;
          if (usdKrw !== null) this.usdKrw = usdKrw;
          if (this.usdtKrw !== null) {
            price = this.usdtKrw;
            if (this.usdKrw !== null && this.usdKrw > 0) {
              this.kimchiPremium = ((this.usdtKrw - this.usdKrw) / this.usdKrw * 100).toFixed(2);
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
          this.showError();
        }
      } catch (e) {
        this.showError();
      }
    }, 150);
  }

  // USDT/KRW — 한국 거래소 실거래가. Upbit 우선, 실패 시 Bithumb 폴백. 실패하면 null(throw 안 함).
  async fetchUsdtKrw() {
    try {
      const r = await Utils.fetchData('https://api.upbit.com/v1/ticker?markets=KRW-USDT');
      if (Array.isArray(r) && r[0] && r[0].trade_price) {
        const v = parseFloat(r[0].trade_price);
        if (!isNaN(v) && v > 0) return v;
      }
    } catch (e) { /* fall through to Bithumb */ }
    try {
      const r = await Utils.fetchData('https://api.bithumb.com/public/ticker/USDT_KRW');
      if (r && r.data && r.data.closing_price) {
        const v = parseFloat(r.data.closing_price);
        if (!isNaN(v) && v > 0) return v;
      }
    } catch (e) { /* give up */ }
    return null;
  }

  // USD/KRW 환율 (manana.kr). 실패하면 null(throw 안 함).
  async fetchUsdKrw() {
    try {
      const r = await Utils.fetchData('https://api.manana.kr/exchange/rate/KRW/USD.json');
      if (Array.isArray(r) && r[0] && r[0].rate) {
        const v = parseFloat(r[0].rate);
        if (!isNaN(v) && v > 0) return v;
      }
    } catch (e) { /* give up */ }
    return null;
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

  createIcon(price, loading, error) {
    if (!loading && !error) this.hasData = true;
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
      ctx.font = fontSize + 'px ' + this.fontFamily;
      ctx.fillText('...', cx, cy);
    } else if (error) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold ' + fontSize + 'px ' + this.fontFamily;
      ctx.fillText('ERR', cx, cy);
    } else if (sym === 'USD_USDT_COMBO') {
      this.drawCombo(ctx, cx, cy, textColor, fontSize);
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
      ctx.font = 'bold ' + symbolSize + 'px ' + this.fontFamily;
      ctx.fillText(this.getDisplayName(), cx, topY);

      // 가격
      const priceStr = this.formatPrice(price);
      ctx.font = 'bold ' + fontSize + 'px ' + this.fontFamily;
      ctx.fillStyle = textColor;
      ctx.fillText(priceStr, cx, priceY);

      // 김치프리미엄
      if (showKimchi) {
        const kp = parseFloat(this.kimchiPremium);
        const sign = kp >= 0 ? '+' : '';
        const kpColor = kp >= 0 ? '#22c55e' : '#ef4444';
        ctx.fillStyle = kpColor;
        ctx.font = 'bold ' + symbolSize + 'px ' + this.fontFamily;
        ctx.fillText(sign + this.kimchiPremium + '%', cx, kimchiY);
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    this.setIcon(dataUrl);
  }

  // 달러+USDT 합본 렌더: 3줄 합본 (라벨 좌측 + 숫자 우측)
  //   달러   1,496
  //   USDT   1,483
  //   김프  -0.93%   (색상 강조)
  // 라벨 / 숫자 / 김프 각각 폰트 크기 설정, 김프는 별도 상하 오프셋 지원.
  drawCombo(ctx, cx, cy, textColor, baseFont) {
    const ps = (v, d) => { const n = parseInt(v); return (isNaN(n) || n <= 0) ? d : n; };
    const labelSize = ps(this.settings.labelFontSize, Math.round(baseFont * 0.7));   // 달러 / USDT / 김프 라벨
    const valueSize = ps(this.settings.valueFontSize, Math.round(baseFont * 1.2));   // USD/KRW · USDT/KRW 숫자
    const kimchiSize = ps(this.settings.kimchiFontSize, Math.round(baseFont * 1.0)); // 김치프리미엄 수치
    const kimchiOff = parseInt(this.settings.kimchiOffsetY) || 0;                    // 김프 단독 상하 오프셋
    const showDecimals = String(this.settings.krwDecimals) === '2';

    const fmtKRW = (v) => {
      if (v === null || v === undefined) return '--';
      return showDecimals
        ? v.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    };

    let kpText = '--';
    let kpColor = textColor;
    if (this.kimchiPremium !== null) {
      const kp = parseFloat(this.kimchiPremium);
      kpText = (kp >= 0 ? '+' : '') + this.kimchiPremium + '%';
      kpColor = kp >= 0 ? '#22c55e' : '#ef4444';
    }

    // 3줄: [라벨 | 숫자], 각 줄은 카드 폭 전체 사용 (라벨 좌, 숫자 우)
    const rows = [
      { label: '달러', value: fmtKRW(this.usdKrw), valColor: textColor, valSize: valueSize, extraY: 0 },
      { label: 'USDT', value: fmtKRW(this.usdtKrw), valColor: textColor, valSize: valueSize, extraY: 0 },
      { label: '김프', value: kpText, valColor: kpColor, valSize: kimchiSize, extraY: kimchiOff }
    ];

    let gap = Math.max(4, Math.round(valueSize * 0.28));
    let rowH = rows.map(r => Math.max(labelSize, r.valSize));
    let total = rowH.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);

    // 196px(여백 포함 184) 안에 들어가도록 비율 축소
    const avail = 184;
    let scale = 1;
    if (total > avail) scale = avail / total;
    const sLabel = labelSize * scale;
    gap = gap * scale;
    rowH = rowH.map(h => h * scale);
    total = rowH.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);

    const marginL = 16;
    const marginR = 16;
    const fontName = this.fontFamily;

    // 라벨↔숫자 가로 간격 (라벨 컬럼 폭 + gap 만큼 떨어진 곳에서 숫자 시작)
    let labelGap = parseInt(this.settings.labelGap);
    if (isNaN(labelGap) || labelGap < 0) labelGap = 14;

    // 라벨 컬럼 폭 = 세 라벨 중 가장 넓은 것 (숫자 시작 위치를 줄마다 정렬)
    ctx.font = 'bold ' + Math.round(sLabel) + 'px ' + fontName;
    let labelColW = 0;
    for (let i = 0; i < rows.length; i++) {
      labelColW = Math.max(labelColW, ctx.measureText(rows[i].label).width);
    }
    const numberX = marginL + labelColW + labelGap;
    const numAvailW = Math.max(20, 196 - marginR - numberX);

    let y = cy - total / 2;
    ctx.textBaseline = 'middle';

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const h = rowH[i];
      const yc = y + h / 2 + (r.extraY || 0);

      // 라벨 (좌측 정렬)
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      ctx.font = 'bold ' + Math.round(sLabel) + 'px ' + fontName;
      ctx.fillText(r.label, marginL, yc);

      // 숫자 (라벨 컬럼+간격 뒤에서 좌측 정렬) — 폭이 넘치면 자동 축소
      let vSize = r.valSize * scale;
      ctx.font = 'bold ' + Math.round(vSize) + 'px ' + fontName;
      while (vSize > 8 && ctx.measureText(r.value).width > numAvailW) {
        vSize -= 1;
        ctx.font = 'bold ' + Math.round(vSize) + 'px ' + fontName;
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = r.valColor;
      ctx.fillText(r.value, numberX, yc);

      y += h + gap;
    }
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
      this.prevPrice = null;
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
