'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { PortfolioSnapshot } from '@/lib/api'

interface PLChartProps {
  history: PortfolioSnapshot[]
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function PLChart({ history }: PLChartProps) {
  const data = useMemo(() => {
    if (!history || history.length === 0) return []
    return history.map((snap) => ({
      time: formatTime(snap.recorded_at),
      value: parseFloat(snap.total_value.toFixed(2)),
    }))
  }, [history])

  const minVal = data.length > 0 ? Math.min(...data.map((d) => d.value)) : 0
  const maxVal = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0
  const isUp = data.length >= 2 ? data[data.length - 1].value >= data[0].value : true
  const lineColor = isUp ? '#22c55e' : '#ef4444'

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-finally-border shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Portfolio P&L</h2>
        {data.length > 0 && (
          <span className="text-xs font-mono text-gray-500">
            {minVal.toFixed(2)} — {maxVal.toFixed(2)}
          </span>
        )}
      </div>
      <div className="flex-1 px-1 pt-1">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            No P&L data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#6b7280', fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: '#2d3748' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                width={60}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e2530',
                  border: '1px solid #2d3748',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#e2e8f0',
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio Value']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: lineColor }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
