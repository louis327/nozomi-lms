'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { NotebookPen, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type SectionNotesProps = {
  sectionId: string
  initialContent: string
}

export function SectionNotes({ sectionId, initialContent }: SectionNotesProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState(initialContent)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedContentRef = useRef(initialContent)

  useEffect(() => {
    setContent(initialContent)
    savedContentRef.current = initialContent
  }, [sectionId, initialContent])

  const save = useCallback(async (text: string) => {
    if (text === savedContentRef.current) return
    setStatus('saving')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('section_notes').upsert(
        {
          user_id: user.id,
          section_id: sectionId,
          content: text,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,section_id' }
      )

      savedContentRef.current = text
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('idle')
    }
  }, [sectionId])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => save(val), 1500)
  }

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    save(content)
  }

  const hasNotes = content.length > 0

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`
          fixed right-6 bottom-6 z-30 w-12 h-12 rounded-full shadow-lg
          flex items-center justify-center transition-colors duration-150 cursor-pointer
          ${open
            ? 'bg-ink text-white hover:bg-black'
            : hasNotes
              ? 'bg-accent text-white hover:bg-accent-deep'
              : 'bg-ink text-white hover:bg-black'
          }
        `}
        title={open ? 'Close notes' : 'My notes'}
        aria-label={open ? 'Close notes' : 'Open notes'}
      >
        {open ? <X className="w-5 h-5" strokeWidth={1.5} /> : <NotebookPen className="w-5 h-5" strokeWidth={1.5} />}
        {!open && hasNotes && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-canvas" />
        )}
      </button>

      <div
        className={`
          fixed right-6 bottom-[76px] z-30 w-[340px] max-w-[calc(100vw-48px)]
          bg-surface rounded-2xl border border-line shadow-2xl
          flex flex-col overflow-hidden
          transition-all duration-200 origin-bottom-right
          ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
        `}
        style={{ maxHeight: 'min(460px, calc(100vh - 120px))' }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-soft shrink-0">
          <div className="flex items-center gap-2.5">
            <NotebookPen className="w-4 h-4 text-ink" strokeWidth={1.5} />
            <span className="font-serif text-[15px] text-ink">My notes</span>
          </div>
          {status === 'saving' && (
            <span className="text-[10.5px] text-ink-muted uppercase tracking-[0.12em]">Saving…</span>
          )}
          {status === 'saved' && (
            <span className="text-[10.5px] text-success uppercase tracking-[0.12em]">Saved</span>
          )}
        </div>

        <div className="flex-1 p-3 min-h-0">
          <textarea
            value={content}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Write your notes for this section…"
            className="w-full h-full min-h-[260px] bg-surface-muted/50 border border-line-soft rounded-xl px-3.5 py-3 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-line-strong transition-colors resize-none leading-relaxed"
          />
        </div>

        <div className="px-5 py-2.5 border-t border-line-soft shrink-0">
          <p className="text-[10.5px] text-ink-muted uppercase tracking-[0.12em]">Auto-saves as you type</p>
        </div>
      </div>
    </>
  )
}
