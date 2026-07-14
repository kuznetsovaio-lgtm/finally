import { useState, useEffect, useRef } from 'react'

export interface PriceTick {
  ticker: string
  price: number
  previous_price: number
  change: number
  change_pct: number
  direction?: 'up' | 'down' | 'flat'
  timestamp: string | number
}

export function useMarketData() {
  const [prices, setPrices] = useState<Record<string, PriceTick>>({})
  const [connected, setConnected] = useState(false)
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({})
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/stream/prices')
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as Record<string, {
          ticker: string
          price: number
          previous_price: number
          change: number
          change_percent: number
          direction?: 'up' | 'down' | 'flat'
          timestamp: string | number
        }>

        const ticks = Object.values(payload).map((tick) => ({
          ticker: tick.ticker,
          price: tick.price,
          previous_price: tick.previous_price,
          change: tick.change,
          change_pct: tick.change_percent,
          direction: tick.direction,
          timestamp: tick.timestamp,
        }))

        setPrices((prev) => {
          const next = { ...prev }
          for (const tick of ticks) {
            next[tick.ticker] = tick
          }
          return next
        })

        setPriceHistory((prev) => {
          const next = { ...prev }
          for (const tick of ticks) {
            next[tick.ticker] = [...(next[tick.ticker] || []).slice(-100), tick.price]
          }
          return next
        })
      } catch {
        // ignore malformed messages
      }
    }

    return () => {
      es.close()
    }
  }, [])

  return { prices, connected, priceHistory }
}
