import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// POST /api/tutor/warm
// Fires a minimal Anthropic call to open the connection + warm Vercel's
// serverless function instance. Called when the student opens the Coach
// panel — cuts ~200-500ms off the first real Evaluate call.
//
// Always returns 200 fast; failure is silent — this is a UX preload, not
// a blocking dependency.
export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  // Fire and forget — don't wait for completion.
  anthropic.messages
    .create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'warm' }]
    })
    .catch(() => {})

  return NextResponse.json({ ok: true })
}
