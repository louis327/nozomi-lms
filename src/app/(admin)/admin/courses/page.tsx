import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Plus } from 'lucide-react'
import { CourseDeleteButton } from '@/components/admin/course-delete-button'

export default async function AdminCoursesPage() {
  const supabase = createAdminClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, status, created_at, cover_image')
    .order('sort_order', { ascending: true })

  // Fetch module counts and enrollment counts
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-2xl font-bold text-nz-text-primary">
          Courses
        </h1>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-heading font-semibold rounded-xl bg-nz-sakura text-nz-bg-primary hover:bg-nz-sakura-deep transition-colors sakura-glow"
        >
          <Plus className="w-4 h-4" />
          Create Course
        </Link>
      </div>

      {(courses ?? []).length === 0 ? (
        <div className="bg-nz-bg-card border border-nz-border rounded-2xl p-12 text-center">
          <p className="text-nz-text-tertiary mb-4">No courses yet. Create your first course to get started.</p>
          <Link
            href="/admin/courses/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-heading font-semibold rounded-xl bg-nz-sakura text-nz-bg-primary hover:bg-nz-sakura-deep transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Course
          </Link>
        </div>
      ) : (
        <div className="bg-nz-bg-card border border-nz-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-nz-border">
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Course
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Modules
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Students
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nz-border/50">
              {(courses ?? []).map((course) => (
                <tr key={course.id} className="hover:bg-nz-bg-elevated/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-nz-text-primary">{course.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        course.status === 'published'
                          ? 'bg-nz-success/15 text-nz-success'
                          : 'bg-nz-warning/15 text-nz-warning'
                      }`}
                    >
                      {course.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-nz-text-secondary">
                    {moduleCounts[course.id] || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-nz-text-secondary">
                    {studentCounts[course.id] || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-nz-text-tertiary">
                    {new Date(course.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-nz-bg-elevated text-nz-text-secondary hover:text-nz-text-primary border border-nz-border hover:border-nz-border-hover transition-colors"
                      >
                        Edit
                      </Link>
                      <CourseDeleteButton courseId={course.id} courseTitle={course.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
