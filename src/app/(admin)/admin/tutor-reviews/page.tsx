import { createAdminClient } from '@/lib/supabase/admin'
import { TutorReviewList } from '@/components/admin/tutor-review-list'

export const dynamic = 'force-dynamic'

export default async function TutorReviewsPage() {
  const supabase = createAdminClient()

  // Pull recent flagged turns (the calibration queue) and recent passes for
  // context. Newest first.
  const { data: turns } = await supabase
    .from('tutor_turns')
    .select(`
      id, session_id, turn_number, student_message, agent_message, intent, verdict,
      shallow_pattern, gap, flagged_for_review, flag_reason, raw_evaluation, raw_critic, created_at,
      tutor_sessions ( user_id, section_id, sections ( title, modules ( title, courses ( title ) ) ) )
    `)
    .order('created_at', { ascending: false })
    .limit(80)

  const turnIds = (turns ?? []).map(t => t.id)
  const { data: existingReviews } = turnIds.length
    ? await supabase
        .from('tutor_reviews')
        .select('turn_id, judgement, note, reviewer_id, created_at')
        .in('turn_id', turnIds)
    : { data: [] }

  const reviewByTurn: Record<string, any[]> = {}
  for (const r of existingReviews ?? []) {
    if (!reviewByTurn[r.turn_id]) reviewByTurn[r.turn_id] = []
    reviewByTurn[r.turn_id].push(r)
  }

  const flagged = (turns ?? []).filter(t => t.flagged_for_review)
  const passes = (turns ?? []).filter(t => !t.flagged_for_review).slice(0, 20)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[24px] font-heading font-bold text-[#111] tracking-[-0.02em]">Tutor Reviews</h1>
        <p className="text-[13.5px] text-[#666] mt-1 max-w-[640px]">
          Calibration queue. Each flagged turn shows what the student said, what the agent replied,
          and why the critic objected. Rate it and the rubrics improve over time.
        </p>
      </header>

      <section>
        <h2 className="text-[14px] font-semibold text-[#111] uppercase tracking-[0.08em] mb-3">
          Flagged for review · {flagged.length}
        </h2>
        <TutorReviewList turns={flagged as any} existingReviews={reviewByTurn} />
      </section>

      <section>
        <h2 className="text-[14px] font-semibold text-[#111] uppercase tracking-[0.08em] mb-3">
          Recent unflagged · {passes.length}
        </h2>
        <p className="text-[12.5px] text-[#888] mb-3 max-w-[600px]">
          Sample these too — the critic isn't infallible. If a "clean" turn is actually bad, mark it.
        </p>
        <TutorReviewList turns={passes as any} existingReviews={reviewByTurn} />
      </section>
    </div>
  )
}
