import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageTopbar } from '@/components/layout/page-topbar'
import { AiCoach } from '@/components/dashboard/ai-coach'
import { RaiseTimeline } from '@/components/dashboard/raise-timeline'
import { RaiseFunnel } from '@/components/dashboard/raise-funnel'
import { SectionHeatmap } from '@/components/dashboard/section-heatmap'
import { CourseThumb } from '@/components/ui/course-thumb'
import { buildRaiseSnapshot, type OnboardingData } from '@/lib/raise-context'
import type { Course } from '@/lib/types'
import { ArrowUpRight, Sparkles, Compass } from 'lucide-react'

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
  const hasEnrollment = !!primaryCourse

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

  const firstIncomplete = sectionRows.find((s) => !sectionProgress[s.id]?.completed)
  const resumeHref = primaryCourse
    ? firstIncomplete
      ? `/courses/${primaryCourse.id}/learn/${firstIncomplete.id}`
      : `/courses/${primaryCourse.id}`
    : '/courses'

  let featuredCourses: (Course & { moduleCount: number; sectionTotal: number })[] = []
  if (!hasEnrollment) {
    const { data: featured } = await supabase
      .from('courses')
      .select('*, modules(id, sections(id))')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .limit(3)

    featuredCourses = ((featured ?? []) as (Course & { modules: { id: string; sections: { id: string }[] }[] })[]).map((c) => {
      const sectionIds = c.modules?.flatMap((m) => m.sections?.map((s) => s.id) ?? []) ?? []
      return {
        ...c,
        moduleCount: c.modules?.length ?? 0,
        sectionTotal: sectionIds.length,
      }
    })
  }

  const stats: { label: string; value: string }[] = []
  if (snap.raiseAmount) stats.push({ label: 'Raising', value: snap.raiseAmount })
  if (snap.targetValuation) stats.push({ label: 'Valuation', value: snap.targetValuation })
  if (snap.projectType) stats.push({ label: 'Sector', value: snap.projectType })
  if (snap.stage) stats.push({ label: 'Stage', value: snap.stage })

  return (
    <div className="pb-24">
      <PageTopbar breadcrumb={[{ label: 'Nozomi', href: '/dashboard' }, { label: 'Dashboard' }]} />

      {/* Masthead */}
      <div className="px-6 lg:px-12 pt-8 pb-5">
        <div className="flex items-center gap-3 text-[10.5px] font-semibold tracking-[0.32em] text-ink-muted uppercase">
          <span>{formatMasthead()}</span>
          <span className="w-[20px] h-px bg-line-strong" />
          <span>{displayName.toUpperCase()}&rsquo;S COMMAND CENTER</span>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-6 lg:px-12 pb-8">
        <h1
          className="text-ink"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(40px, 5.6vw, 72px)',
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
          }}
        >
          Good to see you, {displayName}<span className="text-accent">.</span>
        </h1>
      </div>

      {/* Primary widget grid */}
      <div className="px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="lg:col-span-2">
            <RaiseTimeline
              closeDate={snap.targetCloseDate}
              closeText={snap.targetCloseText}
              daysToClose={snap.daysToClose}
              raiseAmount={snap.raiseAmount}
            />
          </div>
          <div className="lg:col-span-1">
            <RaiseFunnel raiseStatus={snap.raiseStatus} raiseAmount={snap.raiseAmount} />
          </div>
        </div>

        {/* Stats strip */}
        {stats.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface overflow-hidden mb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-line">
              {stats.map((stat, i) => (
                <div key={i} className="p-5 lg:p-6">
                  <p className="text-[9.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-2">
                    {stat.label}
                  </p>
                  <p
                    className="text-ink truncate"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      fontSize: 'clamp(20px, 2.2vw, 28px)',
                      lineHeight: 1.05,
                      letterSpacing: '-0.022em',
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Course progress OR first-entry discovery */}
        {hasEnrollment && primaryCourse ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <div className="lg:col-span-2">
              <SectionHeatmap
                courseId={primaryCourse.id}
                modules={moduleRows}
                sections={sectionRows}
                progress={sectionProgress}
                completedCount={completedSections}
                totalCount={totalSections}
              />
            </div>
            <div className="lg:col-span-1 rounded-2xl border border-line bg-surface p-7 flex flex-col">
              <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-3">
                Continue
              </p>
              <h3
                className="text-ink mb-4"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontSize: 'clamp(24px, 2.4vw, 32px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.022em',
                }}
              >
                {primaryCourse.title}
              </h3>
              <p className="text-[13px] text-ink-soft mb-6 leading-[1.55] flex-1">
                {firstIncomplete
                  ? `Pick up where you left off — ${firstIncomplete.title}.`
                  : 'All sections complete. Review or revisit.'}
              </p>
              <Link
                href={resumeHref}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-ink text-ink-inverted text-[13px] font-semibold hover:bg-accent transition-colors group"
              >
                {firstIncomplete ? 'Continue learning' : 'Review course'}
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-7 lg:p-8 mb-5 overflow-hidden relative">
            <div
              className="absolute -right-32 -top-32 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, var(--nz-accent) 0%, transparent 70%)' }}
            />
            <div className="relative flex items-start justify-between mb-8 gap-4">
              <div>
                <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
                  Start here
                </p>
                <h2
                  className="text-ink max-w-[18ch]"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 700,
                    fontStyle: 'italic',
                    fontSize: 'clamp(30px, 3.6vw, 48px)',
                    lineHeight: 1.02,
                    letterSpacing: '-0.028em',
                  }}
                >
                  Explore courses to close faster<span className="text-accent">.</span>
                </h2>
              </div>
              <Link
                href="/discover"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line text-[12.5px] font-semibold text-ink hover:border-accent hover:text-accent transition-colors group"
              >
                <Compass className="w-4 h-4" strokeWidth={1.8} />
                <span>Discover all</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
              </Link>
            </div>

            {featuredCourses.length > 0 ? (
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
                {featuredCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group flex flex-col bg-canvas border border-line rounded-xl overflow-hidden hover:border-accent transition-colors"
                  >
                    <div className="aspect-[16/9] bg-surface-muted relative overflow-hidden">
                      {course.cover_image ? (
                        <img
                          src={course.cover_image}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CourseThumb title={course.title} size="lg" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-serif text-[17px] text-ink leading-tight mb-2 group-hover:text-accent-deep transition-colors line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-[11px] text-ink-muted tracking-wide mt-auto">
                        {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'} &middot; {course.sectionTotal} sections
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-ink-muted">New material is being prepared.</p>
            )}
          </div>
        )}

        {/* Coach */}
        <div className="rounded-2xl border border-line bg-surface p-7 lg:p-8 mb-5">
          <div className="flex items-baseline justify-between gap-6 mb-5">
            <div>
              <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-2">
                Your coach
              </p>
              <h2
                className="text-ink"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontSize: 'clamp(24px, 2.6vw, 34px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.022em',
                }}
              >
                Ask anything about your raise<span className="text-accent">.</span>
              </h2>
            </div>
          </div>
          <AiCoach starters={starters} />
        </div>

        {/* Blocker + Notes */}
        {(snap.biggestBlocker || recentNotes.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {snap.biggestBlocker && (
              <div className="lg:col-span-2 rounded-2xl border border-line bg-surface p-7 lg:p-8">
                <p className="text-[10.5px] font-semibold tracking-[0.28em] text-accent uppercase mb-5">
                  What&rsquo;s in the way
                </p>
                <div className="relative pl-5 mb-4">
                  <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-accent" />
                  <p
                    className="text-ink max-w-[40ch]"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 500,
                      fontStyle: 'italic',
                      fontSize: 'clamp(20px, 2.4vw, 30px)',
                      lineHeight: 1.2,
                      letterSpacing: '-0.015em',
                    }}
                  >
                    &ldquo;{snap.biggestBlocker}&rdquo;
                  </p>
                </div>
                <p className="text-[12px] text-ink-muted pl-5 leading-relaxed">
                  Your self-reported blocker. Ask your coach above for a specific plan.
                </p>
              </div>
            )}

            {recentNotes.length > 0 && (
              <div className={`${snap.biggestBlocker ? 'lg:col-span-1' : 'lg:col-span-3'} rounded-2xl border border-line bg-surface p-7`}>
                <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-5">
                  Recent notes
                </p>
                <div className={`${snap.biggestBlocker ? 'space-y-5' : 'grid grid-cols-1 md:grid-cols-3 gap-6'}`}>
                  {recentNotes.map((n) => {
                    const text = stripHtml(n.content)
                    const preview = text.length > 120 ? `${text.slice(0, 120).trim()}…` : text
                    return (
                      <Link
                        key={n.id}
                        href={primaryCourse ? `/courses/${primaryCourse.id}/learn/${n.section_id}` : '#'}
                        className="group block"
                      >
                        <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.18em] mb-1.5 group-hover:text-accent transition-colors">
                          {n.section_title}
                        </p>
                        <p className="text-[12.5px] text-ink-soft leading-[1.5] line-clamp-3">
                          {preview || 'Empty note'}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
