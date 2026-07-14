# frontend — task status

## Current work
All files written and verified.

## Done
- All frontend files created (18 files total)

## Blocked
- None (frontend is self-contained, no backend dependency required to write the code)

## Instructions
Read `planning/TEAM_LEAD_INSTRUCTIONS.md` for full context. Write all files listed under "Frontend" in that doc.

## Visual Design (locked)
- Background: `#0d1117`
- Borders: muted gray
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991`
- Price flash: green `#22c55e` (uptick), red `#ef4444` (downtick), 500ms fade

## Layout (Bloomberg-style terminal)
```
┌─────────────────────────────────────────────────────┐
│  HEADER: portfolio value | cash | connection dot   │
├──────────────┬────────────────────────────────────┤
│              │                                     │
│  WATCHLIST   │        MAIN CHART                   │
│  (ticker     │   (selected ticker chart)          │
│   grid with  │                                     │
│   sparklines)├─────────────────────────────────────┤
│              │  TRADE BAR                          │
├──────────────┤  (ticker input, qty, buy/sell)    │
│              ├─────────────────────────────────────┤
│  PORTFOLIO   │  P&L CHART                          │
│  HEATMAP     │  (portfolio value over time)        │
│              ├─────────────────────────────────────┤
│  POSITIONS   │  POSITIONS TABLE                     │
│  TABLE       │                                     │
└──────────────┴─────────────────────────────────────┘
                          ┌─────────────┐
                          │  CHAT PANEL │  (collapsible sidebar)
                          └─────────────┘
```

## SSE hook
`useMarketData` hook creates an `EventSource('/api/stream/prices')`, parses `PriceTick` events, updates React state, handles reconnection automatically.

## Chart library
Use `lightweight-charts` (TradingView) — canvas-based, handles streaming data well. Or Recharts. Either is fine.

## Sparklines
Accumulate price history from SSE in local React state. Use a minimal inline SVG sparkline.

## Files to create
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/next.config.ts`
- `frontend/tailwind.config.ts`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/app/page.tsx`
- `frontend/components/Header.tsx`
- `frontend/components/Watchlist.tsx`
- `frontend/components/MainChart.tsx`
- `frontend/components/TradeBar.tsx`
- `frontend/components/PortfolioHeatmap.tsx`
- `frontend/components/PositionsTable.tsx`
- `frontend/components/PLChart.tsx`
- `frontend/components/ChatPanel.tsx`
- `frontend/hooks/useMarketData.ts`
- `frontend/lib/api.ts`
