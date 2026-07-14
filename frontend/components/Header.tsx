'use client'

import type { Portfolio } from '@/lib/api'

interface HeaderProps {
  portfolio: Portfolio | null
  connected: boolean
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {connected ? (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      ) : (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
          connected ? 'bg-green-500' : 'bg-yellow-500'
        }`}
      />
    </span>
  )
}

export default function Header({ portfolio, connected }: HeaderProps) {
  const totalValue = portfolio?.total_value ?? 0
  const cashBalance = portfolio?.cash_balance ?? 0

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-finally-border bg-finally-card shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-accent-yellow font-bold text-xl font-mono tracking-tight">
          FinAlly
        </span>
        <span className="text-gray-500 text-xs font-mono">AI Trading Workstation</span>
      </div>

      {/* Center: Portfolio values */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Portfolio</span>
          <span className="text-white font-mono font-semibold text-base">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="w-px h-4 bg-finally-border" />
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Cash</span>
          <span className="text-gray-300 font-mono text-sm">
            ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Right: Connection status */}
      <div className="flex items-center gap-2">
        <ConnectionDot connected={connected} />
        <span className="text-xs text-gray-400 font-mono">
          {connected ? 'Connected' : 'Reconnecting...'}
        </span>
      </div>
    </header>
  )
}
