'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Turn = {
  turn_number: number
  student_message: string | null
  agent_message: string
  intent: 'answer' | 'question' | 'off_topic' | 'meta' | 'opener' | null
  verdict: 'pass' | 'shallow' | 'wrong' | 'partial' | null
}

type Props = { sectionId: string; sectionTitle: string }

export function TutorCoach({ sectionId, sectionTitle }: Props) {
  const [hasRubric, setHasRubric] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [question, setQuestion] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [mastery, setMastery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Check if this section has an approved rubric before showing the button.
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tutor_rubrics')
      .select('id')
      .eq('section_id', sectionId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHasRubric(!!data))
  }, [sectionId])

  const startSession = useCallback(async () => {
    setError(null)
    setThinking(true)
    try {
      const res = await fetch('/api/tutor/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to start session')
      }
      const data = await res.json()
      setSessionId(data.sessionId)
      setQuestion(data.question)

      if (data.isExistingSession) {
        const hist = await fetch(`/api/tutor/history?sessionId=${data.sessionId}`)
        const h = await hist.json()
        setTurns(h.turns || [])
        setMastery(!!h.mastery)
      } else {
        setTurns([])
        setMastery(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start')
    } finally {
      setThinking(false)
    }
  }, [sectionId])

  const onOpen = () => {
    if (!open) {
      setOpen(true)
      if (!sessionId) startSession()
    }
  }

  const send = useCallback(async () => {
    const text = draft.trim()
    if (!text || !sessionId || thinking || mastery) return
    setDraft('')
    setThinking(true)
    setError(null)

    const optimistic: Turn = {
      turn_number: (turns[turns.length - 1]?.turn_number ?? 0) + 1,
      student_message: text,
      agent_message: '…',
      intent: null,
      verdict: null
    }
    setTurns(t => [...t, optimistic])

    try {
      const res = await fetch('/api/tutor/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, sectionId, studentMessage: text })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Tutor failed (${res.status})`)
      }
      const data = await res.json()
      setTurns(t => {
        const copy = [...t]
        copy[copy.length - 1] = {
          ...optimistic,
          agent_message: data.reply ?? '(no reply)',
          intent: data.intent ?? null,
          verdict: data.verdict ?? null
        }
        return copy
      })
      if (data.verdict === 'pass' || data.mastery === 'mastered') setMastery(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send'
      setError(msg)
      setTurns(t => t.slice(0, -1))
      setDraft(text)
    } finally {
      setThinking(false)
    }
  }, [draft, sessionId, sectionId, thinking, mastery, turns])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [turns.length, thinking])

  // Show the Coach to any authenticated user on a section that has an
  // approved rubric. Auth is enforced at the API level for start/turn calls.
  if (!hasRubric) return null

  if (!open) {
    return (
      <button
        onClick={onOpen}
        className="fixed bottom-24 right-6 z-40 rounded-full shadow-xl px-5 py-3 text-sm font-semibold tracking-wide flex items-center gap-2 transition-transform hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #0d0d0e 0%, #1a1a1d 100%)',
          color: '#fafafa',
          border: '1px solid #c69a3f33'
        }}
        aria-label="Open AI coach"
      >
        <span style={{ color: '#c69a3f' }}>●</span>
        <span>Coach</span>
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-40 w-[420px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{
        background: '#0d0d0e',
        color: '#fafafa',
        border: '1px solid #c69a3f44'
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#c69a3f' }}>Section Coach</p>
          <p className="text-[14px] mt-0.5" style={{ color: '#cfcab8', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}>
            {sectionTitle}
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-white/40 hover:text-white/80 transition-colors"
          aria-label="Close coach"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {question && (
          <div className="rounded-lg px-4 py-3 text-[13.5px] leading-relaxed" style={{ background: '#1a1a1d', borderLeft: '2px solid #c69a3f' }}>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: '#c69a3f' }}>Checkpoint</p>
            <p style={{ color: '#e8e3d4' }}>{question}</p>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            {t.student_message && (
              <div className="flex justify-end">
                <div className="rounded-lg px-3.5 py-2.5 text-[13.5px] leading-relaxed max-w-[85%]" style={{ background: '#2a2520', color: '#fafafa' }}>
                  {t.student_message}
                </div>
              </div>
            )}
            <div className="flex justify-start">
              <div className="rounded-lg px-3.5 py-2.5 text-[13.5px] leading-relaxed max-w-[90%]" style={{ background: '#1a1a1d', color: '#e8e3d4' }}>
                {t.agent_message}
                {t.verdict && t.verdict !== 'pass' && (
                  <span
                    className="ml-2 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: t.verdict === 'wrong' ? '#d97755' : '#c69a3f' }}
                  >
                    · {t.verdict}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3.5 py-2.5 text-[12px] italic" style={{ background: '#1a1a1d', color: '#c69a3f' }}>
              the coach is considering your answer<span className="thinking-dots">...</span>
            </div>
          </div>
        )}

        {mastery && (
          <div className="rounded-lg px-4 py-3 text-[13px] mt-2" style={{ background: 'linear-gradient(135deg, #2a2018 0%, #1a1a1d 100%)', border: '1px solid #c69a3f66' }}>
            <p className="font-semibold mb-1" style={{ color: '#c69a3f' }}>You've got this section.</p>
            <p style={{ color: '#cfcab8' }}>Move on when you're ready.</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg px-3.5 py-2.5 text-[12px]" style={{ background: '#3a1d1d', color: '#f7c2c2', border: '1px solid #d9555533' }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); send() }}
        className="border-t border-white/5 p-3 flex gap-2 items-end"
      >
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
          }}
          rows={2}
          disabled={thinking || mastery || !sessionId}
          placeholder={mastery ? 'Section complete' : 'Take a shot at the checkpoint…'}
          className="flex-1 bg-transparent text-[14px] resize-none focus:outline-none placeholder:text-white/30"
          style={{ color: '#fafafa' }}
        />
        <button
          type="submit"
          disabled={thinking || mastery || !sessionId || !draft.trim()}
          className="rounded-md px-3.5 py-2 text-[12px] font-semibold uppercase tracking-wider transition-opacity disabled:opacity-30"
          style={{ background: '#c69a3f', color: '#0d0d0e' }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
