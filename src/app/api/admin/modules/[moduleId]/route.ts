import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return null
  return adminClient
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminClient = await verifyAdmin()
  if (!adminClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { moduleId } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.label !== undefined) updates.label = body.label || null
  if (body.eyebrow !== undefined) updates.eyebrow = body.eyebrow || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('modules')
    .update(updates)
    .eq('id', moduleId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminClient = await verifyAdmin()
  if (!adminClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { moduleId } = await params

  // Delete all content blocks for sections in this module
  const { data: sections } = await adminClient
    .from('sections')
    .select('id')
    .eq('module_id', moduleId)

  if (sections?.length) {
    const sectionIds = sections.map((s) => s.id)
    await adminClient
      .from('content_blocks')
      .delete()
      .in('section_id', sectionIds)

    // Delete section progress
    await adminClient
      .from('section_progress')
      .delete()
      .in('section_id', sectionIds)
  }

  // Delete module deliverables
  await adminClient
    .from('module_deliverables')
    .delete()
    .eq('module_id', moduleId)

  // Delete module progress
  await adminClient
    .from('module_progress')
    .delete()
    .eq('module_id', moduleId)

  // Delete sections
  await adminClient
    .from('sections')
    .delete()
    .eq('module_id', moduleId)

  // Delete module
  const { error } = await adminClient
    .from('modules')
    .delete()
    .eq('id', moduleId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
