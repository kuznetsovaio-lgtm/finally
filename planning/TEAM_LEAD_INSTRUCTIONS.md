# FinAlly — Team Lead Coordination Notes

## Mission

Build the FinAlly AI Trading Workstation end-to-end. Every team member works from files in `planning/` — this is the shared contract.

## Team

| Agent | Responsibility |
|---|---|
| `frontend` | Next.js frontend (TypeScript, Tailwind, charts, SSE, layout) |
| `backend` | FastAPI app, routes, market source wiring |
| `database` | SQLite schema, init, seed, migrations, all SQL |
| `llm-engineer` | LiteLLM → OpenRouter, structured outputs, chat flow |
| `tester` | Playwright E2E tests, docker-compose.test.yml |
| `devops` | Dockerfile, docker-compose.yml, start/stop scripts |

## Critical Design Decisions Already Made

These are **locked** — do not revisit:

1. **Single container, single port 8000** — FastAPI serves Next.js static export
2. **SSE over WebSockets** — `/api/stream/prices`, EventSource on frontend
3. **SQLite** — `db/finally.db`, lazy init on first request
4. **Market data interface** — `MarketDataSource` ABC with `get_latest_prices()` and `get_historical_bars()`. Simulator default; Massive if `MASSIVE_API_KEY` set
5. **LLM** — LiteLLM via OpenRouter, `openrouter/.../gpt-oss-120b` with Cerebras inference, structured JSON output
6. **Color scheme** — Dark `#0d1117`, Yellow `#ecad0a`, Blue `#209dd7`, Purple `#753991`
7. **No auth** — single user, `user_id="default"` hardcoded

## Team Member Task Files

Each specialist writes their current task and status to `planning/tasks/<name>.md`. Example:

```markdown
# frontend task status

## Current work
Building watchlist component with SSE EventSource

## Done
- Next.js scaffold created
- Tailwind dark theme configured
- Header with portfolio total and connection indicator

## Blocked
- Waiting for backend SSE endpoint URL (backend will write it)

## Notes
```

## Dependency Chain

```
devops
 └── Dockerfile, docker-compose.yml, scripts/
        │
        ▼
database ──► backend ──► llm-engineer (chat endpoint needs backend running)
        │       │
        │       └── frontend (needs backend API routes)
        │
        ▼
tester (needs everything built and running)
```

## Task Assignment

### DevOps (do first, in parallel with database)
- Write `Dockerfile` (multi-stage: Node → Python, single port 8000)
- Write `docker-compose.yml`
- Write `scripts/start_windows.ps1`, `scripts/stop_windows.ps1`
- Write `scripts/start_mac.sh`, `scripts/stop_mac.sh`
- Write `test/docker-compose.test.yml` (base, not tester-specific)
- Write `.env.example`

### Database (do second)
- Write `backend/db/schema.sql` — all tables from PLAN.md
- Write `backend/db/__init__.py` — lazy init: creates schema if empty, seeds default data
- Default tickers: AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, META, JPM, V, NFLX
- Cash balance default: $10,000

### Backend (do third)
- Write `backend/pyproject.toml` with all Python dependencies
- Write `backend/main.py` — FastAPI app, mount static files, include routers
- Write `backend/market/__init__.py` — `get_market_source()` factory
- Write `backend/market/interface.py` — `MarketDataSource` ABC, `PriceTick`, `OHLCBar`
- Write `backend/market/simulator.py` — `SimulatorMarketSource`
- Write `backend/market/massive.py` — `MassiveMarketSource`
- Write `backend/routers/portfolio.py` — `/api/portfolio`, `/api/portfolio/trade`, `/api/portfolio/history`
- Write `backend/routers/watchlist.py` — `/api/watchlist`, POST, DELETE
- Write `backend/routers/chat.py` — `/api/chat`
- Write `backend/routers/stream.py` — `/api/stream/prices` SSE endpoint
- Write `backend/routers/health.py` — `/api/health`
- Write `backend/db_client.py` — SQLite helper (get_connection, all CRUD)
- Start SSE background poller task on startup

### Frontend (after backend skeleton is up)
- Write `frontend/package.json`, `tsconfig.json`, `next.config.ts`
- Write `frontend/tailwind.config.ts` — dark theme, custom colors
- Write `frontend/app/globals.css`
- Write `frontend/app/layout.tsx`
- Write `frontend/app/page.tsx` — main terminal layout
- Write `frontend/components/Header.tsx` — portfolio total, connection dot
- Write `frontend/components/Watchlist.tsx` — grid with flash animations, sparklines
- Write `frontend/components/MainChart.tsx` — large chart for selected ticker
- Write `frontend/components/TradeBar.tsx` — ticker, quantity, buy, sell buttons
- Write `frontend/components/PortfolioHeatmap.tsx` — treemap
- Write `frontend/components/PositionsTable.tsx` — positions table
- Write `frontend/components/PLChart.tsx` — P&L line chart
- Write `frontend/components/ChatPanel.tsx` — chat sidebar
- Write `frontend/hooks/useMarketData.ts` — SSE EventSource hook
- Write `frontend/lib/api.ts` — `/api/*` fetch helpers
- Build with `output: 'export'` for static HTML

### LLM Engineer (after backend routes exist)
- Write `backend/llm/__init__.py`
- Write `backend/llm/client.py` — LiteLLM client setup with cerebras-inference skill
- Write `backend/llm/prompts.py` — system prompt for FinAlly assistant
- Write `backend/llm/schema.py` — structured output JSON schema
- Write `backend/llm/executor.py` — executes trades + watchlist changes from LLM response
- Integrate with `backend/routers/chat.py`

### Tester (after frontend builds and backend runs)
- Write `test/playwright.config.ts`
- Write `test/tests/00-fresh-start.spec.ts` — default watchlist, $10k balance, prices streaming
- Write `test/tests/01-watchlist.spec.ts` — add/remove ticker
- Write `test/tests/02-trade.spec.ts` — buy, sell, cash updates
- Write `test/tests/03-portfolio.spec.ts` — heatmap, positions table, P&L chart
- Write `test/tests/04-chat.spec.ts` — send message, receive response (mocked LLM)
- Write `test/tests/05-sse-reconnect.spec.ts` — disconnect and verify reconnection
- Run tests against the running container, report failures to the responsible agent

## Reporting Protocol

After completing each milestone, the team lead:
1. Reads all `planning/tasks/*.md` status files
2. Identifies the next bottleneck
3. Notifies the relevant agent to unblock
4. If two agents are blocked on each other, decides order and communicates it

## Final Gate

Before marking the project complete, verify:
- `docker compose up --build` succeeds
- Browser opens to `http://localhost:8000` with live prices
- Can buy/sell a stock, balance updates
- SSE reconnects after network blip
- Playwright tests pass in CI mode
