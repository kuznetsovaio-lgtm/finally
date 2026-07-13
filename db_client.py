"""Convenience re-exports of the database layer.

Import from here in routers rather than directly from app.db to keep
import paths consistent and easy to find.
"""

from app.db import (
    init_db,
    get_connection,
    # Profile
    get_cash_balance,
    set_cash_balance,
    # Watchlist
    get_watchlist,
    add_to_watchlist,
    remove_from_watchlist,
    # Positions
    get_positions,
    execute_trade,
    # Snapshots
    get_portfolio_history,
    record_portfolio_snapshot,
    # Chat
    get_chat_history,
    add_chat_message,
)

__all__ = [
    "init_db",
    "get_connection",
    "get_cash_balance",
    "set_cash_balance",
    "get_watchlist",
    "add_to_watchlist",
    "remove_from_watchlist",
    "get_positions",
    "execute_trade",
    "get_portfolio_history",
    "record_portfolio_snapshot",
    "get_chat_history",
    "add_chat_message",
]
