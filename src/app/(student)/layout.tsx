import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentLayoutShell } from '@/components/layout/student-layout-shell'
import { ToastProvider } from '@/components/ui/toast'
import { TourGuide } from '@/components/tour/tour-guide'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email, onboarding_completed, tour_completed_at')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const userName = profile?.full_name || profile?.email || 'Student'
  const isAdmin = profile?.role === 'admin'

  // Resolve hrefs for the tour to navigate the user through one example course.
  let firstCourseHref: string | null = null
  let firstSectionHref: string | null = null
  if (profile && !profile.tour_completed_at) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .limit(1)
    const firstCourseId = courses?.[0]?.id
    if (firstCourseId) {
      firstCourseHref = `/courses/${firstCourseId}`
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', firstCourseId)
        .order('sort_order', { ascending: true })
        .limit(1)
      const firstModuleId = modules?.[0]?.id
      if (firstModuleId) {
        const { data: sections } = await supabase
          .from('sections')
          .select('id')
          .eq('module_id', firstModuleId)
          .order('sort_order', { ascending: true })
          .limit(1)
        const firstSectionId = sections?.[0]?.id
        if (firstSectionId) {
          firstSectionHref = `/courses/${firstCourseId}/learn/${firstSectionId}`
        }
      }
    }
  }

  return (
    <ToastProvider>
      <TourGuide
        initialCompleted={Boolean(profile?.tour_completed_at)}
        firstCourseHref={firstCourseHref}
        firstSectionHref={firstSectionHref}
      >
        <div className="min-h-screen bg-canvas">
          <StudentLayoutShell userName={userName} isAdmin={isAdmin}>
            {children}
          </StudentLayoutShell>
        </div>
      </TourGuide>
    </ToastProvider>
  )
}
