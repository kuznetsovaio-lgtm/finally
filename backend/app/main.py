"""FastAPI entry point for FinAlly."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.market import PriceCache, create_market_data_source
from app.market.stream import _generate_events as _stream_events
from app.routers import portfolio, watchlist, chat, health

logger = logging.getLogger(__name__)

# Static files served from project root (Next.js build output lands here at runtime)
STATIC_DIR = Path(__file__).parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create price cache and market source. Shutdown: stop the source."""
    # Create the shared price cache
    price_cache = PriceCache()
    app.state.price_cache = price_cache

    # Seed initial tickers from the watchlist
    from app.db import get_watchlist
    tickers = [w["ticker"] for w in get_watchlist()]

    # Create and start market source
    source = create_market_data_source(price_cache)
    app.state.market_source = source

    default_tickers = [
        "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA",
        "NVDA", "META", "JPM", "V", "NFLX",
    ]
    active_tickers = tickers if tickers else default_tickers
    await source.start(active_tickers)
    logger.info("Market data source started with tickers: %s", active_tickers)

    yield

    await source.stop()
    logger.info("Market data source stopped")


app = FastAPI(
    title="FinAlly API",
    version="0.1.0",
    lifespan=lifespan,
)

# Include routers
app.include_router(portfolio.router)
app.include_router(watchlist.router)
app.include_router(chat.router)
app.include_router(health.router)

sse_router = APIRouter(prefix="/api/stream", tags=["streaming"])


@sse_router.get("/prices")
async def stream_prices(request: Request):
    price_cache = getattr(request.app.state, "price_cache", None)
    if price_cache is None:
        raise HTTPException(status_code=503, detail="Price cache unavailable")

    return StreamingResponse(
        _stream_events(price_cache, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


app.include_router(sse_router)

# Mount exported Next.js assets where the generated HTML expects them.
if STATIC_DIR.exists():
    next_assets_dir = STATIC_DIR / "_next"
    if next_assets_dir.exists():
        app.mount("/_next", StaticFiles(directory=str(next_assets_dir)), name="next-assets")


@app.get("/")
async def root():
    """Serve the Next.js index.html, or return an API info message."""
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {
        "message": "FinAlly API running. Build the frontend to serve the UI.",
        "docs": "/docs",
    }


@app.get("/{full_path:path}")
async def frontend_asset(full_path: str):
    """Serve exported frontend files from the build output directory."""
    if not STATIC_DIR.exists() or not full_path:
        raise HTTPException(status_code=404, detail="Not found")

    asset_path = (STATIC_DIR / full_path).resolve()
    static_root = STATIC_DIR.resolve()

    if static_root not in asset_path.parents and asset_path != static_root:
        raise HTTPException(status_code=404, detail="Not found")

    if asset_path.is_file():
        return FileResponse(str(asset_path))

    index_path = asset_path / "index.html"
    if index_path.is_file():
        return FileResponse(str(index_path))

    raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
