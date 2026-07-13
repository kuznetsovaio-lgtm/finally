'use client'

import type { Portfolio } from '@/lib/api'
import type { PriceTick } from '@/hooks/useMarketData'

interface PositionsTableProps {
  portfolio: Portfolio | null
  prices: Record<string, PriceTick>
}

export default function PositionsTable({ portfolio, prices }: PositionsTableProps) {
  if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-finally-border shrink-0">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Positions</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 text-xs">No open positions</p>
        </div>
      </div>
    )
  }

  const enriched = portfolio.positions
    .map((pos) => {
      const price = prices[pos.ticker]?.price ?? pos.current_price ?? 0
      const market_value = price * pos.quantity
      const cost_basis = pos.avg_cost * pos.quantity
      const pnl = market_value - cost_basis
      const pnl_pct = cost_basis > 0 ? (pnl / cost_basis) * 100 : 0
      return { ...pos, price, market_value, pnl, pnl_pct }
    })
    .sort((a, b) => b.pnl - a.pnl)

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-finally-border shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Positions</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-gray-500 border-b border-finally-border sticky top-0 bg-finally-dark">
            <tr>
              <th className="text-left font-semibold uppercase tracking-wider px-3 py-2">Ticker</th>
              <th className="text-right font-semibold uppercase tracking-wider px-3 py-2">Qty</th>
              <th className="text-right font-semibold uppercase tracking-wider px-3 py-2">Avg Cost</th>
              <th className="text-right font-semibold uppercase tracking-wider px-3 py-2">Current</th>
              <th className="text-right font-semibold uppercase tracking-wider px-3 py-2">Mkt Value</th>
              <th className="text-right font-semibold uppercase tracking-wider px-3 py-2">Unreal. P&L</th>
              <th className="text-right font-semibold uppercase tracking-wider px-3 py-2">%</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((pos) => (
              <tr
                key={pos.id}
                className="border-b border-finally-border/50 hover:bg-finally-card/50 transition-colors"
              >
                <td className="px-3 py-2 font-mono font-bold text-accent-yellow">{pos.ticker}</td>
                <td className="px-3 py-2 font-mono text-right text-gray-200">{pos.quantity.toFixed(4)}</td>
                <td className="px-3 py-2 font-mono text-right text-gray-400">${pos.avg_cost.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono text-right text-gray-200">${pos.price.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono text-right text-gray-200">
                  ${pos.market_value.toFixed(2)}
                </td>
                <td
                  className={`px-3 py-2 font-mono text-right font-semibold ${
                    pos.pnl >= 0 ? 'text-uptick' : 'text-downtick'
                  }`}
                >
                  {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                </td>
                <td
                  className={`px-3 py-2 font-mono text-right font-semibold ${
                    pos.pnl_pct >= 0 ? 'text-uptick' : 'text-downtick'
                  }`}
                >
                  {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
