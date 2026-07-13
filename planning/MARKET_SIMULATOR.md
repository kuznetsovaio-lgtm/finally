# Market Simulator — FinAlly Project

> Generates realistic-looking stock price movements using Geometric Brownian Motion (GBM), correlated multi-asset moves, and random "event" spikes. Runs entirely in-process — no network, no API key required.

---

## Overview

The simulator is the default price source when `MASSIVE_API_KEY` is not set. It:

- Maintains a live price state for each ticker in the watchlist
- Updates all prices simultaneously at a fixed cadence (~500ms)
- Produces realistic price paths: continuous movement, mean reversion, occasional spikes
- Computes daily open/close/high/low from the intraday tick sequence
- Conforms to the `MarketDataSource` interface — fully interchangeable with the Massive implementation

---

## Algorithm: Geometric Brownian Motion (GBM)

Price evolution follows GBM:

```
S(t+1) = S(t) * exp((μ - σ²/2) * dt + σ * √dt * Z)
```

Where:
- `S(t)` = price at time `t`
- `μ` = drift (annualized daily return, default `0.0` — no sustained trend)
- `σ` = volatility (annualized daily volatility, default `0.20` — 20% annual vol ≈ 1.3% daily)
- `dt` = time step in years (`500ms / (252 * 6.5 * 3600)` ≈ `3.1e-5` trading-years)
- `Z` = standard normal random variable

**Per-ticker parameters** — configurable at construction:

| Ticker | Seed Price | Annual Volatility (σ) |
|--------|-----------|----------------------|
| AAPL   | 189.50    | 0.20 |
| GOOGL  | 175.00    | 0.22 |
| MSFT   | 420.00    | 0.19 |
| AMZN   | 185.00    | 0.24 |
| TSLA   | 250.00    | 0.55 |
| NVDA   | 130.00    | 0.45 |
| META   | 510.00    | 0.28 |
| JPM    | 195.00    | 0.18 |
| V      | 275.00    | 0.17 |
| NFLX   | 650.00    | 0.35 |

Higher-volatility stocks (TSLA, NVDA, NFLX) are deliberately more dramatic for demos.

---

## Correlated Moves

Individual GBM draws are independent, but market-wide events should move all stocks together (e.g., broad market selloff). The simulator adds a **common factor**:

```
individual_return = GBM_sample(ticker)
market_return     = GBM_sample()       # shared Z for all tickers
correlation       = 0.3                # weight of market factor

composite_return  = correlation * market_return + (1 - correlation) * individual_return
```

This means:
- ~30% of price variance is shared across all tickers (market correlation)
- ~70% is idiosyncratic to each stock
- Tech stocks (AAPL, GOOGL, MSFT, AMZN, NVDA, META) have an additional tech sector correlation (`0.2` extra weight) so they move together

---

## Random Event Spikes

With probability `p` per tick (`p = 0.005`, roughly once per 20 ticks at 500ms cadence = every ~10 seconds on average), a **random event** is triggered:

```python
if random.random() < EVENT_PROBABILITY:
    direction = random.choice([-1, 1])
    magnitude = random.uniform(0.015, 0.05)   # 1.5% to 5% jump
    spike = direction * magnitude * current_price
    price += spike
```

This creates sudden gaps up or down — useful for making the watchlist feel live.

---

## Price Bounds

Prices are bounded below by `seed_price * 0.5` (50% drawdown maximum) and above by `seed_price * 5.0` (500% gain maximum) to prevent runaway prices in long sessions.

---

## Daily OHLC Tracking

The simulator tracks running open/high/low/close for the current trading session:

```python
class PriceState:
    ticker: str
    price: float
    open_price: float       # price at session open
    high_price: float
    low_price: float
    prev_close: float       # yesterday's close (from seed or prior session)
    daily_volume: int
    last_updated: datetime
    tick_count: int          # number of ticks since session open
```

- `open_price` is set on the first tick of the session (00:00 UTC or first poll after midnight)
- `high_price` and `low_price` are updated on every tick: `max(high, price)` / `min(low, price)`
- `prev_close` carries over from the previous session's final price
- At session close (or on first tick of new day), a new session begins: `open_price = price`, `high_price = low_price = price`

