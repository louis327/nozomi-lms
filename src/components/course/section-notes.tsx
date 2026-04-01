'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          fixed right-6 bottom-6 z-30 w-12 h-12 rounded-full shadow-lg
          flex items-center justify-center transition-all duration-200 cursor-pointer
          ${open
            ? 'bg-[#111] text-white hover:bg-[#333]'
            : hasNotes
              ? 'bg-nz-sakura text-white hover:bg-nz-sakura-deep'
              : 'bg-[#111] text-white hover:bg-[#333]'
          }
        `}
        title={open ? 'Close notes' : 'My Notes'}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {hasNotes && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white" />
            )}
          </>
        )}
      </button>

      {/* Floating card (anchored above the button) */}
      <div
        className={`
          fixed right-6 bottom-[76px] z-30 w-[320px] max-w-[calc(100vw-48px)]
          bg-white rounded-xl border border-[#e8e8e8] shadow-xl
          flex flex-col overflow-hidden
          transition-all duration-200 origin-bottom-right
          ${open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
          }
        `}
        style={{ maxHeight: 'min(420px, calc(100vh - 120px))' }}
      >
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#111] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="text-[13px] font-heading font-semibold text-[#111]">My Notes</span>
          </div>
          {status === 'saving' && (
            <span className="text-[11px] text-[#aaa]">Saving...</span>
          )}
          {status === 'saved' && (
            <span className="text-[11px] text-[#22c55e]">Saved</span>
          )}
        </div>

        {/* Card body */}
        <div className="flex-1 p-3 min-h-0">
          <textarea
            value={content}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Write your notes for this section..."
            className="w-full h-full min-h-[240px] bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#bbb] focus:outline-none focus:border-[#111] transition-colors resize-none"
          />
        </div>

        {/* Card footer */}
        <div className="px-4 py-2.5 border-t border-[#f0f0f0] shrink-0">
          <p className="text-[11px] text-[#bbb]">Auto-saves as you type</p>
        </div>
      </div>
    </>
  )
}
