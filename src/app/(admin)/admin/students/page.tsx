import { createAdminClient } from '@/lib/supabase/admin'
import { StudentList } from '@/components/admin/student-list'

export default async function AdminStudentsPage() {
  const supabase = createAdminClient()

  // Fetch all student profiles
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  // Fetch all enrollments with course info
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, user_id, course_id, enrolled_at, courses(title)')

  // Fetch all section progress
  const { data: progress } = await supabase
    .from('section_progress')
    .select('id, user_id, section_id, completed, completed_at')

  // Fetch sections with module info for mapping
  const { data: sections } = await supabase
    .from('sections')
    .select('id, module_id, modules(course_id)')

  // Build a map: section_id -> course_id
  const sectionToCourse: Record<string, string> = {}
  ;(sections ?? []).forEach((s) => {
    const mod = s.modules as unknown as Record<string, string> | null
    if (mod?.course_id) sectionToCourse[s.id] = mod.course_id
  })

  // Count total sections per course
  const totalSectionsPerCourse: Record<string, number> = {}
  ;(sections ?? []).forEach((s) => {
    const courseId = sectionToCourse[s.id]
    if (courseId) totalSectionsPerCourse[courseId] = (totalSectionsPerCourse[courseId] || 0) + 1
  })

  // Build enriched student data
  const studentData = (students ?? []).map((student) => {
    const studentEnrollments = (enrollments ?? []).filter((e) => e.user_id === student.id)
    const studentProgress = (progress ?? []).filter((p) => p.user_id === student.id && p.completed)

    // Progress per course
    const courseProgress: Record<string, { completed: number; total: number; title: string }> = {}
    studentEnrollments.forEach((e) => {
      const course = e.courses as unknown as Record<string, string> | null
      courseProgress[e.course_id] = {
        completed: 0,
        total: totalSectionsPerCourse[e.course_id] || 0,
        title: course?.title || 'Unknown',
      }
    })

    studentProgress.forEach((p) => {
      const courseId = sectionToCourse[p.section_id]
      if (courseId && courseProgress[courseId]) {
        courseProgress[courseId].completed++
      }
    })

    // Last active: most recent completed_at
    const completedDates = studentProgress
      .filter((p) => p.completed_at)
      .map((p) => new Date(p.completed_at!).getTime())
    const lastActive = completedDates.length > 0 ? new Date(Math.max(...completedDates)).toISOString() : null

    return {
      ...student,
      enrolledCount: studentEnrollments.length,
      courseProgress,
      lastActive,
    }
  })

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-nz-text-primary mb-8">
        Students
      </h1>

      <StudentList students={studentData} />
    </div>
  )
}
