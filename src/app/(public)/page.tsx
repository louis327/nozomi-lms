import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Course } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('*, modules(id)')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })

  const coursesWithCount = (courses ?? []).map((course: Course & { modules: { id: string }[] }) => ({
    ...course,
    moduleCount: course.modules?.length ?? 0,
  }))

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-nz-text-primary tracking-tight leading-tight" style={{ letterSpacing: '-0.035em' }}>
            Master Web3{' '}
            <span className="text-sakura-gradient">Fundraising</span>
          </h1>

          {/* Sakura gradient accent line */}
          <div className="mx-auto mt-6 h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-nz-sakura to-transparent" />

          <p className="mt-6 text-lg sm:text-xl text-nz-text-secondary max-w-2xl mx-auto leading-relaxed">
            Learn from battle-tested operators who have raised and deployed capital across
            the Web3 ecosystem. Nozomi is the YC for Web3 — actionable knowledge, not theory.
          </p>

          <div className="mt-10">
            <a
              href="#courses"
              className="inline-flex items-center px-7 py-3.5 font-heading font-semibold text-base bg-nz-sakura text-nz-bg-primary rounded-xl hover:bg-nz-sakura-deep transition-all duration-200 sakura-glow"
            >
              Explore Courses
              <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Course Grid */}
      <section id="courses" className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-nz-text-primary mb-10">
            Available Courses
          </h2>

          {coursesWithCount.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-nz-text-muted text-lg">
                No courses available yet. Check back soon.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {coursesWithCount.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`} className="group">
                  <Card hoverable className="flex flex-col h-full overflow-hidden">
                    {/* Cover image or gradient placeholder */}
                    <div className="relative h-44 bg-gradient-to-br from-nz-bg-tertiary via-nz-bg-elevated to-nz-bg-secondary overflow-hidden">
                      {course.cover_image ? (
                        <img
                          src={course.cover_image}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-2xl bg-nz-sakura/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-nz-sakura/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-nz-bg-card/90 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-heading font-semibold text-lg text-nz-text-primary group-hover:text-nz-sakura transition-colors leading-snug line-clamp-2">
                          {course.title}
                        </h3>
                        <Badge variant="sakura">{course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}</Badge>
                      </div>

                      {course.description && (
                        <p className="text-sm text-nz-text-tertiary leading-relaxed line-clamp-3 mb-4">
                          {course.description}
                        </p>
                      )}

                      <div className="mt-auto pt-3 border-t border-nz-border">
                        <span className="text-sm font-medium text-nz-sakura group-hover:text-nz-sakura-deep transition-colors inline-flex items-center gap-1.5">
                          View Course
                          <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
