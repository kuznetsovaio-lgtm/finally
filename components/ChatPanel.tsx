'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, RefreshCw } from 'lucide-react'
import type { Portfolio } from '@/lib/api'
import type { PriceTick } from '@/hooks/useMarketData'
import type { WatchlistItem } from '@/lib/api'
import { sendChat } from '@/lib/api'

interface TradeAction {
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
}

interface WatchlistChange {
  ticker: string
  action: 'add' | 'remove'
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  trades?: TradeAction[]
  watchlistChanges?: WatchlistChange[]
}

interface ChatPanelProps {
  open: boolean
  onToggle: () => void
  portfolio: Portfolio | null
  prices: Record<string, PriceTick>
  watchlist: WatchlistItem[]
  onRefreshPortfolio: () => void
}

function buildContextMessage(portfolio: Portfolio | null, prices: Record<string, PriceTick>, watchlist: WatchlistItem[]): string {
  const lines: string[] = []

  if (portfolio) {
    lines.push(`Cash: $${portfolio.cash_balance.toFixed(2)}`)
    lines.push(`Total Portfolio Value: $${portfolio.total_value.toFixed(2)}`)
    lines.push(`Unrealized P&L: $${portfolio.unrealized_pnl.toFixed(2)}`)

    if (portfolio.positions.length > 0) {
      lines.push('Positions:')
      for (const pos of portfolio.positions) {
        const price = prices[pos.ticker]?.price ?? pos.current_price ?? 0
        const pnl = (price - pos.avg_cost) * pos.quantity
        lines.push(
          `  ${pos.ticker}: ${pos.quantity.toFixed(4)} shares @ avg $${pos.avg_cost.toFixed(2)}, current $${price.toFixed(2)}, P&L $${pnl.toFixed(2)}`
        )
      }
    } else {
      lines.push('Positions: none')
    }
  }

  if (watchlist.length > 0) {
    lines.push(`Watchlist: ${watchlist.map((w) => w.ticker).join(', ')}`)
  }

  return lines.join('\n')
}

export default function ChatPanel({
  open,
  onToggle,
  portfolio,
  prices,
  watchlist,
  onRefreshPortfolio,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (open) {
      scrollToBottom()
      inputRef.current?.focus()
    }
  }, [messages, open])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const context = buildContextMessage(portfolio, prices, watchlist)
      const systemPrompt = `You are FinAlly, an AI trading assistant. Always respond with valid JSON matching this schema:
{
  "message": "your conversational response",
  "trades": [{"ticker": "AAPL", "side": "buy", "quantity": 10}],
  "watchlist_changes": [{"ticker": "PYPL", "action": "add"}]
}
Current portfolio context:
${context}`
      const fullMessage = `${systemPrompt}\n\nUser: ${trimmed}`

      const res = await sendChat(fullMessage)

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        trades: res.trades,
        watchlistChanges: res.watchlist_changes,
      }

      setMessages((prev) => [...prev, assistantMsg])
      onRefreshPortfolio()
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e)
      setError(errMsg)
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', content: `Error: ${errMsg}` },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, portfolio, prices, watchlist, onRefreshPortfolio])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#171b27]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-finally-border shrink-0">
        <span className="font-mono text-gray-200 tracking-[0.18em] text-xs uppercase">AI Assistant</span>
        <button onClick={onToggle} className="text-gray-500 hover:text-white transition-colors text-xs font-mono">
          Collapse
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8 font-mono leading-relaxed">
            Ask about your portfolio, get analysis,
            <br />
            or execute trades through chat.
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-accent-blue/20 border border-accent-blue/30 text-gray-200'
                  : 'bg-finally-dark border border-finally-border text-gray-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {msg.role === 'assistant' ? (
                  <Bot size={14} className="text-accent-blue mt-0.5 shrink-0" />
                ) : (
                  <User size={14} className="text-accent-blue mt-0.5 shrink-0" />
                )}
                <span className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</span>
              </div>

              {msg.trades && msg.trades.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.trades.map((t, i) => (
                    <div
                      key={i}
                      className={`text-xs font-mono px-2 py-1 rounded border ${
                        t.side === 'buy'
                          ? 'bg-uptick/10 border-uptick/30 text-uptick'
                          : 'bg-downtick/10 border-downtick/30 text-downtick'
                      }`}
                    >
                      {t.side.toUpperCase()} {t.quantity} {t.ticker}
                    </div>
                  ))}
                </div>
              )}

              {msg.watchlistChanges && msg.watchlistChanges.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.watchlistChanges.map((w, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono px-2 py-1 rounded border bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow"
                    >
                      {w.action === 'add' ? 'Added' : 'Removed'}: {w.ticker}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-finally-dark border border-finally-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-accent-blue animate-spin" />
                <span className="text-xs text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && <div className="text-center text-downtick text-xs mt-2">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); handleSend() }}
        className="px-4 py-4 border-t border-finally-border shrink-0"
      >
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your portfolio..."
            rows={2}
            className="flex-1 bg-finally-dark border border-finally-border rounded px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-blue resize-none font-mono"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-accent-purple hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors text-white self-end"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  )
}