---

## Class Structure

```python
class SimulatorMarketSource(MarketDataSource):
    """
    In-process market data source using Geometric Brownian Motion.
    Implements MarketDataSource — same interface as MassiveMarketSource.
    """

    def __init__(
        self,
        tickers: list[str] | None = None,
        seed_prices: dict[str, float] | None = None,
        volatility: dict[str, float] | None = None,
        drift: float = 0.00001,
        event_probability: float = 0.005,
        poll_interval: float = 0.5,
    ):
        """
        tickers:            list of ticker symbols to simulate
        seed_prices:       dict of ticker -> starting price (defaults to hardcoded table)
        volatility:         dict of ticker -> annual volatility σ (defaults to table above)
        drift:              annual drift μ (default 0.00001 = ~2.5% annual return)
        event_probability:  probability per tick of a random spike (default 0.005)
        poll_interval:      seconds between ticks (default 0.5)
        """
```

**Internal state:**

```python
self._states: dict[str, PriceState]     # live price state per ticker
self._rng: np.random.Generator          # seeded RNG for reproducibility (seed = 42)
self._drift = drift
self._event_prob = event_probability
self._sector_correlation = {
    "tech": ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "META"]
}
```

---

## `get_latest_prices` Implementation

```python
def get_latest_prices(self, tickers: list[str]) -> dict[str, PriceTick]:
    # Step 1: Generate market factor (shared across all tickers)
    market_return = self._rng.normal(0, self._drift_vol)
    now = datetime.now(tz=UTC)

    results = {}
    for ticker in tickers:
        state = self._states[ticker]

        # Step 2: Idiosyncratic GBM return
        idio_return = self._rng.normal(0, self._drift_vol)

        # Step 3: Add tech sector correlation if applicable
        sector_factor = 0.0
        if ticker in self._sector_correlation["tech"]:
            sector_factor = self._rng.normal(0, self._drift_vol * 0.5)

        # Step 4: Composite return
        composite = (
            0.3 * market_return
            + 0.5 * idio_return
            + 0.2 * sector_factor
        )

        prev_price = state.price

        # Step 5: Apply GBM step
        new_price = prev_price * math.exp(composite)

        # Step 6: Random event spike
        if self._rng.random() < self._event_prob:
            direction = self._rng.choice([-1, 1])
            magnitude = self._rng.uniform(0.015, 0.05)
            new_price *= (1 + direction * magnitude)

        # Step 7: Bound prices
        seed = self._seed_prices.get(ticker, 100.0)
        new_price = max(seed * 0.5, min(seed * 5.0, new_price))

        # Step 8: Update state
        state.price = new_price
        state.high_price = max(state.high_price, new_price)
        state.low_price = min(state.low_price, new_price)
        state.tick_count += 1

        # Step 9: Check for new trading session
        if now.date() != state.session_date:
            state.open_price = new_price
            state.high_price = new_price
            state.low_price = new_price
            state.daily_volume = 0
            state.session_date = now.date()

        results[ticker] = PriceTick(
            ticker=ticker,
            price=round(new_price, 2),
            prev_price=round(prev_price, 2),
            change=round(new_price - prev_price, 2),
            change_pct=round(((new_price - prev_price) / prev_price * 100), 4)
            if prev_price != 0 else 0.0,
            timestamp=now,
        )

    return results
```

---

## `get_historical_bars` Implementation

The simulator generates synthetic intraday OHLC history from the session state:

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
    """
    Generates synthetic minute bars for the current session.
    from_date / to_date are accepted but ignored (simulator always uses today).
    """
    state = self._states.get(ticker)
    if not state:
        return []

    bars = []
    now = datetime.now(tz=UTC)
    session_start = now.replace(hour=9, minute=30, second=0, microsecond=0)
    minutes_elapsed = max(0, int((now - session_start).total_seconds() / 60))

    for i in range(min(limit, minutes_elapsed)):
        bar_time = session_start + timedelta(minutes=i)
        # Simulate OHLC from the session state
        open_ = round(state.price * self._rng.uniform(0.998, 1.002), 2)
        close_ = round(state.price * self._rng.uniform(0.998, 1.002), 2)
        high_ = round(max(open_, close_) * self._rng.uniform(1.0, 1.001), 2)
        low_ = round(min(open_, close_) * self._rng.uniform(0.999, 1.0), 2)
        bars.append(OHLCBar(
            ticker=ticker,
            timestamp=bar_time,
            open=open_,
            high=high_,
            low=low_,
            close=close_,
            volume=int(self._rng.integers(10000, 100000)),
        ))

    return bars
