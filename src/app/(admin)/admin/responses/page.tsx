import { createAdminClient } from '@/lib/supabase/admin'
import { ResponsesView } from '@/components/admin/responses-view'

type SearchParams = Promise<{ courseId?: string; sectionId?: string }>

export default async function AdminResponsesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = createAdminClient()

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, title,
      modules (
        id, title, sort_order,
        sections ( id, title, sort_order )
      )
    `)
    .order('sort_order', { ascending: true })

  let blocks: { id: string; type: string; content: Record<string, unknown>; sort_order: number }[] = []
  let responses: {
    user_id: string
    full_name: string | null
    email: string | null
    workbook_data: Record<string, unknown> | null
    completed: boolean
    completed_at: string | null
    updated_at: string
  }[] = []
  let sectionTitle = ''

  if (params.sectionId) {
    const { data: blocksData } = await supabase
      .from('content_blocks')
      .select('id, type, content, sort_order')
      .eq('section_id', params.sectionId)
      .order('sort_order', { ascending: true })

    blocks = (blocksData ?? []) as typeof blocks

    const { data: section } = await supabase
      .from('sections')
      .select('title')
      .eq('id', params.sectionId)
      .single()
    sectionTitle = section?.title ?? ''

    const { data: progressRows } = await supabase
      .from('section_progress')
      .select('user_id, workbook_data, completed, completed_at, updated_at')
      .eq('section_id', params.sectionId)
      .order('updated_at', { ascending: false })

    const userIds = (progressRows ?? []).map((r) => r.user_id)
    const { data: profiles } =
      userIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
        : { data: [] }

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]),
    )

    responses = (progressRows ?? [])
      .filter((r) => r.workbook_data && Object.keys(r.workbook_data).length > 0)
      .map((r) => ({
        user_id: r.user_id,
        full_name: profileMap.get(r.user_id)?.full_name ?? null,
        email: profileMap.get(r.user_id)?.email ?? null,
        workbook_data: r.workbook_data,
        completed: r.completed,
        completed_at: r.completed_at,
        updated_at: r.updated_at,
      }))
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-nz-text-primary mb-2">
        Workbook Responses
      </h1>
      <p className="text-sm text-[#888] mb-8">
        Pick a course and section to view all student answers side by side.
      </p>

      <ResponsesView
        courses={(courses ?? []) as never}
        selectedCourseId={params.courseId ?? null}
        selectedSectionId={params.sectionId ?? null}
        sectionTitle={sectionTitle}
        blocks={blocks as never}
        responses={responses}
      />
    </div>
  )
}
