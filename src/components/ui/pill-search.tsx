'use client'

import { Search, BookOpen, Layers, FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Result = {
  kind: 'course' | 'module' | 'section'
  id: string
  title: string
  href: string
  context?: string
}

type PillSearchProps = {
  className?: string
  placeholder?: string
}

const KIND_LABEL: Record<Result['kind'], string> = {
  course: 'Course',
  module: 'Module',
  section: 'Lesson',
}

const KIND_ICON: Record<Result['kind'], React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  course: BookOpen,
  module: Layers,
  section: FileText,
}

export function PillSearch({ className = '', placeholder = 'Search courses, lessons...' }: PillSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const id = ++reqIdRef.current
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          credentials: 'same-origin',
        })
        if (id !== reqIdRef.current) return
        if (!res.ok) {
          setResults([])
          return
        }
        const data = await res.json()
        setResults(Array.isArray(data.results) ? data.results : [])
        setActiveIndex(0)
      } finally {
        if (id === reqIdRef.current) setLoading(false)
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  const navigate = (href: string) => {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(href)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[activeIndex]
      if (r) navigate(r.href)
    }
  }

  const showDropdown = open && (loading || results.length > 0 || query.trim().length >= 2)

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2 w-full bg-surface border border-line rounded-full focus-within:border-ink transition-colors">
        <Search className="w-4 h-4 text-ink-muted shrink-0" strokeWidth={1.5} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-surface border border-line rounded-2xl shadow-lg overflow-hidden">
          {loading && results.length === 0 && (
            <div className="px-4 py-3 text-[12.5px] text-ink-muted">Searching...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-[12.5px] text-ink-muted">
              No matches for &ldquo;{query.trim()}&rdquo;.
            </div>
          )}
          {results.length > 0 && (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.map((r, i) => {
                const Icon = KIND_ICON[r.kind]
                return (
                  <li key={`${r.kind}:${r.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => navigate(r.href)}
                      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === activeIndex ? 'bg-canvas' : 'hover:bg-canvas'
                      }`}
                    >
                      <span className="mt-0.5 w-7 h-7 rounded-full bg-canvas border border-line flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-ink-soft" strokeWidth={1.5} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-ink truncate">{r.title}</span>
                        <span className="block text-[11px] text-ink-muted truncate">
                          {KIND_LABEL[r.kind]}
                          {r.context ? ` · ${r.context}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
