-- Author review log: one row per (turn, admin) judgment.
-- The author can rate a flagged turn as "agent right" / "agent wrong" /
-- "verdict wrong" and leave a note. Used to compound rubric quality.

create table if not exists public.tutor_reviews (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.tutor_turns(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  judgement text not null check (judgement in (
    'agent_right',       -- agent's reply was correct, critic flag was wrong
    'agent_wrong',       -- agent's reply was bad, critic flag was right
    'verdict_wrong',     -- the evaluator graded incorrectly (pass/shallow/wrong)
    'rubric_gap'         -- the rubric is missing a pattern that would have helped
  )),
  note text,
  created_at timestamptz not null default now(),
  unique (turn_id, reviewer_id)
);

create index if not exists idx_tutor_reviews_turn on public.tutor_reviews(turn_id);

alter table public.tutor_reviews enable row level security;

drop policy if exists "admins manage reviews" on public.tutor_reviews;
create policy "admins manage reviews" on public.tutor_reviews
  for all using (public.is_admin()) with check (public.is_admin());
