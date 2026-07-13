class StockTicker {
  constructor(context) {
    this.context = context;
    this.lastIcon = '';
    // Optional US regular-session fallback. Get a free key at https://finnhub.io and
    // paste it here, or leave empty to disable Finnhub (Naver + stockanalysis still work).
    this.FINNHUB_KEY = '';
    // Realtime KRX proxy (Cloudflare Worker -> Naver Finance, delayTime:0, CORS-OK).
    // Deploy your own relay: https://github.com/ukinora/krx-proxy-worker
    // Paste your own Worker URL here (see the repo link above). Empty = realtime
    // relay disabled; the ticker falls back to (delayed) stockanalysis prices.
    this.KRX_PROXY = '';

    this.settings = {
      symbol: 'TSLA',
      bgColor: '#000000',
      symbolFontSize: 16,
      priceFontSize: 32,
      changeFontSize: 14,
      lineGap: 8,
      showChange: true,
      textOffsetY: 0,
      scrollSpeed: 17,
      refreshDuration: 15,
      alertUnderEnabled: false,
      alertUnderPrice: 0,
      alertOverEnabled: false,
      alertOverPrice: 0,
      sessionPreMarket: true,
      sessionRegular: true,
      sessionAfterHours: true,
      sessionOffHours: true
    };
    this.allowSend = true;
    this.debounceTimer = 0;
    this.refreshTimer = 0;
    this.lastPrice = null;
    this.lastChange = null;
    this.lastChangePct = null;
    this.lastSession = 'regular';   // 'pre' | 'regular' | 'post'
    this.lastCurrency = 'USD';      // 'USD' | 'KRW'
    this.krName = '';               // Korean stock name (shown instead of the 6-digit code)
    this.scrollTimer = 0;           // marquee animation timer for long names
    this.scrollOffset = 0;          // px scrolled so far (advances leftward)
    this.scrollName = '';           // name currently being scrolled
    this.SCROLL_INTERVAL = 60;      // ms per frame (~16 fps); scroll speed (px/s) comes from settings.scrollSpeed
    this.fontFamily = '"Source Han Sans"';

    this.run();
  }

  run() {
    this.clear();
    this.fetchData(true);
    this.refreshTimer = setInterval(() => {
      this.fetchData(false);
    }, this.settings.refreshDuration * 1000);
  }

  getNthWeekday(year, month, weekday, n) {
    var d = new Date(year, month, 1);
    var count = 0;
    while (d.getMonth() === month) {
      if (d.getDay() === weekday) {
        count++;
        if (count === n) return d.getDate();
      }
      d.setDate(d.getDate() + 1);
    }
    return -1;
  }

  getLastWeekday(year, month, weekday) {
    var d = new Date(year, month + 1, 0);
    while (d.getDay() !== weekday) {
      d.setDate(d.getDate() - 1);
    }
    return d.getDate();
  }

  getEasterDate(year) {
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mo = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    var dy = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, mo, dy);
  }

  isMarketClosed() {
    var etDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    var year = etDate.getFullYear();
    var month = etDate.getMonth();
    var day = etDate.getDate();
    var dow = etDate.getDay();

    if (dow === 0 || dow === 6) return true;

    var holidays = [
      [0, 1],   // New Year's Day
      [5, 19],  // Juneteenth
      [6, 4],   // Independence Day
      [11, 25], // Christmas
      [0, this.getNthWeekday(year, 0, 1, 3)],  // MLK Day
      [1, this.getNthWeekday(year, 1, 1, 3)],  // Presidents' Day
      [4, this.getLastWeekday(year, 4, 1)],     // Memorial Day
      [8, this.getNthWeekday(year, 8, 1, 1)],   // Labor Day
      [10, this.getNthWeekday(year, 10, 4, 4)], // Thanksgiving
    ];

    var easter = this.getEasterDate(year);
    var gfDate = new Date(easter);
    gfDate.setDate(gfDate.getDate() - 2);
    holidays.push([gfDate.getMonth(), gfDate.getDate()]);

    for (var i = 0; i < holidays.length; i++) {
      var hDate = new Date(year, holidays[i][0], holidays[i][1]);
      var hDow = hDate.getDay();
      if (hDow === 6) hDate.setDate(hDate.getDate() - 1);
      else if (hDow === 0) hDate.setDate(hDate.getDate() + 1);

      if (hDate.getMonth() === month && hDate.getDate() === day) return true;
    }

    return false;
  }

  isInActiveSession() {
    var s = this.settings;
    var toBool = function(v) { return v !== false && v !== 'false'; };

    if (this.isMarketClosed()) return toBool(s.sessionOffHours);

    var etStr = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
    var parts = etStr.split(', ')[1].split(':');
    var h = parseInt(parts[0]);
    var m = parseInt(parts[1]);
    var t = h * 60 + m;

    // Pre-market: 4:00-9:30 ET (240-570)
    if (t >= 240 && t < 570) return toBool(s.sessionPreMarket);
    // Regular: 9:30-16:00 ET (570-960)
    if (t >= 570 && t < 960) return toBool(s.sessionRegular);
    // After-hours: 16:00-20:00 ET (960-1200)
    if (t >= 960 && t < 1200) return toBool(s.sessionAfterHours);
    // Off-hours: 20:00-4:00 ET
    return toBool(s.sessionOffHours);
  }

  // Korean KRX listings are 6-digit codes (e.g. 005930, 498400). US tickers are
  // alphabetic, so this never collides.
  isKoreanCode(sym) {
    return /^\d{6}$/.test(sym);
  }

  fetchData(force) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    var symRaw = (this.settings.symbol || '').toUpperCase().trim();
    var isKr = this.isKoreanCode(symRaw);
    // US session gating only applies to US tickers; Korean codes refresh on the
    // interval regardless (their market hours differ).
    if (!force && !isKr && !this.isInActiveSession()) return;

    this.debounceTimer = setTimeout(async () => {
      this.showLoading();

      var sym = (this.settings.symbol || '').toUpperCase().trim();
      if (!sym) {
        this.createIcon(null, false, true);
        return;
      }

      try {
        // Korean stocks (KRX 6-digit code) — realtime Naver via Worker proxy
        // (delayed stockanalysis fallback), KRW.
        if (this.isKoreanCode(sym)) {
          var kr = await this.fetchKorean(sym);
          if (kr && typeof kr.p === 'number' && kr.p > 0) {
            this.lastPrice = kr.p;
            this.lastChange = (typeof kr.c === 'number') ? kr.c : null;
            this.lastChangePct = (typeof kr.cp === 'number') ? kr.cp : null;
            this.lastSession = 'regular';
            this.lastCurrency = 'KRW';
            this.krName = (kr.name) ? kr.name : '';
            this.createIcon(this.lastPrice, false);
          } else {
            this.showError();
          }
          return;
        }
        this.lastCurrency = 'USD';

        // US sourcing strategy:
        //   - Extended hours (pre/post): stockanalysis (Naver extended unverified).
        //   - Regular trading open: Naver realtime via the Worker — same source as
        //     KRX (delayTime:0). stockanalysis lags ~1-2 min on lower-volume tickers.
        //   - Closed / source down: stockanalysis last price, then Naver, then Finnhub.
        var saData = await this.fetchStockanalysis(sym);
        var q = saData ? saData.quote : null;
        if (q) {
          var extActive = q.e === true && (q.fms === 'pre' || q.fms === 'post');
          if (extActive && typeof q.ep === 'number' && q.ep > 0) {
            this.lastPrice = q.ep;
            this.lastChange = (typeof q.ec === 'number') ? q.ec : null;
            this.lastChangePct = (typeof q.ecp === 'number') ? q.ecp : null;
            this.lastSession = q.fms; // 'pre' or 'post'
            this.createIcon(this.lastPrice, false);
            return;
          }
          // Regular trading open -> Naver realtime (avoids stockanalysis lag).
          if (q.ms === 'open' && q.fms === 'open') {
            var us = await this.fetchUsRealtime(sym);
            if (us) {
              this.lastPrice = us.c;
              this.lastChange = us.d;
              this.lastChangePct = us.dp;
              this.lastSession = 'regular';
              this.createIcon(this.lastPrice, false);
              return;
            }
          }
          // Closed, or Naver failed: stockanalysis last price.
          if (typeof q.p === 'number' && q.p > 0) {
            this.lastPrice = q.p;
            this.lastChange = (typeof q.c === 'number') ? q.c : null;
            this.lastChangePct = (typeof q.cp === 'number') ? q.cp : null;
            this.lastSession = 'regular';
            this.createIcon(this.lastPrice, false);
            return;
          }
        }

        // stockanalysis unavailable -> Naver Worker, then Finnhub as last resort.
        console.warn('[StockTicker] stockanalysis miss; falling back for', sym);
        var us2 = await this.fetchUsRealtime(sym);
        if (!us2) us2 = await this.fetchFinnhub(sym);
        if (us2) {
          this.lastPrice = us2.c;
          this.lastChange = us2.d;
          this.lastChangePct = us2.dp;
          this.lastSession = 'regular';
          this.createIcon(this.lastPrice, false);
        } else {
          console.warn('[StockTicker] invalid data for', sym);
          this.showError();
        }
      } catch (e) {
        console.warn('[StockTicker] fetch error:', e.toString());
        this.showError();
      }
    }, 150);
  }

  // Korean KRX quote. Returns { p, c, cp } on success; null on failure.
  // Primary: realtime via Cloudflare Worker proxy (Naver, delayTime:0).
  // Fallback: stockanalysis.com (CORS-native but ~15-20min delayed) when the
  // proxy is unreachable, so the key degrades to delayed data instead of ERR.
  async fetchKorean(code) {
    var rt = await this.fetchKoreanRealtime(code);
    if (rt) return rt;
    return await this.fetchKoreanDelayed(code);
  }

  // Realtime Naver quote via the Worker. { p, c, cp } or null.
  async fetchKoreanRealtime(code) {
    if (!this.KRX_PROXY) return null;
    try {
      var url = this.KRX_PROXY + '?code=' + encodeURIComponent(code);
      var r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) return null;
      var j = await r.json();
      if (j && j.ok === true && typeof j.p === 'number' && j.p > 0) {
        return {
          p: j.p,
          c: (typeof j.c === 'number') ? j.c : null,
          cp: (typeof j.cp === 'number') ? j.cp : null,
          name: (typeof j.name === 'string') ? j.name : ''
        };
      }
    } catch (e) {
      // fall through to delayed source
    }
    return null;
  }

  // Delayed fallback: stockanalysis.com quotes API (CORS-enabled, KRW, KST).
  async fetchKoreanDelayed(code) {
    try {
      var url = 'https://stockanalysis.com/api/quotes/a/KRX-' + encodeURIComponent(code);
      var r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) return null;
      var j = await r.json();
      if (j && j.status === 200 && j.data && typeof j.data.p === 'number') {
        return { p: j.data.p, c: j.data.c, cp: j.data.cp };
      }
    } catch (e) {
      // fall through
    }
    return null;
  }

  // Realtime US quote via the Naver Worker proxy (worldstock, delayTime:0).
  // Returns { c, d, dp } (price, change, change%) — same shape as fetchFinnhub
  // so the US branch can use either interchangeably. null on failure.
  async fetchUsRealtime(sym) {
    if (!this.KRX_PROXY) return null;
    try {
      var url = this.KRX_PROXY + '?us=' + encodeURIComponent(sym);
      var r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) return null;
      var j = await r.json();
      if (j && j.ok === true && typeof j.p === 'number' && j.p > 0) {
        return {
          c: j.p,
          d: (typeof j.c === 'number') ? j.c : null,
          dp: (typeof j.cp === 'number') ? j.cp : null
        };
      }
    } catch (e) {
      // fall through to Finnhub / stockanalysis
    }
    return null;
  }

  // Realtime US regular-session quote via Finnhub. { c, d, dp } or null.
  // Last-resort fallback when both Naver and stockanalysis are unavailable.
  async fetchFinnhub(sym) {
    if (!this.FINNHUB_KEY) return null;  // no key configured -> skip this fallback
    try {
      var url = 'https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(sym) + '&token=' + this.FINNHUB_KEY;
      var r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) return null;
      var d = await r.json();
      if (d && typeof d.c === 'number' && d.c > 0) {
        return {
          c: d.c,
          d: (typeof d.d === 'number') ? d.d : null,
          dp: (typeof d.dp === 'number') ? d.dp : null
        };
      }
    } catch (e) {
      // fall through
    }
    return null;
  }

  // stockanalysis.com info endpoint. Tries the stocks ("s") path first, falls back to ETFs ("e").
  // Returns data.data (with .quote) on success; null on failure.
  async fetchStockanalysis(sym) {
    var types = ['s', 'e'];
    var lower = sym.toLowerCase();
    for (var i = 0; i < types.length; i++) {
      try {
        var url = 'https://api.stockanalysis.com/api/symbol/' + types[i] + '/' + encodeURIComponent(lower) + '/info';
        var r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) continue;
        var j = await r.json();
        if (j && j.status === 200 && j.data && j.data.quote) return j.data;
      } catch (e) {
        // try next type
      }
    }
    return null;
  }

  getDisplayName() {
    var sym = (this.settings.symbol || '').toUpperCase().trim();
    // Korean stocks: show the resolved name (e.g. 삼성전자) instead of the code.
    if (this.isKoreanCode(sym) && this.krName) return this.krName;
    return sym;
  }

  formatPrice(price) {
    if (price === null || price === undefined) return '--';
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(4);
  }

  // KRW: integer with thousands separators (Korean stocks quote in whole won).
  formatPriceKRW(price) {
    if (price === null || price === undefined) return '--';
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  }

  // Price string for the current symbol: ₩ prefix for Korean won; US prices show no symbol.
  priceLabel(price) {
    if (this.lastCurrency === 'KRW') return '₩' + this.formatPriceKRW(price);
    return this.formatPrice(price);
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
    if (this.lastChange === null || this.lastChangePct === null) {
      return { direction: 0, pct: 0 };
    }
    if (this.lastChange > 0) return { direction: 1, pct: this.lastChangePct };
    if (this.lastChange < 0) return { direction: -1, pct: this.lastChangePct };
    return { direction: 0, pct: 0 };
  }

  createIcon(price, loading, error) {
    // While a name is scrolling, skip the transient "loading" frame so the
    // marquee never stutters on each refresh.
    if (loading && this.scrollTimer) return;
    var canvas = document.createElement('canvas');
    var size = 196;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    var bgColor = this.settings.bgColor || '#000000';
    var symbolFontSize = parseInt(this.settings.symbolFontSize) || 16;
    var priceFontSize = parseInt(this.settings.priceFontSize) || 32;
    var changeFontSize = parseInt(this.settings.changeFontSize) || 14;
    var offsetY = parseInt(this.settings.textOffsetY) || 0;
    var cx = size / 2;
    var cy = size / 2 + offsetY;

    var upColor = '#22c55e';
    var downColor = '#ef4444';
    var neutralColor = '#9ca3af';

    // Alert: 배경/텍스트 색상 반전
    var alertActive = !loading && !error && this.isAlertTriggered(price);
    var actualBg = alertActive ? this.invertColor(bgColor) : bgColor;
    var baseTextColor = alertActive ? bgColor : '#ffffff';

    ctx.fillStyle = actualBg;
    ctx.fillRect(0, 0, size, size);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    if (loading) {
      ctx.fillStyle = '#ffffff';
      ctx.font = priceFontSize + 'px ' + this.fontFamily;
      ctx.fillText('...', cx, cy);
    } else if (error) {
      this.stopScroll(); // keep ERR on screen; don't let the marquee overwrite it
      ctx.fillStyle = downColor;
      ctx.font = 'bold ' + priceFontSize + 'px ' + this.fontFamily;
      ctx.fillText('ERR', cx, cy);
    } else {
      var change = this.getChangeInfo();
      var dir = change.direction;
      var pctStr = Math.abs(change.pct).toFixed(2);
      // alert 활성화 시 변동 색상도 반전 배경에 맞게 조정
      var changeColor = alertActive
        ? (dir > 0 ? '#007700' : dir < 0 ? '#aa0000' : bgColor)
        : (dir > 0 ? upColor : dir < 0 ? downColor : neutralColor);

      var lineGap = parseInt(this.settings.lineGap);
      if (isNaN(lineGap)) lineGap = 8;
      var showChange = this.settings.showChange !== false && this.settings.showChange !== 'false';

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

      var symbolName = this.getDisplayName();

      // Session badge: PRE (pre-market) / AH (after-hours)
      var sessionTag = '';
      var sessionColor = baseTextColor;
      if (this.lastSession === 'pre') {
        sessionTag = 'PRE';
        sessionColor = alertActive ? '#7a4f00' : '#fbbf24'; // amber
      } else if (this.lastSession === 'post') {
        sessionTag = 'AH';
        sessionColor = alertActive ? '#0a3a73' : '#60a5fa'; // blue
      }

      // Layout: [session tag] [symbol/name] [triangle] at the configured font size.
      // Korean names can be long; if the line overflows the key, KEEP the full
      // size and marquee-scroll the name slowly leftward instead of shrinking it.
      var triangleStr = dir > 0 ? '\u25B2' : (dir < 0 ? '\u25BC' : '');
      var gapTag = sessionTag ? 6 : 0;
      var gapTri = triangleStr ? 4 : 0;
      var maxLineWidth = size - 12;
      var tagSize = Math.round(symbolFontSize * 0.75);
      var triangleSize = Math.round(symbolFontSize * 0.7);

      ctx.font = 'bold ' + tagSize + 'px ' + this.fontFamily;
      var tagWidth = sessionTag ? ctx.measureText(sessionTag).width : 0;
      ctx.font = 'bold ' + symbolFontSize + 'px ' + this.fontFamily;
      var symbolWidth = ctx.measureText(symbolName).width;
      ctx.font = triangleSize + 'px ' + this.fontFamily;
      var triWidth = triangleStr ? ctx.measureText(triangleStr).width : 0;
      var totalWidth = tagWidth + gapTag + symbolWidth + gapTri + triWidth;

      if (totalWidth <= maxLineWidth) {
        // Fits: draw centered and static.
        this.stopScroll();
        var startX = cx - totalWidth / 2;
        ctx.textAlign = 'left';
        if (sessionTag) {
          ctx.fillStyle = sessionColor;
          ctx.font = 'bold ' + tagSize + 'px ' + this.fontFamily;
          ctx.fillText(sessionTag, startX, topY);
          startX += tagWidth + gapTag;
        }
        ctx.fillStyle = baseTextColor;
        ctx.font = 'bold ' + symbolFontSize + 'px ' + this.fontFamily;
        ctx.fillText(symbolName, startX, topY);
        startX += symbolWidth + gapTri;
        if (triangleStr) {
          ctx.fillStyle = changeColor;
          ctx.font = triangleSize + 'px ' + this.fontFamily;
          ctx.fillText(triangleStr, startX, topY);
        }
      } else {
        // Overflows: keep full size, marquee-scroll the name leftward (seamless,
        // repeated with a gap). Direction stays visible via price color + (%) line.
        if (this.scrollName !== symbolName) { this.scrollName = symbolName; this.scrollOffset = 0; }
        this.startScroll();
        var gap = 36;
        var period = symbolWidth + gap;
        var mx = -(this.scrollOffset % period);
        ctx.textAlign = 'left';
        ctx.fillStyle = baseTextColor;
        ctx.font = 'bold ' + symbolFontSize + 'px ' + this.fontFamily;
        ctx.fillText(symbolName, mx, topY);
        ctx.fillText(symbolName, mx + period, topY);
      }

      ctx.textAlign = 'center';

      var priceStr = this.priceLabel(price);
      ctx.fillStyle = dir !== 0 ? changeColor : baseTextColor;
      ctx.font = 'bold ' + priceFontSize + 'px ' + this.fontFamily;
      ctx.fillText(priceStr, cx, priceY);

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
    if (active) {
      // resume marquee if the current name overflows
      if (this.lastPrice !== null) this.createIcon(this.lastPrice, false);
    } else {
      this.stopScroll(); // pause animation while the key is hidden
    }
  }

  setParams(jsn) {
    var prevSymbol = this.settings.symbol;
    this.settings = {
      ...this.settings,
      ...jsn
    };
    // On symbol change, clear cached name + price so the new symbol starts fresh
    // (shows a brief loading frame, not the previous symbol's value).
    if (this.settings.symbol !== prevSymbol) {
      this.krName = '';
      this.lastPrice = null;
      this.lastChange = null;
      this.lastChangePct = null;
    }
    this.fontFamily = loadTickerFont(this.settings.customFont);
    this.run();
  }

  // Loading frame ONLY on the first load (no value yet). On refreshes we keep the
  // last rendered value so the numbers update in place — no "..." flash/flicker.
  showLoading() {
    if (this.lastPrice === null) this.createIcon(null, true);
  }

  // On a fetch failure keep the last good value (no ERR flash); show the error
  // frame only when there is nothing to display yet (first load / bad symbol).
  showError() {
    if (this.lastPrice === null) this.createIcon(null, false, true);
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
    this.stopScroll();
  }

  // Marquee animation: redraw the icon at an advancing offset so a long name
  // scrolls slowly leftward. Paused (no work) while the key is not visible.
  startScroll() {
    if (this.scrollTimer) return;
    this.scrollTimer = setInterval(() => {
      if (!this.allowSend) return;
      // px/s from settings -> px per frame (clamped to a sane range)
      var pxPerSec = Math.max(2, Math.min(120, parseFloat(this.settings.scrollSpeed) || 17));
      this.scrollOffset += pxPerSec * (this.SCROLL_INTERVAL / 1000);
      this.createIcon(this.lastPrice, false);
    }, this.SCROLL_INTERVAL);
  }

  stopScroll() {
    if (this.scrollTimer) {
      clearInterval(this.scrollTimer);
      this.scrollTimer = 0;
    }
    this.scrollOffset = 0;
    this.scrollName = '';
  }
}
