"""Watchlist management endpoints."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db import get_watchlist, add_to_watchlist, remove_from_watchlist

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


class AddTickerRequest(BaseModel):
    ticker: str


@router.get("")
async def get_watchlist_endpoint(request: Request) -> list[dict]:
    """Return the current watchlist with live prices from the SSE price cache."""
    tickers = get_watchlist()
    cache = request.app.state.price_cache

    result = []
    for ticker in tickers:
        entry = {"ticker": ticker["ticker"], "added_at": ticker["added_at"]}
        price_update = cache.get(ticker["ticker"])
        if price_update:
            entry.update(price_update.to_dict())
        else:
            entry["price"] = None
            entry["change"] = None
            entry["change_percent"] = None
            entry["direction"] = "flat"
        result.append(entry)
    return result


@router.post("")
async def add_ticker_endpoint(req: AddTickerRequest, request: Request) -> dict:
    """Add a ticker to the user's watchlist."""
    ticker = req.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker cannot be empty")

    added = add_to_watchlist(ticker)
    if not added:
        raise HTTPException(status_code=409, detail=f"{ticker} is already in the watchlist")

    # Notify the market data source of the new ticker
    source = getattr(request.app.state, "market_source", None)
    if source:
        try:
            await source.add_ticker(ticker)
        except Exception:
            logger.exception("Failed to add ticker %s to market source", ticker)

    return {"ticker": ticker, "added": True}


@router.delete("/{ticker}")
async def remove_ticker_endpoint(ticker: str, request: Request) -> dict:
    """Remove a ticker from the user's watchlist."""
    ticker = ticker.strip().upper()
    removed = remove_from_watchlist(ticker)
    if not removed:
        raise HTTPException(status_code=404, detail=f"{ticker} not found in watchlist")

    # Remove from the market data source
    source = getattr(request.app.state, "market_source", None)
    if source:
        try:
            await source.remove_ticker(ticker)
        except Exception:
            logger.exception("Failed to remove ticker %s from market source", ticker)

    return {"ticker": ticker, "removed": True}
