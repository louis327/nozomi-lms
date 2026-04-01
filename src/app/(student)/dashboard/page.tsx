import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course, Section } from '@/lib/types'

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

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      course_id,
      enrolled_at,
      courses (
        id, title, description, cover_image, status,
        modules (
          id, title, sort_order,
          sections ( id, title, sort_order )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  const allSectionIds: string[] = []
  const typedEnrollments = (enrollments ?? []) as unknown as EnrollmentWithCourse[]

  for (const enrollment of typedEnrollments) {
    for (const mod of enrollment.courses.modules ?? []) {
      for (const sec of mod.sections ?? []) {
        allSectionIds.push(sec.id)
      }
    }
  }

  let progressMap: Record<string, boolean> = {}
  if (allSectionIds.length > 0) {
    const { data: progress } = await supabase
      .from('section_progress')
      .select('section_id, completed')
      .eq('user_id', user.id)
      .in('section_id', allSectionIds)

    for (const p of progress ?? []) {
      progressMap[p.section_id] = p.completed
    }
  }

  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Learner'

  // Stats
  const enrolledCount = typedEnrollments.length
  let completedCount = 0
  let inProgressCount = 0
  let totalSectionsAll = 0
  let totalSectionsCompleted = 0

  let continueEnrollment: EnrollmentWithCourse | null = null
  let continueSection: { id: string; title: string } | null = null
  let continueModuleTitle = ''
  let continuePct = 0

  for (const enrollment of typedEnrollments) {
    const modules = [...(enrollment.courses.modules ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    const sections = modules.flatMap((m) => [...(m.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order))
    const total = sections.length
    const done = sections.filter((s) => progressMap[s.id]).length
    totalSectionsAll += total
    totalSectionsCompleted += done

    if (total > 0 && done === total) {
      completedCount++
    } else if (done > 0) {
      inProgressCount++
      if (!continueEnrollment) {
        continueEnrollment = enrollment
        const firstIncomplete = sections.find((s) => !progressMap[s.id])
        if (firstIncomplete) {
          continueSection = firstIncomplete
          const mod = modules.find((m) => m.sections?.some((s) => s.id === firstIncomplete.id))
          continueModuleTitle = mod?.title ?? ''
        }
        continuePct = Math.round((done / total) * 100)
      }
    } else if (!continueEnrollment && total > 0) {
      continueEnrollment = enrollment
      continueSection = sections[0] ?? null
      continueModuleTitle = modules[0]?.title ?? ''
      continuePct = 0
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-[22px] font-bold text-[#111] tracking-[-0.02em]">
            Welcome back, {displayName}
          </h1>
          <p className="text-[13px] text-[#888] mt-1">Track your learning progress</p>
        </div>
        <Link
          href="/courses"
          className="px-4 py-2 text-[13px] font-heading font-semibold rounded-lg bg-[#111] text-white hover:bg-[#333] transition-colors"
        >
          Browse Courses
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Enrolled', value: enrolledCount, icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          ), accent: false },
          { label: 'In Progress', value: inProgressCount, icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          ), accent: true },
          { label: 'Completed', value: completedCount, icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), accent: false },
          { label: 'Sections', value: `${totalSectionsCompleted} / ${totalSectionsAll}`, icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ), accent: false },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl px-4 py-4 ${
              stat.accent
                ? 'bg-nz-sakura text-white'
                : 'bg-white border border-[#e8e8e8]'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                stat.accent ? 'bg-white/20 text-white' : 'bg-[#f5f5f5] text-[#888]'
              }`}>
                {stat.icon}
              </div>
              <span className={`text-[11px] font-medium uppercase tracking-[0.08em] ${
                stat.accent ? 'text-white/70' : 'text-[#999]'
              }`}>{stat.label}</span>
            </div>
            <p className={`text-[28px] font-heading font-bold leading-none tracking-[-0.02em] ${
              stat.accent ? 'text-white' : 'text-[#111]'
            }`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {typedEnrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8e8e8] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-nz-sakura flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h2 className="font-heading text-lg font-bold text-[#111] mb-1">No courses yet</h2>
          <p className="text-[13px] text-[#888] mb-6">Browse our catalog and enroll to start learning.</p>
          <Link
            href="/courses"
            className="inline-flex px-5 py-2.5 text-[13px] font-heading font-semibold rounded-lg bg-nz-sakura text-white hover:bg-nz-sakura-deep transition-colors"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <>
          {/* Continue Learning — hero card */}
          {continueEnrollment && continueSection && (
            <div className="rounded-xl overflow-hidden mb-8 bg-[#111]">
              <div className="flex items-stretch">
                {/* Cover */}
                <div className="hidden sm:block w-52 shrink-0 relative">
                  {continueEnrollment.courses.cover_image ? (
                    <img
                      src={continueEnrollment.courses.cover_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#222] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 p-6 flex flex-col justify-center">
                  <p className="text-[11px] text-nz-sakura font-bold uppercase tracking-[0.1em] mb-2">&#9656; Continue Learning</p>
                  <h3 className="font-heading font-bold text-white text-lg tracking-[-0.01em] mb-1">
                    {continueEnrollment.courses.title}
                  </h3>
                  <p className="text-[13px] text-[#999] mb-4">
                    {continueModuleTitle && <>{continueModuleTitle} &middot; </>}{continueSection.title}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-[#333] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-nz-sakura transition-all duration-700"
                        style={{ width: `${continuePct}%` }}
                      />
                    </div>
                    <span className="text-[12px] text-[#666] font-medium">{continuePct}%</span>
                  </div>
                </div>
                {/* Action */}
                <div className="hidden sm:flex items-center pr-6">
                  <Link
                    href={`/courses/${continueEnrollment.courses.id}/learn/${continueSection.id}`}
                    className="px-5 py-2.5 text-[13px] font-heading font-semibold rounded-lg bg-nz-sakura text-white hover:bg-nz-sakura-deep transition-colors"
                  >
                    Resume &rarr;
                  </Link>
                </div>
              </div>
              {/* Mobile CTA */}
              <div className="sm:hidden px-6 pb-5">
                <Link
                  href={`/courses/${continueEnrollment.courses.id}/learn/${continueSection.id}`}
                  className="block w-full text-center px-5 py-2.5 text-[13px] font-heading font-semibold rounded-lg bg-nz-sakura text-white hover:bg-nz-sakura-deep transition-colors"
                >
                  Resume Learning &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* My Courses */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-[13px] font-bold text-[#111] uppercase tracking-[0.06em]">My Courses</h2>
            <span className="text-[12px] text-[#aaa]">{enrolledCount} course{enrolledCount !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-white rounded-xl border border-[#e8e8e8] divide-y divide-[#f0f0f0]">
            {typedEnrollments.map((enrollment) => {
              const course = enrollment.courses
              const modules = [...(course.modules ?? [])].sort((a, b) => a.sort_order - b.sort_order)
              const allSections = modules.flatMap((m) =>
                [...(m.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order)
              )
              const totalSections = allSections.length
              const completedSections = allSections.filter((s) => progressMap[s.id]).length
              const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0
              const isComplete = pct === 100
              const firstIncomplete = allSections.find((s) => !progressMap[s.id])
              const resumeId = firstIncomplete?.id ?? allSections[0]?.id

              return (
                <div
                  key={enrollment.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#fafafa] transition-colors group"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-[#f5f5f5] overflow-hidden shrink-0">
                    {course.cover_image ? (
                      <img src={course.cover_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#ccc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-[14px] text-[#111] truncate leading-tight">{course.title}</h3>
                    <p className="text-[12px] text-[#aaa] mt-0.5">
                      {modules.length} module{modules.length !== 1 ? 's' : ''} &middot; {completedSections}/{totalSections} sections
                    </p>
                  </div>

                  {/* Circular progress */}
                  <div className="hidden sm:flex items-center gap-3 shrink-0">
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.5" fill="none"
                          stroke={isComplete ? '#22c55e' : '#E8458B'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${pct * 0.975} 100`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#111]">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  {resumeId && (
                    <Link href={`/courses/${course.id}/learn/${resumeId}`} className="shrink-0">
                      <span className="px-4 py-2 text-[12px] font-heading font-semibold rounded-lg bg-[#111] text-white hover:bg-[#333] transition-colors inline-block">
                        {pct === 0 ? 'Start' : isComplete ? 'Review' : 'Continue'}
                      </span>
                    </Link>
                  )}

                  {/* Mobile progress */}
                  <div className="sm:hidden shrink-0">
                    <span className={`text-[12px] font-bold ${isComplete ? 'text-[#22c55e]' : 'text-nz-sakura'}`}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
