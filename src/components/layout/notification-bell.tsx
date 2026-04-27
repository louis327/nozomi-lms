'use client'

import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  kind: string
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', { credentials: 'same-origin' })
      if (!res.ok) return
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
      setUnread(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const t = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  const markAllRead = async () => {
    if (unread === 0) return
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })))
    setUnread(0)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    } catch { /* best effort */ }
  }

  const handleClick = async (n: Notification) => {
    setOpen(false)
    if (!n.read_at) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it)))
      setUnread((c) => Math.max(0, c - 1))
      try {
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [n.id] }),
        })
      } catch { /* best effort */ }
    }
    if (n.href) router.push(n.href)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-surface border border-line hover:border-line-strong text-ink-soft hover:text-ink transition-colors flex items-center justify-center relative"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-accent text-[9px] font-semibold text-white flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[340px] bg-surface border border-line rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line-soft">
            <p className="font-serif text-[14px] text-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11.5px] text-ink-muted hover:text-ink transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="px-4 py-6 text-[12.5px] text-ink-muted text-center">Loading…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-[12.5px] text-ink-muted text-center">
                You&rsquo;re all caught up.
              </div>
            )}
            {items.length > 0 && (
              <ul>
                {items.map((n) => {
                  const isUnread = !n.read_at
                  return (
                    <li key={n.id} className="border-b border-line-soft last:border-0">
                      <button
                        type="button"
                        onClick={() => handleClick(n)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-canvas transition-colors"
                      >
                        <span
                          className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                            isUnread ? 'bg-accent' : 'bg-transparent'
                          }`}
                          aria-hidden
                        />
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[13px] truncate ${isUnread ? 'text-ink font-medium' : 'text-ink-soft'}`}>
                            {n.title}
                          </span>
                          {n.body && (
                            <span className="block text-[12px] text-ink-muted mt-0.5">{n.body}</span>
                          )}
                          <span className="block text-[10.5px] text-ink-muted uppercase tracking-[0.1em] mt-1">
                            {formatRelative(n.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
