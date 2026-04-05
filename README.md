# Crypto Ticker for Ulanzi D200H

Ulanzi Studio plugin that displays real-time cryptocurrency prices on your Ulanzi D200H LCD keys.

## Features

- **20+ Cryptocurrencies** - BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX, and more
- **USD/KRW Exchange Rate** - Real-time dollar-won rate via manana.kr
- **USDT/KRW with Kimchi Premium** - USDT price in KRW with kimchi premium percentage
- **Customizable Colors** - Background color, text color with presets and color picker
- **Adjustable Font Size** - 12px to 60px with slider control
- **Text Position Control** - Vertical offset adjustment (-80px to +80px)
- **Refresh Interval** - 5 seconds to 10 minutes

## Data Sources

| Symbol | API | CORS |
|--------|-----|------|
| Crypto (BTC, ETH, ...) | [Binance](https://data-api.binance.vision/api/v3/ticker/price) | Yes |
| USD/KRW | [manana.kr](https://api.manana.kr/exchange/rate/KRW/USD.json) | Yes |
| USDT/KRW | [CryptoCompare](https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=KRW) | Yes |

## Installation

### Method 1: Installer (Recommended)

1. Download **CryptoTicker-Setup.exe** from [Releases](../../releases/latest)
2. Run the installer
3. Click "Install"
4. Check "Launch Ulanzi Studio" on the finish screen

That's it! The plugin is ready to use.

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

1. Open Ulanzi Studio
2. Find **"Crypto Ticker"** in the left panel
3. Drag the action onto any LCD key on your D200H
4. Configure in the right panel:
   - Select symbol (BTC, ETH, USD/KRW, USDT/KRW, ...)
   - Pick background and text colors
   - Adjust font size and position
   - Set refresh interval

You can assign different coins to different keys.

## LCD Display

```
   BTC          <- Symbol name
  67,331        <- Price in USDT
```

USDT/KRW shows kimchi premium:

```
   USDT         <- Symbol
  1,516.50      <- KRW price
  +0.39%        <- Kimchi premium (green/red)
```

## Requirements

- Ulanzi Studio 6.1+
- Ulanzi D200H (or compatible device)
- Windows 10+ / macOS 10.11+

## Built With

- [UlanziDeckPlugin-SDK](https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK)

## License

MIT
