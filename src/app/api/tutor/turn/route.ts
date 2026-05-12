import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Webhook URL for the n8n tutor agent workflow.
const N8N_TUTOR_WEBHOOK =
  process.env.N8N_TUTOR_WEBHOOK_URL || 'https://n8n.textflow.com.au/webhook/nozomi-tutor-turn'

// POST /api/tutor/turn
// Body: { sessionId, sectionId, studentMessage }
// Forwards to the n8n Socratic tutor workflow and returns its reply.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { sessionId, sectionId, blockId, studentMessage } = await request.json()
  if (!sessionId || !sectionId || !blockId || typeof studentMessage !== 'string') {
    return NextResponse.json({ error: 'sessionId, sectionId, blockId, studentMessage required' }, { status: 400 })
  }

  // Confirm the session belongs to this user. RLS would also enforce this,
  // but we want a clean 403 not a silent miss.
  const { data: session } = await supabase
    .from('tutor_sessions')
    .select('id, user_id, section_id, block_id, status')
    .eq('id', sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.section_id !== sectionId) {
    return NextResponse.json({ error: 'Section mismatch' }, { status: 400 })
  }
  if (session.block_id && session.block_id !== blockId) {
    return NextResponse.json({ error: 'Block mismatch' }, { status: 400 })
  }
  if (session.status !== 'active') {
    return NextResponse.json({ error: 'Session already ended', status: session.status }, { status: 409 })
  }

  const res = await fetch(N8N_TUTOR_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      userId: user.id,
      sectionId,
      blockId,
      studentMessage
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return NextResponse.json(
      { error: 'Tutor workflow failed', status: res.status, detail: text.slice(0, 500) },
      { status: 502 }
    )
  }

  const data = await res.json().catch(() => null)
  if (!data || typeof data !== 'object') {
    return NextResponse.json({ error: 'Tutor workflow returned invalid response' }, { status: 502 })
  }

  return NextResponse.json(data)
}
