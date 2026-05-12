import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/tutor/start
// Body: { sectionId, blockId }
// Returns: { sessionId, question, isExistingSession, turnCount }
// Creates a new active session (or returns the existing active one) for this
// (user, block) pair. The rubric must exist and be approved for the block.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { sectionId, blockId } = await request.json()
  if (!sectionId || !blockId) {
    return NextResponse.json({ error: 'sectionId and blockId required' }, { status: 400 })
  }

  const { data: rubric } = await supabase
    .from('tutor_rubrics')
    .select('id, question')
    .eq('block_id', blockId)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle()

  if (!rubric) {
    return NextResponse.json({ error: 'No approved rubric for this prompt' }, { status: 404 })
  }

  // Reuse an active session for this (user, block) if one exists.
  const { data: existing } = await supabase
    .from('tutor_sessions')
    .select('id, turn_count, mastery_reached')
    .eq('user_id', user.id)
    .eq('block_id', blockId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      sessionId: existing.id,
      question: rubric.question,
      isExistingSession: true,
      turnCount: existing.turn_count,
      mastery: existing.mastery_reached
    })
  }

  const { data: created, error: createErr } = await supabase
    .from('tutor_sessions')
    .insert({
      user_id: user.id,
      section_id: sectionId,
      block_id: blockId,
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
