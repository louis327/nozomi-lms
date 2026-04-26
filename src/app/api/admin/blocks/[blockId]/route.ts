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
  { params }: { params: Promise<{ blockId: string }> }
) {
  const adminClient = await verifyAdmin()
  if (!adminClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { blockId } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.content !== undefined) updates.content = body.content
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.type !== undefined) updates.type = body.type

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('content_blocks')
    .update(updates)
    .eq('id', blockId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const adminClient = await verifyAdmin()
  if (!adminClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { blockId } = await params

  const { error } = await adminClient
    .from('content_blocks')
    .delete()
    .eq('id', blockId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
