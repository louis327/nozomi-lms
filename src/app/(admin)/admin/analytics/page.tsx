import { createAdminClient } from '@/lib/supabase/admin'
import { AnalyticsView } from '@/components/admin/analytics-view'

type SearchParams = Promise<{ courseId?: string }>

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = createAdminClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .order('sort_order', { ascending: true })

  const courseId = params.courseId ?? null
  let funnel: {
    sectionId: string
    moduleTitle: string
    sectionTitle: string
    reached: number
    completed: number
  }[] = []
  let enrolled = 0
  let courseTitle = ''

  if (courseId) {
    const { data: course } = await supabase
      .from('courses')
      .select(`
        id, title,
        modules (
          id, title, sort_order,
          sections ( id, title, sort_order )
        )
      `)
      .eq('id', courseId)
      .single()

    courseTitle = course?.title ?? ''

    const orderedSections: { id: string; title: string; moduleTitle: string }[] = []
    const mods = [...((course?.modules as never[]) ?? [])].sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
    ) as { id: string; title: string; sort_order: number; sections: { id: string; title: string; sort_order: number }[] }[]
    for (const m of mods) {
      const secs = [...(m.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      for (const s of secs) {
        orderedSections.push({ id: s.id, title: s.title, moduleTitle: m.title })
      }
    }

    const { count: enrolledCount } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
    enrolled = enrolledCount ?? 0

    const sectionIds = orderedSections.map((s) => s.id)

    if (sectionIds.length > 0) {
      const { data: progressRows } = await supabase
        .from('section_progress')
        .select('section_id, user_id, completed, workbook_data')
        .in('section_id', sectionIds)

      const reachedMap = new Map<string, Set<string>>()
      const completedMap = new Map<string, Set<string>>()

      for (const r of progressRows ?? []) {
        const reached = reachedMap.get(r.section_id) ?? new Set<string>()
        const hasData =
          r.completed ||
          (r.workbook_data && Object.keys(r.workbook_data).length > 0)
        if (hasData) reached.add(r.user_id)
        reachedMap.set(r.section_id, reached)

        if (r.completed) {
          const c = completedMap.get(r.section_id) ?? new Set<string>()
          c.add(r.user_id)
          completedMap.set(r.section_id, c)
        }
      }

      funnel = orderedSections.map((s) => ({
        sectionId: s.id,
        moduleTitle: s.moduleTitle,
        sectionTitle: s.title,
        reached: reachedMap.get(s.id)?.size ?? 0,
        completed: completedMap.get(s.id)?.size ?? 0,
      }))
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-nz-text-primary mb-2">
        Drop-off Analytics
      </h1>
      <p className="text-sm text-[#888] mb-8">
        See where students stall in a course. &ldquo;Reached&rdquo; means any saved data;
        &ldquo;Completed&rdquo; means the section was marked complete.
      </p>

      <AnalyticsView
        courses={(courses ?? []) as never}
        selectedCourseId={courseId}
        courseTitle={courseTitle}
        enrolled={enrolled}
        funnel={funnel}
      />
    </div>
  )
}
