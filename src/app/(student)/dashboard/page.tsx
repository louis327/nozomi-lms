import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buildRaiseSnapshot, type OnboardingData } from '@/lib/raise-context'
import type { Course } from '@/lib/types'
import { ArrowUpRight, Check, ArrowRight, BookOpen } from 'lucide-react'

export const metadata = { title: 'Dashboard — Nozomi' }

const PANEL =
  'rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]'
const EYEBROW =
  'text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink-muted'

function greeting(d: Date) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const FUNNEL = [
  { label: 'Plan', desc: 'Strategy & targets', match: (s: string) => s.includes('haven') && s.includes('thinking') },
  { label: 'Deck', desc: 'Narrative & materials', match: (s: string) => (s.includes('building the plan') && s.includes('not ready')) || (s.includes('deck ready') && s.includes('haven')) },
  { label: 'Outreach', desc: 'Warm intros & first meetings', match: (s: string) => s.includes('first few meetings') },
  { label: 'Pitching', desc: 'Actively in meetings', match: (s: string) => s.includes('actively pitching') || (s.includes('pitched') && s.includes('conversion')) },
  { label: 'Commits', desc: 'Soft circles & term sheets', match: (s: string) => s.includes('soft commit') || s.includes('trying to close') },
  { label: 'Closed', desc: 'Round in the bank', match: (s: string) => s.includes('recently closed') || s.includes('next round') },
]

