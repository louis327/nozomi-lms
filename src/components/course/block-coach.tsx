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

type Props = {
  blockId: string
  sectionId: string
  /** Function the parent uses to provide the student's current answer text on demand. */
  getAnswer: () => string
}

// Maps the stage values written by the n8n workflow to user-facing labels.
const STAGE_LABEL: Record<string, string> = {
  reading: 'Reading your answer…',
  thinking: 'Thinking it through…',
  reviewing: 'Reviewing my response…',
  tightening: 'Tightening the response…',
  done: 'Ready'
}

export function BlockCoach({ blockId, sectionId, getAnswer }: Props) {
  const [hasRubric, setHasRubric] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [thinking, setThinking] = useState(false)
  const [mastery, setMastery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState('')
  const [stage, setStage] = useState<string | null>(null)
  const [stageStartedAt, setStageStartedAt] = useState<number | null>(null)
  const [, forceTick] = useState(0)
  const esRef = useRef<EventSource | null>(null)

  // Check rubric existence on mount.
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tutor_rubrics')
      .select('id')
      .eq('block_id', blockId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHasRubric(!!data))
  }, [blockId])

  // Ensure a session exists, return its id.
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId
    try {
      const res = await fetch('/api/tutor/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, blockId })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Could not start session')
      }
      const data = await res.json()
      setSessionId(data.sessionId)
      // Load history if existing session
      if (data.isExistingSession) {
        const h = await fetch(`/api/tutor/history?sessionId=${data.sessionId}`)
        const hdata = await h.json()
        setTurns(hdata.turns || [])
        if (hdata.mastery) setMastery(true)
      }
      return data.sessionId
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start')
      return null
    }
  }, [sessionId, sectionId, blockId])

  // Tick every second while thinking, so the elapsed-time counter updates.
  useEffect(() => {
    if (!thinking) return
    const t = setInterval(() => forceTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [thinking])

  const closeStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])

  useEffect(() => () => closeStream(), [closeStream])

  const sendTurn = useCallback(async (message: string) => {
    if (!message.trim() || thinking || mastery) return
    setError(null)
    setThinking(true)
    setStage('reading')
    setStageStartedAt(Date.now())
    const sid = await ensureSession()
    if (!sid) { setThinking(false); setStage(null); return }

    const turnCorrelationId = crypto.randomUUID()

    const turnNum = (turns[turns.length - 1]?.turn_number ?? 0) + 1
    const optimistic: Turn = {
      turn_number: turnNum,
      student_message: message,
      agent_message: '',
      intent: null,
      verdict: null
    }
    setTurns(t => [...t, optimistic])

    // Open SSE stream BEFORE POSTing, so we don't miss early events.
    closeStream()
    const es = new EventSource(`/api/tutor/turn-stream?turnCorrelationId=${turnCorrelationId}`)
    esRef.current = es
    let finalFromStream: any = null

    es.onmessage = ev => {
      try {
        const row = JSON.parse(ev.data)
        if (row.stage) {
          setStage(row.stage)
          setStageStartedAt(Date.now())
        }
        if (row.stage === 'done' && row.payload) {
          finalFromStream = row.payload
          setTurns(t => {
            const copy = [...t]
            const last = copy[copy.length - 1]
            if (last) {
              copy[copy.length - 1] = {
                ...last,
                agent_message: row.payload.reply ?? last.agent_message,
                intent: row.payload.intent ?? null,
                verdict: row.payload.verdict ?? null
              }
            }
            return copy
          })
          if (row.payload.verdict === 'pass' || row.payload.mastery === 'mastered') setMastery(true)
        }
      } catch {}
    }
    es.onerror = () => { es.close() }

    try {
      const res = await fetch('/api/tutor/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, sectionId, blockId, studentMessage: message, turnCorrelationId })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Tutor failed (${res.status})`)
      }
      const data = await res.json()
      // If SSE didn't already update the bubble (slower-arriving), do it now.
      if (!finalFromStream) {
        setTurns(t => {
          const copy = [...t]
          const last = copy[copy.length - 1]
          if (last) {
            copy[copy.length - 1] = {
              ...last,
              agent_message: data.reply ?? '(no reply)',
              intent: data.intent ?? null,
              verdict: data.verdict ?? null
            }
          }
          return copy
        })
        if (data.verdict === 'pass' || data.mastery === 'mastered') setMastery(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setTurns(t => t.slice(0, -1))
    } finally {
      setThinking(false)
      setStage(null)
      setStageStartedAt(null)
      closeStream()
    }
  }, [ensureSession, sectionId, blockId, thinking, mastery, turns, closeStream])

  const onEvaluate = useCallback(() => {
    const answer = getAnswer().trim()
    if (!answer) {
      setError('Write your answer first, then I can review it.')
      return
    }
    setError(null)
    setOpen(true)
    sendTurn(answer)
  }, [getAnswer, sendTurn])

  const onFollowUp = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const text = followUp.trim()
    if (!text) return
    setFollowUp('')
    sendTurn(text)
  }, [followUp, sendTurn])

  if (hasRubric === null) return null  // still loading
  if (!hasRubric) return null          // no rubric for this prompt — silent

  return (
    <div className="mt-3">
      {!open && turns.length === 0 && (
        <button
          onClick={onEvaluate}
          disabled={thinking}
          className="text-[12px] font-semibold uppercase tracking-[0.08em] px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 cursor-pointer"
          style={{
            background: '#0d0d0e',
            color: '#fafafa',
            border: '1px solid #c69a3f55'
          }}
        >
          <span style={{ color: '#c69a3f' }}>●</span> Evaluate my answer
        </button>
      )}

      {(open || turns.length > 0) && (
        <div
          className="rounded-xl overflow-hidden mt-1"
          style={{ background: '#0d0d0e', color: '#fafafa', border: '1px solid #c69a3f44' }}
        >
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/5">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#c69a3f' }}>
              Coach review
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white/80 text-[14px] cursor-pointer"
              aria-label="Collapse"
            >
              ×
            </button>
          </div>

          <div className="px-4 py-3 space-y-3">
            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                {t.student_message && (
                  <div className="flex justify-end">
                    <div className="rounded-lg px-3 py-2 text-[13px] leading-relaxed max-w-[85%]" style={{ background: '#2a2520', color: '#fafafa' }}>
                      {t.student_message}
                    </div>
                  </div>
                )}
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-2 text-[13px] leading-relaxed max-w-[90%]" style={{ background: '#1a1a1d', color: '#e8e3d4' }}>
                    {t.agent_message}
                  </div>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-[12px] flex items-center gap-2" style={{ background: '#1a1a1d', color: '#c69a3f' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#c69a3f' }} />
                  <span className="italic">{stage ? (STAGE_LABEL[stage] ?? stage) : 'Starting…'}</span>
                  {stageStartedAt && (
                    <span className="text-white/30 text-[10.5px] font-mono ml-1">
                      {Math.max(0, Math.floor((Date.now() - stageStartedAt) / 1000))}s
                    </span>
                  )}
                </div>
              </div>
            )}

            {mastery && (
              <div className="rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: 'linear-gradient(135deg, #2a2018 0%, #1a1a1d 100%)', border: '1px solid #c69a3f66' }}>
                <p className="font-semibold" style={{ color: '#c69a3f' }}>This one's locked in.</p>
                <p className="mt-0.5" style={{ color: '#cfcab8' }}>Move on when you're ready.</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: '#3a1d1d', color: '#f7c2c2', border: '1px solid #d9555533' }}>
                {error}
              </div>
            )}
          </div>

          {!mastery && (
            <form onSubmit={onFollowUp} className="border-t border-white/5 px-3 py-2 flex gap-2 items-center">
              {turns.length === 0 ? (
                <span className="flex-1 text-[12px] text-white/40">Tap to ask the coach to review your answer.</span>
              ) : (
                <input
                  type="text"
                  value={followUp}
                  onChange={e => setFollowUp(e.target.value)}
                  disabled={thinking}
                  placeholder="Reply to the coach…"
                  className="flex-1 bg-transparent text-[13px] focus:outline-none placeholder:text-white/30"
                  style={{ color: '#fafafa' }}
                />
              )}
              {turns.length === 0 ? (
                <button
                  type="button"
                  onClick={onEvaluate}
                  disabled={thinking}
                  className="rounded-md px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-wider disabled:opacity-30 cursor-pointer"
                  style={{ background: '#c69a3f', color: '#0d0d0e' }}
                >
                  Evaluate
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={thinking || !followUp.trim()}
                  className="rounded-md px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-wider disabled:opacity-30 cursor-pointer"
                  style={{ background: '#c69a3f', color: '#0d0d0e' }}
                >
                  Send
                </button>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
