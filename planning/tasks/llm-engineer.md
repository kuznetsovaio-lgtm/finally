# llm-engineer — task status

## Current work
All files written and verified.

## Done
- `backend/llm/__init__.py`
- `backend/llm/client.py` — LiteLLM → OpenRouter/Cerebras, mock mode
- `backend/llm/prompts.py` — system prompt, build_user_prompt, build_context
- `backend/llm/schema.py` — ChatResponse, TradeAction, WatchlistChange
- `backend/llm/executor.py` — execute_llm_actions with validation

## Blocked
- None

## Instructions
Read `planning/TEAM_LEAD_INSTRUCTIONS.md` for full context. Write all files listed under "LLM Engineer" in that doc.

## Key constraints
- Use `cerebras-inference` skill to set up LiteLLM → OpenRouter with Cerebras inference
- Model: `openrouter/.../gpt-oss-120b` (Cerebras inference provider)
- API key: `os.environ["OPENROUTER_API_KEY"]`
- Structured JSON output: `{"message": str, "trades": [...], "watchlist_changes": [...]}`
- If `LLM_MOCK=true` in env, return a deterministic mock response instead of calling the API
- LLM should NOT execute trades that would: (a) buy more than cash allows, (b) sell more shares than owned
- System prompt: FinAlly is a concise, data-driven AI trading assistant. Respond only with valid JSON. Analyze portfolio composition and P&L. Suggest trades with reasoning. Execute trades when asked. Manage the watchlist.

## Chat flow (per PLAN.md)
1. Load user portfolio context (cash, positions with P&L, watchlist with live prices)
2. Load recent chat history from `chat_messages` table (last N messages)
3. Construct prompt: system message + portfolio context + history + user message
4. Call LLM via LiteLLM with structured output
5. Parse JSON response
6. Validate and auto-execute any trades in `trades[]` array
7. Apply any watchlist changes in `watchlist_changes[]` array
8. Store user message + assistant response (with `actions` JSON) in `chat_messages`
9. Return full JSON to frontend

## Mock mode
When `LLM_MOCK=true`, return:
```json
{
  "message": "This is a simulated response.",
  "trades": [],
  "watchlist_changes": []
}
```
For testing, randomly return a small buy or watchlist add 20% of the time.

## Files to create
- `backend/llm/__init__.py`
- `backend/llm/client.py`
- `backend/llm/prompts.py`
- `backend/llm/schema.py`
- `backend/llm/executor.py`
