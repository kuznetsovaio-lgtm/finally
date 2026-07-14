# database — task status

## Current work
All files written and verified.

## Done
- `backend/db/schema.sql` — all 6 tables with CHECK constraints and UNIQUE constraints
- `backend/db/__init__.py` — full lazy init, all helper functions, seed data

## Blocked
- None

## Instructions
Read `planning/TEAM_LEAD_INSTRUCTIONS.md` for full context. Write all files listed under "Database" in that doc.

## Schema Requirements (from PLAN.md)

Tables (all with `user_id TEXT DEFAULT 'default'`):

1. **users_profile** — `id` PK, `cash_balance` REAL DEFAULT 10000.0, `created_at` TEXT
2. **watchlist** — `id` PK (UUID), `user_id`, `ticker` TEXT, `added_at` TEXT, UNIQUE(user_id, ticker)
3. **positions** — `id` PK (UUID), `user_id`, `ticker` TEXT, `quantity` REAL, `avg_cost` REAL, `updated_at` TEXT, UNIQUE(user_id, ticker)
4. **trades** — `id` PK (UUID), `user_id`, `ticker` TEXT, `side` TEXT ('buy'/'sell'), `quantity` REAL, `price` REAL, `executed_at` TEXT
5. **portfolio_snapshots** — `id` PK (UUID), `user_id`, `total_value` REAL, `recorded_at` TEXT
6. **chat_messages** — `id` PK (UUID), `user_id`, `role` TEXT ('user'/'assistant'), `content` TEXT, `actions` TEXT (JSON or null), `created_at` TEXT

## Default seed data
- users_profile: id='default', cash_balance=10000.0
- watchlist: AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, META, JPM, V, NFLX

## Lazy init logic
- `backend/db/__init__.py` checks if `db/finally.db` exists and has tables
- If not, creates schema and seeds default data
- Exposes `get_connection()` returning a `sqlite3.Connection`
- Exposes helper functions: `get_user()`, `upsert_watchlist()`, `get_watchlist()`, `get_positions()`, `execute_trade()`, `get_trades()`, `record_snapshot()`, `get_snapshots()`, `save_chat_message()`, `get_chat_history()`

## Files to create
- `backend/db/schema.sql`
- `backend/db/__init__.py`
