import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sectionId = request.nextUrl.searchParams.get('section_id')

  let query = supabase
    .from('section_highlights')
    .select('id, section_id, block_id, selected_text, note, color, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (sectionId) query = query.eq('section_id', sectionId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { section_id, block_id, selected_text, note, color } = body

  if (!section_id || !selected_text?.trim()) {
    return NextResponse.json(
      { error: 'Missing section_id or selected_text' },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('section_highlights')
    .insert({
      user_id: user.id,
      section_id,
      block_id: block_id ?? null,
      selected_text: selected_text.trim(),
      note: note?.trim() || null,
      color: color || 'yellow',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
