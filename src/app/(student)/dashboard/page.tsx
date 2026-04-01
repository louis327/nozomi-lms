import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Button } from '@/components/ui/button'
import type { Course, Section, SectionProgress } from '@/lib/types'

export const metadata = { title: 'Dashboard' }

type EnrollmentWithCourse = {
  id: string
  course_id: string
  courses: Course & {
    modules: {
      id: string
      sort_order: number
      sections: Pick<Section, 'id' | 'sort_order'>[]
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
      courses (
        id, title, description, cover_image, status,
        modules (
          id, sort_order,
          sections ( id, sort_order )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  // Gather all section IDs across enrollments for progress lookup
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-nz-text-primary mb-2">
          Welcome back, {displayName}
        </h1>
        <p className="text-nz-text-secondary text-lg">
          Pick up where you left off.
        </p>
      </div>

      {typedEnrollments.length === 0 ? (
        /* Empty state */
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-nz-sakura/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-nz-sakura" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h2 className="font-heading text-xl font-semibold text-nz-text-primary mb-2">
            No courses yet
          </h2>
          <p className="text-nz-text-secondary mb-6 max-w-md mx-auto">
            Browse our catalog and enroll in a course to start your learning journey.
          </p>
          <Link href="/">
            <Button size="lg">Browse Courses</Button>
          </Link>
        </Card>
      ) : (
        /* Course grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {typedEnrollments.map((enrollment) => {
            const course = enrollment.courses
            const modules = [...(course.modules ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            const allSections = modules.flatMap((m) =>
              [...(m.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            )
            const totalSections = allSections.length
            const completedSections = allSections.filter((s) => progressMap[s.id]).length
            const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

            // Find first incomplete section for "Continue Learning"
            const firstIncomplete = allSections.find((s) => !progressMap[s.id])
            const resumeId = firstIncomplete?.id ?? allSections[0]?.id

            return (
              <Card key={enrollment.id} hoverable className="flex flex-col overflow-hidden">
                {/* Cover image */}
                <div className="aspect-video bg-nz-bg-tertiary relative overflow-hidden">
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-nz-sakura/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-nz-sakura-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {/* Progress badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-nz-bg-card/90 backdrop-blur border border-nz-border text-xs font-semibold text-nz-text-primary shadow-sm">
                    {pct}%
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-heading font-semibold text-lg text-nz-text-primary mb-1 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-nz-text-tertiary mb-4">
                    {modules.length} module{modules.length !== 1 ? 's' : ''} &middot; {totalSections} section{totalSections !== 1 ? 's' : ''}
                  </p>

                  <div className="mb-4">
                    <ProgressBar value={pct} />
                    <p className="text-xs text-nz-text-muted mt-1.5">
                      {completedSections} / {totalSections} sections completed
                    </p>
                  </div>

                  <div className="mt-auto">
                    {resumeId ? (
                      <Link href={`/courses/${course.id}/learn/${resumeId}`} className="block">
                        <Button className="w-full" size="sm">
                          {pct === 0 ? 'Start Learning' : pct === 100 ? 'Review Course' : 'Continue Learning'}
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/courses/${course.id}/learn`} className="block">
                        <Button className="w-full" size="sm">Start Learning</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
