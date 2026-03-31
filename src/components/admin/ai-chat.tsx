'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  ChevronDown,
  Wrench,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ToolEvent {
  tool: string
  status: 'calling' | 'done' | 'error'
  detail?: string
}

const toolLabels: Record<string, string> = {
  create_course: 'Creating course',
  create_module: 'Creating module',
  create_section: 'Creating section',
  create_content_block: 'Creating content block',
  create_multiple_content_blocks: 'Creating content blocks',
  list_courses: 'Listing courses',
  get_course_structure: 'Loading course structure',
  update_course: 'Updating course',
  update_module: 'Updating module',
  update_section: 'Updating section',
  delete_module: 'Deleting module',
  delete_section: 'Deleting section',
  delete_content_block: 'Deleting content block',
}

export function AiChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, toolEvents, scrollToBottom])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setToolEvents([])

    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Chat request failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let assistantText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'text') {
              assistantText += data.content
              setMessages([...newMessages, { role: 'assistant', content: assistantText }])
            } else if (data.type === 'tool_call') {
              setToolEvents((prev) => [
                ...prev,
                { tool: data.tool, status: 'calling' },
              ])
            } else if (data.type === 'tool_result') {
              setToolEvents((prev) =>
                prev.map((e) =>
                  e.tool === data.tool && e.status === 'calling'
                    ? {
                        ...e,
                        status: data.result?.error ? 'error' : 'done',
                        detail: data.result?.error || undefined,
                      }
                    : e
                )
              )
            } else if (data.type === 'error') {
              assistantText += `\n\nError: ${data.content}`
              setMessages([...newMessages, { role: 'assistant', content: assistantText }])
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      if (assistantText) {
        setMessages([...newMessages, { role: 'assistant', content: assistantText }])
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong'
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Error: ${errMsg}` },
      ])
    } finally {
      setLoading(false)
      setToolEvents([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer ${
          open
            ? 'bg-nz-bg-elevated border border-nz-border text-nz-text-secondary hover:text-nz-text-primary'
            : 'bg-nz-sakura text-nz-bg-primary hover:bg-nz-sakura-deep sakura-glow-strong'
        }`}
      >
        {open ? <ChevronDown className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-h-[70vh] flex flex-col bg-nz-bg-secondary border border-nz-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-nz-border bg-nz-bg-elevated/30">
            <div className="w-8 h-8 rounded-xl bg-nz-sakura/15 flex items-center justify-center">
              <Bot className="w-4 h-4 text-nz-sakura" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-heading font-semibold text-nz-text-primary">
                Nozomi AI
              </h3>
              <p className="text-xs text-nz-text-muted">Course builder assistant</p>
            </div>
            <button
              onClick={() => {
                setMessages([])
                setToolEvents([])
              }}
              className="px-2 py-1 rounded-lg text-xs text-nz-text-muted hover:text-nz-text-secondary hover:bg-nz-bg-elevated transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[calc(70vh-140px)]">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-nz-sakura/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-nz-sakura" />
                </div>
                <div>
                  <p className="text-sm font-heading font-semibold text-nz-text-primary">
                    Build courses with AI
                  </p>
                  <p className="text-xs text-nz-text-muted mt-1 max-w-[280px] mx-auto">
                    Paste content, describe what you want, or ask me to build a full course structure.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  {[
                    'Create a course called "Web3 Fundraising"',
                    'List all my courses',
                    'Build a module from my pasted content',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion)
                        inputRef.current?.focus()
                      }}
                      className="block w-full text-left px-3 py-2 rounded-xl text-xs text-nz-text-tertiary hover:text-nz-text-secondary hover:bg-nz-bg-elevated border border-nz-border/50 hover:border-nz-border transition-colors cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-nz-sakura/15'
                      : 'bg-nz-bg-elevated border border-nz-border'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-3.5 h-3.5 text-nz-sakura" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-nz-text-tertiary" />
                  )}
                </div>
                <div
                  className={`flex-1 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'text-nz-text-primary bg-nz-sakura/5 border border-nz-sakura/10 rounded-2xl rounded-tr-md px-4 py-3'
                      : 'text-nz-text-secondary'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Tool activity */}
            {toolEvents.length > 0 && (
              <div className="space-y-1.5 pl-10">
                {toolEvents.map((event, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {event.status === 'calling' ? (
                      <Loader2 className="w-3 h-3 text-nz-sakura animate-spin" />
                    ) : event.status === 'done' ? (
                      <CheckCircle2 className="w-3 h-3 text-nz-success" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-nz-error" />
                    )}
                    <Wrench className="w-3 h-3 text-nz-text-muted" />
                    <span className="text-nz-text-tertiary">
                      {toolLabels[event.tool] || event.tool}
                    </span>
                    {event.detail && (
                      <span className="text-nz-error text-[10px]">— {event.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {loading && toolEvents.length === 0 && (
              <div className="flex items-center gap-2 pl-10 text-xs text-nz-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-nz-border bg-nz-bg-primary/50">
            <div className="flex items-end gap-2 bg-nz-bg-tertiary rounded-xl border border-nz-border focus-within:border-nz-sakura/30 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Build a course, add content..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-nz-text-primary placeholder:text-nz-text-muted px-4 py-3 resize-none focus:outline-none max-h-32"
                style={{ minHeight: '44px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = '44px'
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px'
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2.5 m-1 rounded-lg text-nz-sakura hover:bg-nz-sakura/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
