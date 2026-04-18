import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course } from '@/lib/types'
import { PageTopbar } from '@/components/layout/page-topbar'
import { CourseThumb } from '@/components/ui/course-thumb'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'

export const metadata = { title: 'My Courses — Nozomi' }

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: courses } = await supabase
    .from('courses')
    .select('*, modules(id, sections(id))')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id))

  const allSectionIds = (courses ?? []).flatMap((c: Course & { modules: { id: string; sections: { id: string }[] }[] }) =>
    c.modules?.flatMap((m) => m.sections?.map((s) => s.id) ?? []) ?? []
  )

  const { data: progress } = await supabase
    .from('section_progress')
    .select('section_id, completed')
    .eq('user_id', user.id)
    .in('section_id', allSectionIds.length > 0 ? allSectionIds : ['00000000-0000-0000-0000-000000000000'])

  const completedSections = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.section_id))

  type CourseWithProgress = Course & {
    modules: { id: string; sections: { id: string }[] }[]
    moduleCount: number
    sectionTotal: number
    sectionDone: number
    pct: number
    isEnrolled: boolean
  }

  const coursesList: CourseWithProgress[] = (courses ?? []).map((c: Course & { modules: { id: string; sections: { id: string }[] }[] }) => {
    const sectionIds = c.modules?.flatMap((m) => m.sections?.map((s) => s.id) ?? []) ?? []
    const sectionDone = sectionIds.filter((id) => completedSections.has(id)).length
    const sectionTotal = sectionIds.length
    const pct = sectionTotal > 0 ? Math.round((sectionDone / sectionTotal) * 100) : 0
    return {
      ...c,
      moduleCount: c.modules?.length ?? 0,
      sectionTotal,
      sectionDone,
      pct,
      isEnrolled: enrolledIds.has(c.id),
    }
  })

  const enrolledCourses = coursesList.filter((c) => c.isEnrolled)
  const inProgressCourses = enrolledCourses.filter((c) => c.sectionTotal === 0 || c.pct < 100)
  const completedCourses = enrolledCourses.filter((c) => c.sectionTotal > 0 && c.pct === 100)
  const otherCourses = coursesList.filter((c) => !c.isEnrolled)

  const summary = (() => {
    const parts: string[] = []
    if (inProgressCourses.length > 0) {
      parts.push(`${inProgressCourses.length} in progress`)
    }
    if (completedCourses.length > 0) {
      parts.push(`${completedCourses.length} completed`)
    }
    if (otherCourses.length > 0) {
      parts.push(`${otherCourses.length} to explore`)
    }
    if (parts.length === 0) {
      return `${coursesList.length} ${coursesList.length === 1 ? 'course' : 'courses'} available — pick something that calls to you.`
    }
    return parts.join(' · ')
  })()

  return (
    <div className="px-6 lg:px-10 pb-16">
      <PageTopbar breadcrumb={[{ label: 'Nozomi', href: '/dashboard' }, { label: 'My Courses' }]} />

      <section className="mt-6 mb-10">
        <p className="eyebrow mb-4">Your library</p>
        <h1 className="display text-[48px] md:text-[56px] mb-3 max-w-2xl">
          Your <em>courses</em>.
        </h1>
        <p className="text-[14px] text-ink-soft max-w-lg">{summary}</p>
      </section>

      {inProgressCourses.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="eyebrow">In Progress</h2>
            <span className="text-[12px] text-ink-muted">{inProgressCourses.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {inProgressCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group flex flex-col bg-surface border border-line rounded-2xl overflow-hidden hover:border-line-strong transition-colors"
              >
                <div className="aspect-[16/9] bg-surface-muted relative overflow-hidden">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CourseThumb title={course.title} size="xl" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant="accent">Enrolled</Badge>
                  </div>
                </div>
                <div className="flex-1 p-5 flex flex-col">
                  <h3 className="font-serif text-[18px] text-ink leading-tight mb-1 group-hover:text-accent-deep transition-colors">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-[12.5px] text-ink-soft line-clamp-2 mb-4">{course.description}</p>
                  )}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-[11px] text-ink-muted mb-2">
                      <span className="uppercase tracking-[0.12em] font-semibold">Progress</span>
                      <span className="font-semibold text-ink tabular-nums">{course.pct}%</span>
                    </div>
                    <ProgressBar value={course.pct} />
                    <p className="text-[11px] text-ink-muted mt-2">
                      {course.sectionDone} / {course.sectionTotal} sections · {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {completedCourses.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="eyebrow">Completed</h2>
            <span className="text-[12px] text-ink-muted">{completedCourses.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {completedCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group flex flex-col bg-surface border border-line rounded-2xl overflow-hidden hover:border-line-strong transition-colors"
              >
                <div className="aspect-[16/9] bg-surface-muted relative overflow-hidden">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CourseThumb title={course.title} size="xl" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant="success">Complete</Badge>
                  </div>
                </div>
                <div className="flex-1 p-5 flex flex-col">
                  <h3 className="font-serif text-[18px] text-ink leading-tight mb-1 group-hover:text-accent-deep transition-colors">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-[12.5px] text-ink-soft line-clamp-2 mb-4">{course.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-line-soft">
                    <span className="text-[11px] text-ink-muted">
                      {course.sectionTotal} sections · {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
                    </span>
                    <span className="text-[11.5px] font-medium text-accent">Review →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {otherCourses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="eyebrow">Explore more</h2>
            <span className="text-[12px] text-ink-muted">{otherCourses.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {otherCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group flex flex-col bg-surface border border-line rounded-2xl overflow-hidden hover:border-line-strong transition-colors"
              >
                <div className="aspect-[16/9] bg-surface-muted relative overflow-hidden">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CourseThumb title={course.title} size="xl" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-5">
                  <h3 className="font-serif text-[18px] text-ink leading-tight mb-1 group-hover:text-accent-deep transition-colors">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-[12.5px] text-ink-soft line-clamp-2 mb-4">{course.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-line-soft">
                    <span className="text-[11px] text-ink-muted">
                      {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'} · {course.sectionTotal} sections
                    </span>
                    <span className="text-[11.5px] font-medium text-accent">View →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {coursesList.length === 0 && (
        <div className="bg-surface border border-line rounded-2xl p-16 text-center">
          <p className="font-serif text-[22px] text-ink mb-2">No courses yet</p>
          <p className="text-[13px] text-ink-muted">New courses are being prepared. Check back soon.</p>
        </div>
      )}
    </div>
  )
}
