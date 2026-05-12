import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type Turn = {
  intent: string | null
  verdict: string | null
  shallow_pattern: string | null
  flagged_for_review: boolean
  created_at: string
  // PostgREST embed shape is dynamic — we access defensively below.
  tutor_sessions: any
}

type RubricLite = {
  block_id: string
  section_id: string
  shallow_patterns: any[]
  wrong_patterns: any[]
}

export default async function MisconceptionsPage() {
  const supabase = createAdminClient()

  const [{ data: turns }, { data: rubrics }, { data: mastery }] = await Promise.all([
    supabase
      .from('tutor_turns')
      .select(`
        intent, verdict, shallow_pattern, flagged_for_review, created_at,
        tutor_sessions ( section_id, sections ( title, modules ( title, courses ( title ) ) ) )
      `)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('tutor_rubrics')
      .select('block_id, section_id, shallow_patterns, wrong_patterns')
      .eq('status', 'approved'),
    supabase
      .from('tutor_mastery')
      .select('section_id, status')
  ])

  const turnsList = (turns ?? []) as Turn[]
  const rubricsList = (rubrics ?? []) as RubricLite[]
  const masteryList = (mastery ?? []) as Array<{ section_id: string; status: string }>

  // Pattern → human-readable description (look up from rubric)
  const patternDescByPattern = new Map<string, string>()
  for (const r of rubricsList) {
    for (const p of (r.shallow_patterns || [])) if (p?.id) patternDescByPattern.set(p.id, p.pattern || p.id)
    for (const p of (r.wrong_patterns || [])) if (p?.id) patternDescByPattern.set(p.id, p.pattern || p.id)
  }

  // Aggregate
  const patternCounts = new Map<string, { count: number; sections: Set<string> }>()
  let answers = 0
  let passes = 0
  let shallows = 0
  let wrongs = 0
  let partials = 0
  let flagged = 0

  for (const t of turnsList) {
    if (t.intent === 'answer') answers++
    if (t.verdict === 'pass') passes++
    if (t.verdict === 'shallow') shallows++
    if (t.verdict === 'wrong') wrongs++
    if (t.verdict === 'partial') partials++
    if (t.flagged_for_review) flagged++
    if (t.shallow_pattern) {
      const entry = patternCounts.get(t.shallow_pattern) ?? { count: 0, sections: new Set<string>() }
      entry.count++
      const ts = t.tutor_sessions
      const session = Array.isArray(ts) ? ts[0] : ts
      const sec = Array.isArray(session?.sections) ? session?.sections[0] : session?.sections
      const secTitle: string | undefined = sec?.title
      if (secTitle) entry.sections.add(secTitle)
      patternCounts.set(t.shallow_pattern, entry)
    }
  }

  const topPatterns = Array.from(patternCounts.entries())
    .map(([id, v]) => ({ id, count: v.count, sections: Array.from(v.sections), description: patternDescByPattern.get(id) ?? id }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)

  const masteryCount = masteryList.filter(m => m.status === 'mastered').length
  const masteryRate = masteryList.length ? Math.round(100 * masteryCount / masteryList.length) : 0

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[24px] font-heading font-bold text-[#111] tracking-[-0.02em]">Misconceptions</h1>
        <p className="text-[13.5px] text-[#666] mt-1 max-w-[680px]">
          Where students get stuck across the course. Patterns that fire often = candidates for course content improvement.
          Anything new firing at a high rate may indicate the rubric is over-triggering — worth a review.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
          <Stat label="Turns" value={turnsList.length} tone="muted" />
          <Stat label="Answers" value={answers} tone="muted" />
          <Stat label="Passes" value={passes} tone="good" />
          <Stat label="Shallow" value={shallows} tone="warn" />
          <Stat label="Wrong" value={wrongs} tone="warn" />
          <Stat label="Partial" value={partials} tone="warn" />
          <Stat label="Flagged" value={flagged} tone="bad" />
          <Stat label={`Mastery (${masteryCount}/${masteryList.length})`} value={masteryRate} suffix="%" tone="good" />
        </div>
      </header>

      <section>
        <h2 className="text-[14px] font-semibold text-[#111] uppercase tracking-[0.08em] mb-3">
          Top patterns hit · {topPatterns.length}
        </h2>
        {topPatterns.length === 0 ? (
          <p className="text-[13px] text-[#888] italic py-4">No misconception data yet — students need to use the Coach first.</p>
        ) : (
          <div className="space-y-2">
            {topPatterns.map(p => (
              <article key={p.id} className="bg-white border border-[#e8e8e8] rounded-lg px-4 py-3 flex items-start gap-4">
                <div className="text-[18px] font-heading font-bold text-[#111] tabular-nums w-12 shrink-0">{p.count}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[#888] font-semibold">{p.id}</p>
                  <p className="text-[13px] text-[#222] mt-0.5 line-clamp-2">{p.description}</p>
                  {p.sections.length > 0 && (
                    <p className="text-[11.5px] text-[#888] mt-1.5">
                      In: {p.sections.slice(0, 4).join(' · ')}{p.sections.length > 4 ? ` +${p.sections.length - 4} more` : ''}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone: 'good' | 'warn' | 'muted' | 'bad' }) {
  const cls =
    tone === 'good' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : tone === 'warn' ? 'bg-amber-50 text-amber-800 border-amber-200'
    : tone === 'bad' ? 'bg-rose-50 text-rose-800 border-rose-200'
    : 'bg-[#fafafa] text-[#666] border-[#eee]'
  return (
    <span className={`inline-block px-2.5 py-1 rounded border ${cls}`}>
      <span className="font-semibold mr-1">{value}{suffix ?? ''}</span>
      <span className="uppercase tracking-wider text-[10.5px]">{label}</span>
    </span>
  )
}
