'use client'

import { useCallback, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Turn = {
  id: string
  session_id: string
  turn_number: number
  student_message: string | null
  agent_message: string
  intent: string | null
  verdict: string | null
  shallow_pattern: string | null
  gap: string | null
  flagged_for_review: boolean
  flag_reason: string | null
  raw_evaluation: any
  raw_critic: any
  created_at: string
  tutor_sessions?: {
    user_id: string
    section_id: string
    sections?: {
      title?: string
      modules?: { title?: string; courses?: { title?: string } }
    }
  }
}

type Review = {
  turn_id: string
  judgement: 'agent_right' | 'agent_wrong' | 'verdict_wrong' | 'rubric_gap'
  note: string | null
  reviewer_id: string
  created_at: string
}

const JUDGEMENT_LABELS: Record<Review['judgement'], string> = {
  agent_right: 'Agent was right',
  agent_wrong: 'Agent was wrong',
  verdict_wrong: 'Verdict was wrong',
  rubric_gap: 'Rubric missing a pattern'
}

const JUDGEMENT_COLORS: Record<Review['judgement'], string> = {
  agent_right: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  agent_wrong: 'bg-rose-50 text-rose-800 border-rose-200',
  verdict_wrong: 'bg-amber-50 text-amber-800 border-amber-200',
  rubric_gap: 'bg-indigo-50 text-indigo-800 border-indigo-200'
}

export function TutorReviewList({
  turns,
  existingReviews
}: {
  turns: Turn[]
  existingReviews: Record<string, Review[]>
}) {
  const [reviews, setReviews] = useState(existingReviews)

  if (!turns.length) {
    return (
      <p className="text-[13px] text-[#888] italic py-4">Nothing in this bucket.</p>
    )
  }

  return (
    <div className="space-y-4">
      {turns.map(t => (
        <TurnCard
          key={t.id}
          turn={t}
          existing={reviews[t.id] || []}
          onSubmitted={review =>
            setReviews(r => ({ ...r, [t.id]: [...(r[t.id] || []), review] }))
          }
        />
      ))}
    </div>
  )
}

function TurnCard({
  turn,
  existing,
  onSubmitted
}: {
  turn: Turn
  existing: Review[]
  onSubmitted: (r: Review) => void
}) {
  const [judgement, setJudgement] = useState<Review['judgement'] | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const courseTitle = turn.tutor_sessions?.sections?.modules?.courses?.title
  const moduleTitle = turn.tutor_sessions?.sections?.modules?.title
  const sectionTitle = turn.tutor_sessions?.sections?.title

  const criticIssues: string[] = useMemo(() => {
    const c = turn.raw_critic
    if (Array.isArray(c?.issues)) return c.issues
    if (turn.flag_reason) return [turn.flag_reason]
    return []
  }, [turn])

  const submit = useCallback(async () => {
    if (!judgement || saving) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error: insErr, data } = await supabase
        .from('tutor_reviews')
        .upsert(
          { turn_id: turn.id, reviewer_id: user.id, judgement, note: note.trim() || null },
          { onConflict: 'turn_id,reviewer_id' }
        )
        .select()
        .single()
      if (insErr) throw insErr
      onSubmitted(data as Review)
      setNote('')
      setJudgement(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }, [judgement, note, turn.id, saving, onSubmitted])

  return (
    <article className="bg-white border border-[#e8e8e8] rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#999]">
          {courseTitle ? `${courseTitle} · ` : ''}
          {moduleTitle ? `${moduleTitle} · ` : ''}
          {sectionTitle || 'Section'} · Turn {turn.turn_number}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#aaa]">
          <Badge tone={turn.verdict === 'pass' ? 'good' : turn.verdict === 'wrong' ? 'bad' : 'warn'}>
            {turn.intent || 'unknown'} → {turn.verdict || '—'}
          </Badge>
          {turn.flagged_for_review && <Badge tone="bad">flagged</Badge>}
        </div>
      </div>

      {turn.student_message && (
        <div className="rounded-md bg-[#fafafa] border border-[#eee] px-3.5 py-2.5">
          <p className="text-[10.5px] uppercase tracking-[0.08em] text-[#aaa] mb-1">Student</p>
          <p className="text-[13.5px] text-[#222] leading-relaxed whitespace-pre-wrap">{turn.student_message}</p>
        </div>
      )}

      <div className="rounded-md bg-[#0d0d0e] text-[#fafafa] px-3.5 py-2.5">
        <p className="text-[10.5px] uppercase tracking-[0.08em] text-[#c69a3f] mb-1">Agent</p>
        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{turn.agent_message}</p>
      </div>

      {turn.gap && (
        <p className="text-[12px] text-[#666]">
          <span className="font-semibold text-[#111]">Gap (evaluator):</span> {turn.gap}
        </p>
      )}

      {criticIssues.length > 0 && (
        <div className="text-[12px] text-[#922] bg-rose-50 border border-rose-100 rounded-md px-3.5 py-2">
          <p className="font-semibold mb-1">Critic flagged:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {criticIssues.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        </div>
      )}

      {existing.length > 0 && (
        <div className="text-[12px] text-[#444] bg-[#fafafa] border border-[#eee] rounded-md px-3.5 py-2 space-y-1">
          <p className="font-semibold uppercase tracking-[0.08em] text-[10.5px] text-[#888]">Reviews</p>
          {existing.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`inline-block text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded border ${JUDGEMENT_COLORS[r.judgement]}`}>
                {JUDGEMENT_LABELS[r.judgement]}
              </span>
              {r.note && <span className="text-[12px] text-[#444]">{r.note}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-[#f0f0f0] space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(JUDGEMENT_LABELS) as [Review['judgement'], string][]).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setJudgement(k)}
              className={`text-[11.5px] px-2.5 py-1 rounded border transition-colors ${
                judgement === k
                  ? 'bg-[#111] text-white border-[#111]'
                  : 'bg-white text-[#444] border-[#ddd] hover:border-[#999]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Optional note (what the right reply would have been, or which pattern is missing from the rubric)"
          className="w-full text-[12.5px] border border-[#ddd] rounded-md px-3 py-2 focus:outline-none focus:border-[#111]"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!judgement || saving}
            className="text-[12px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded bg-[#111] text-white disabled:opacity-30 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save review'}
          </button>
          {error && <span className="text-[11.5px] text-rose-600">{error}</span>}
        </div>
      </div>
    </article>
  )
}

function Badge({ tone, children }: { tone: 'good' | 'bad' | 'warn'; children: React.ReactNode }) {
  const cls =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'bad'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>
      {children}
    </span>
  )
}
