import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageTopbar } from '@/components/layout/page-topbar'
import { AiCoach } from '@/components/dashboard/ai-coach'
import { buildRaiseSnapshot, formatCountdown, type OnboardingData } from '@/lib/raise-context'
import { ArrowUpRight } from 'lucide-react'

export const metadata = { title: 'Dashboard — Nozomi' }

function formatMasthead(d = new Date()) {
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase()
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toUpperCase()
  return `${day} \u00B7 ${date}`
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function buildStarters(snap: ReturnType<typeof buildRaiseSnapshot>): string[] {
  const starters: string[] = []
  if (snap.biggestBlocker) {
    starters.push(`How do I unblock: "${snap.biggestBlocker}"?`)
  }
  if (snap.raiseStatus && snap.raiseStatus.toLowerCase().includes('not')) {
    starters.push('What should I do this week to kick off my raise?')
  } else {
    starters.push('What should my next 3 days look like?')
  }
  if (snap.targetValuation) {
    starters.push('Is my target valuation realistic for my stage?')
  } else {
    starters.push('How should I think about valuation for this round?')
  }
  starters.push('Draft a cold intro message to a sector-fit investor.')
  return starters.slice(0, 4)
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, onboarding_data')
    .eq('id', user.id)
    .single()

  const displayName =
    profile?.full_name?.split(' ')[0] ??
    user.email?.split('@')[0] ??
    'Founder'

  const snap = buildRaiseSnapshot(profile?.onboarding_data as OnboardingData | null)
  const starters = buildStarters(snap)
  const countdown = formatCountdown(snap)

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course_id, enrolled_at, courses(id, title, description, cover_image)')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  type EnrollmentRow = {
    id: string
    course_id: string
    enrolled_at: string
    courses: { id: string; title: string; description: string | null; cover_image: string | null } | null
  }
  const enrollmentRows = (enrollments ?? []) as unknown as EnrollmentRow[]
  const primary = enrollmentRows[0]
  const primaryCourse = primary?.courses ?? null

  let moduleRows: { id: string; title: string; sort_order: number }[] = []
  let sectionRows: { id: string; module_id: string; title: string; sort_order: number }[] = []
  const sectionProgress: Record<string, { completed: boolean }> = {}
  let recentNotes: {
    id: string
    content: string
    updated_at: string
    section_id: string
    section_title: string
  }[] = []

  if (primaryCourse) {
    const { data: modules } = await supabase
      .from('modules')
      .select('id, title, sort_order')
      .eq('course_id', primaryCourse.id)
      .order('sort_order')
    moduleRows = modules ?? []

    if (moduleRows.length > 0) {
      const moduleIds = moduleRows.map((m) => m.id)

      const { data: sections } = await supabase
        .from('sections')
        .select('id, module_id, title, sort_order')
        .in('module_id', moduleIds)
        .order('sort_order')
      sectionRows = sections ?? []

      if (sectionRows.length > 0) {
        const sectionIds = sectionRows.map((s) => s.id)
        const [{ data: secProg }, { data: notes }] = await Promise.all([
          supabase
            .from('section_progress')
            .select('section_id, completed')
            .eq('user_id', user.id)
            .in('section_id', sectionIds),
          supabase
            .from('section_notes')
            .select('id, content, updated_at, section_id')
            .eq('user_id', user.id)
            .in('section_id', sectionIds)
            .order('updated_at', { ascending: false })
            .limit(3),
        ])
        for (const p of secProg ?? []) {
          sectionProgress[p.section_id] = { completed: p.completed }
        }

        const sectionById = new Map(sectionRows.map((s) => [s.id, s]))
        recentNotes = (notes ?? [])
          .map((n) => {
            const sec = sectionById.get(n.section_id)
            if (!sec) return null
            return {
              id: n.id,
              content: n.content,
              updated_at: n.updated_at,
              section_id: n.section_id,
              section_title: sec.title,
            }
          })
          .filter((n): n is NonNullable<typeof n> => n !== null)
      }
    }
  }

  const totalSections = sectionRows.length
  const completedSections = Object.values(sectionProgress).filter((p) => p.completed).length
  const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

  const sectionsByModule = new Map<string, typeof sectionRows>()
  for (const s of sectionRows) {
    const arr = sectionsByModule.get(s.module_id) ?? []
    arr.push(s)
    sectionsByModule.set(s.module_id, arr)
  }

  const firstIncomplete = sectionRows.find((s) => !sectionProgress[s.id]?.completed)
  const resumeHref = primaryCourse
    ? firstIncomplete
      ? `/courses/${primaryCourse.id}/learn/${firstIncomplete.id}`
      : `/courses/${primaryCourse.id}`
    : '/courses'

  const metaBits = [
    snap.stage,
    snap.projectType,
    snap.targetValuation && `${snap.targetValuation} cap`,
    snap.cofounders,
    snap.teamSize && `team of ${snap.teamSize}`,
  ].filter(Boolean) as string[]

  return (
    <div className="pb-24">
      <PageTopbar breadcrumb={[{ label: 'Nozomi', href: '/dashboard' }, { label: 'Dashboard' }]} />

      {/* ─── MASTHEAD ─── */}
      <div className="px-6 lg:px-12 pt-8 pb-6">
        <div className="flex items-center gap-3 text-[10.5px] font-semibold tracking-[0.32em] text-ink-muted uppercase">
          <span>{formatMasthead()}</span>
          <span className="w-[20px] h-px bg-line-strong" />
          <span>{displayName.toUpperCase()}&rsquo;S RAISE</span>
        </div>
      </div>

      {/* ─── HERO: THE COUNTDOWN ─── */}
      <section className="px-6 lg:px-12 pt-2 pb-14">
        <h1
          className="text-ink mb-8 max-w-[16ch]"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(56px, 9vw, 128px)',
            lineHeight: 0.95,
            letterSpacing: '-0.038em',
          }}
        >
          {countdown.includes('to close') ? (
            <>
              {countdown.replace(' to close', '')}<span className="text-ink-soft"> to close</span>
              <span className="text-accent">.</span>
            </>
          ) : (
            <>{countdown}<span className="text-accent">.</span></>
          )}
        </h1>

        {metaBits.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 max-w-4xl">
            {metaBits.map((bit, i) => (
              <div key={i} className="flex items-center gap-5">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-line-strong" />}
                <span className="text-[13.5px] text-ink-soft tracking-wide">{bit}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-ink-soft max-w-xl">
            Your onboarding sets up this view.{' '}
            <Link href="/onboarding?redo=1" className="text-accent hover:underline">
              Fill it in →
            </Link>
          </p>
        )}
      </section>

      {/* ─── BLOCKER PULLQUOTE ─── */}
      {snap.biggestBlocker && (
        <>
          <div className="px-6 lg:px-12">
            <div className="border-t border-line" />
          </div>
          <section className="px-6 lg:px-12 py-14">
            <div className="max-w-[1100px]">
              <p className="text-[11px] font-semibold tracking-[0.32em] text-accent uppercase mb-8">
                What&rsquo;s in the way
              </p>
              <div className="relative pl-6 md:pl-10 mb-6">
                <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-accent" />
                <p
                  className="text-ink max-w-[44ch]"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    fontStyle: 'italic',
                    fontSize: 'clamp(26px, 3.6vw, 44px)',
                    lineHeight: 1.18,
                    letterSpacing: '-0.018em',
                  }}
                >
                  &ldquo;{snap.biggestBlocker}&rdquo;
                </p>
              </div>
              <p className="text-[12.5px] text-ink-muted max-w-[44ch] leading-relaxed pl-6 md:pl-10">
                Your self-reported blocker. Ask your coach below for a specific plan to move past this.
              </p>
            </div>
          </section>
        </>
      )}

      {/* ─── COACH (primary action) ─── */}
      <div className="px-6 lg:px-12">
        <div className="border-t border-line" />
      </div>
      <section className="px-6 lg:px-12 py-10">
        <div className="flex items-baseline justify-between gap-6 mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.32em] text-ink-muted uppercase mb-2">
              Your coach
            </p>
            <h2
              className="text-ink"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 'clamp(28px, 3.2vw, 40px)',
                lineHeight: 1.05,
                letterSpacing: '-0.022em',
              }}
            >
              Ask anything about your raise.
            </h2>
          </div>
        </div>
        <AiCoach starters={starters} />
      </section>

      {/* ─── WORK / PROGRESS ─── */}
      {primaryCourse && (
        <>
          <div className="px-6 lg:px-12">
            <div className="border-t border-line" />
          </div>
          <section className="px-6 lg:px-12 py-14">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-start">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.32em] text-ink-muted uppercase mb-3">
                  The work
                </p>
                <h2
                  className="text-ink mb-3 max-w-[20ch]"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 700,
                    fontStyle: 'italic',
                    fontSize: 'clamp(32px, 4vw, 52px)',
                    lineHeight: 1.02,
                    letterSpacing: '-0.025em',
                  }}
                >
                  {primaryCourse.title}
                </h2>
                <p className="text-[13.5px] text-ink-soft mb-6">
                  {completedSections} of {totalSections} sections complete
                </p>
                <Link
                  href={resumeHref}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-accent hover:text-accent-deep transition-colors group"
                >
                  {firstIncomplete ? 'Continue where you left off' : 'Review course'}
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
                </Link>
              </div>

              <div className="flex items-center gap-5">
                <div
                  className="tabular-nums text-ink"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 700,
                    fontStyle: 'italic',
                    fontSize: 'clamp(64px, 7vw, 108px)',
                    lineHeight: 0.9,
                    letterSpacing: '-0.04em',
                  }}
                >
                  {pct}
                  <span className="text-ink-faint text-[0.5em]">%</span>
                </div>
              </div>
            </div>

            {/* Module list */}
            {moduleRows.length > 0 && (
              <div className="mt-12 max-w-4xl">
                <ul className="divide-y divide-line">
                  {moduleRows.map((mod, i) => {
                    const mods = sectionsByModule.get(mod.id) ?? []
                    const done = mods.filter((s) => sectionProgress[s.id]?.completed).length
                    const total = mods.length
                    const complete = total > 0 && done === total
                    const firstMod = mods.find((s) => !sectionProgress[s.id]?.completed) ?? mods[0]
                    return (
                      <li key={mod.id}>
                        <Link
                          href={firstMod ? `/courses/${primaryCourse.id}/learn/${firstMod.id}` : `/courses/${primaryCourse.id}`}
                          className="group flex items-center gap-5 py-4 hover:bg-surface-muted/50 -mx-3 px-3 rounded-lg transition-colors"
                        >
                          <span className="text-[11px] font-mono tabular-nums text-ink-faint w-8">
                            M{String(i + 1).padStart(2, '0')}
                          </span>
                          <span className={`flex-1 text-[15px] leading-snug ${complete ? 'text-ink-muted line-through' : 'text-ink group-hover:text-accent-deep'} transition-colors`}>
                            {mod.title}
                          </span>
                          <div className="flex items-center gap-1" aria-label={`${done} of ${total} sections complete`}>
                            {mods.map((s) => (
                              <span
                                key={s.id}
                                className={`w-[18px] h-[3px] rounded-full ${
                                  sectionProgress[s.id]?.completed ? 'bg-accent' : 'bg-line-strong'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11.5px] tabular-nums text-ink-muted w-12 text-right">
                            {done}/{total}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>
        </>
      )}

      {/* ─── NOTES ─── */}
      {recentNotes.length > 0 && (
        <>
          <div className="px-6 lg:px-12">
            <div className="border-t border-line" />
          </div>
          <section className="px-6 lg:px-12 py-14">
            <p className="text-[11px] font-semibold tracking-[0.32em] text-ink-muted uppercase mb-8">
              Recent notes
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
              {recentNotes.map((n) => {
                const text = stripHtml(n.content)
                const preview = text.length > 140 ? `${text.slice(0, 140).trim()}…` : text
                return (
                  <Link
                    key={n.id}
                    href={primaryCourse ? `/courses/${primaryCourse.id}/learn/${n.section_id}` : '#'}
                    className="group block"
                  >
                    <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.18em] mb-2 group-hover:text-accent transition-colors">
                      {n.section_title}
                    </p>
                    <p className="text-[13.5px] text-ink-soft leading-[1.5] line-clamp-4">
                      {preview || 'Empty note'}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        </>
      )}

      {/* ─── PITCH CONTEXT FOOTER ─── */}
      {(snap.projectDescription || snap.competitiveAdvantage) && (
        <>
          <div className="px-6 lg:px-12">
            <div className="border-t border-line" />
          </div>
          <section className="px-6 lg:px-12 py-14">
            <p className="text-[11px] font-semibold tracking-[0.32em] text-ink-muted uppercase mb-8">
              Your pitch, as you told us
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl">
              {snap.projectDescription && (
                <div>
                  <p className="text-[10.5px] font-semibold text-ink uppercase tracking-[0.18em] mb-2">
                    What you&rsquo;re building
                  </p>
                  <p className="text-[15px] text-ink-soft leading-[1.55] font-serif italic">
                    &ldquo;{snap.projectDescription}&rdquo;
                  </p>
                </div>
              )}
              {snap.competitiveAdvantage && (
                <div>
                  <p className="text-[10.5px] font-semibold text-ink uppercase tracking-[0.18em] mb-2">
                    Your edge
                  </p>
                  <p className="text-[15px] text-ink-soft leading-[1.55] font-serif italic">
                    &ldquo;{snap.competitiveAdvantage}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
