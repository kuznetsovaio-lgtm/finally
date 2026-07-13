"""Database layer re-export for app.routers compatibility.

The actual implementation lives at db. This module exists so that
imports like `from app.db import get_watchlist` continue to work without
requiring every router to use the top-level project import path.
"""

from db import (
    init_db,
    get_connection,
    get_user,
    get_cash_balance,
    update_cash,
    get_watchlist,
    add_to_watchlist,
    remove_from_watchlist,
    get_positions,
    upsert_position,
    remove_position,
    execute_trade,
    get_trades,
    record_snapshot,
    record_portfolio_snapshot,
    get_snapshots,
    get_portfolio_history,
    add_chat_message,
    get_chat_history,
)

__all__ = [
    "init_db",
    "get_connection",
    "get_user",
    "get_cash_balance",
    "update_cash",
    "get_watchlist",
    "add_to_watchlist",
    "remove_from_watchlist",
    "get_positions",
    "upsert_position",
    "remove_position",
    "execute_trade",
    "get_trades",
    "record_snapshot",
    "record_portfolio_snapshot",
    "get_snapshots",
    "get_portfolio_history",
    "add_chat_message",
    "get_chat_history",
]
