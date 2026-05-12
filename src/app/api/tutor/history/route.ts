import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/tutor/history?sessionId=...
// Returns the full turn-by-turn history for an active tutor session.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: session } = await supabase
    .from('tutor_sessions')
    .select('id, user_id, status, mastery_reached')
    .eq('id', sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: turns } = await supabase
    .from('tutor_turns')
    .select('turn_number, student_message, agent_message, intent, verdict, created_at')
    .eq('session_id', sessionId)
    .order('turn_number', { ascending: true })

  return NextResponse.json({
    sessionId,
    status: session.status,
    mastery: session.mastery_reached,
    turns: turns ?? []
  })
}