```

> **Note**: The simulator's historical bars are approximate — they are generated on demand to satisfy the charting request, not stored from prior ticks. For a live trading session they will be plausible. After a container restart they start fresh. This is acceptable for a demo/simulation environment.

---

## SSE Integration

The simulator is wrapped by `SSEPoller` exactly like the Massive source:

```python
class SSEPoller:
    def __init__(self, source: MarketDataSource):
        self._source = source
        self._cache: dict[str, PriceTick] = {}
        self._running = False

    async def start(self):
        """Background task: poll every poll_interval seconds."""
        self._running = True
        while self._running:
            try:
                ticks = await self._source.get_latest_prices_async(
                    tickers=list(self._cache.keys())
                )
                async with self._lock:
                    self._cache = ticks
            except Exception as e:
                logger.warning(f"Poller error: {e}")
            await asyncio.sleep(self._source.poll_interval)
```

When the user adds or removes a ticker from the watchlist, the SSEPoller's ticker list is updated:

```python
def set_watchlist(self, tickers: list[str]):
    """Called when the watchlist changes. Reinitializes the cache."""
    for ticker in tickers:
        if ticker not in self._cache:
            self._cache[ticker] = self._source.get_latest_prices([ticker])[ticker]
```

---

## Environment Variables

| Variable | Default | Effect |
|---|---|---|
| `SIMULATOR_VOLATILITY` | per-ticker table | Overrides all tickers with a single σ |
| `SIMULATOR_DRIFT` | 0.00001 | Annual drift μ |
| `SIMULATOR_EVENT_PROBABILITY` | 0.005 | Probability of a random event spike per tick |
| `SIMULATOR_POLL_INTERVAL` | 0.5 | Seconds between simulated ticks |

Example for a calmer demo:

```bash
SIMULATOR_VOLATILITY=0.10 SIMULATOR_EVENT_PROBABILITY=0.001
```

Or for high-drama:

```bash
SIMULATOR_VOLATILITY=0.40 SIMULATOR_EVENT_PROBABILITY=0.02
```

---

## Testing

The simulator must pass these property-based tests:

```python
def test_prices_always_positive():
    sim = SimulatorMarketSource(tickers=["AAPL", "GOOGL"])
    for _ in range(1000):
        ticks = sim.get_latest_prices(["AAPL", "GOOGL"])
        for tick in ticks.values():
            assert tick.price > 0

def test_price_bounded():
    sim = SimulatorMarketSource(tickers=["AAPL"], seed_prices={"AAPL": 100.0})
    for _ in range(10000):
        ticks = sim.get_latest_prices(["AAPL"])
        p = ticks["AAPL"].price
        assert 50.0 <= p <= 500.0   # 0.5x to 5x seed

def test_change_pct_symmetric():
    sim = SimulatorMarketSource(tickers=["AAPL"])
    ups, downs = 0, 0
    for _ in range(10000):
        ticks = sim.get_latest_prices(["AAPL"])
        if ticks["AAPL"].change > 0:
            ups += 1
        elif ticks["AAPL"].change < 0:
            downs += 1
    # Roughly balanced — not too skewed
    assert 0.3 < ups / (ups + downs) < 0.7
```

---

## Summary

The simulator is a self-contained `SimulatorMarketSource` that:
- Conforms to `MarketDataSource` — zero coupling to the rest of the backend
- Uses GBM with per-ticker volatility, sector correlation, and random event spikes
- Tracks running OHLC for the current session
- Is configurable via environment variables for different demo moods
- Can be replaced at runtime by swapping `get_market_source()` — no other code changes needed
