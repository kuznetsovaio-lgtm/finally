"""Database layer for FinAlly — SQLite with lazy initialization."""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any

# Resolve DB path: allow override via DB_DIR env var, else fall back to /app/db
_DB_DIR = Path(os.environ.get("DB_DIR", "/app/db"))
_DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = _DB_DIR / "finally.db"

_ENSURED = False  # module-level guard for one-shot init


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

def get_connection() -> sqlite3.Connection:
    """Return a thread-safe SQLite connection."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# Lazy initialization
# ---------------------------------------------------------------------------

def init_db() -> None:
    """
    Create schema and seed default data if the database is empty.

    Safe to call repeatedly — uses CREATE TABLE IF NOT EXISTS and
    INSERT OR IGNORE so it is idempotent.
    """
    global _ENSURED
    if _ENSURED:
        return

    schema_path = Path(__file__).parent / "schema.sql"
    conn = get_connection()
    try:
        # Create schema
        conn.executescript(schema_path.read_text(encoding="utf-8"))
        conn.commit()

        # Seed default user
        conn.execute(
            """
            INSERT OR IGNORE INTO users_profile (id, cash_balance)
            VALUES ('default', 10000.0)
            """
        )

        # Seed default watchlist
        default_tickers = [
            "AAPL", "GOOGL", "MSFT", "AMZN",
            "TSLA", "NVDA", "META", "JPM",
            "V", "NFLX",
        ]
        for ticker in default_tickers:
            conn.execute(
                """
                INSERT OR IGNORE INTO watchlist (id, user_id, ticker)
                VALUES (?, 'default', ?)
                """,
                (uuid.uuid4().hex, ticker),
            )

        conn.commit()
    finally:
        conn.close()

    _ENSURED = True


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

def get_user(user_id: str = "default") -> dict[str, Any] | None:
    """Return the user row as a dict, or None if not found."""
    init_db()
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM users_profile WHERE id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_cash(user_id: str, new_balance: float) -> None:
    """Update a user's cash balance."""
    init_db()
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
            (new_balance, user_id),
        )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Watchlist
# ---------------------------------------------------------------------------

def get_watchlist(user_id: str = "default") -> list[dict[str, Any]]:
    """Return all watchlist rows for the user as list of dicts."""
    init_db()
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, ticker, added_at FROM watchlist "
            "WHERE user_id = ? ORDER BY added_at ASC",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def add_to_watchlist(ticker: str, user_id: str = "default") -> bool:
    """
    Add a ticker to the user's watchlist.

    Returns True if the ticker was newly added, False if it was already present.
    """
    init_db()
    conn = get_connection()
    try:
        # Check before inserting to determine if it was new
        existing = conn.execute(
            "SELECT id FROM watchlist WHERE user_id = ? AND ticker = ?",
            (user_id, ticker.upper()),
        ).fetchone()
        if existing:
            return False  # already present
        conn.execute(
            """
            INSERT INTO watchlist (id, user_id, ticker)
            VALUES (?, ?, ?)
            """,
            (uuid.uuid4().hex, user_id, ticker.upper()),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def remove_from_watchlist(ticker: str, user_id: str = "default") -> bool:
    """Remove a ticker from the user's watchlist. Returns True if removed."""
    init_db()
    conn = get_connection()
    try:
        before = conn.execute(
            "SELECT id FROM watchlist WHERE user_id = ? AND ticker = ?",
            (user_id, ticker.upper()),
        ).fetchone()
        if not before:
            return False
        conn.execute(
            "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?",
            (user_id, ticker.upper()),
        )
        conn.commit()
        return True
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Positions
# ---------------------------------------------------------------------------

def get_positions(user_id: str = "default") -> list[dict[str, Any]]:
    """Return all position rows for the user."""
    init_db()
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT ticker, quantity, avg_cost, updated_at FROM positions "
            "WHERE user_id = ? ORDER BY ticker ASC",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def upsert_position(
    ticker: str,
    quantity: float,
    avg_cost: float,
    user_id: str = "default",
) -> None:
    """Insert or update a position (replaces quantity and avg_cost)."""
    init_db()
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(user_id, ticker)
            DO UPDATE SET quantity = excluded.quantity,
                           avg_cost   = excluded.avg_cost,
                           updated_at = excluded.updated_at
            """,
            (uuid.uuid4().hex, user_id, ticker.upper(), quantity, avg_cost),
        )
        conn.commit()
    finally:
        conn.close()


def remove_position(ticker: str, user_id: str = "default") -> None:
    """Delete a position entirely (quantity reached zero)."""
    init_db()
    conn = get_connection()
    try:
        conn.execute(
            "DELETE FROM positions WHERE user_id = ? AND ticker = ?",
            (user_id, ticker.upper()),
        )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Trades
# ---------------------------------------------------------------------------

def record_trade(
    ticker: str,
    side: str,
    quantity: float,
    price: float,
    user_id: str = "default",
) -> dict[str, Any]:
    """
    Insert an append-only trade record.

    Returns the inserted row dict.
    """
    init_db()
    conn = get_connection()
    try:
        trade_id = uuid.uuid4().hex
        conn.execute(
            """
            INSERT INTO trades (id, user_id, ticker, side, quantity, price)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (trade_id, user_id, ticker.upper(), side, quantity, price),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM trades WHERE id = ?", (trade_id,)
        ).fetchone()
        return dict(row) if row else {}
    finally:
        conn.close()


