# Market Interface — FinAlly Project

> Defines the abstract interface and concrete implementations that power price streaming in FinAlly. The simulator and Massive API are interchangeable — the rest of the backend never knows which is running.

---

## Design Goals

1. **Single interface** — all price data flows through one abstraction, regardless of source.
2. **Zero coupling** — the SSE streamer, SSE poller, and chat context builder are completely agnostic to whether prices come from simulation or a live API.
3. **Lazy initialization** — the correct implementation is selected once at startup, based on the presence of `MASSIVE_API_KEY`.
4. **Graceful degradation** — if the Massive API is unavailable or rate-limited, the backend falls back to the simulator without crashing.

---

## Abstract Interface

All price sources implement `MarketDataSource`, which exposes two methods:

```python
class MarketDataSource(ABC):
    @abstractmethod
    def get_latest_prices(self, tickers: list[str]) -> dict[str, PriceTick]:
        """
        Fetch the latest price for each ticker.
        Called by the SSE poller on each poll cycle.
        Returns a dict keyed by ticker symbol.
        """

    @abstractmethod
    def get_historical_bars(
        self,
        ticker: str,
        timespan: str = "minute",
        multiplier: int = 1,
        from_date: str | None = None,
        to_date: str | None = None,
        limit: int = 500,
    ) -> list[OHLCBar]:
        """
        Fetch historical OHLC bars for charting.
        'from_date' and 'to_date' are in YYYY-MM-DD format.
        Returns a list sorted oldest-first.
        """
```

### Return Types

```python
@dataclass
class PriceTick:
    ticker: str
    price: float              # latest price
    prev_price: float         # price from the previous poll cycle (for direction)
    change: float              # absolute change vs prev_price
    change_pct: float          # percent change vs prev_price
    timestamp: datetime        # when this price was recorded

@dataclass
class OHLCBar:
    ticker: str
    timestamp: datetime        # bar open time
    open: float
    high: float
    low: float
    close: float
    volume: int
```

---

## Factory Selection

At application startup, the backend calls `get_market_source()` once:

```python
def get_market_source() -> MarketDataSource:
    api_key = os.environ.get("MASSIVE_API_KEY", "").strip()
    if api_key:
        return MassiveMarketSource(api_key)
    return SimulatorMarketSource()
```

This function lives in `backend/market/__init__.py` and is the only import site where implementation choice leaks outside the `market` package.

---

## Implementation 1 — Simulator

See [MARKET_SIMULATOR.md](MARKET_SIMULATOR.md) for the full design.

Instantiated with a list of tickers and an optional seed prices dict:

```python
simulator = SimulatorMarketSource(
    tickers=["AAPL", "GOOGL", "MSFT", ...],
    seed_prices={"AAPL": 189.50, "GOOGL": 175.00, ...},
)
```

Implements the full `MarketDataSource` interface. In-process and synchronous — no I/O.

---

## Implementation 2 — Massive API

Wraps the official `massive` Python client.

```python
class MassiveMarketSource(MarketDataSource):
    def __init__(self, api_key: str):
        self._client = RESTClient(api_key=api_key)
        self._poll_interval = 15  # seconds, adjusted after first response
        self._prev_prices: dict[str, float] = {}
```

**`get_latest_prices`** — polls `GET /v2/last/trade/{ticker}` for each ticker, stores the prior price before updating, returns `PriceTick` dict:

```python
def get_latest_prices(self, tickers: list[str]) -> dict[str, PriceTick]:
    results = {}
    for ticker in tickers:
        trade = self._client.get_last_trade(ticker=ticker)
        price = float(trade.price)
        prev = self._prev_prices.get(ticker, price)
        change = price - prev
        results[ticker] = PriceTick(
            ticker=ticker,
            price=price,
            prev_price=prev,
            change=change,
            change_pct=(change / prev * 100) if prev else 0.0,
            timestamp=datetime.fromtimestamp(trade.timestamp / 1000, tz=UTC),
        )
        self._prev_prices[ticker] = price
    return results
```

**`get_historical_bars`** — polls `GET /v2/aggs/ticker/{ticker}/range/1/minute/{date}/{date}` for the current date (intraday chart), or a date range if specified:

```python
def get_historical_bars(
    self,
    ticker: str,
    timespan: str = "minute",
    multiplier: int = 1,
    from_date: str | None = None,
    to_date: str | None = None,
    limit: int = 500,
) -> list[OHLCBar]:
    today = date.today().isoformat()
    bars = []
    for agg in self._client.list_aggs(
        ticker=ticker,
        multiplier=multiplier,
        timespan=timespan,
        from_=from_date or today,
        to=to_date or today,
        limit=limit,
    ):
        bars.append(OHLCBar(
            ticker=ticker,
            timestamp=datetime.fromtimestamp(agg.t / 1000, tz=UTC),
            open=agg.o,
            high=agg.h,
            low=agg.l,
            close=agg.c,
            volume=agg.v,
        ))
    return bars
```

