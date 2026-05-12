import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

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
  return { adminClient, userId: user.id }
}

// POST /api/admin/rubrics/[id]/approve  → sets status='approved' and stamps reviewer
// POST /api/admin/rubrics/[id]/approve { unapprove: true } → reverts to draft
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await verifyAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const unapprove = !!body.unapprove

  const update = unapprove
    ? { status: 'draft', approved_by: null, approved_at: null }
    : { status: 'approved', approved_by: ctx.userId, approved_at: new Date().toISOString() }

  const { data, error } = await ctx.adminClient
    .from('tutor_rubrics')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rubric: data })
}
