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

const STAGE_LABEL: Record<string, string> = {
  loading: 'Reading your answer…',
  evaluating: 'Grading your reasoning…',
  responding: 'Composing feedback…'
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
  const abortRef = useRef<AbortController | null>(null)

  // Check rubric existence
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

  useEffect(() => () => abortRef.current?.abort(), [])

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

  const sendTurn = useCallback(async (message: string) => {
    if (!message.trim() || thinking || mastery) return
    setError(null)
    setThinking(true)
    setStage('loading')
    const sid = await ensureSession()
    if (!sid) { setThinking(false); setStage(null); return }

    // Optimistic: add empty agent bubble that we'll stream into.
    const turnNum = (turns[turns.length - 1]?.turn_number ?? 0) + 1
    setTurns(t => [...t, {
      turn_number: turnNum,
      student_message: message,
      agent_message: '',
      intent: null,
      verdict: null
    }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/tutor/evaluate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, sectionId, blockId, studentMessage: message }),
        signal: controller.signal
      })
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '')
        throw new Error(errText || `Stream failed (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // SSE messages are separated by \n\n
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.trim()) continue
          const line = part.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          let evt: any
          try { evt = JSON.parse(line.slice(6)) } catch { continue }

          if (evt.type === 'stage') {
            setStage(evt.stage)
          } else if (evt.type === 'token') {
            setTurns(t => {
              const copy = [...t]
              const last = copy[copy.length - 1]
              if (last) copy[copy.length - 1] = { ...last, agent_message: last.agent_message + evt.text }
              return copy
            })
          } else if (evt.type === 'eval') {
            setTurns(t => {
              const copy = [...t]
              const last = copy[copy.length - 1]
              if (last) copy[copy.length - 1] = { ...last, intent: evt.intent, verdict: evt.verdict }
              return copy
            })
          } else if (evt.type === 'final') {
            if (evt.verdict === 'pass' || evt.mastery === 'mastered') setMastery(true)
            setStage(null)
          } else if (evt.type === 'error') {
            throw new Error(evt.error || 'stream error')
          }
        }
      }
    } catch (e) {
      if ((e as any).name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Failed')
      setTurns(t => t.slice(0, -1))
    } finally {
      setThinking(false)
      setStage(null)
    }
  }, [ensureSession, sectionId, blockId, thinking, mastery, turns])

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

  if (hasRubric === null) return null
  if (!hasRubric) return null

  return (
    <div className="mt-3">
      {!open && turns.length === 0 && (
        <button
          onClick={onEvaluate}
          disabled={thinking}
          className="text-[12px] font-semibold uppercase tracking-[0.08em] px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 cursor-pointer"
          style={{ background: '#0d0d0e', color: '#fafafa', border: '1px solid #c69a3f55' }}
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
                    {t.agent_message || (
                      thinking && i === turns.length - 1 ? (
                        <span className="text-[12px] italic flex items-center gap-2" style={{ color: '#c69a3f' }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#c69a3f' }} />
                          {stage ? STAGE_LABEL[stage] ?? '' : 'Starting…'}
                        </span>
                      ) : null
                    )}
                    {thinking && i === turns.length - 1 && t.agent_message && (
                      <span className="inline-block w-1 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: '#c69a3f88' }} />
                    )}
                  </div>
                </div>
              </div>
            ))}

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
