'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import Watchlist from '@/components/Watchlist'
import MainChart from '@/components/MainChart'
import TradeBar from '@/components/TradeBar'
import PortfolioHeatmap from '@/components/PortfolioHeatmap'
import PositionsTable from '@/components/PositionsTable'
import PLChart from '@/components/PLChart'
import ChatPanel from '@/components/ChatPanel'
import { useMarketData } from '@/hooks/useMarketData'
import { fetchPortfolio, fetchPortfolioHistory, fetchWatchlist, addToWatchlist, removeFromWatchlist } from '@/lib/api'
import type { Portfolio, PortfolioSnapshot, WatchlistItem, TradeExecution } from '@/lib/api'

export default function Home() {
  const { prices, connected, priceHistory } = useMarketData()
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)
  const [tradeError, setTradeError] = useState<string | null>(null)

  const loadPortfolio = useCallback(async () => {
    try {
      setPortfolio(await fetchPortfolio())
    } catch {}
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      setPortfolioHistory(await fetchPortfolioHistory())
    } catch {}
  }, [])

  const loadWatchlist = useCallback(async () => {
    try {
      setWatchlist(await fetchWatchlist())
    } catch {}
  }, [])

  useEffect(() => {
    loadPortfolio()
    loadHistory()
    loadWatchlist()

    const interval = setInterval(() => {
      loadPortfolio()
      loadHistory()
      loadWatchlist()
    }, 5000)

    return () => clearInterval(interval)
  }, [loadPortfolio, loadHistory, loadWatchlist])

  useEffect(() => {
    if (!selectedTicker && watchlist.length > 0) {
      setSelectedTicker(watchlist[0].ticker)
    }
  }, [selectedTicker, watchlist])

  const handleAddTicker = async (ticker: string) => {
    try {
      await addToWatchlist(ticker)
      await loadWatchlist()
    } catch (e) {
      console.error('Failed to add ticker', e)
    }
  }

  const handleRemoveTicker = async (ticker: string) => {
    try {
      await removeFromWatchlist(ticker)
      await loadWatchlist()
      if (selectedTicker === ticker) setSelectedTicker(null)
    } catch (e) {
      console.error('Failed to remove ticker', e)
    }
  }

  const handleTradeSuccess = useCallback((msg: string, trade?: TradeExecution, newCash?: number) => {
    setTradeSuccess(msg)

    if (trade) {
      setPortfolio((prev) => {
        if (!prev) return prev

        const existing = prev.positions.find((p) => p.ticker === trade.ticker)
        let nextPositions = prev.positions

        if (trade.side === 'buy') {
          if (existing) {
            const nextQty = existing.quantity + trade.quantity
            const nextAvg = ((existing.quantity * existing.avg_cost) + (trade.quantity * trade.price)) / nextQty
            nextPositions = prev.positions.map((p) =>
              p.ticker === trade.ticker
                ? { ...p, quantity: nextQty, avg_cost: nextAvg, current_price: trade.price }
                : p
            )
          } else {
            nextPositions = [
              ...prev.positions,
              {
                id: trade.id,
                ticker: trade.ticker,
                quantity: trade.quantity,
                avg_cost: trade.price,
                current_price: trade.price,
                unrealized_pnl: 0,
                change_pct: 0,
              },
            ]
          }
        } else if (existing) {
          const remaining = existing.quantity - trade.quantity
          nextPositions = remaining <= 0
            ? prev.positions.filter((p) => p.ticker !== trade.ticker)
            : prev.positions.map((p) =>
                p.ticker === trade.ticker
                  ? { ...p, quantity: remaining, current_price: trade.price }
                  : p
              )
        }

        const normalizedPositions = nextPositions.map((p) => {
          const currentPrice = p.current_price ?? p.avg_cost
          const unrealized = (currentPrice - p.avg_cost) * p.quantity
          return {
            ...p,
            current_price: currentPrice,
            unrealized_pnl: unrealized,
            change_pct: p.avg_cost > 0 ? ((currentPrice - p.avg_cost) / p.avg_cost) * 100 : 0,
          }
        })

        const cashBalance = newCash ?? prev.cash_balance
        const positionsValue = normalizedPositions.reduce((sum, p) => sum + ((p.current_price ?? 0) * p.quantity), 0)

        return {
          ...prev,
          cash_balance: cashBalance,
          positions: normalizedPositions,
          unrealized_pnl: normalizedPositions.reduce((sum, p) => sum + (p.unrealized_pnl ?? 0), 0),
          total_value: cashBalance + positionsValue,
        }
      })
    }

    void loadPortfolio()
    void loadHistory()
    setTimeout(() => setTradeSuccess(null), 3000)
  }, [loadPortfolio, loadHistory])

  const handleTradeError = useCallback((msg: string) => {
    setTradeError(msg)
    setTimeout(() => setTradeError(null), 3000)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-finally-dark overflow-hidden">
      <Header portfolio={portfolio} connected={connected} />

      {tradeSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-900 border border-green-700 text-green-200 px-4 py-2 rounded text-sm font-mono">
          {tradeSuccess}
        </div>
      )}
      {tradeError && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded text-sm font-mono">
          {tradeError}
        </div>
      )}

      <div className="grid flex-1 overflow-hidden grid-cols-[430px_minmax(0,1fr)_470px]">
        <div className="flex flex-col min-h-0 border-r border-finally-border">
          <Watchlist
            prices={prices}
            priceHistory={priceHistory}
            selectedTicker={selectedTicker}
            onSelectTicker={setSelectedTicker}
            onAddTicker={handleAddTicker}
            onRemoveTicker={handleRemoveTicker}
            watchlist={watchlist}
          />
          <div className="border-t border-finally-border shrink-0">
            <TradeBar
              selectedTicker={selectedTicker}
              prices={prices}
              portfolio={portfolio}
              onTradeSuccess={handleTradeSuccess}
              onTradeError={handleTradeError}
              onSelectTicker={setSelectedTicker}
            />
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="flex-[3] border-b border-finally-border overflow-hidden">
            <MainChart
              selectedTicker={selectedTicker}
              prices={prices}
              priceHistory={priceHistory}
            />
          </div>
          <div className="grid flex-[2] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden">
            <div className="border-r border-finally-border overflow-hidden">
              <PositionsTable portfolio={portfolio} prices={prices} />
            </div>
            <div className="overflow-hidden">
              <PLChart history={portfolioHistory} />
            </div>
          </div>
        </div>

        <div className="grid grid-rows-[300px_minmax(0,1fr)] min-h-0 border-l border-finally-border">
          <div className="overflow-hidden border-b border-finally-border">
            {portfolio ? <PortfolioHeatmap portfolio={portfolio} prices={prices} /> : <div className="h-full" />}
          </div>
          <div className="overflow-hidden">
            <ChatPanel
              open
              onToggle={() => {}}
              portfolio={portfolio}
              prices={prices}
              watchlist={watchlist}
              onRefreshPortfolio={() => {
                loadPortfolio()
                loadHistory()
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
