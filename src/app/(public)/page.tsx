import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course } from '@/lib/types'
import { CourseThumb } from '@/components/ui/course-thumb'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

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
    <div>
      {/* Hero */}
      <section className="px-6 lg:px-10 pt-16 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow-accent mb-6">Raise Web3 — the program</p>
          <h1 className="display text-[52px] sm:text-[64px] lg:text-[80px] leading-[1.02] mb-8">
            Master Web3 <em>fundraising,</em>
            <br />taught by operators.
          </h1>
          <p className="text-[17px] text-ink-soft max-w-2xl mx-auto leading-relaxed">
            Nozomi is the YC for Web3. Learn from founders who&apos;ve raised and deployed capital
            across DeFi, infrastructure, and consumer — actionable knowledge, not theory.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <a
              href="#courses"
              className="inline-flex items-center px-6 py-3 text-[13.5px] font-medium bg-ink text-white rounded-full hover:bg-black transition-colors"
            >
              Explore courses
              <svg className="ml-2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 text-[13.5px] font-medium border border-line text-ink rounded-full hover:border-line-strong transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="px-6 lg:px-10 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <p className="eyebrow mb-2">Catalog</p>
              <h2 className="display text-[32px] sm:text-[36px]">
                Available <em>courses</em>
              </h2>
            </div>
            <span className="text-[12px] text-ink-muted">
              {coursesWithCount.length} {coursesWithCount.length === 1 ? 'course' : 'courses'}
            </span>
          </div>

          {coursesWithCount.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-surface border border-line">
              <p className="text-ink-muted text-[14px]">No courses available yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {coursesWithCount.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group rounded-2xl overflow-hidden bg-surface border border-line hover:border-line-strong transition-colors flex flex-col"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-surface-muted">
                    <CourseThumb
                      title={course.title}
                      coverImage={course.cover_image}
                      className="w-full h-full rounded-none"
                    />
                  </div>

                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="font-serif text-[20px] leading-[1.2] text-ink mb-2 line-clamp-2 group-hover:text-accent-deep transition-colors">
                      {course.title}
                    </h3>

                    {course.description && (
                      <p className="text-[13px] text-ink-soft leading-relaxed line-clamp-3 mb-5">
                        {course.description}
                      </p>
                    )}

                    <div className="mt-auto pt-4 border-t border-line-soft flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-ink-muted font-medium">
                        {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
                      </span>
                      <span className="text-[12px] font-medium text-accent inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                        View
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
