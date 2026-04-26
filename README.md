# FX Currency API — x402 Powered

Real-time fiat exchange rates for 160+ currencies. No API keys. Pay per request in USDC on Base mainnet. Powered by ECB and 50+ central bank data via Frankfurter.dev.

## Endpoints

| Endpoint | Price | Description |
|---|---|---|
| `GET /rates` | $0.001 | Latest rates for 160+ currencies |
| `GET /convert` | $0.001 | Convert between any two currencies |
| `GET /historical` | $0.002 | Historical rates by date |
| `GET /currencies` | $0.0005 | List all supported currencies |
| `GET /` | FREE | API docs |
| `GET /.well-known/x402` | FREE | Autodiscovery |

## Deploy to Vercel

### 1. Clone & install

```bash
git clone <your-repo>
cd fx-currency-api
```

### 2. Set env vars in Vercel dashboard

```
WALLET_ADDRESS=0xf5fF2Cb593bcd029fd4Aae049109a9Cc205D5baF
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
```

### 3. Deploy

```bash
npm i -g vercel
vercel --prod
```

## Query examples

```bash
# Latest USD rates
curl https://your-app.vercel.app/rates?base=USD

# Specific currencies only
curl "https://your-app.vercel.app/rates?base=EUR&symbols=USD,GBP,HUF,JPY"

# Convert 100 USD to EUR
curl "https://your-app.vercel.app/convert?from=USD&to=EUR&amount=100"

# Historical rates
curl "https://your-app.vercel.app/historical?date=2024-01-15&base=USD&symbols=EUR,GBP"

# All supported currencies
curl https://your-app.vercel.app/currencies

# Autodiscovery
curl https://your-app.vercel.app/.well-known/x402
```

## Why this exists

Fiat FX rates are missing from the x402 / agentic.market ecosystem.
CoinGecko covers crypto — but EUR/USD, GBP/JPY, HUF and 160+ other fiat pairs are not available via x402.
AI agents doing global commerce, pricing, or financial calculations need this data without managing API keys or subscriptions.

## Data source

Frankfurter.dev — free, open-source, sourced from ECB and 50+ central banks. No API key required on the backend.
