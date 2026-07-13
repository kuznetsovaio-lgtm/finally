'use client'

import { useState } from 'react'
import type { PriceTick } from '@/hooks/useMarketData'
import type { Portfolio, TradeExecution } from '@/lib/api'
import { executeTrade } from '@/lib/api'

interface TradeBarProps {
  selectedTicker: string | null
  prices: Record<string, PriceTick>
  portfolio: Portfolio | null
  onTradeSuccess: (msg: string, trade?: TradeExecution, newCash?: number) => void
  onTradeError: (msg: string) => void
  onSelectTicker: (ticker: string | null) => void
}

export default function TradeBar({
  selectedTicker,
  prices,
  portfolio,
  onTradeSuccess,
  onTradeError,
  onSelectTicker,
}: TradeBarProps) {
  const [ticker, setTicker] = useState(selectedTicker || '')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)

  const effectiveTicker = selectedTicker || ticker

  const handleTrade = async (side: 'buy' | 'sell') => {
    if (!effectiveTicker || !quantity) return
    setLoading(true)
    try {
      const res = await executeTrade(effectiveTicker, parseFloat(quantity), side)
      if (res.success) {
        const verb = side === 'buy' ? 'Bought' : 'Sold'
        onTradeSuccess(`${verb} ${quantity} ${effectiveTicker.toUpperCase()} - ${res.message}`, res.trade, res.new_cash)
      } else {
        onTradeError(`${side === 'buy' ? 'Buy' : 'Sell'} failed: ${res.message}`)
      }
      setQuantity('')
    } catch (e: unknown) {
      onTradeError(`${side === 'buy' ? 'Buy' : 'Sell'} error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  const currentPrice = effectiveTicker ? (prices[effectiveTicker]?.price ?? 0) : 0
  const position = portfolio?.positions.find((p) => p.ticker === effectiveTicker?.toUpperCase())
  const positionQty = position?.quantity ?? 0

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-finally-card">
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-gray-500 uppercase tracking-wider">Ticker</label>
        <input
          type="text"
          value={selectedTicker || ticker}
          onChange={(e) => {
            setTicker(e.target.value.toUpperCase())
            onSelectTicker(null)
          }}
          placeholder="AAPL"
          className="bg-finally-dark border border-finally-border rounded px-2 py-1.5 w-20 text-sm font-mono font-semibold text-white placeholder-gray-600 focus:outline-none focus:border-accent-yellow uppercase"
          maxLength={6}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-gray-500 uppercase tracking-wider">Qty</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
          min="0"
          step="any"
          className="bg-finally-dark border border-finally-border rounded px-2 py-1.5 w-20 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-accent-yellow"
        />
      </div>

      {effectiveTicker && currentPrice > 0 && (
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Price</label>
          <span className="font-mono text-white text-sm py-1.5">${currentPrice.toFixed(2)}</span>
        </div>
      )}

      {effectiveTicker && currentPrice > 0 && quantity && (
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Est. Total</label>
          <span className="font-mono text-gray-300 text-sm py-1.5">
            ${(currentPrice * parseFloat(quantity || '0')).toFixed(2)}
          </span>
        </div>
      )}

      {effectiveTicker && positionQty > 0 && (
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Position</label>
          <span className="font-mono text-gray-300 text-sm py-1.5">{positionQty.toFixed(4)} shares</span>
        </div>
      )}

      <div className="flex flex-col gap-0.5 ml-auto">
        <label className="text-xs text-gray-500 uppercase tracking-wider">Available Cash</label>
        <span className="font-mono text-gray-300 text-sm py-1.5">
          ${(portfolio?.cash_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <button
        onClick={() => handleTrade('buy')}
        disabled={loading || !effectiveTicker || !quantity || currentPrice === 0}
        className="px-4 py-2 rounded font-semibold text-sm bg-accent-blue text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '...' : 'BUY'}
      </button>
      <button
        onClick={() => handleTrade('sell')}
        disabled={loading || !effectiveTicker || !quantity || currentPrice === 0}
        className="px-4 py-2 rounded font-semibold text-sm bg-accent-purple text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '...' : 'SELL'}
      </button>
    </div>
  )
}
