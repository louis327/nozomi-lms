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

export async function POST(request: NextRequest) {
  const adminClient = await verifyAdmin()
  if (!adminClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { module_id, title, sort_order } = body

  if (!module_id) {
    return NextResponse.json({ error: 'Missing module_id' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('sections')
    .insert({
      module_id,
      title: title || 'New Section',
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const adminClient = await verifyAdmin()
  if (!adminClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { sections } = body as { sections: { id: string; sort_order: number }[] }

  if (!sections?.length) {
    return NextResponse.json({ error: 'No sections provided' }, { status: 400 })
  }

  for (const sec of sections) {
    const { error } = await adminClient
      .from('sections')
      .update({ sort_order: sec.sort_order })
      .eq('id', sec.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
