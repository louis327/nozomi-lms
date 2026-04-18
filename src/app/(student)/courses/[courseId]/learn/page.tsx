import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CourseLearnIndexPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: course } = await supabase
    .from('courses')
    .select(`id, modules ( id, sort_order, sections ( id, sort_order ) )`)
    .eq('id', courseId)
    .single()

  if (!course) redirect('/courses')

  const modules = [...(course.modules ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
  const allSectionIds: string[] = []
  for (const mod of modules) {
    for (const sec of [...((mod as any).sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)) {
      allSectionIds.push(sec.id)
    }
  }

  if (allSectionIds.length === 0) {
    redirect(`/courses/${courseId}`)
  }

  const { data: progress } = await supabase
    .from('section_progress')
    .select('section_id, completed')
    .eq('user_id', user.id)
    .in('section_id', allSectionIds)

  const completedSet = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.section_id))
  const next = allSectionIds.find((id) => !completedSet.has(id)) ?? allSectionIds[0]

  redirect(`/courses/${courseId}/learn/${next}`)
}
