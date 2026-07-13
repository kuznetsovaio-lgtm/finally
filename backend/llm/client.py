"""LiteLLM client for FinAlly chat — routes to OpenRouter (Cerebras) or mock."""

from __future__ import annotations

import asyncio
import logging
import os
import random
from typing import Any

from litellm import acompletion

from llm.prompts import build_system_prompt, build_user_prompt
from llm.schema import ChatResponse

logger = logging.getLogger(__name__)

# Model identifier accepted by OpenRouter's Cerebras endpoint.
MODEL = "openrouter/openai/gpt-oss-120b"

# Instruct OpenRouter to route to Cerebras (avoids auto-routing).
EXTRA_BODY: dict[str, Any] = {"provider": {"order": ["Cerebras"]}}


class LLMClient:
    """Chat client backed by LiteLLM / OpenRouter / Cerebras."""

    def __init__(self) -> None:
        self.mock = os.environ.get("LLM_MOCK", "false").lower() == "true"
        self.api_key = os.environ.get("OPENROUTER_API_KEY", "")

    async def chat(
        self,
        portfolio_context: str,
        chat_history: list[dict[str, str]],
        user_message: str,
    ) -> ChatResponse:
        """Send a message to the LLM and return a structured response."""
        if self.mock:
            return self._mock_response(user_message)
        return await self._call_llm(portfolio_context, chat_history, user_message)

    async def _call_llm(
        self,
        portfolio_context: str,
        chat_history: list[dict[str, str]],
        user_message: str,
    ) -> ChatResponse:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": build_system_prompt()},
            {
                "role": "user",
                "content": build_user_prompt(portfolio_context, chat_history, user_message),
            },
        ]

        try:
            response = await acompletion(
                model=MODEL,
                messages=messages,
                api_key=self.api_key,
                extra_body=EXTRA_BODY,
                response_format=ChatResponse,
                reasoning_effort="low",
                temperature=0.7,
            )
        except Exception as exc:
            logger.exception("LLM call failed: %s", exc)
            return ChatResponse(
                message="Sorry, I couldn't reach the AI right now. Please try again.",
                trades=[],
                watchlist_changes=[],
            )

        raw = response.choices[0].message.content or ""

        try:
            return ChatResponse.model_validate_json(raw)
        except Exception as exc:
            logger.warning("LLM JSON parse failed (%s); stripping fences. Content: %s", exc, raw)
            stripped = raw.strip().strip("```json").strip("```").strip()
            try:
                return ChatResponse.model_validate_json(stripped)
            except Exception:
                return ChatResponse(
                    message="I had trouble understanding my own thoughts — please rephrase.",
                    trades=[],
                    watchlist_changes=[],
                )

    def _mock_response(self, user_message: str) -> ChatResponse:
        """Deterministic-ish mock response for testing and dev."""
        msg_lower = user_message.lower()
        trades = []
        watchlist_changes = []

        if ("buy" in msg_lower or "invest" in msg_lower) and random.random() < 0.2:
            trades = [{"ticker": "NVDA", "side": "buy", "quantity": 1.0}]
        elif "watch" in msg_lower and random.random() < 0.2:
            watchlist_changes = [{"ticker": "AMD", "action": "add"}]

        message = (
            "I'm FinAlly, your AI trading assistant. "
            "I can analyze your portfolio, execute trades, and manage your watchlist. "
            "(Running in mock mode — set LLM_MOCK=false and OPENROUTER_API_KEY for live AI.)"
        )
        return ChatResponse(message=message, trades=trades, watchlist_changes=watchlist_changes)


# Singleton instance
_chat_client = LLMClient()


def chat_complete(
    user_message: str,
    chat_history: list[dict[str, str]],
    portfolio_context: str,
) -> dict:
    """Synchronous wrapper around LLMClient.chat(). Runs in a fresh event loop."""
    result = asyncio.run(_chat_client.chat(portfolio_context, chat_history, user_message))
    return result.model_dump()


async def chat_complete_async(
    user_message: str,
    chat_history: list[dict[str, str]],
    portfolio_context: str,
) -> dict:
    """Async version for use inside FastAPI async endpoints."""
    result = await _chat_client.chat(portfolio_context, chat_history, user_message)
    return result.model_dump()
