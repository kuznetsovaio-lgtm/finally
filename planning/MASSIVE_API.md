# Massive API Reference — FinAlly Project

> Massive (formerly Polygon.io) provides financial market data via REST and WebSocket. This document covers the endpoints and patterns used in the FinAlly project.
>
> **Source**: [Massive API Docs](https://massive.com/docs), [Python Client](https://github.com/polygon-io/client-python)

---

## Authentication

All requests require the API key passed via the `X-FAPI-Key` HTTP header:

```http
X-FAPI-Key: your_api_key_here
```

Base URL: `https://api.massive.com`

---

## Environment Variable

Set `MASSIVE_API_KEY` in `.env`. The backend switches to real data automatically when the key is present and non-empty. If absent or empty, the simulator runs instead.

---

## Relevant Endpoints

### 1. Aggregate Bars (OHLC) — Historical Prices

```
GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
```

Fetches OHLC (Open, High, Low, Close) bars over a date range.

**Path parameters**

| Parameter   | Type | Description |
|-------------|------|-------------|
| `ticker`    | string | Stock symbol, e.g. `AAPL` |
| `multiplier`| int   | How many `timespan` units per bar (use `1` for standard bars) |
| `timespan`  | string | `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year` |
| `from`      | string | Start date in `YYYY-MM-DD` format |
| `to`        | string | End date in `YYYY-MM-DD` format |

**Query parameters**

| Parameter   | Default | Description |
|-------------|---------|-------------|
| `adjusted`  | `true`  | Whether to return adjusted prices |
| `sort`      | `asc`   | `asc` or `desc` |
| `limit`     | `50000` | Max results per page |

**Response**

```json
{
  "ticker": "AAPL",
  "queryCount": 1,
  "resultsCount": 1,
  "adjusted": true,
  "results": [
    {
      "t": 1718001600000,
      "o": 189.50,
      "h": 190.10,
      "l": 189.20,
      "c": 189.95,
      "v": 1234567
    }
  ]
}
```

Fields in the `results` array:

| Field | Type   | Description |
|-------|--------|-------------|
| `t`   | int    | Unix timestamp in milliseconds (open time) |
| `o`   | float  | Open price |
| `h`   | float  | High price |
| `l`   | float  | Low price |
| `c`   | float  | Close price |
| `v`   | int    | Trading volume |

**Python client**

```python
from massive import RESTClient

client = RESTClient(api_key="<API_KEY>")

# Fetch 1-minute bars for AAPL over the last hour
for agg in client.list_aggs(
    ticker="AAPL",
    multiplier=1,
    timespan="minute",
    from_="2026-07-13",
    to="2026-07-13",
    limit=50000,
):
    print(agg.t, agg.o, agg.h, agg.l, agg.c, agg.v)
```

**Previous Close (single bar)**

```
GET /v2/aggs/ticker/{ticker}/prev
```

Returns the last completed bar for the ticker — the previous close price. Useful for computing daily change without fetching a full range.

```json
{
  "ticker": "AAPL",
  "queryCount": 1,
  "resultsCount": 1,
  "adjusted": true,
  "results": [
    {
      "t": 1717915200000,
      "o": 188.00,
      "h": 190.50,
      "l": 187.75,
      "c": 189.50,
      "v": 98765432
    }
  ]
}
```

---

### 2. Last Trade — Current Price

```
GET /v2/last/trade/{ticker}
```

Returns the most recent executed trade for a ticker. This is the primary endpoint for current price in FinAlly.

**Response**

```json
{
  "status": "OK",
  "symbol": "AAPL",
  "last": {
    "price": "189.95",
    "size": "100",
    "exchange": 12,
    "timestamp": 1718002000000
  }
}
```

**Python client**

```python
trade = client.get_last_trade(ticker="AAPL")
print(trade.price)       # "189.95"
print(trade.timestamp)   # 1718002000000 (Unix ms)
```

---

### 3. Last Quote — Bid/Ask

```
GET /v2/last/quote/{ticker}
```

Returns the most recent NBBO quote (best bid and ask).

**Response**

```json
{
  "status": "OK",
  "symbol": "AAPL",
  "last": {
    "bid": "189.90",
    "bidSize": "200",
    "ask": "189.99",
    "askSize": "100",
    "timestamp": 1718002000000
  }
}
```

**Python client**

```python
quote = client.get_last_quote(ticker="AAPL")
print(quote.bid, quote.ask)
```

---

### 4. List Trades — Historical Trade Tape

```
GET /v2/trades/{ticker}/{timestamp}
```

Where `timestamp` is `YYYY-MM-DD`. Returns all trades for that ticker on that date.

```json
{
  "status": "OK",
  "symbol": "AAPL",
  "page": 1,
  "results": [
    {
      "t": 1718001600000,
      "p": 189.50,
      "s": 100,
      "c": [" "],
      "i": 12345,
      "x": 12,
      "p1": false
    }
  ]
}
```

**Python client**

```python
for trade in client.list_trades(ticker="AAPL", timestamp="2026-07-13"):
    print(trade.p, trade.s, trade.t)
```

---

### 5. Snapshot — Ticker with Indicators

```
GET /v3/snapshot/indicators/{ticker}?indicator=ema,sma,rsi
```

Returns current price plus technical indicators (EMA, SMA, RSI, MACD, etc.).

```python
snapshot = client.get_snapshot_indicators(ticker="AAPL", indicator="ema,sma")
print(snapshot.results.indicators.ema[0].value)
```

---

### 6. WebSocket — Real-Time Streaming

The WebSocket client pushes trades and quotes as they happen. This is the recommended approach for real-time data in FinAlly.

**Connection URL**: `wss://api.massive.com`

**Subscription format**: `T.{ticker}` for trades, `Q.{ticker}` for quotes, `AM.{ticker}` for aggregate minute bars.

**Python client**

```python
from massive import WebSocketClient

ws = WebSocketClient(
    api_key="<API_KEY>",
    subscriptions=["T.AAPL", "T.GOOGL", "AM.AAPL"],
)

def handle_msg(messages):
    for m in messages:
        print(m)

ws.run(handle_msg=handle_msg)
```

**JSON message format (trade)**

```json
{
  "ev": "T",
  "sym": "AAPL",
  "p": 189.95,
  "s": 100,
  "t": 1718002000000,
  "i": 12345,
  "x": 12,
  "c": [" "]
}
```

**JSON message format (aggregate minute bar)**

```json
{
  "ev": "AM",
  "sym": "AAPL",
  "v": 1234,
  "o": 189.50,
  "c": 189.95,
  "h": 190.10,
  "l": 189.20,
  "s": 1718001600000,
  "e": 1718001659999
}
```

**Frontend (JavaScript native WebSocket)**

```javascript
const ws = new WebSocket("wss://api.massive.com?apiKey=<API_KEY>");
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.ev === "T") {
    console.log(msg.sym, msg.p, msg.t);
  }
});
ws.send(JSON.stringify({ action: "subscribe", params: "T.AAPL,T.GOOGL" }));
```

> **Note**: The WebSocket subscription string format varies by tier. Free tier supports limited subscriptions. For simplicity, FinAlly uses REST polling on the free tier and can upgrade to WebSocket for paid tiers.

---

## Rate Limits

| Tier   | Limit                        |
|--------|------------------------------|
| Free   | ~5 requests/minute           |
| Starter| ~100 requests/minute         |
| Pro+   | Higher limits                |

For the free tier, poll at most every 15 seconds. For Starter/Pro, poll every 2–15 seconds.

---

## FinAlly Usage Pattern

The backend polls these endpoints at a fixed interval based on tier:

```python
# Polling interval per tier
FREE_POLL_INTERVAL = 15  # seconds
PAID_POLL_INTERVAL = 5   # seconds
```

**Endpoint used for current price**: `GET /v2/last/trade/{ticker}` — one request per ticker per poll cycle.

**Endpoint used for daily change**: `GET /v2/aggs/ticker/{ticker}/prev` — or derive from the last completed bar.

**Endpoint used for intraday history**: `GET /v2/aggs/ticker/{ticker}/range/1/minute/{date}/{date}` — fetched on demand when a user selects a ticker to chart.

---

## Python Client Installation

```bash
pip install -U massive
```

Requires Python 3.9+. Initialize with:

```python
from massive import RESTClient

client = RESTClient(api_key=os.environ["MASSIVE_API_KEY"])
```

---

## Tier Detection

The Massive API returns rate limit headers in responses:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
```

The backend reads these to adapt its polling interval dynamically. If `X-RateLimit-Remaining < 2`, back off to 60 seconds.
