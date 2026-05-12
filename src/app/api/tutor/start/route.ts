import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/tutor/start
// Body: { sectionId }
// Returns: { sessionId, question, isExistingSession, openerReply }
// Creates a new active session (or returns the existing active one) for this
// (user, section) pair and surfaces the checkpoint question to display.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { sectionId } = await request.json()
  if (!sectionId) return NextResponse.json({ error: 'sectionId required' }, { status: 400 })

  const { data: rubric, error: rubricErr } = await supabase
    .from('tutor_rubrics')
    .select('id, question')
    .eq('section_id', sectionId)
    .eq('status', 'approved')
    .limit(1)
    .single()

  if (rubricErr || !rubric) {
    return NextResponse.json({ error: 'No approved rubric for this section' }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from('tutor_sessions')
    .select('id, turn_count')
    .eq('user_id', user.id)
    .eq('section_id', sectionId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      sessionId: existing.id,
      question: rubric.question,
      isExistingSession: true,
      turnCount: existing.turn_count
    })
  }

  const { data: created, error: createErr } = await supabase
    .from('tutor_sessions')
    .insert({
      user_id: user.id,
      section_id: sectionId,
      rubric_id: rubric.id,
      status: 'active'
    })
    .select('id')
    .single()

  if (createErr || !created) {
    return NextResponse.json({ error: createErr?.message || 'Failed to create session' }, { status: 500 })
  }

  return NextResponse.json({
    sessionId: created.id,
    question: rubric.question,
    isExistingSession: false,
    turnCount: 0
  })
}
