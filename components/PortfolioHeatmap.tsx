'use client'

import type { Portfolio } from '@/lib/api'
import type { PriceTick } from '@/hooks/useMarketData'

interface PortfolioHeatmapProps {
  portfolio: Portfolio
  prices: Record<string, PriceTick>
}

export default function PortfolioHeatmap({ portfolio, prices }: PortfolioHeatmapProps) {
  const { positions, total_value, unrealized_pnl } = portfolio

  if (!positions || positions.length === 0) {
    return (
      <div className="border-t border-finally-border p-3 shrink-0">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Portfolio Heatmap</h3>
        <div className="text-gray-600 text-xs text-center py-4">No positions yet</div>
      </div>
    )
  }

  // Calculate per-position weight and P&L
  const enriched = positions
    .map((pos) => {
      const price = prices[pos.ticker]?.price ?? pos.current_price ?? 0
      const market_value = price * pos.quantity
      const cost_basis = pos.avg_cost * pos.quantity
      const pnl = price * pos.quantity - cost_basis
      const pnl_pct = cost_basis > 0 ? (pnl / cost_basis) * 100 : 0
      const weight = total_value > 0 ? (market_value / total_value) * 100 : 0
      return { ...pos, price, market_value, pnl, pnl_pct, weight }
    })
    .filter((p) => p.market_value > 0)
    .sort((a, b) => b.market_value - a.market_value)

  // Simple treemap: assign area proportional to weight
  const totalWeight = enriched.reduce((s, p) => s + p.weight, 0) || 1

  // Simple row-based layout: fill rows left-to-right, breaking at 40% width
  const cells = enriched.map((pos) => {
    const relWeight = pos.weight / totalWeight
    const relPnl = pos.pnl_pct / 100
    const color = relPnl >= 0 ? '#22c55e' : '#ef4444'
    const opacity = Math.min(0.15 + Math.abs(relPnl) * 3, 0.9)
    const bgStyle = {
      backgroundColor: color,
      opacity,
    }
    return {
      ...pos,
      relWeight,
      bgStyle,
    }
  })

  return (
    <div className="border-t border-finally-border shrink-0">
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Portfolio</h3>
          <span
            className={`text-xs font-mono font-semibold ${
              unrealized_pnl >= 0 ? 'text-uptick' : 'text-downtick'
            }`}
          >
            {unrealized_pnl >= 0 ? '+' : ''}${unrealized_pnl.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="px-2 pb-2">
        <div className="flex flex-wrap gap-1">
          {cells.map((cell) => (
            <div
              key={cell.ticker}
              title={`${cell.ticker}: ${cell.pnl_pct >= 0 ? '+' : ''}${cell.pnl_pct.toFixed(2)}% (${cell.weight.toFixed(1)}%)`}
              style={cell.bgStyle}
              className="rounded border border-white/10 flex flex-col items-center justify-center p-1 min-w-[40px] flex-1"
            >
              <span className="text-white font-mono font-bold text-xs leading-none">
                {cell.ticker}
              </span>
              <span className="text-white/80 font-mono text-[10px] leading-none mt-0.5">
                {cell.pnl_pct >= 0 ? '+' : ''}{cell.pnl_pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
