# backend — task status

## Current work
All files written and verified.

## Done
- `backend/pyproject.toml`
- `backend/app/main.py` — FastAPI lifespan, router registration
- `backend/app/market/__init__.py` + factory
- `backend/app/market/interface.py` — ABC + types
- `backend/app/market/cache.py` — Thread-safe PriceCache
- `backend/app/market/models.py` — PriceUpdate dataclass
- `backend/app/market/simulator.py` — GBM simulator
- `backend/app/market/massive_client.py` — Massive REST client
- `backend/app/market/stream.py` — SSE endpoint
- `backend/app/routers/portfolio.py`
- `backend/app/routers/watchlist.py`
- `backend/app/routers/chat.py`
- `backend/app/routers/health.py`
- `backend/app/routers/llm.py` — bridge to backend.llm
- `backend/app/db/__init__.py` — re-export from backend.db
- `backend/db_client.py`

## Blocked
- None

## Instructions
Read `planning/TEAM_LEAD_INSTRUCTIONS.md` for full context. Write all files listed under "Backend" in that doc.

## Dependencies to include in pyproject.toml
- `fastapi`
- `uvicorn[standard]`
- `httpx`
- `pydantic`
- `python-dotenv`
- `litellm` (for LLM calls — though LLM engineer owns the client, backend needs the import)
- `pytest` + `pytest-asyncio` (dev)

## Market source wiring
`backend/market/__init__.py` exports `get_market_source()`. Import this from `backend/db/__init__.py` for the db client (no cycle — db does NOT import market).

## SSE poller
Run as a `asyncio.create_task` on FastAPI startup via lifespan context manager:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    source = get_market_source()
    poller = SSEPoller(source)
    asyncio.create_task(poller.start())
    app.state.poller = poller
    yield
    poller.stop()
```

## Files to create
- `backend/pyproject.toml`
- `backend/main.py`
- `backend/market/__init__.py`
- `backend/market/interface.py`
- `backend/market/simulator.py`
- `backend/market/massive.py`
- `backend/routers/portfolio.py`
- `backend/routers/watchlist.py`
- `backend/routers/chat.py`
- `backend/routers/stream.py`
- `backend/routers/health.py`
- `backend/db_client.py`
