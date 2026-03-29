import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CourseSidebar } from '@/components/course/course-sidebar'

export default async function CourseLearnLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (!enrollment) redirect('/courses')

  // Fetch course structure
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, cover_image, status, sort_order, created_at, updated_at,
      modules (
        id, course_id, title, description, sort_order, created_at, updated_at,
        sections ( id, module_id, title, video_url, sort_order, created_at, updated_at )
      )
    `)
    .eq('id', courseId)
    .single()

  if (!course) redirect('/dashboard')

  // Fetch all section progress for this user in this course
  const allSectionIds: string[] = []
  for (const mod of course.modules ?? []) {
    for (const sec of (mod as any).sections ?? []) {
      allSectionIds.push(sec.id)
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

  // Determine current section from the URL - we pass empty string and the sidebar handles it
  // The actual currentSectionId will come from the child route

  return (
    <div className="flex min-h-screen">
      <CourseSidebar
        course={course as any}
        progress={progressMap}
        currentSectionId=""
        courseId={courseId}
      />
      <div className="flex-1 lg:ml-[280px]">
        {children}
      </div>
    </div>
  )
}
