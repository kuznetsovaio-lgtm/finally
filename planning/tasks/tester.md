# tester — task status

## Current work
Waiting for the app to be built and running so tests can execute. Monitoring other agents.

## Done
- `test/playwright.config.ts`
- `test/tests/00-fresh-start.spec.ts`
- `test/tests/01-watchlist.spec.ts`
- `test/tests/02-trade.spec.ts`
- `test/tests/03-portfolio.spec.ts`
- `test/tests/04-chat.spec.ts`
- `test/tests/05-sse-reconnect.spec.ts`
- `test/README.md`
- `test/docker-compose.test.yml`

## Blocked
- Waiting for app to be built and running before tests can execute.

## Instructions
Read `planning/TEAM_LEAD_INSTRUCTIONS.md` for full context. Write all files listed under "Tester" in that doc.

## Approach
While waiting for the app to be built:
1. Read all `planning/tasks/*.md` status files
2. Read `planning/PLAN.md` in full
3. Design the Playwright test scenarios in detail
4. Write `test/playwright.config.ts` and the test spec files (they can be written before the app is ready — they just won't pass until the app runs)

## Test Scenarios

### `00-fresh-start.spec.ts`
- Navigate to `http://localhost:8000`
- Verify: 10 default tickers visible, $10,000 balance shown, prices are updating (wait 2s, check price changed)
- Verify: connection indicator is green

### `01-watchlist.spec.ts`
- Remove a ticker from the watchlist
- Verify: ticker disappears from watchlist grid
- Add a new ticker (e.g. AMD)
- Verify: ticker appears with live price

### `02-trade.spec.ts`
- Buy 10 shares of AAPL
- Verify: cash decreases by ~10 × AAPL price, position appears in positions table
- Sell 5 shares of AAPL
- Verify: cash increases by ~5 × AAPL price, position quantity decreases
- Try to sell more shares than owned → should show error or prevent sale

### `03-portfolio.spec.ts`
- Buy several different tickers
- Verify: heatmap renders with colored rectangles (green=profit, red=loss)
- Verify: positions table shows all positions with correct P&L
- Verify: P&L chart shows data points (wait for snapshots)

### `04-chat.spec.ts` (mocked LLM)
- Send message: "What is my portfolio worth?"
- Verify: response appears with text content
- Send message: "Buy 5 shares of NVDA"
- Verify: trade confirmation shown inline

### `05-sse-reconnect.spec.ts`
- Navigate to app, wait for prices to appear
- Simulate disconnect (browser DevTools → Network → offline)
- Wait 3 seconds, restore connection
- Verify: prices resume streaming, no crash

## Environment
- `LLM_MOCK=true` in test environment
- App runs in Docker at `http://localhost:8000`
- Playwright runs against the container or `http://host.docker.internal:8000`

## Files to create
- `test/playwright.config.ts`
- `test/tests/00-fresh-start.spec.ts`
- `test/tests/01-watchlist.spec.ts`
- `test/tests/02-trade.spec.ts`
- `test/tests/03-portfolio.spec.ts`
- `test/tests/04-chat.spec.ts`
- `test/tests/05-sse-reconnect.spec.ts`
