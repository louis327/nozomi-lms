import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { CourseDeleteButton } from '@/components/admin/course-delete-button'
import { CoursesHeader } from '@/components/admin/courses-header'

export default async function AdminCoursesPage() {
  const supabase = createAdminClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, status, created_at, cover_image')
    .order('sort_order', { ascending: true })

  const courseIds = (courses ?? []).map((c) => c.id)

  const [modulesRes, enrollmentsRes] = await Promise.all([
    supabase.from('modules').select('id, course_id').in('course_id', courseIds.length ? courseIds : ['']),
    supabase.from('enrollments').select('id, course_id').in('course_id', courseIds.length ? courseIds : ['']),
  ])

  const moduleCounts: Record<string, number> = {}
  ;(modulesRes.data ?? []).forEach((m) => {
    moduleCounts[m.course_id] = (moduleCounts[m.course_id] || 0) + 1
  })

  const studentCounts: Record<string, number> = {}
  ;(enrollmentsRes.data ?? []).forEach((e) => {
    studentCounts[e.course_id] = (studentCounts[e.course_id] || 0) + 1
  })

  return (
    <div>
      <CoursesHeader />

      {(courses ?? []).length === 0 ? (
        <div className="bg-white border border-[#e8e8e8] rounded-xl p-12 text-center">
          <p className="text-[13px] text-[#888] mb-4">No courses yet. Create your first course to get started.</p>
          <Link
            href="/admin/courses/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-heading font-semibold rounded-lg bg-nz-sakura text-white hover:bg-nz-sakura-deep transition-colors"
          >
            Create Course
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e8e8e8] divide-y divide-[#f0f0f0]">
          {(courses ?? []).map((course) => (
            <div
              key={course.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[#fafafa] transition-colors group"
            >
              {/* Thumbnail */}
              <div className="w-16 h-12 rounded-lg bg-[#f5f5f5] overflow-hidden shrink-0">
                {course.cover_image ? (
                  <img src={course.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#ccc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-[14px] text-[#111] truncate leading-tight">{course.title}</h3>
                <p className="text-[12px] text-[#aaa] mt-0.5">
                  {moduleCounts[course.id] || 0} modules &middot; {studentCounts[course.id] || 0} students &middot; {new Date(course.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Status */}
              <span
                className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  course.status === 'published'
                    ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7]'
                    : 'bg-[#fffbeb] text-[#d97706] border border-[#fef3c7]'
                }`}
              >
                {course.status === 'published' ? 'Published' : 'Draft'}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/admin/courses/${course.id}/edit`}
                  className="px-3 py-1.5 text-[12px] font-heading font-semibold rounded-lg bg-[#111] text-white hover:bg-[#333] transition-colors"
                >
                  Edit
                </Link>
                <CourseDeleteButton courseId={course.id} courseTitle={course.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
