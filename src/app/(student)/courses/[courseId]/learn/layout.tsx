import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CourseLearnShell } from '@/components/course/course-learn-shell'

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

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Verify enrollment (admins can view any course without enrollment)
  if (!isAdmin) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (!enrollment) redirect('/courses')
  }

  // Fetch course structure
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, cover_image, status, sort_order, created_at, updated_at,
      modules (
        id, course_id, title, description, sort_order, created_at, updated_at,
        sections ( id, module_id, title, video_url, status, sort_order, created_at, updated_at )
      )
    `)
    .eq('id', courseId)
    .single()

  if (!course) redirect('/dashboard')

  // Hide draft sections from non-admins (RLS already does this for them, but
  // admins fetch everything — students see only published sections).
  if (!isAdmin) {
    for (const mod of (course.modules ?? []) as any[]) {
      mod.sections = (mod.sections ?? []).filter((s: any) => s.status === 'published')
    }
  }

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

  return (
    <CourseLearnShell
      course={course as any}
      progress={progressMap}
      courseId={courseId}
      isAdmin={isAdmin}
    >
      {children}
    </CourseLearnShell>
  )
}
