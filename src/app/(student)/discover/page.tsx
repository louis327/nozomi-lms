import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course } from '@/lib/types'
import { PageTopbar } from '@/components/layout/page-topbar'
import { CourseThumb } from '@/components/ui/course-thumb'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Discover — Nozomi' }

export default async function DiscoverPage() {
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

  type CourseWithMeta = Course & {
    modules: { id: string; sections: { id: string }[] }[]
    moduleCount: number
    sectionTotal: number
    isEnrolled: boolean
  }

  const coursesList: CourseWithMeta[] = (courses ?? []).map(
    (c: Course & { modules: { id: string; sections: { id: string }[] }[] }) => {
      const sectionIds = c.modules?.flatMap((m) => m.sections?.map((s) => s.id) ?? []) ?? []
      return {
        ...c,
        moduleCount: c.modules?.length ?? 0,
        sectionTotal: sectionIds.length,
        isEnrolled: enrolledIds.has(c.id),
      }
    }
  )

  return (
    <div className="pb-24">
      <PageTopbar breadcrumb={[{ label: 'Nozomi', href: '/dashboard' }, { label: 'Discover' }]} />

      <div className="px-6 lg:px-12 pt-8 pb-4">
        <p className="text-[10.5px] font-semibold tracking-[0.32em] text-ink-muted uppercase">
          Catalogue &middot; {coursesList.length} {coursesList.length === 1 ? 'course' : 'courses'}
        </p>
      </div>

      <section className="px-6 lg:px-12 pt-2 pb-14">
        <h1
          className="text-ink mb-6 max-w-[16ch]"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(44px, 7cqi, 84px)',
            lineHeight: 0.96,
            letterSpacing: '-0.035em',
          }}
        >
          Discover what to<span className="text-accent"> build next.</span>
        </h1>
        <p className="text-[15px] text-ink-soft max-w-2xl leading-[1.55]">
          Every course is built by Web3 operators who&rsquo;ve raised and deployed capital.
          Pick what your raise needs right now.
        </p>
      </section>

      <div className="px-6 lg:px-12">
        <div className="border-t border-line" />
      </div>

      <section className="px-6 lg:px-12 pt-10">
        {coursesList.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-[22px] text-ink mb-2 italic">No courses yet.</p>
            <p className="text-[13px] text-ink-muted">New material is being prepared. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {coursesList.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group flex flex-col bg-surface border border-line rounded-2xl overflow-hidden hover:border-line-strong transition-colors"
              >
                <div className="aspect-[16/9] bg-surface-muted relative overflow-hidden">
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CourseThumb title={course.title} size="xl" />
                    </div>
                  )}
                  {course.isEnrolled && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="accent">Enrolled</Badge>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-5 flex flex-col">
                  <h3 className="font-serif text-[20px] text-ink leading-tight mb-2 group-hover:text-accent-deep transition-colors">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-[13px] text-ink-soft line-clamp-3 mb-5 leading-[1.55]">
                      {course.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-line-soft">
                    <span className="text-[11px] text-ink-muted tracking-wide">
                      {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'} &middot; {course.sectionTotal} sections
                    </span>
                    <span className="text-[12px] font-semibold text-accent">
                      {course.isEnrolled ? 'Open →' : 'View →'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
