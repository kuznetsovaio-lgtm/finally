"""Chat endpoint with LLM integration."""

from __future__ import annotations

import logging
import uuid
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db import (
    get_cash_balance,
    get_positions,
    get_watchlist,
    execute_trade,
    add_to_watchlist,
    remove_from_watchlist,
    add_chat_message,
)
from app.routers import llm as llm_module

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class TradeSpec(BaseModel):
    ticker: str
    side: str
    quantity: float


class WatchlistChangeSpec(BaseModel):
    ticker: str
    action: str  # "add" or "remove"


class ChatResponse(BaseModel):
    message: str
    trades: list[dict]
    watchlist_changes: list[dict]


@router.post("", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, request: Request) -> ChatResponse:
    """Process a user message through the LLM, auto-execute approved actions."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    cache = request.app.state.price_cache

    # Load portfolio context
    cash = get_cash_balance()
    positions = get_positions()
    watchlist_rows = get_watchlist()
    watchlist_tickers = [w["ticker"] for w in watchlist_rows]

    live_prices: dict[str, dict] = {}
    for w in watchlist_rows:
        pu = cache.get(w["ticker"])
        if pu:
            live_prices[w["ticker"]] = pu.to_dict()

    positions_value = sum(
        (live_prices.get(p["ticker"], {}).get("price", p["avg_cost"]) * p["quantity"])
        for p in positions
    )
    portfolio_value = cash + positions_value

    portfolio_context = llm_module.build_context(
        cash=cash,
        positions=positions,
        watchlist=watchlist_tickers,
        live_prices=live_prices,
        portfolio_value=portfolio_value,
    )

    # Load chat history (last 20 turns)
    from app.db import get_chat_history
    history = get_chat_history(limit=40)  # 20 turns = 40 messages

    # Call the LLM
    result = llm_module.chat_complete(
        user_message=req.message,
        chat_history=history,
        portfolio_context=portfolio_context,
    )

    message_text = result.get("message", "")
    trades = result.get("trades", [])
    watchlist_changes = result.get("watchlist_changes", [])

    executed_trades: list[dict] = []
    executed_watchlist: list[dict] = []

    # Auto-execute trades
    for t in trades:
        ticker = t.get("ticker", "").strip().upper()
        side = t.get("side", "").lower()
        quantity = float(t.get("quantity", 0))

        if not ticker or side not in ("buy", "sell") or quantity <= 0:
            logger.warning("Skipping invalid trade spec: %s", t)
            continue

        price_update = cache.get(ticker)
        if price_update is None:
            logger.warning("No live price for %s, skipping trade", ticker)
            continue

        price = price_update.price

        if side == "buy":
            required = round(price * quantity, 2)
            if required > get_cash_balance():
                logger.warning("Insufficient cash for %s buy of %s shares", ticker, quantity)
                continue
        else:
            positions_now = get_positions()
            pos = next((p for p in positions_now if p["ticker"] == ticker), None)
            if pos is None or pos["quantity"] < quantity:
                logger.warning("Insufficient shares for %s sell of %s shares", ticker, quantity)
                continue

        trade = execute_trade(ticker=ticker, quantity=quantity, price=price, side=side)
        if trade:
            executed_trades.append({
                "id": trade["id"],
                "ticker": trade["ticker"],
                "side": trade["side"],
                "quantity": trade["quantity"],
                "price": trade["price"],
                "executed_at": trade["executed_at"],
            })
            logger.info("Chat executed trade: %s %s %s @ $%s", side, quantity, ticker, price)

    # Auto-execute watchlist changes
    for wc in watchlist_changes:
        ticker = wc.get("ticker", "").strip().upper()
        action = wc.get("action", "").lower()

        if not ticker or action not in ("add", "remove"):
            logger.warning("Skipping invalid watchlist change spec: %s", wc)
            continue

        if action == "add":
            added = add_to_watchlist(ticker)
            if added:
                executed_watchlist.append({"ticker": ticker, "action": "add"})
                source = getattr(request.app.state, "market_source", None)
                if source:
                    try:
                        await source.add_ticker(ticker)
                    except Exception:
                        logger.exception("Failed to add %s to market source", ticker)
        else:
            removed = remove_from_watchlist(ticker)
            if removed:
                executed_watchlist.append({"ticker": ticker, "action": "remove"})
                source = getattr(request.app.state, "market_source", None)
                if source:
                    try:
                        await source.remove_ticker(ticker)
                    except Exception:
                        logger.exception("Failed to remove %s from market source", ticker)

    # Store the message and response in chat history
    msg_id = str(uuid.uuid4())
    actions_json = None
    if executed_trades or executed_watchlist:
        import json as _json
        actions_json = _json.dumps({
            "trades": executed_trades,
            "watchlist_changes": executed_watchlist,
        })
    add_chat_message(role="user", content=req.message)
    add_chat_message(role="assistant", content=message_text, actions=actions_json)

    return ChatResponse(
        message=message_text,
        trades=executed_trades,
        watchlist_changes=executed_watchlist,
    )
