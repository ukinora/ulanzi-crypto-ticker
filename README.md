# Crypto & Stock Ticker for Ulanzi D200H

Ulanzi Studio plugin that shows real-time **crypto, US/Korean stocks, and FX** prices on your Ulanzi D200H LCD keys.

## Actions

The plugin ships four independent actions — drag any of them onto a key:

| Action | Shows | Source |
|--------|-------|--------|
| **Crypto Ticker** | A single coin's USDT price (BTC, ETH, SOL, …) | Binance |
| **Crypto Ticker 2** | Coin price with change arrow, % change, and over/under price alerts | Binance |
| **Stock Ticker** | US & Korean stock / ETF price, realtime, with pre-market / after-hours badges | Naver relay (realtime) → stockanalysis → Finnhub |
| **Tether Ticker** | USD/KRW rate + USDT/KRW with the kimchi-premium % | manana.kr + Upbit/Bithumb |

## Highlights

- **Realtime Korean & US stocks** — 6-digit KRX codes (e.g. `005930`) resolve to the stock name (삼성전자) and price; US tickers (e.g. `TSLA`, `QLD`) update live during regular hours, with `PRE` / `AH` session badges for extended hours.
- **Marquee scrolling** — long names that overflow the 196 px key scroll smoothly instead of shrinking; scroll speed is adjustable.
- **Flicker-free updates** — values change in place; no `...` flash on each refresh, and the last good value stays on a transient network error.
- **Price alerts** — invert the key's colors when a price crosses an over/under threshold (Crypto Ticker 2, Stock Ticker).
- **Customizable** — background/text color, per-line font sizes, vertical offset, refresh interval, custom font.

## Data sources & CORS relay

Ulanzi plugins run in a WebView that enforces CORS, so APIs without `Access-Control-Allow-Origin: *` can't be read directly. Crypto and FX sources (Binance, manana.kr) are CORS-friendly and used directly.

**Korean and US stock prices come from Naver Finance (realtime, `delayTime:0`), which blocks cross-origin reads.** They are fetched through a small Cloudflare Worker relay that adds CORS:

- **Deploy your own relay** and set its URL in `plugin/actions/stockticker.js` (`this.KRX_PROXY`). One-click deploy: **[ukinora/krx-proxy-worker](https://github.com/ukinora/krx-proxy-worker)** (Cloudflare free tier, 100k req/day).
- Until it's set, Stock Ticker falls back to delayed [stockanalysis](https://stockanalysis.com) prices.

**Finnhub** is only a last-resort US fallback and is **disabled by default**. To enable it, get a free key at [finnhub.io](https://finnhub.io) and set `FINNHUB_KEY` in `plugin/actions/stockticker.js` (leaving it empty keeps Naver + stockanalysis as the sources — no key required).

## Installation

### Method 1: Installer (Recommended)

1. Download **CryptoTicker-Setup.exe** from [Releases](../../releases/latest)
2. Run the installer and click "Install"
3. Check "Launch Ulanzi Studio" on the finish screen

### Method 2: Manual Install

1. Download the latest release zip from [Releases](../../releases)
2. Extract to: `%APPDATA%\Ulanzi\UlanziDeck\Plugins\com.ulanzi.cryptoticker.ulanziPlugin\`
3. Restart Ulanzi Studio

### Method 3: Clone

```bash
git clone https://github.com/ukinora/ulanzi-crypto-ticker.git
xcopy /E /I ulanzi-crypto-ticker "%APPDATA%\Ulanzi\UlanziDeck\Plugins\com.ulanzi.cryptoticker.ulanziPlugin"
```

Then restart Ulanzi Studio.

## Usage

1. Open Ulanzi Studio and find **Crypto Ticker** in the left panel.
2. Drag one of the four actions onto an LCD key.
3. Configure it in the right panel:
   - **Crypto**: pick a coin symbol.
   - **Stock**: type a US ticker (`TSLA`) or a 6-digit Korean code (`005930`); choose which trading sessions to display.
   - Set colors, font sizes, vertical offset, scroll speed, refresh interval, and (optionally) price alerts.

Assign different symbols to different keys.

## LCD Display

```
   PRE  TSLA ▲     <- session badge + name/ticker + direction
   431.20          <- price (green up / red down)
   (+1.84%)        <- change percent
```

Korean stocks show the resolved name and a ₩ price:

```
   삼성전자         <- name (scrolls if too long)
  ₩71,900
   (-0.55%)
```

## Requirements

- Ulanzi Studio 6.1+
- Ulanzi D200H (or compatible device)
- Windows 10+ / macOS 10.11+

## Built With

- [UlanziDeckPlugin-SDK](https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK)
- Development reference: [ulanzi-studio-plugin-skill](https://github.com/ukinora/ulanzi-studio-plugin-skill)

## License

MIT
