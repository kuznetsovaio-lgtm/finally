"""Execute trades and watchlist changes from an LLM ChatResponse."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from db import (
    add_to_watchlist,
    get_positions,
    get_user,
    record_trade,
    remove_from_watchlist,
    remove_position,
    upsert_position,
    update_cash,
)
from llm.schema import ChatResponse

logger = logging.getLogger(__name__)


@dataclass
class TradeResult:
    ticker: str
    side: str
    quantity: float
    price: float
    success: bool
    error: str | None = None


@dataclass
class WatchlistResult:
    ticker: str
    action: str
    success: bool
    error: str | None = None


@dataclass
class ExecutionResult:
    """Outcome of applying a ChatResponse's actions."""

    trades: list[TradeResult]
    watchlist: list[WatchlistResult]
    errors: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "trades": [vars(r) for r in self.trades],
            "watchlist": [vars(r) for r in self.watchlist],
            "errors": self.errors,
        }


def execute_llm_actions(
    response: ChatResponse,
    price_cache: Any,  # PriceCache — imported lazily to avoid circular import at module level
) -> ExecutionResult:
    """Validate and execute all trades and watchlist changes in a ChatResponse.

    Execution is transactional per-item: each trade or watchlist change is applied
    individually and independently; a failure in one does not roll back another.

    Parameters
    ----------
    response : ChatResponse
        Structured response from the LLM.
    price_cache : PriceCache
        Live in-memory price store. Used to fetch current prices for validation
        and trade execution.

    Returns
    -------
    ExecutionResult
        Lists of executed trades / watchlist changes plus any errors encountered.
    """
    trade_results: list[TradeResult] = []
    watchlist_results: list[WatchlistResult] = []
    errors: list[str] = []

    # --- Pre-fetch live prices for all tickers the LLM wants to trade ---
    tickers_to_fetch = [t.ticker.upper() for t in response.trades]
    live_prices: dict[str, float] = {}

    for ticker in tickers_to_fetch:
        update = price_cache.get(ticker)
        if update is None:
            live_prices[ticker] = 0.0  # will be caught below
        else:
            live_prices[ticker] = update.price

    # --- Fetch current user state ---
    user = get_user()
    cash = user["cash_balance"]

    # Build a quick ticker -> (quantity, avg_cost) map from current positions
    positions = {p["ticker"]: p for p in get_positions()}
    user_id = user["id"]

    # --- Execute each trade ---
    for trade in response.trades:
        ticker = trade.ticker.upper()
        price = live_prices.get(ticker)

        # Validate: ticker must be in the price cache
        if price is None or price == 0.0:
            msg = f"Ticker '{ticker}' is not in the live price feed — cannot execute trade."
            errors.append(msg)
            trade_results.append(
                TradeResult(ticker=ticker, side=trade.side, quantity=trade.quantity, price=0.0, success=False, error=msg)
            )
            continue

        total_cost = round(trade.quantity * price, 2)

        if trade.side == "buy":
            if total_cost > cash:
                msg = (
                    f"Insufficient cash for BUY {trade.quantity} {ticker} @ ${price:.2f}: "
                    f"need ${total_cost:.2f}, have ${cash:.2f}."
                )
                errors.append(msg)
                trade_results.append(
                    TradeResult(ticker=ticker, side="buy", quantity=trade.quantity, price=price, success=False, error=msg)
                )
                continue

            # Deduct cash
            cash -= total_cost
            update_cash(user_id, round(cash, 2))

            # Upsert position (blended average cost)
            existing = positions.get(ticker)
            if existing:
                old_qty = existing["quantity"]
                old_avg = existing["avg_cost"]
                new_qty = old_qty + trade.quantity
                new_avg = round((old_qty * old_avg + trade.quantity * price) / new_qty, 4)
            else:
                new_qty = trade.quantity
                new_avg = round(price, 4)

            upsert_position(ticker, new_qty, new_avg, user_id)
            record_trade(ticker, "buy", trade.quantity, price, user_id)

            # Refresh local position map
            positions[ticker] = {"quantity": new_qty, "avg_cost": new_avg}

            trade_results.append(
                TradeResult(ticker=ticker, side="buy", quantity=trade.quantity, price=price, success=True)
            )

        else:  # sell
            position = positions.get(ticker)
            if not position:
                msg = f"Cannot sell {trade.quantity} {ticker}: no open position found."
                errors.append(msg)
                trade_results.append(
                    TradeResult(ticker=ticker, side="sell", quantity=trade.quantity, price=price, success=False, error=msg)
                )
                continue

            current_qty = position["quantity"]
            if trade.quantity > current_qty:
                msg = (
                    f"Insufficient shares for SELL {trade.quantity} {ticker}: "
                    f"trying to sell more than owned ({current_qty} shares)."
                )
                errors.append(msg)
                trade_results.append(
                    TradeResult(ticker=ticker, side="sell", quantity=trade.quantity, price=price, success=False, error=msg)
                )
                continue

            # Add cash from sale
            cash += total_cost
            update_cash(user_id, round(cash, 2))

            new_qty = round(current_qty - trade.quantity, 6)
            avg_cost = position["avg_cost"]

            if new_qty <= 1e-9:  # effectively zero — remove position
                remove_position(ticker, user_id)
                positions.pop(ticker, None)
            else:
                upsert_position(ticker, new_qty, avg_cost, user_id)
                positions[ticker] = {"quantity": new_qty, "avg_cost": avg_cost}

            record_trade(ticker, "sell", trade.quantity, price, user_id)

            trade_results.append(
                TradeResult(ticker=ticker, side="sell", quantity=trade.quantity, price=price, success=True)
            )

    # --- Execute watchlist changes ---
    for change in response.watchlist_changes:
        ticker = change.ticker.upper()

        if change.action == "add":
            try:
                add_to_watchlist(ticker, user_id)
                watchlist_results.append(
                    WatchlistResult(ticker=ticker, action="add", success=True)
                )
            except Exception as exc:  # pragma: no cover — SQLite upsert is safe but guard anyway
                msg = f"Failed to add '{ticker}' to watchlist: {exc}"
                errors.append(msg)
                watchlist_results.append(
                    WatchlistResult(ticker=ticker, action="add", success=False, error=msg)
                )

        elif change.action == "remove":
            try:
                remove_from_watchlist(ticker, user_id)
                watchlist_results.append(
                    WatchlistResult(ticker=ticker, action="remove", success=True)
                )
            except Exception as exc:
                msg = f"Failed to remove '{ticker}' from watchlist: {exc}"
                errors.append(msg)
                watchlist_results.append(
                    WatchlistResult(ticker=ticker, action="remove", success=False, error=msg)
                )

        else:
            msg = f"Unknown watchlist action '{change.action}' for '{ticker}' — ignored."
            errors.append(msg)

    return ExecutionResult(trades=trade_results, watchlist=watchlist_results, errors=errors)