**Rate limit handling** — reads `X-RateLimit-Remaining` from the last HTTP response and backs off:

```python
def _handle_rate_limit(self, response: httpx.Response):
    remaining = int(response.headers.get("X-RateLimit-Remaining", 0))
    if remaining < 2:
        self._poll_interval = 60  # back off to 1 minute
    elif remaining < 10:
        self._poll_interval = 30
```

**Fallback on network error** — if a poll raises `httpx.HTTPStatusError` or `httpx.TimeoutException`, the poller logs a warning and returns the last known prices (stale is better than crashing).

---

## Architecture — How They Connect

```
backend/
└── market/
    ├── __init__.py          # get_market_source() factory
    ├── interface.py         # ABC + dataclasses (PriceTick, OHLCBar)
    ├── simulator.py         # SimulatorMarketSource
    └── massive.py           # MassiveMarketSource
```

### Consumer: SSE Poller

A single background task runs the poller loop. It holds a reference to whichever `MarketDataSource` was returned by the factory:

```python
class SSEPoller:
    def __init__(self, source: MarketDataSource):
        self._source = source
        self._tick_cache: dict[str, PriceTick] = {}

    def poll_and_cache(self):
        """Called every ~500ms by the event loop."""
        self._tick_cache = self._source.get_latest_prices(
            tickers=list(self._tick_cache.keys())  # current watchlist
        )

    def get_cache(self) -> dict[str, PriceTick]:
        return self._tick_cache
```

The SSE endpoint reads from `_tick_cache` and pushes to connected clients:

```python
@router.get("/api/stream/prices")
async def stream_prices():
    async def event_generator():
        while True:
            ticks = sse_poller.get_cache()
            for ticker, tick in ticks.items():
                yield f"data: {json.dumps(asdict(tick))}\n\n"
            await asyncio.sleep(0.5)
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### Consumer: Chart Endpoint

The `/api/chart/{ticker}` endpoint delegates directly to `get_historical_bars`:

```python
@router.get("/api/chart/{ticker}")
async def get_chart(ticker: str, timespan: str = "minute", limit: int = 500):
    source = get_market_source()  # same factory, same source singleton
    bars = source.get_historical_bars(ticker=ticker, timespan=timespan, limit=limit)
    return {"bars": [asdict(b) for b in bars]}
```

### Consumer: Chat Context Builder

When the LLM needs portfolio context, it reads live prices through the same interface:

```python
def build_portfolio_context(poller: SSEPoller) -> str:
    ticks = poller.get_cache()
    lines = []
    for ticker, tick in ticks.items():
        lines.append(f"  {ticker}: ${tick.price:.2f} ({tick.change_pct:+.2f}%)")
    return "\n".join(lines)
```

---

## Thread / Async Safety

- The simulator is thread-safe — it holds state in plain Python dataclasses with no locks.
- The Massive poller runs in an `asyncio` background task using `httpx.AsyncClient`. The `prev_prices` dict is mutated only in the single async task, so no lock is needed.
- The SSE cache (`_tick_cache`) is written by the async poller and read by sync SSE endpoints. It is protected by a single `asyncio.Lock`:

```python
class SSEPoller:
    def __init__(self, source: MarketDataSource):
        self._source = source
        self._cache: dict[str, PriceTick] = {}
        self._lock = asyncio.Lock()

    async def poll_and_cache(self):
        ticks = await self._source.get_latest_prices_async(tickers=list(self._cache.keys()))
        async with self._lock:
            self._cache = ticks

    def get_cache(self) -> dict[str, PriceTick]:
        # Sync read — copy to avoid race with writer
        return self._cache.copy()  # snapshot for SSE endpoint
```

---

## Error Handling

| Failure mode | Response |
|---|---|
| Missing `MASSIVE_API_KEY` | Simulator runs, no degradation |
| Invalid API key (401) | Logged warning, simulator starts, 503 on `/api/health` with `data_source: simulator_fallback` |
| Rate limit hit (429) | Back off per tier, continue with last known prices |
| Network timeout | Logged warning, return stale cache |
| Ticker not found (404) | Omit from results, log ticker name |
| All tickers fail | Return empty dict, SSE sends no events (client continues waiting) |

---

## Environment Variables

| Variable | Effect |
|---|---|
| `MASSIVE_API_KEY` not set or empty | Simulator is used |
| `MASSIVE_API_KEY` set | Massive REST API is used |
| `SIMULATOR_VOLATILITY` | Overrides GBM volatility (default `0.002`) — useful for demos |
| `SIMULATOR_DRIFT` | Overrides GBM drift (default `0.00001`) |
| `SIMULATOR_EVENT_PROBABILITY` | Probability of a random "event" spike (default `0.005`) |
