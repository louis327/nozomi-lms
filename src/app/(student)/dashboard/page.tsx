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
import { ArrowUpRight, Sparkles, BookOpen } from 'lucide-react'

export const metadata = { title: 'Dashboard — Nozomi' }

function formatMasthead(d = new Date()) {
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase()
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
  return `${day} \u00B7 ${date}`
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
  starters.push('Draft a cold intro to a sector-fit investor.')
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
        for (const p of secProg ?? []) {
          sectionProgress[p.section_id] = { completed: p.completed }
        }
      }
    }
  }

  const totalSections = sectionRows.length
  const completedSections = Object.values(sectionProgress).filter((p) => p.completed).length

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

  return (
    <div className="px-6 lg:px-10 pb-24">
      <PageTopbar breadcrumb={[{ label: 'Nozomi', href: '/dashboard' }, { label: 'Dashboard' }]} />

      {/* Masthead: date only */}
      <div className="pt-6 pb-4">
        <p className="text-[10.5px] font-semibold tracking-[0.32em] text-ink-muted uppercase">
          {formatMasthead()}
        </p>
      </div>

      {/* Greeting */}
      <div className="pb-8">
        <h1
          className="text-ink"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(28px, 3.8cqi, 44px)',
            lineHeight: 1.02,
            letterSpacing: '-0.032em',
          }}
        >
          Good to see you, {displayName}
        </h1>
      </div>

      {/* Hero grid: left stack (Timeline + Continue/Explore), right tall Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <RaiseTimeline
            closeDate={snap.targetCloseDate}
            closeText={snap.targetCloseText}
            daysToClose={snap.daysToClose}
            raiseAmount={snap.raiseAmount}
            targetValuation={snap.targetValuation}
          />

          {hasEnrollment && primaryCourse && moduleRows.length > 0 ? (
            <SectionHeatmap
              courseId={primaryCourse.id}
              courseTitle={primaryCourse.title}
              modules={moduleRows}
              sections={sectionRows}
              progress={sectionProgress}
              completedCount={completedSections}
              totalCount={totalSections}
              nextSectionTitle={nextSectionTitle}
              nextModuleIndex={nextModuleIndex}
              nextModuleTitle={nextModule?.title ?? null}
              resumeHref={resumeHref}
            />
          ) : !hasEnrollment ? (
            <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden flex-1">
              <div
                className="absolute -right-32 -top-32 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--nz-accent) 0%, transparent 70%)' }}
              />
              <div className="relative flex items-start justify-between mb-7 gap-4">
                <div>
                  <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-2 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
                    Start here
                  </p>
                  <h2
                    className="text-ink max-w-[20ch]"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      fontSize: 'clamp(24px, 2.8cqi, 34px)',
                      lineHeight: 1.05,
                      letterSpacing: '-0.025em',
                    }}
                  >
                    Explore courses to close faster
                  </h2>
                </div>
                <Link
                  href="/courses"
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line text-[12.5px] font-semibold text-ink hover:border-accent hover:text-accent transition-colors group"
                >
                  <BookOpen className="w-4 h-4" strokeWidth={1.8} />
                  <span>Browse all</span>
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
                        <h3 className="font-serif text-[16px] text-ink leading-tight mb-2 group-hover:text-accent-deep transition-colors line-clamp-2">
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
          ) : null}
        </div>

        <div className="lg:col-span-1">
          <RaiseFunnel raiseStatus={snap.raiseStatus} raiseAmount={snap.raiseAmount} />
        </div>
      </div>

      {/* Compact coach */}
      <AiCoach starters={starters} compact />
    </div>
  )
}
