'use client'

import { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import type { PriceTick } from '@/hooks/useMarketData'

interface MainChartProps {
  selectedTicker: string | null
  prices: Record<string, PriceTick>
  priceHistory: Record<string, number[]>
}

export default function MainChart({ selectedTicker, prices, priceHistory }: MainChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const lastTickRef = useRef<number>(0)

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0d1117' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1e2530' },
        horzLines: { color: '#1e2530' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#2d3748',
          width: 1,
          style: 2,
          labelBackgroundColor: '#209dd7',
        },
        horzLine: {
          color: '#2d3748',
          width: 1,
          style: 2,
          labelBackgroundColor: '#209dd7',
        },
      },
      timeScale: {
        borderColor: '#2d3748',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2d3748',
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
    })

    const series = chart.addLineSeries({
      color: '#ecad0a',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    })

    chartRef.current = chart
    seriesRef.current = series

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Update chart data when selected ticker or price history changes
  useEffect(() => {
    if (!selectedTicker || !seriesRef.current) return

    const history = priceHistory[selectedTicker] || []
    if (history.length === 0) return

    // Build time series data
    const now = Math.floor(Date.now() / 1000)
    const startTime = now - history.length * 5 // 5 seconds per tick
    const data = history.map((price, i) => ({
      time: (startTime + i * 5) as Time,
      value: price,
    }))

    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [selectedTicker, priceHistory])

  // Live update: append new tick
  useEffect(() => {
    if (!selectedTicker || !seriesRef.current) return
    const tick = prices[selectedTicker]
    if (!tick) return

    const now = Math.floor(Date.now() / 1000)
    if (now === lastTickRef.current) return
    lastTickRef.current = now

    seriesRef.current.update({ time: now as Time, value: tick.price })
  }, [prices, selectedTicker])

  return (
    <div className="relative w-full h-full bg-finally-dark">
      {!selectedTicker ? (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          Click a ticker in the watchlist to view its chart
        </div>
      ) : (
        <>
          <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
            <span className="font-mono font-bold text-accent-yellow text-base">{selectedTicker}</span>
            {prices[selectedTicker] && (
              <>
                <span className="font-mono text-white text-base">
                  ${prices[selectedTicker].price.toFixed(2)}
                </span>
                <span
                  className={`font-mono text-xs ${
                    prices[selectedTicker].change_pct >= 0 ? 'text-uptick' : 'text-downtick'
                  }`}
                >
                  {prices[selectedTicker].change_pct >= 0 ? '+' : ''}
                  {prices[selectedTicker].change_pct.toFixed(2)}%
                </span>
              </>
            )}
          </div>
          <div ref={containerRef} className="w-full h-full" />
        </>
      )}
    </div>
  )
}
