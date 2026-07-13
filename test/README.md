# FinAlly E2E Tests

Playwright end-to-end tests for the FinAlly AI Trading Workstation.

## Prerequisites

- Node.js 18+ with npm
- Docker and Docker Compose
- Chromium browser (installed via Playwright)

## Setup

```bash
# Install Playwright test runner
npm install -D @playwright/test

# Install Chromium (or all browsers)
npx playwright install chromium
```

## Running Tests

### Locally (app already running)

Set the `LLM_MOCK=true` environment variable to use mocked LLM responses:

```bash
LLM_MOCK=true npx playwright test
```

### With Docker Compose (production-like, recommended)

This runs the full app container and the Playwright browser service together:

```bash
docker compose -f test/docker-compose.test.yml up --build
```

The test runner starts automatically after the app is healthy.

### Run a single test file

```bash
LLM_MOCK=true npx playwright test tests/00-fresh-start.spec.ts
```

### Run with headed browser (visible)

```bash
LLM_MOCK=true npx playwright test --headed
```

### Run with UI mode

```bash
LLM_MOCK=true npx playwright test --ui
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CI` | unset | When set, retries failed tests and uses `docker compose` web server |
| `LLM_MOCK` | unset | When set to `true`, uses deterministic mock LLM responses |
| `HEADLESS` | unset | When unset, runs headed (visible browser) |

## Test Coverage

| File | What it tests |
|---|---|
| `00-fresh-start.spec.ts` | Default watchlist, $10k balance, live prices, connection dot |
| `01-watchlist.spec.ts` | Add/remove tickers, duplicate rejection |
| `02-trade.spec.ts` | Buy, sell, cash updates, insufficient funds guards |
| `03-portfolio.spec.ts` | Positions table, heatmap, P&L chart, ticker selection |
| `04-chat.spec.ts` | Send messages, receive responses, trade confirmations, loading state |
| `05-sse-reconnect.spec.ts` | SSE disconnection, reconnection, page navigation recovery |

## Troubleshooting

**Tests timeout on prices loading**
- Ensure the app is running at `http://localhost:8000`
- Check the `/api/health` endpoint returns 200

**Chat tests always fail**
- Verify `LLM_MOCK=true` is set — real API calls require a valid `OPENROUTER_API_KEY`

**Docker tests fail to start**
- Ensure ports 8000 and 9323 are not in use
- Run `docker compose -f test/docker-compose.test.yml down` before retrying
