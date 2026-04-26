import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { createFacilitatorConfig } from "@coinbase/x402";

const app = express();
app.use(express.json());

const FRANKFURTER = "https://api.frankfurter.dev/v2";
const WALLET = process.env.WALLET_ADDRESS;
const CDP_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_KEY_SECRET = process.env.CDP_API_KEY_SECRET;

if (!WALLET) throw new Error("WALLET_ADDRESS env var is required");
if (!CDP_KEY_ID || !CDP_KEY_SECRET) throw new Error("CDP_API_KEY_ID and CDP_API_KEY_SECRET are required");

const facilitatorConfig = createFacilitatorConfig(CDP_KEY_ID, CDP_KEY_SECRET);
const facilitator = new HTTPFacilitatorClient(facilitatorConfig);
const resourceServer = new x402ResourceServer(facilitator).register(
  "eip155:8453",
  new ExactEvmScheme()
);

const makeAccepts = (price) => ({
  scheme: "exact",
  price,
  network: "eip155:8453",
  payTo: WALLET,
});

const routes = {
  "GET /rates": {
    accepts: makeAccepts("$0.001"),
    description: "Latest fiat exchange rates for 160+ currencies. Base currency configurable (default: USD).",
    mimeType: "application/json",
  },
  "GET /convert": {
    accepts: makeAccepts("$0.001"),
    description: "Convert an amount between any two fiat currencies using live rates.",
    mimeType: "application/json",
  },
  "GET /historical": {
    accepts: makeAccepts("$0.002"),
    description: "Historical exchange rates for a specific date or date range.",
    mimeType: "application/json",
  },
  "GET /currencies": {
    accepts: makeAccepts("$0.0005"),
    description: "List of all 160+ supported fiat currencies with their full names.",
    mimeType: "application/json",
  },
};

app.use(paymentMiddleware(routes, resourceServer));

async function frankfurterFetch(path) {
  const res = await fetch(`${FRANKFURTER}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Upstream error ${res.status}`);
  return res.json();
}

// GET /rates?base=USD&symbols=EUR,GBP,HUF,JPY
app.get("/rates", async (req, res) => {
  try {
    const base = (req.query.base || "USD").toUpperCase();
    const symbols = req.query.symbols || "";
    let url = `/rates?from=${encodeURIComponent(base)}`;
    if (symbols) url += `&symbols=${encodeURIComponent(symbols.toUpperCase())}`;
    const data = await frankfurterFetch(url);
    res.json({
      base: data.base,
      date: data.date,
      rates: data.rates,
      count: Object.keys(data.rates || {}).length,
      timestamp: new Date().toISOString(),
      _paid: "$0.001 USDC / Base mainnet",
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /convert?from=USD&to=EUR&amount=100
app.get("/convert", async (req, res) => {
  try {
    const from = (req.query.from || "USD").toUpperCase();
    const to = (req.query.to || "EUR").toUpperCase();
    const amount = parseFloat(req.query.amount) || 1;

    const data = await frankfurterFetch(
      `/rates?from=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`
    );

    const rate = data.rates?.[to];
    if (!rate) return res.status(400).json({ error: `Currency ${to} not found` });

    res.json({
      from,
      to,
      amount,
      rate,
      result: parseFloat((amount * rate).toFixed(6)),
      date: data.date,
      timestamp: new Date().toISOString(),
      _paid: "$0.001 USDC / Base mainnet",
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /historical?date=2024-01-15&base=USD&symbols=EUR,GBP
app.get("/historical", async (req, res) => {
  try {
    const date = req.query.date;
    const from = req.query.from || req.query.base || "USD";
    const to = (req.query.to || "").toUpperCase();
    const symbols = req.query.symbols || to;

    if (!date) return res.status(400).json({ error: "date param required (YYYY-MM-DD)" });

    let url = `/rates?from=${encodeURIComponent(date)}&base=${encodeURIComponent(from.toUpperCase())}`;
    if (symbols) url += `&symbols=${encodeURIComponent(symbols.toUpperCase())}`;

    const data = await frankfurterFetch(url);
    res.json({
      base: data.base,
      date: data.date,
      rates: data.rates,
      count: Object.keys(data.rates || {}).length,
      _paid: "$0.002 USDC / Base mainnet",
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /currencies
app.get("/currencies", async (req, res) => {
  try {
    const data = await frankfurterFetch("/currencies");
    res.json({
      currencies: data,
      count: Object.keys(data || {}).length,
      timestamp: new Date().toISOString(),
      _paid: "$0.0005 USDC / Base mainnet",
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Autodiscovery — agentic.market indexing
app.get("/.well-known/x402", (_req, res) => {
  res.json({
    version: "1",
    payTo: WALLET,
    network: "eip155:8453",
    currency: "USDC",
    name: "FX Currency API",
    description: "Real-time fiat exchange rates for 160+ currencies via x402 micropayments. No API key needed. Powered by ECB and central bank data.",
    resources: [
      {
        path: "/rates",
        method: "GET",
        description: "Latest exchange rates for 160+ fiat currencies.",
        params: "?base=USD&symbols=EUR,GBP,HUF,JPY",
        price: { amount: "0.001", currency: "USDC" },
      },
      {
        path: "/convert",
        method: "GET",
        description: "Convert amount between any two fiat currencies.",
        params: "?from=USD&to=EUR&amount=100",
        price: { amount: "0.001", currency: "USDC" },
      },
      {
        path: "/historical",
        method: "GET",
        description: "Historical exchange rates for a specific date.",
        params: "?date=2024-01-15&base=USD&symbols=EUR,GBP",
        price: { amount: "0.002", currency: "USDC" },
      },
      {
        path: "/currencies",
        method: "GET",
        description: "List of all 160+ supported currencies.",
        price: { amount: "0.0005", currency: "USDC" },
      },
    ],
  });
});

// Free root — docs
app.get("/", (_req, res) => {
  res.json({
    name: "FX Currency API",
    version: "1.0.0",
    description: "Real-time fiat exchange rates for 160+ currencies via x402 micropayments. No API key needed.",
    payment: "USDC on Base mainnet (eip155:8453)",
    source: "Frankfurter.dev — ECB + 50+ central banks",
    endpoints: [
      { path: "GET /rates", price: "$0.001", params: "?base=USD&symbols=EUR,GBP,HUF,JPY" },
      { path: "GET /convert", price: "$0.001", params: "?from=USD&to=EUR&amount=100" },
      { path: "GET /historical", price: "$0.002", params: "?date=2024-01-15&base=USD&symbols=EUR" },
      { path: "GET /currencies", price: "$0.0005", params: "" },
    ],
    discovery: "GET /.well-known/x402",
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
