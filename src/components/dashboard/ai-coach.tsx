'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

export function AiCoach({ starters }: { starters: string[] }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || 'Request failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let assistantText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const data = JSON.parse(part.slice(6))
            if (data.type === 'text') {
              assistantText += data.content
              setMessages([...next, { role: 'assistant', content: assistantText }])
            } else if (data.type === 'error') {
              assistantText += `\n\nError: ${data.content}`
              setMessages([...next, { role: 'assistant', content: assistantText }])
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setMessages([...next, { role: 'assistant', content: `Error: ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
        <div className="w-8 h-8 rounded-xl bg-accent-soft flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent" strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.16em]">
            Your coach
          </p>
          <h3 className="text-[15px] font-semibold text-ink leading-tight">
            Nozomi Coach
          </h3>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[11px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="px-5 py-4 space-y-4 min-h-[280px] max-h-[460px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="py-4">
            <p className="text-[13px] text-ink-soft leading-relaxed mb-4">
              Ask anything about your raise — valuation, timing, blockers, outreach. I already know your stage and context from onboarding.
            </p>
            <div className="space-y-1.5">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] text-ink-soft hover:text-ink bg-canvas hover:bg-surface-muted border border-line transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            <div
              className={
                msg.role === 'user'
                  ? 'max-w-[85%] text-[14px] leading-relaxed text-ink bg-accent-soft rounded-2xl rounded-tr-md px-4 py-2.5 whitespace-pre-wrap'
                  : 'text-[14px] leading-relaxed text-ink whitespace-pre-wrap'
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-2 text-[12px] text-ink-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <div className="p-3 border-t border-line bg-canvas">
        <div className="flex items-end gap-2 bg-surface rounded-xl border border-line focus-within:border-accent/40 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your raise…"
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-faint px-4 py-3 resize-none focus:outline-none max-h-32"
            style={{ minHeight: '44px' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = '44px'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 m-1 rounded-lg text-accent hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            aria-label="Send"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
