import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CourseLearnIndexPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()

  // Fetch the first module (by sort_order), then its first section
  const { data: modules } = await supabase
    .from('modules')
    .select('id, sort_order, sections ( id, sort_order )')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })
    .limit(1)

  const firstModule = modules?.[0]
  if (!firstModule) redirect('/dashboard')

  const sections = [...((firstModule as any).sections ?? [])].sort(
    (a: any, b: any) => a.sort_order - b.sort_order
  )
  const firstSection = sections[0]
  if (!firstSection) redirect('/dashboard')

  redirect(`/courses/${courseId}/learn/${firstSection.id}`)
}
