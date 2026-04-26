import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { sectionId } = await params

  const { data: source, error: srcErr } = await adminClient
    .from('sections')
    .select('*')
    .eq('id', sectionId)
    .single()

  if (srcErr || !source) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  const { data: laterSections } = await adminClient
    .from('sections')
    .select('id, sort_order')
    .eq('module_id', source.module_id)
    .gt('sort_order', source.sort_order)
    .order('sort_order', { ascending: true })

  for (const sec of laterSections ?? []) {
    const { error } = await adminClient
      .from('sections')
      .update({ sort_order: sec.sort_order + 1 })
      .eq('id', sec.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: newSection, error: insErr } = await adminClient
    .from('sections')
    .insert({
      module_id: source.module_id,
      title: `${source.title} (copy)`,
      video_url: source.video_url,
      sort_order: source.sort_order + 1,
    })
    .select()
    .single()

  if (insErr || !newSection) {
    return NextResponse.json({ error: insErr?.message || 'Failed to create section' }, { status: 500 })
  }

  const { data: blocks } = await adminClient
    .from('content_blocks')
    .select('type, content, sort_order')
    .eq('section_id', sectionId)
    .order('sort_order', { ascending: true })

  if (blocks && blocks.length > 0) {
    const blockCopies = blocks.map((b) => ({
      section_id: newSection.id,
      type: b.type,
      content: b.content,
      sort_order: b.sort_order,
    }))
    const { error: blockErr } = await adminClient.from('content_blocks').insert(blockCopies)
    if (blockErr) {
      return NextResponse.json({ error: blockErr.message }, { status: 500 })
    }
  }

  return NextResponse.json(newSection)
}
