import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course, Section } from '@/lib/types'
import { PageTopbar } from '@/components/layout/page-topbar'
import { StatCard } from '@/components/ui/stat-card'
import { ProgressRing } from '@/components/ui/progress-ring'
import { MilestoneBanner } from '@/components/ui/milestone-banner'
import { LineChart } from '@/components/ui/line-chart'
import { CourseThumb } from '@/components/ui/course-thumb'
import { ProgressBar } from '@/components/ui/progress-bar'

export const metadata = { title: 'Dashboard — Nozomi' }

type EnrollmentWithCourse = {
  id: string
  course_id: string
  enrolled_at: string
  courses: Course & {
    modules: {
      id: string
      title: string
      sort_order: number
      sections: Pick<Section, 'id' | 'title' | 'sort_order'>[]
    }[]
  }
}

function formatDateLine(d = new Date()) {
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase()
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toUpperCase()
  return `${day} · ${date}`
}

function computeStreak(completedDates: Date[]): number {
  if (completedDates.length === 0) return 0
  const days = new Set(completedDates.map((d) => d.toISOString().slice(0, 10)))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) streak++
    else if (i > 0) break
  }
  return streak
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id, course_id, enrolled_at,
      courses (
        id, title, description, cover_image, status,
        modules ( id, title, sort_order, sections ( id, title, sort_order ) )
      )
    `)
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  const typedEnrollments = (enrollments ?? []) as unknown as EnrollmentWithCourse[]

  const allSectionIds: string[] = []
  for (const enrollment of typedEnrollments) {
    for (const mod of enrollment.courses.modules ?? []) {
      for (const sec of mod.sections ?? []) {
        allSectionIds.push(sec.id)
      }
    }
  }

  let progressMap: Record<string, { completed: boolean; completed_at: string | null }> = {}
  if (allSectionIds.length > 0) {
    const { data: progress } = await supabase
      .from('section_progress')
      .select('section_id, completed, completed_at')
      .eq('user_id', user.id)
      .in('section_id', allSectionIds)
    for (const p of progress ?? []) {
      progressMap[p.section_id] = { completed: p.completed, completed_at: p.completed_at }
    }
  }

  const displayName =
    profile?.full_name?.split(' ')[0] ??
    user.email?.split('@')[0] ??
    'Learner'

  // Stats
  const completedDates = Object.values(progressMap)
    .filter((p) => p.completed && p.completed_at)
    .map((p) => new Date(p.completed_at!))
  const streak = computeStreak(completedDates)
  const totalSectionsAll = allSectionIds.length
  const totalSectionsCompleted = Object.values(progressMap).filter((p) => p.completed).length
  const completionPct = totalSectionsAll > 0 ? Math.round((totalSectionsCompleted / totalSectionsAll) * 100) : 0
  // Approx focus hours — assume 20min avg per completed section
  const focusHrs = Math.round((totalSectionsCompleted * 20) / 6) / 10

  // Continue studying list
  const continueList = typedEnrollments
    .map((e) => {
      const modules = [...(e.courses.modules ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      const sections = modules.flatMap((m) => [...(m.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order))
      const total = sections.length
      const done = sections.filter((s) => progressMap[s.id]?.completed).length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const firstIncomplete = sections.find((s) => !progressMap[s.id]?.completed)
      const resumeId = firstIncomplete?.id ?? sections[0]?.id
      const minutesLeft = Math.max(5, (total - done) * 18)
      return { enrollment: e, modules, total, done, pct, resumeId, minutesLeft }
    })
    .filter((x) => x.total > 0)

  // Chart data — last 7 weeks focus hours (approximated from completed_at timestamps)
  const weeksBack = 7
  const chartData = Array(weeksBack).fill(0)
  const now = Date.now()
  for (const d of completedDates) {
    const weeksAgo = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24 * 7))
    if (weeksAgo >= 0 && weeksAgo < weeksBack) {
      chartData[weeksBack - 1 - weeksAgo] += 20 / 60 // minutes -> hours
    }
  }
  // Pad with a baseline so the chart always has shape even on a new account
  const chartDisplay = chartData.map((v, i) => Math.max(v, 0.5 + i * 0.3))
  const peakIdx = chartDisplay.indexOf(Math.max(...chartDisplay))

  const chartLabels = Array.from({ length: weeksBack }, (_, i) => `WK ${weeksBack - i}`)

  return (
    <div className="px-6 lg:px-10 pb-16">
      <PageTopbar breadcrumb={[{ label: 'Nozomi', href: '/dashboard' }, { label: 'Dashboard' }, { label: 'Overview' }]} />

      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mt-6 mb-10">
        <div>
          <p className="eyebrow mb-5">{formatDateLine()} · {(profile?.full_name || displayName).toUpperCase()}</p>
          <h1 className="display text-[54px] md:text-[64px] mb-4 max-w-2xl">
            Welcome back,<br/>
            <em>{displayName}</em>.
          </h1>
          <p className="text-[14px] text-ink-soft max-w-lg leading-relaxed">
            {streak > 0 ? (
              <>You&rsquo;re on a <strong className="text-ink font-semibold">{streak}-day</strong> learning streak. {continueList.length > 0 ? `${continueList.reduce((acc, c) => acc + (c.total - c.done), 0)} lessons remain to reach your next milestone.` : 'Keep up the momentum.'}</>
            ) : (
              <>A fresh week of focused learning. Pick up where you left off or start something new.</>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 min-w-[300px]">
          <StatCard label="Streak" value={streak} unit="days" trend={streak > 0 ? { direction: 'up', text: 'keep going' } : undefined} />
          <StatCard label="Focus hrs" value={focusHrs.toFixed(1)} unit="hr" hint="last 7 days" />
          <StatCard label="Completion" value={completionPct} unit="%" hint="across all courses" />
          <StatCard label="Sections" value={`${totalSectionsCompleted}/${totalSectionsAll}`} hint="completed" />
        </div>
      </section>

      {/* Chart + paths */}
      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-10">
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="font-serif text-[22px] text-ink leading-tight">Learning rhythm</h2>
              <p className="text-[12px] text-ink-muted mt-0.5">Focus hours across the last 7 weeks</p>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-surface-muted">
              {['Week', 'Month', 'Season'].map((t, i) => (
                <button
                  key={t}
                  className={`px-3 py-1 text-[11.5px] font-medium rounded-full ${i === 1 ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <LineChart
              data={chartDisplay}
              labels={chartLabels}
              highlightIndex={peakIdx}
              highlightLabel={`${chartLabels[peakIdx]} · Peak · ${chartDisplay[peakIdx].toFixed(1)} focus hours`}
              height={240}
              width={640}
            />
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6">
          <h2 className="font-serif text-[22px] text-ink leading-tight">Path progress</h2>
          <p className="text-[12px] text-ink-muted mt-0.5 mb-5">Your active learning paths</p>
          <div className="space-y-4">
            {continueList.slice(0, 4).map(({ enrollment, modules, done, total, pct }) => (
              <div key={enrollment.id} className="flex items-center gap-3">
                <ProgressRing value={pct} size={42} stroke={3} showLabel={false} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-ink truncate leading-tight">
                    {enrollment.courses.title}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {done} / {total} {modules.length === 1 ? 'sections' : 'sections'}
                  </p>
                </div>
                <span className="text-[12px] font-semibold text-ink tabular-nums">{pct}%</span>
              </div>
            ))}
            {continueList.length === 0 && (
              <p className="text-[12px] text-ink-muted italic">Enroll in a course to start tracking progress.</p>
            )}
          </div>
        </div>
      </section>

      {/* Continue studying + Schedule */}
      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-10">
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-serif text-[22px] text-ink leading-tight">Continue studying</h2>
              <p className="text-[12px] text-ink-muted mt-0.5">Pick up where you left off</p>
            </div>
            <Link
              href="/courses"
              className="text-[12px] font-medium text-ink-soft hover:text-ink px-3 py-1 rounded-full border border-line hover:border-line-strong transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="mt-5 divide-y divide-line-soft">
            {continueList.slice(0, 5).map(({ enrollment, done, total, pct, resumeId, minutesLeft }) => (
              <Link
                key={enrollment.id}
                href={resumeId ? `/courses/${enrollment.courses.id}/learn/${resumeId}` : `/courses/${enrollment.courses.id}`}
                className="flex items-center gap-4 py-3.5 -mx-2 px-2 rounded-lg hover:bg-surface-muted/50 transition-colors group"
              >
                <CourseThumb title={enrollment.courses.title} coverImage={enrollment.courses.cover_image} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-ink truncate">{enrollment.courses.title}</p>
                  <p className="text-[11.5px] text-ink-muted mt-0.5">
                    {enrollment.courses.description ?? 'Nozomi course'} · {minutesLeft} min left
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-3 w-[180px]">
                  <ProgressBar value={pct} className="flex-1" />
                  <span className="text-[12px] text-ink-soft tabular-nums w-9 text-right">{pct}%</span>
                </div>
              </Link>
            ))}
            {continueList.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-[13px] text-ink-muted mb-3">You haven&rsquo;t enrolled in any courses yet.</p>
                <Link href="/courses" className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium rounded-full bg-ink text-white hover:bg-black transition-colors">
                  Browse courses →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-serif text-[22px] text-ink leading-tight">Today&rsquo;s schedule</h2>
              <p className="text-[12px] text-ink-muted mt-0.5">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · upcoming</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {continueList.slice(0, 4).map(({ enrollment, resumeId }, i) => {
              const hours = [9, 13, 16, 20]
              const minutes = [30, 0, 15, 0]
              const time = `${String(hours[i]).padStart(2, '0')}:${String(minutes[i]).padStart(2, '0')}`
              const labels = ['Live Session', 'Due today', 'Quiz', 'Optional']
              return (
                <Link
                  key={enrollment.id}
                  href={resumeId ? `/courses/${enrollment.courses.id}/learn/${resumeId}` : `/courses/${enrollment.courses.id}`}
                  className="flex gap-4 pb-4 border-b border-line-soft last:border-0 last:pb-0 group"
                >
                  <div className="shrink-0 w-[52px]">
                    <p className="font-serif text-[16px] text-ink leading-none">{time}</p>
                    <p className="text-[9.5px] text-ink-muted uppercase tracking-[0.12em] mt-1">Local</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate group-hover:text-accent transition-colors">
                      {enrollment.courses.title}
                    </p>
                    <p className="text-[11.5px] text-ink-muted mt-0.5 truncate">
                      {labels[i]} · Session {i + 1}
                    </p>
                    <span className="inline-block mt-1.5 eyebrow-accent text-[9.5px]">{labels[i]}</span>
                  </div>
                </Link>
              )
            })}
            {continueList.length === 0 && (
              <p className="text-[12px] text-ink-muted italic">No scheduled sessions.</p>
            )}
          </div>
        </div>
      </section>

      {/* Milestone */}
      {streak > 0 && (
        <MilestoneBanner
          eyebrow="Milestone · Streak unlocked"
          title={
            <>
              <em>{streak} days</em> of uninterrupted study.
            </>
          }
          description={`You've completed ${totalSectionsCompleted} sections across ${typedEnrollments.length} course${typedEnrollments.length !== 1 ? 's' : ''}. Keep the rhythm going — more milestones ahead.`}
          primaryAction={{ label: 'View certificate', href: '/certificates' }}
          secondaryAction={{ label: 'Share progress', href: '/community' }}
        />
      )}
    </div>
  )
}
