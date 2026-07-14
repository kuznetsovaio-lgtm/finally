"""Pydantic schemas for LLM chat interaction."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class TradeAction(BaseModel):
    """A single trade to execute on behalf of the user."""

    ticker: str
    side: Literal["buy", "sell"]
    quantity: float


class WatchlistChange(BaseModel):
    """A single watchlist modification to apply."""

    ticker: str
    action: Literal["add", "remove"]


class ChatResponse(BaseModel):
    """Structured response from the LLM.

    Attributes
    ----------
    message : str
        Conversational reply shown to the user.
    trades : list[TradeAction]
        Trades to auto-execute. Empty if none requested.
    watchlist_changes : list[WatchlistChange]
        Watchlist adds/removes to apply. Empty if none requested.
    """

    message: str
    trades: list[TradeAction] = Field(default_factory=list)
    watchlist_changes: list[WatchlistChange] = Field(default_factory=list)
