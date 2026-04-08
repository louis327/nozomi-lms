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
  const { course_id, title, sort_order } = body

  if (!course_id) {
    return NextResponse.json({ error: 'Missing course_id' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('modules')
    .insert({
      course_id,
      title: title || 'New Module',
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
  const { modules } = body as { modules: { id: string; sort_order: number }[] }

  if (!modules?.length) {
    return NextResponse.json({ error: 'No modules provided' }, { status: 400 })
  }

  for (const mod of modules) {
    const { error } = await adminClient
      .from('modules')
      .update({ sort_order: mod.sort_order })
      .eq('id', mod.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
