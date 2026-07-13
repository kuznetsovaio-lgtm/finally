'use client'

import { useState } from 'react'
import type { PriceTick } from '@/hooks/useMarketData'
import type { WatchlistItem } from '@/lib/api'

interface WatchlistProps {
  prices: Record<string, PriceTick>
  priceHistory: Record<string, number[]>
  selectedTicker: string | null
  onSelectTicker: (ticker: string | null) => void
  onAddTicker: (ticker: string) => void
  onRemoveTicker: (ticker: string) => void
  watchlist: WatchlistItem[]
}

function Sparkline({ history, color }: { history: number[]; color: string }) {
  if (history.length < 2) return <span className="text-gray-600 text-xs font-mono">--</span>

  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1
  const width = 110
  const height = 30

  const points = history
    .map((v, i) => {
      const x = (i / (history.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 2) - 1
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TickerRow({
  ticker,
  priceData,
  history,
  selected,
  onSelect,
  onRemove,
}: {
  ticker: string
  priceData: PriceTick | undefined
  history: number[]
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const price = priceData?.price ?? 0
  const changePct = priceData?.change_pct ?? 0
  const isUp = changePct >= 0
  const sparkColor = isUp ? '#40d66b' : '#ff5d6c'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid grid-cols-[76px_70px_64px_1fr_18px] items-center gap-3 border-b border-finally-border/80 px-4 py-3 text-left transition-colors ${
        selected ? 'bg-finally-card/85' : 'hover:bg-finally-card/45'
      }`}
    >
      <span className="font-mono font-bold text-[12px] text-gray-100">{ticker}</span>
      <span className="font-mono text-[12px] text-gray-200">${price.toFixed(2)}</span>
      <span className={`font-mono text-[12px] ${isUp ? 'text-uptick' : 'text-downtick'}`}>
        {isUp ? '+' : ''}{changePct.toFixed(2)}%
      </span>
      <div className="overflow-hidden">
        <Sparkline history={history} color={sparkColor} />
      </div>
      <span
        className="text-gray-600 hover:text-red-400 text-xs leading-none"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        x
      </span>
    </button>
  )
}

export default function Watchlist({
  prices,
  priceHistory,
  selectedTicker,
  onSelectTicker,
  onAddTicker,
  onRemoveTicker,
  watchlist,
}: WatchlistProps) {
  const [addInput, setAddInput] = useState('')
  const tickers = watchlist.map((w) => w.ticker)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const t = addInput.trim().toUpperCase()
    if (t && !tickers.includes(t)) {
      onAddTicker(t)
    }
    setAddInput('')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#171b27]">
      <div className="px-4 py-3 border-b border-finally-border shrink-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-[0.18em]">Watchlist</h2>
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="Add ticker"
              className="w-28 bg-finally-dark border border-finally-border rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-yellow"
              autoComplete="off"
            />
            <button type="submit" className="font-mono text-accent-blue hover:text-white text-sm">
              +
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-[76px_70px_64px_1fr_18px] gap-3 px-4 py-3 border-b border-finally-border/90 text-[11px] uppercase tracking-[0.14em] text-gray-500 font-mono shrink-0">
        <span>Ticker</span>
        <span>Price</span>
        <span>Chg%</span>
        <span>Chart</span>
        <span />
      </div>

      <div className="flex-1 overflow-y-auto">
        {tickers.map((ticker) => (
          <TickerRow
            key={ticker}
            ticker={ticker}
            priceData={prices[ticker]}
            history={priceHistory[ticker] || []}
            selected={selectedTicker === ticker}
            onSelect={() => onSelectTicker(selectedTicker === ticker ? null : ticker)}
            onRemove={() => onRemoveTicker(ticker)}
          />
        ))}
        {tickers.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-4">No tickers in watchlist</p>
        )}
      </div>
    </div>
  )
}
