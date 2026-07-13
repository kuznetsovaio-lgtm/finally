"""LLM integration for FinAlly chat — LiteLLM via OpenRouter / Cerebras."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import litellm

logger = logging.getLogger(__name__)

# Model: Cerebras via OpenRouter
MODEL = "openrouter/openai/gpt-oss-120b"


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are FinAlly, an AI trading assistant embedded in a stock trading workstation.

You have access to the user's live portfolio data. You can:
- Analyze portfolio composition, risk concentration, and P&L
- Suggest trades with clear reasoning
- Execute trades when the user asks or agrees (no confirmation needed — it's a simulation)
- Add or remove tickers from the watchlist
- Answer questions about specific stocks or the market

Always respond with valid JSON matching this schema:
{
  "message": "Your conversational response to the user",
  "trades": [{"ticker": "AAPL", "side": "buy", "quantity": 10}],
  "watchlist_changes": [{"ticker": "PYPL", "action": "add"}]
}

- `message` (required): plain text reply shown to the user
- `trades` (optional): trades to execute automatically. Each is validated: buys require sufficient cash, sells require sufficient shares. Invalid trades are silently skipped.
- `watchlist_changes` (optional): watchlist modifications. `action` is "add" or "remove".

Be concise, data-driven, and professional. Do not hallucinate prices — use the provided live prices only.
"""


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------

def build_context(
    cash: float,
    positions: list[dict],
    watchlist: list[str],
    live_prices: dict[str, dict],
    portfolio_value: float,
) -> str:
    """Build the portfolio context string injected into every chat prompt."""
    lines = ["## Portfolio Context"]
    lines.append(f"Cash: ${cash:,.2f}")
    lines.append(f"Total Portfolio Value: ${portfolio_value:,.2f}")
    lines.append("")
    if positions:
        lines.append("Positions:")
        for pos in positions:
            ticker = pos["ticker"]
            pu = live_prices.get(ticker)
            current = pu["price"] if pu else pos.get("avg_cost", 0)
            pnl = round((current - pos["avg_cost"]) * pos["quantity"], 2) if current else 0
            pct = (
                round((current - pos["avg_cost"]) / pos["avg_cost"] * 100, 2)
                if current and pos["avg_cost"]
                else 0
            )
            lines.append(
                f"  {ticker}: {pos['quantity']} shares @ avg ${pos['avg_cost']:.2f} "
                f"→ current ${current:.2f} | P&L ${pnl:.2f} ({pct:+.2f}%)"
            )
    else:
        lines.append("Positions: (none)")
    lines.append("")
    lines.append(f"Watchlist: {', '.join(watchlist) if watchlist else '(empty)'}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def parse_llm_response(raw: str) -> dict[str, Any]:
    """Parse JSON from the LLM response. Falls back gracefully on malformed output."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown fences or raw text
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {
            "message": raw.strip() or "I'm sorry, I couldn't process that request.",
            "trades": [],
            "watchlist_changes": [],
        }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def chat_complete(
    user_message: str,
    chat_history: list[dict],
    portfolio_context: str,
) -> dict[str, Any]:
    """Call the LLM via LiteLLM / OpenRouter / Cerebras and return parsed JSON."""

    # Mock mode for testing / development
    if os.environ.get("LLM_MOCK", "false").lower() in ("true", "1", "yes"):
        return {
            "message": f"(Mock) You said: {user_message}. This is a simulated LLM response.",
            "trades": [],
            "watchlist_changes": [],
        }

    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": "Remember: always respond with valid JSON."},
    ]

    if portfolio_context:
        messages.insert(1, {"role": "system", "content": portfolio_context})

    # Append conversation history (last 20 turns = 40 messages)
    for entry in chat_history[-40:]:
        role = entry.get("role", "user")
        content = entry.get("content", "")
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})

    try:
        response = litellm.completion(
            model=MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        raw = response.choices[0].message.content or ""
        return parse_llm_response(raw)
    except Exception as e:
        logger.exception("LLM call failed: %s", e)
        return {
            "message": (
                "I'm sorry, I'm having trouble connecting to the AI service right now. "
                "Please try again."
            ),
            "trades": [],
            "watchlist_changes": [],
        }


# ---------------------------------------------------------------------------
# Re-export for convenience
# ---------------------------------------------------------------------------

ChatResponse = dict  # type alias — the LLM returns a plain dict

__all__ = [
    "ChatResponse",
    "build_context",
    "chat_complete",
    "parse_llm_response",
]