function funnelIndex(status: string | null): number {
  if (!status) return -1
  const s = status.toLowerCase()
  for (let i = 0; i < FUNNEL.length; i++) if (FUNNEL[i].match(s)) return i
  return -1
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
    profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Founder'

  const snap = buildRaiseSnapshot(profile?.onboarding_data as OnboardingData | null)

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
  const primaryCourse = enrollmentRows[0]?.courses ?? null
  const hasEnrollment = !!primaryCourse

  let moduleRows: { id: string; title: string; sort_order: number }[] = []
  let sectionRows: { id: string; module_id: string; title: string; sort_order: number }[] = []
  const sectionProgress: Record<string, { completed: boolean }> = {}

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
        const { data: secProg } = await supabase
          .from('section_progress')
          .select('section_id, completed')
          .eq('user_id', user.id)
          .in('section_id', sectionIds)
        for (const p of secProg ?? []) sectionProgress[p.section_id] = { completed: p.completed }
      }
    }
  }

  const totalSections = sectionRows.length
  const completedSections = Object.values(sectionProgress).filter((p) => p.completed).length
  const pct = totalSections ? Math.round((completedSections / totalSections) * 100) : 0

  const firstIncomplete = sectionRows.find((s) => !sectionProgress[s.id]?.completed)
  const nextSectionTitle = firstIncomplete?.title ?? null
  const nextModule = firstIncomplete
    ? moduleRows.find((m) => m.id === firstIncomplete.module_id) ?? null
    : null
  const nextModuleIndex = nextModule ? moduleRows.findIndex((m) => m.id === nextModule.id) : null
  const resumeHref = primaryCourse
    ? firstIncomplete
      ? `/courses/${primaryCourse.id}/learn/${firstIncomplete.id}`
      : `/courses/${primaryCourse.id}`
    : '/courses'

  const moduleProgress = moduleRows.map((m) => {
    const secs = sectionRows.filter((s) => s.module_id === m.id)
    const done = secs.filter((s) => sectionProgress[s.id]?.completed).length
    return { id: m.id, title: m.title, done, total: secs.length }
  })

  const cur = funnelIndex(snap.raiseStatus)
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Featured courses for users with no enrollment.
  let featuredCourses: (Course & { moduleCount: number; sectionTotal: number })[] = []
  if (!hasEnrollment) {
    const { data: featured } = await supabase
      .from('courses')
      .select('*, modules(id, sections(id))')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .limit(3)
    featuredCourses = ((featured ?? []) as (Course & { modules: { id: string; sections: { id: string }[] }[] })[]).map((c) => ({
      ...c,
      moduleCount: c.modules?.length ?? 0,
      sectionTotal: c.modules?.flatMap((m) => m.sections?.map((s) => s.id) ?? [])?.length ?? 0,
    }))
  }

  return (
    <div className="px-6 pb-16 pt-8 lg:px-10">
      {/* Header */}
      <div data-tour="dashboard-greeting" className="mb-7 flex items-end justify-between gap-6">
        <div>
          <p className="mb-1.5 text-[13.5px] text-ink-muted">{dateLabel}</p>
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-ink">
            {greeting(now)}, {displayName}
          </h1>
        </div>
        {snap.daysToClose !== null && snap.daysToClose >= 0 && (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3.5 py-2">
            <span className="h-[7px] w-[7px] rounded-full bg-accent" />
            <span className="text-[13px] font-semibold text-accent-deep">
              Raise closing in {snap.daysToClose} days
            </span>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Target raise" value={snap.raiseAmount ?? '—'} sub="This round" />
        <Kpi label="Valuation" value={snap.targetValuation ?? '—'} sub="Post-money target" />
        <Kpi label="Days to close" value={snap.daysToClose !== null ? String(snap.daysToClose) : '—'} sub={snap.targetCloseText ?? 'No close date set'} accent />
        <Kpi label="Course progress" value={`${pct}%`} sub={totalSections ? `${completedSections} of ${totalSections} sections` : 'Not started'} />
      </div>

      {/* Course + Pipeline */}
      <div data-tour="dashboard-courses" className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.62fr_1fr]">
        {hasEnrollment && primaryCourse ? (
          <div className={`${PANEL} p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={`${EYEBROW} mb-2`}>Course progress</p>
                <h2 className="text-[19px] font-bold tracking-[-0.02em] text-ink">{primaryCourse.title}</h2>
              </div>
              <span className="text-[24px] font-bold tabular-nums text-ink">{pct}%</span>
            </div>

            <div className="mb-6 flex items-center justify-between gap-4 rounded-[11px] bg-surface-muted px-4 py-3.5">
              <div className="min-w-0">
                <p className="mb-0.5 text-[12px] text-ink-muted">
                  {firstIncomplete ? `Up next${nextModuleIndex !== null ? ` · Module ${String(nextModuleIndex + 1).padStart(2, '0')}` : ''}${nextModule ? ` · ${nextModule.title}` : ''}` : 'Course complete'}
                </p>
                <p className="truncate text-[15.5px] font-semibold tracking-[-0.01em] text-ink">
                  {nextSectionTitle ?? 'Review your work'}
                </p>
              </div>
              <Link href={resumeHref} className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-white transition-[filter] hover:brightness-110">
                Continue <ArrowUpRight size={15} strokeWidth={2.3} />
              </Link>
            </div>

            <div className="flex flex-col">
              {moduleProgress.map((m, i) => {
                const mp = m.total ? (m.done / m.total) * 100 : 0
                const done = m.total > 0 && m.done === m.total
                const active = m.id === nextModule?.id
                return (
                  <div key={m.id} className={`flex items-center gap-3.5 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${done ? 'bg-accent' : 'bg-surface'} ${done ? '' : active ? 'border-[1.5px] border-accent' : 'border-[1.5px] border-line-strong'}`}>
                      {done && <Check size={11} strokeWidth={3} className="text-white" />}
                      {active && !done && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </span>
                    <span className={`flex-1 truncate text-[14px] ${done || active ? 'font-semibold text-ink' : 'font-medium text-ink-soft'}`}>{m.title}</span>
                    <span className="h-[5px] w-24 overflow-hidden rounded-full bg-track">
                      <span className="block h-full rounded-full" style={{ width: `${mp}%`, background: done ? 'var(--nz-accent)' : mp > 0 ? 'var(--nz-ink-soft)' : 'transparent' }} />
                    </span>
                    <span className="w-8 text-right text-[12.5px] tabular-nums text-ink-muted">{m.done}/{m.total}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className={`${PANEL} p-6`}>
            <p className={`${EYEBROW} mb-2`}>Start here</p>
            <h2 className="mb-1 text-[19px] font-bold tracking-[-0.02em] text-ink">Explore courses to close faster</h2>
            <p className="mb-5 text-[13.5px] text-ink-soft">Enroll in a course to start tracking your raise.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {featuredCourses.map((c) => (
                <Link key={c.id} href={`/courses/${c.id}`} className="group rounded-[11px] border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                  <h3 className="mb-1.5 line-clamp-2 text-[15px] font-bold tracking-[-0.01em] text-ink group-hover:text-accent-deep">{c.title}</h3>
                  <p className="text-[11.5px] tabular-nums text-ink-muted">{c.moduleCount} modules · {c.sectionTotal} sections</p>
                </Link>
              ))}
              {featuredCourses.length === 0 && <p className="text-[13px] text-ink-muted">New material is being prepared.</p>}
            </div>
            <Link href="/courses" className="mt-5 inline-flex items-center gap-2 rounded-[10px] border border-line px-4 py-2.5 text-[12.5px] font-semibold text-ink hover:border-accent hover:text-accent">
              <BookOpen size={15} strokeWidth={1.8} /> Browse all <ArrowUpRight size={13} strokeWidth={2} />
            </Link>
          </div>
        )}

        {/* Pipeline */}
        <div className={`${PANEL} p-6`}>
          <div className="mb-6 flex items-center justify-between">
            <p className={EYEBROW}>Raise pipeline</p>
            {cur >= 0 && (
              <span className="rounded-md bg-accent-soft px-2.5 py-1 text-[12.5px] font-semibold text-accent-deep">
                Stage {cur + 1} of {FUNNEL.length}
              </span>
            )}
          </div>
          <div className="relative">
            {FUNNEL.map((s, i) => {
              const isCur = i === cur
              const isPast = cur >= 0 && i < cur
              const last = i === FUNNEL.length - 1
              return (
                <div key={s.label} className="relative flex items-start gap-4 pb-[18px] last:pb-0">
                  {!last && <span aria-hidden className={`absolute left-[8px] top-5 bottom-0 w-0.5 ${isPast ? 'bg-accent' : 'bg-track'}`} />}
                  <span className={`relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${isPast ? 'bg-accent' : 'bg-surface'} ${isCur ? 'border-2 border-accent' : isPast ? '' : 'border-2 border-line-strong'}`}>
                    {isPast && <Check size={10} strokeWidth={3} className="text-white" />}
                    {isCur && <span className="h-[7px] w-[7px] rounded-full bg-accent" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[14.5px] ${isCur ? 'font-bold text-ink' : isPast ? 'font-semibold text-ink-soft' : 'font-semibold text-ink-muted'}`}>{s.label}</p>
                      {isCur && <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-accent">Current</span>}
                    </div>
                    <p className={`mt-0.5 text-[12.5px] ${i > cur ? 'text-ink-faint' : 'text-ink-muted'}`}>{s.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`${PANEL} px-5 py-[18px]`}>
      <p className={EYEBROW}>{label}</p>
      <p className={`mt-2.5 text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums ${accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
      {sub && <p className="mt-2 text-[12.5px] text-ink-muted">{sub}</p>}
    </div>
  )
}
