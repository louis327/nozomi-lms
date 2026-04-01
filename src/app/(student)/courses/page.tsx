import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course } from '@/lib/types'

export const metadata = { title: 'Browse Courses — Nozomi' }

export default async function BrowseCoursesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: courses } = await supabase
    .from('courses')
    .select('*, modules(id)')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id))

  const coursesWithCount = (courses ?? []).map((course: Course & { modules: { id: string }[] }) => ({
    ...course,
    moduleCount: course.modules?.length ?? 0,
    isEnrolled: enrolledIds.has(course.id),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-[22px] font-bold text-[#111] tracking-[-0.02em]">Browse Courses</h1>
          <p className="text-[13px] text-[#888] mt-1">{coursesWithCount.length} course{coursesWithCount.length !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      {coursesWithCount.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8e8e8] p-10 text-center">
          <p className="text-[13px] text-[#888]">No courses available yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coursesWithCount.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="group">
              <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden hover:border-[#d4d4d4] hover:-translate-y-0.5 transition-all">
                {/* Cover */}
                <div className="aspect-video bg-[#f5f5f5] relative overflow-hidden">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#ccc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                      </svg>
                    </div>
                  )}
                  {course.isEnrolled && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#16a34a] text-white text-[10px] font-bold uppercase tracking-wider">
                      Enrolled
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-heading font-semibold text-[14px] text-[#111] group-hover:text-nz-sakura transition-colors truncate mb-1">{course.title}</h3>
                  {course.description && (
                    <p className="text-[12px] text-[#888] line-clamp-2 mb-3">{course.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#aaa]">{course.moduleCount} module{course.moduleCount !== 1 ? 's' : ''}</span>
                    <span className="text-[12px] font-semibold text-nz-sakura group-hover:text-nz-sakura-deep transition-colors">
                      {course.isEnrolled ? 'Continue' : 'View'} &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
