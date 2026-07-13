// Tether Ticker — always shows the 달러+USDT combo
// (달러 / USD/KRW / USDT / USDT/KRW / 김치프리미엄).
// Reuses CryptoTicker's combo rendering with the symbol locked.
class TetherTicker extends CryptoTicker {
  constructor(context) {
    super(context);
    // CryptoTicker's constructor already kicked off a fetch (debounced 150ms);
    // overriding the symbol synchronously here means that fetch uses the combo.
    this.settings.symbol = 'USD_USDT_COMBO';
    // 3-line combined layout defaults (bigger numbers).
    if (this.settings.labelFontSize === undefined) this.settings.labelFontSize = 22;
    if (this.settings.valueFontSize === undefined) this.settings.valueFontSize = 40;
    if (this.settings.kimchiFontSize === undefined) this.settings.kimchiFontSize = 34;
    if (this.settings.krwDecimals === undefined) this.settings.krwDecimals = '0';
    if (this.settings.labelGap === undefined) this.settings.labelGap = 14;
  }

  setParams(jsn) {
    super.setParams({ ...(jsn || {}), symbol: 'USD_USDT_COMBO' });
  }
}