def get_trades(user_id: str = "default", limit: int = 100) -> list[dict[str, Any]]:
    """Return recent trades, most-recent last (chronological order)."""
    init_db()
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM trades WHERE user_id = ? "
            "ORDER BY executed_at ASC LIMIT ?",
            (user_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Portfolio snapshots
# ---------------------------------------------------------------------------

def record_snapshot(total_value: float, user_id: str = "default") -> dict[str, Any]:
    """Record a portfolio value snapshot. Returns the row dict."""
    init_db()
    conn = get_connection()
    try:
        snap_id = uuid.uuid4().hex
        conn.execute(
            """
            INSERT INTO portfolio_snapshots (id, user_id, total_value)
            VALUES (?, ?, ?)
            """,
            (snap_id, user_id, total_value),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM portfolio_snapshots WHERE id = ?", (snap_id,)
        ).fetchone()
        return dict(row) if row else {}
    finally:
        conn.close()


def get_snapshots(
    user_id: str = "default", limit: int = 500
) -> list[dict[str, Any]]:
    """Return portfolio snapshots, oldest first."""
    init_db()
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM portfolio_snapshots WHERE user_id = ? "
            "ORDER BY recorded_at ASC LIMIT ?",
            (user_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Chat messages
# ---------------------------------------------------------------------------

def save_chat_message(
    role: str,
    content: str,
    actions: str | None,
    user_id: str = "default",
) -> dict[str, Any]:
    """
    Insert a chat message row.

    ``actions`` should be a JSON string (from json.dumps) or None.
    Returns the inserted row dict.
    """
    init_db()
    conn = get_connection()
    try:
        msg_id = uuid.uuid4().hex
        conn.execute(
            """
            INSERT INTO chat_messages (id, user_id, role, content, actions)
            VALUES (?, ?, ?, ?, ?)
            """,
            (msg_id, user_id, role, content, actions),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM chat_messages WHERE id = ?", (msg_id,)
        ).fetchone()
        return dict(row) if row else {}
    finally:
        conn.close()


def get_chat_history(
    user_id: str = "default", limit: int = 20
) -> list[dict[str, Any]]:
    """Return recent chat messages, oldest first."""
    init_db()
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM chat_messages WHERE user_id = ? "
            "ORDER BY created_at ASC LIMIT ?",
            (user_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Convenience wrappers (routers use these names for clarity)
# ---------------------------------------------------------------------------

def get_cash_balance(user_id: str = "default") -> float:
    """Return the user's cash balance."""
    user = get_user(user_id)
    return user["cash_balance"] if user else 10000.0


def set_cash_balance(balance: float, user_id: str = "default") -> None:
    """Update the user's cash balance."""
    update_cash(user_id, balance)


def execute_trade(
    ticker: str,
    quantity: float,
    price: float,
    side: str,
    user_id: str = "default",
) -> dict[str, Any]:
    """
    Execute a buy or sell trade and update positions and cash atomically.

    Returns the trade record dict.
    """
    init_db()
    conn = get_connection()
    try:
        if side == "buy":
            # Deduct cash
            user = get_user(user_id)
            new_balance = user["cash_balance"] - price * quantity
            conn.execute(
                "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
                (new_balance, user_id),
            )
            # Upsert position
            existing = conn.execute(
                "SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
                (user_id, ticker.upper()),
            ).fetchone()
            if existing:
                old_qty, old_avg = existing
                new_qty = old_qty + quantity
                new_avg = (old_qty * old_avg + quantity * price) / new_qty
                conn.execute(
                    """
                    UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = datetime('now')
                    WHERE user_id = ? AND ticker = ?
                    """,
                    (new_qty, new_avg, user_id, ticker.upper()),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (uuid.uuid4().hex, user_id, ticker.upper(), quantity, price),
                )
        elif side == "sell":
            # Add cash
            user = get_user(user_id)
            new_balance = user["cash_balance"] + price * quantity
            conn.execute(
                "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
                (new_balance, user_id),
            )
            # Update position
            existing = conn.execute(
                "SELECT quantity FROM positions WHERE user_id = ? AND ticker = ?",
                (user_id, ticker.upper()),
            ).fetchone()
            if existing:
                remaining = existing["quantity"] - quantity
                if remaining <= 1e-9:
                    conn.execute(
                        "DELETE FROM positions WHERE user_id = ? AND ticker = ?",
                        (user_id, ticker.upper()),
                    )
                else:
                    conn.execute(
                        """
                        UPDATE positions SET quantity = ?, updated_at = datetime('now')
                        WHERE user_id = ? AND ticker = ?
                        """,
                        (remaining, user_id, ticker.upper()),
                    )
        else:
            raise ValueError(f"Invalid side: {side}")

        conn.commit()

        # Record the trade
        trade_id = uuid.uuid4().hex
        conn.execute(
            """
            INSERT INTO trades (id, user_id, ticker, side, quantity, price)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (trade_id, user_id, ticker.upper(), side, quantity, price),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM trades WHERE id = ?", (trade_id,)
        ).fetchone()
        return dict(row) if row else {}
    finally:
        conn.close()


def record_portfolio_snapshot(total_value: float, user_id: str = "default") -> dict:
    """Record a portfolio value snapshot. Returns the row dict."""
    return record_snapshot(total_value, user_id)


def get_portfolio_history(user_id: str = "default", limit: int = 500) -> list[dict]:
    """Return portfolio snapshots formatted for the API. Returns list of {total_value, recorded_at}."""
    rows = get_snapshots(user_id, limit)
    return [{"total_value": r["total_value"], "recorded_at": r["recorded_at"]} for r in rows]


def add_chat_message(
    role: str,
    content: str,
    actions: str | None = None,
    user_id: str = "default",
) -> dict:
    """Store a chat message. Returns the row dict."""
    return save_chat_message(role, content, actions, user_id)
