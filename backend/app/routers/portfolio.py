"""Portfolio management endpoints."""

from __future__ import annotations

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db import (
    execute_trade,
    get_positions,
    get_cash_balance,
    record_portfolio_snapshot,
    get_portfolio_history,
    get_watchlist,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class TradeRequest(BaseModel):
    ticker: str
    quantity: float
    side: str  # "buy" or "sell"


class PositionResponse(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float
    current_price: float | None
    unrealized_pnl: float | None
    change_pct: float | None


class PortfolioResponse(BaseModel):
    cash: float
    positions: list[PositionResponse]
    total_value: float


class PortfolioHistoryResponse(BaseModel):
    snapshots: list[dict]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=PortfolioResponse)
async def get_portfolio(request: Request) -> PortfolioResponse:
    """Return the current portfolio state: cash, positions, and total value.

    Uses the live price cache for current prices.
    """
    cache = request.app.state.price_cache
    cash = get_cash_balance()
    positions_db = get_positions()

    positions: list[PositionResponse] = []
    positions_value = 0.0

    for pos in positions_db:
        ticker = pos["ticker"]
        price_update = cache.get(ticker)
        current_price = price_update.price if price_update else None

        unrealized_pnl = None
        change_pct = None
        if current_price is not None:
            unrealized_pnl = round((current_price - pos["avg_cost"]) * pos["quantity"], 2)
            change_pct = round((current_price - pos["avg_cost"]) / pos["avg_cost"] * 100, 2)
            positions_value += current_price * pos["quantity"]

        positions.append(PositionResponse(
            ticker=ticker,
            quantity=pos["quantity"],
            avg_cost=pos["avg_cost"],
            current_price=current_price,
            unrealized_pnl=unrealized_pnl,
            change_pct=change_pct,
        ))

    total_value = round(cash + positions_value, 2)

    return PortfolioResponse(
        cash=round(cash, 2),
        positions=positions,
        total_value=total_value,
    )


@router.post("/trade")
async def trade_endpoint(req: TradeRequest, request: Request) -> dict:
    """Execute a market order: buy or sell shares at the current price.

    Returns the executed trade details and updated cash balance.
    """
    ticker = req.ticker.strip().upper()
    quantity = float(req.quantity)
    side = req.side.strip().lower()

    if side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="side must be 'buy' or 'sell'")
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")
    if not ticker:
        raise HTTPException(status_code=400, detail="ticker cannot be empty")

    cache = request.app.state.price_cache
    price_update = cache.get(ticker)
    if price_update is None:
        raise HTTPException(status_code=404, detail=f"No live price available for {ticker}")

    price = price_update.price

    # Validate: sufficient cash for buy, sufficient shares for sell
    if side == "buy":
        required = round(price * quantity, 2)
        cash = get_cash_balance()
        if required > cash:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient cash: required ${required:.2f}, available ${cash:.2f}",
            )
    else:  # sell
        positions = get_positions()
        position = next((p for p in positions if p["ticker"] == ticker), None)
        if position is None:
            raise HTTPException(status_code=400, detail=f"No position to sell for {ticker}")
        if position["quantity"] < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient shares: requested {quantity}, owned {position['quantity']}",
            )

    # Execute the trade in the database
    trade = execute_trade(ticker=ticker, quantity=quantity, price=price, side=side)
    if not trade:
        raise HTTPException(status_code=500, detail="Trade execution failed")

    new_cash = get_cash_balance()

    # Record a portfolio snapshot immediately after the trade
    try:
        positions_after = get_positions()
        positions_value = 0.0
        for pos in positions_after:
            pu = cache.get(pos["ticker"])
            if pu:
                positions_value += pu.price * pos["quantity"]
        total_value = new_cash + positions_value
        record_portfolio_snapshot(total_value)
    except Exception:
        logger.exception("Failed to record portfolio snapshot after trade")

    return {
        "success": True,
        "trade": {
            "id": trade["id"],
            "ticker": trade["ticker"],
            "side": trade["side"],
            "quantity": trade["quantity"],
            "price": trade["price"],
            "executed_at": trade["executed_at"],
        },
        "new_cash": round(new_cash, 2),
    }


@router.get("/history", response_model=PortfolioHistoryResponse)
async def portfolio_history_endpoint() -> PortfolioHistoryResponse:
    """Return portfolio value snapshots for the P&L chart."""
    snapshots = get_portfolio_history(limit=500)
    return PortfolioHistoryResponse(snapshots=snapshots)
