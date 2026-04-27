'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Highlighter, X, Trash2, StickyNote } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useEditMode } from '@/lib/edit-mode-context'

type Highlight = {
  id: string
  section_id: string
  block_id: string | null
  selected_text: string
  note: string | null
  color: string
  created_at: string
}

type ToolbarPos = { top: number; left: number; text: string; blockId: string | null } | null

const CONTENT_SELECTOR = '#nz-section-content-column'

function findEnclosingBlockId(node: Node | null): string | null {
  let cur: Node | null = node
  while (cur) {
    if (cur instanceof HTMLElement && cur.id?.startsWith('block-')) {
      return cur.id.replace(/^block-/, '')
    }
    cur = cur.parentNode
  }
  return null
}

export function SectionHighlights({ sectionId }: { sectionId: string }) {
  const { addToast } = useToast()
  const { editMode } = useEditMode()
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [toolbar, setToolbar] = useState<ToolbarPos>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const lastSelectionRef = useRef<string>('')

  // Initial load
  useEffect(() => {
    let cancelled = false
    fetch(`/api/highlights?section_id=${sectionId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) {
          setHighlights(data)
          setLoaded(true)
        }
      })
      .catch(() => setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [sectionId])

  // Selection-change listener
  useEffect(() => {
    if (editMode) return

    const handler = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setToolbar(null)
        return
      }
      const range = sel.getRangeAt(0)
      const container = range.commonAncestorContainer
      const contentEl = document.querySelector(CONTENT_SELECTOR)
      if (!contentEl || !contentEl.contains(container)) {
        setToolbar(null)
        return
      }
      const text = sel.toString().trim()
      if (text.length < 3 || text.length > 800) {
        setToolbar(null)
        return
      }
      // Avoid editor-selection (admin tiptap) — its container has [contenteditable]
      let node: Node | null = container
      while (node) {
        if (node instanceof HTMLElement && node.isContentEditable) {
          setToolbar(null)
          return
        }
        node = node.parentNode
      }
      const rect = range.getBoundingClientRect()
      lastSelectionRef.current = text
      const blockId = findEnclosingBlockId(container)
      setToolbar({
        top: rect.top + window.scrollY - 44,
        left: rect.left + window.scrollX + rect.width / 2,
        text,
        blockId,
      })
    }

    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [editMode])

  const handleHighlight = useCallback(async () => {
    if (!toolbar) return
    const text = toolbar.text
    const blockId = toolbar.blockId
    setToolbar(null)
    window.getSelection()?.removeAllRanges()
    try {
      const res = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          block_id: blockId,
          selected_text: text,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      const created = (await res.json()) as Highlight
      setHighlights((prev) => [created, ...prev])
      addToast('Highlight saved', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    }
  }, [toolbar, sectionId, addToast])

  const handleDelete = useCallback(async (id: string) => {
    const prev = highlights
    setHighlights((cur) => cur.filter((h) => h.id !== id))
    try {
      const res = await fetch(`/api/highlights/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    } catch (err) {
      setHighlights(prev)
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }, [highlights, addToast])

  const handleNoteChange = useCallback(async (id: string, note: string) => {
    setHighlights((cur) => cur.map((h) => (h.id === id ? { ...h, note } : h)))
    try {
      await fetch(`/api/highlights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
    } catch {
      // best-effort
    }
  }, [])

  if (editMode) return null

  return (
    <>
      {/* Floating toolbar */}
      {toolbar && (
        <div
          className="fixed z-50 -translate-x-1/2 bg-ink text-ink-inverted rounded-full shadow-xl px-3 py-1.5 flex items-center gap-1.5 text-[12px]"
          style={{ top: toolbar.top, left: toolbar.left }}
        >
          <button
            onMouseDown={(e) => { e.preventDefault(); handleHighlight() }}
            className="inline-flex items-center gap-1.5 hover:text-accent transition-colors cursor-pointer"
          >
            <Highlighter className="w-3.5 h-3.5" strokeWidth={2} />
            Highlight
          </button>
        </div>
      )}

      {/* Trigger pill */}
      {loaded && (
        <button
          onClick={() => setPanelOpen(true)}
          data-tour="section-highlights"
          className="fixed bottom-24 right-6 z-30 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface border border-line shadow-lg text-[12px] font-medium text-ink-soft hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
          title="My highlights"
        >
          <Highlighter className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
          {highlights.length > 0 && (
            <span className="tabular-nums">{highlights.length}</span>
          )}
          <span className="hidden sm:inline">Highlights</span>
        </button>
      )}

      {/* Side panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPanelOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-line shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <Highlighter className="w-4 h-4 text-accent" strokeWidth={2} />
                <h2 className="font-heading font-semibold text-[14px] text-ink">
                  My Highlights
                </h2>
                <span className="text-[11px] text-ink-faint tabular-nums">
                  {highlights.length}
                </span>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {highlights.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink-faint">
                  Select text in the section to save your first highlight.
                </div>
              ) : (
                <ul className="space-y-3">
                  {highlights.map((h) => (
                    <li
                      key={h.id}
                      className="rounded-xl border border-line bg-surface-muted/40 px-3 py-3"
                    >
                      <p className="text-[13px] text-ink leading-relaxed">
                        <span className="bg-yellow-200/60 px-0.5 rounded">
                          {h.selected_text}
                        </span>
                      </p>
                      <div className="mt-2 flex items-start gap-2">
                        <StickyNote className="w-3 h-3 text-ink-faint mt-1 shrink-0" strokeWidth={2} />
                        <textarea
                          value={h.note ?? ''}
                          placeholder="Add a note…"
                          rows={1}
                          onChange={(e) => handleNoteChange(h.id, e.target.value)}
                          className="flex-1 bg-transparent text-[12px] text-ink-soft placeholder:text-ink-faint resize-none focus:outline-none focus:ring-0 border-b border-transparent focus:border-line transition-colors"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10.5px] text-ink-faint">
                        <span className="font-mono tabular-nums">
                          {new Date(h.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="inline-flex items-center gap-1 hover:text-error transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" strokeWidth={2} />
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
