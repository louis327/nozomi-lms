import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageTopbar } from '@/components/layout/page-topbar'
import { ProgressRing } from '@/components/ui/progress-ring'
import { CourseThumb } from '@/components/ui/course-thumb'
import { AiCoach } from '@/components/dashboard/ai-coach'
import { buildRaiseSnapshot, formatCountdown, type OnboardingData } from '@/lib/raise-context'
import { CheckCircle2, Circle, FileText, ArrowRight, Target } from 'lucide-react'

export const metadata = { title: 'Dashboard — Nozomi' }

function formatDateLine(d = new Date()) {
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase()
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toUpperCase()
  return `${day} · ${date}`
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
  let deliverables: { id: string; module_id: string; label: string; sort_order: number }[] = []
  let sectionProgress: Record<string, { completed: boolean; completed_at: string | null }> = {}
  let moduleProgressMap: Record<string, { completed: boolean }> = {}
  let recentNotes: {
    id: string
    content: string
    updated_at: string
    section_id: string
    section_title: string
    module_id: string
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

      const [{ data: sections }, { data: dels }, { data: modProg }] = await Promise.all([
        supabase
          .from('sections')
          .select('id, module_id, title, sort_order')
          .in('module_id', moduleIds)
          .order('sort_order'),
        supabase
          .from('module_deliverables')
          .select('id, module_id, label, sort_order')
          .in('module_id', moduleIds)
          .order('sort_order'),
        supabase
          .from('module_progress')
          .select('module_id, completed')
          .eq('user_id', user.id)
          .in('module_id', moduleIds),
      ])

      sectionRows = sections ?? []
      deliverables = dels ?? []
      for (const p of modProg ?? []) {
        moduleProgressMap[p.module_id] = { completed: p.completed }
      }

      if (sectionRows.length > 0) {
        const sectionIds = sectionRows.map((s) => s.id)
        const [{ data: secProg }, { data: notes }] = await Promise.all([
          supabase
            .from('section_progress')
            .select('section_id, completed, completed_at')
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
          sectionProgress[p.section_id] = {
            completed: p.completed,
            completed_at: p.completed_at,
          }
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
              module_id: sec.module_id,
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

  const deliverablesByModule = new Map<string, typeof deliverables>()
  for (const d of deliverables) {
    const arr = deliverablesByModule.get(d.module_id) ?? []
    arr.push(d)
    deliverablesByModule.set(d.module_id, arr)
  }

  const totalDeliverables = deliverables.length
  const completedDeliverables = deliverables.filter(
    (d) => moduleProgressMap[d.module_id]?.completed
  ).length

  return (
    <div className="px-6 lg:px-10 pb-16">
      <PageTopbar breadcrumb={[{ label: 'Nozomi', href: '/dashboard' }, { label: 'Dashboard' }]} />

      {/* Hero */}
      <section className="mt-6 mb-10">
        <p className="eyebrow mb-5">
          {formatDateLine()} · {displayName.toUpperCase()}&rsquo;S RAISE
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <h1 className="display text-[48px] md:text-[60px] mb-4 max-w-3xl">
              <em>{countdown}.</em>
            </h1>
            <p className="text-[14px] text-ink-soft max-w-xl leading-relaxed">
              {snap.stage || snap.projectType ? (
                <>
                  {[snap.stage, snap.projectType].filter(Boolean).join(' · ')}
                  {snap.raiseAmount && <> · Raising {snap.raiseAmount}</>}
                  {snap.targetValuation && <> at {snap.targetValuation}</>}
                </>
              ) : (
                <>Complete your onboarding to tailor your dashboard to your raise.</>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <div className="bg-surface border border-line rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.16em] mb-1">
                Raising
              </p>
              <p className="text-[18px] font-semibold text-ink">
                {snap.raiseAmount || '—'}
              </p>
            </div>
            <div className="bg-surface border border-line rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.16em] mb-1">
                Valuation
              </p>
              <p className="text-[18px] font-semibold text-ink">
                {snap.targetValuation || '—'}
              </p>
            </div>
            <div className="bg-surface border border-line rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.16em] mb-1">
                Status
              </p>
              <p className="text-[14px] font-semibold text-ink leading-tight">
                {snap.raiseStatus || 'Not set'}
              </p>
            </div>
            <div className="bg-surface border border-line rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.16em] mb-1">
                Team
              </p>
              <p className="text-[14px] font-semibold text-ink leading-tight">
                {snap.teamSize || '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blocker + Course progress */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 mb-6">
        <div className="bg-surface-dark text-ink-inverted rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-accent" strokeWidth={1.8} />
            <p className="text-[10.5px] font-semibold text-white/55 uppercase tracking-[0.16em]">
              Your biggest blocker
            </p>
          </div>
          {snap.biggestBlocker ? (
            <>
              <p className="font-serif text-[22px] md:text-[26px] text-white leading-snug mb-auto">
                &ldquo;{snap.biggestBlocker}&rdquo;
              </p>
              <p className="text-[13px] text-white/55 leading-relaxed mt-5">
                Ask your coach below for a concrete plan to move past this.
              </p>
            </>
          ) : (
            <p className="font-serif text-[20px] text-white/80 leading-snug">
              Tell your coach what&rsquo;s in your way and get a specific plan back.
            </p>
          )}
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6">
          {primaryCourse ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.16em] mb-1">
                    Your course
                  </p>
                  <h2 className="font-serif text-[20px] text-ink leading-tight">
                    {primaryCourse.title}
                  </h2>
                </div>
                <ProgressRing value={pct} size={56} stroke={4} showLabel />
              </div>
              <p className="text-[12.5px] text-ink-muted mb-5">
                {completedSections} of {totalSections} sections complete
              </p>
              <Link
                href={resumeHref}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium rounded-full bg-ink text-white hover:bg-black transition-colors"
              >
                {firstIncomplete ? 'Continue learning' : 'Review course'}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </>
          ) : (
            <div className="py-6">
              <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.16em] mb-1">
                No course yet
              </p>
              <h2 className="font-serif text-[20px] text-ink leading-tight mb-3">
                Get the Nozomi playbook
              </h2>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium rounded-full bg-ink text-white hover:bg-black transition-colors"
              >
                Browse courses
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Deliverables + Notes */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 mb-6">
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-[22px] text-ink leading-tight">Module deliverables</h2>
              <p className="text-[12px] text-ink-muted mt-0.5">
                {totalDeliverables > 0
                  ? `${completedDeliverables} of ${totalDeliverables} complete`
                  : 'Work products you&rsquo;ll produce'}
              </p>
            </div>
          </div>

          {moduleRows.length === 0 ? (
            <p className="text-[13px] text-ink-muted italic py-4">
              Enroll in a course to see deliverables.
            </p>
          ) : (
            <div className="space-y-5">
              {moduleRows.map((mod) => {
                const mods = deliverablesByModule.get(mod.id) ?? []
                const modComplete = moduleProgressMap[mod.id]?.completed
                if (mods.length === 0) return null
                return (
                  <div key={mod.id}>
                    <div className="flex items-center gap-2 mb-2">
                      {modComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-accent" strokeWidth={1.8} />
                      ) : (
                        <Circle className="w-4 h-4 text-ink-faint" strokeWidth={1.5} />
                      )}
                      <p className="text-[13px] font-semibold text-ink">{mod.title}</p>
                    </div>
                    <ul className="pl-6 space-y-1.5">
                      {mods.map((d) => (
                        <li
                          key={d.id}
                          className={`text-[13px] leading-relaxed ${
                            modComplete ? 'text-ink-muted line-through' : 'text-ink-soft'
                          }`}
                        >
                          {d.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              {deliverables.length === 0 && (
                <p className="text-[13px] text-ink-muted italic">
                  This course doesn&rsquo;t have deliverables defined yet.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-4 h-4 text-ink-soft" strokeWidth={1.6} />
            <h2 className="font-serif text-[20px] text-ink leading-tight">Recent notes</h2>
          </div>

          {recentNotes.length === 0 ? (
            <p className="text-[12.5px] text-ink-muted italic leading-relaxed">
              Jot thoughts while you read. Your notes will surface here.
            </p>
          ) : (
            <div className="space-y-4">
              {recentNotes.map((n) => {
                const text = stripHtml(n.content)
                const preview = text.length > 120 ? `${text.slice(0, 120).trim()}…` : text
                return (
                  <Link
                    key={n.id}
                    href={primaryCourse ? `/courses/${primaryCourse.id}/learn/${n.section_id}` : '#'}
                    className="block group"
                  >
                    <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.14em] mb-1 group-hover:text-accent transition-colors">
                      {n.section_title}
                    </p>
                    <p className="text-[13px] text-ink-soft leading-relaxed line-clamp-2">
                      {preview || 'Empty note'}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Coach */}
      <section className="mb-6">
        <AiCoach starters={starters} />
      </section>

      {/* Raise context footer */}
      {(snap.projectDescription || snap.competitiveAdvantage) && (
        <section className="bg-canvas border border-line-soft rounded-2xl p-6">
          <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.16em] mb-4">
            Your pitch, as you told us
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {snap.projectDescription && (
              <div>
                <p className="text-[11px] font-semibold text-ink uppercase tracking-[0.1em] mb-1.5">
                  What you&rsquo;re building
                </p>
                <p className="text-[13.5px] text-ink-soft leading-relaxed">
                  {snap.projectDescription}
                </p>
              </div>
            )}
            {snap.competitiveAdvantage && (
              <div>
                <p className="text-[11px] font-semibold text-ink uppercase tracking-[0.1em] mb-1.5">
                  Your edge
                </p>
                <p className="text-[13.5px] text-ink-soft leading-relaxed">
                  {snap.competitiveAdvantage}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  )
}
