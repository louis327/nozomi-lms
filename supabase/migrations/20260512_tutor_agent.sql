-- AI Tutor agent: Socratic tutor that grades student answers against
-- author-approved rubrics, asks targeted probes, and tracks mastery.
--
-- Tables:
--   tutor_rubrics   — per-section rubric (checkpoint question + pass criteria
--                     + shallow patterns with probes + wrong patterns with
--                     leading questions). Authored, then approved by an admin.
--   tutor_sessions  — one per (user, section) attempt at the checkpoint
--   tutor_turns     — every student/agent message in a session, plus the
--                     agent's internal classification + evaluation diagnostics
--   tutor_mastery   — rolled-up (user, section) mastery state

create extension if not exists "pgcrypto";

-- Rubrics ------------------------------------------------------------------

create table if not exists public.tutor_rubrics (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  question text not null,
  pass_criteria jsonb not null default '[]'::jsonb,
  shallow_patterns jsonb not null default '[]'::jsonb,
  wrong_patterns jsonb not null default '[]'::jsonb,
  off_scope_hint text,
  notes text,
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tutor_rubrics_section on public.tutor_rubrics(section_id);
create index if not exists idx_tutor_rubrics_status on public.tutor_rubrics(status);

-- Sessions -----------------------------------------------------------------

create table if not exists public.tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  rubric_id uuid references public.tutor_rubrics(id) on delete set null,
  status text not null default 'active' check (status in ('active','mastered','abandoned')),
  turn_count int not null default 0,
  probe_count int not null default 0,
  mastery_reached bool not null default false,
  started_at timestamptz not null default now(),
  last_turn_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_tutor_sessions_user on public.tutor_sessions(user_id);
create index if not exists idx_tutor_sessions_section on public.tutor_sessions(section_id);
create index if not exists idx_tutor_sessions_user_section_active
  on public.tutor_sessions(user_id, section_id)
  where status = 'active';

-- Turns --------------------------------------------------------------------

create table if not exists public.tutor_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tutor_sessions(id) on delete cascade,
  turn_number int not null,
  student_message text,
  agent_message text not null,
  intent text check (intent in ('answer','question','off_topic','meta','opener')),
  verdict text check (verdict in ('pass','shallow','wrong','partial')),
  shallow_pattern text,
  gap text,
  raw_classification jsonb,
  raw_evaluation jsonb,
  raw_critic jsonb,
  flagged_for_review bool not null default false,
  flag_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tutor_turns_session on public.tutor_turns(session_id, turn_number);
create index if not exists idx_tutor_turns_flagged
  on public.tutor_turns(created_at desc)
  where flagged_for_review = true;

-- Mastery ------------------------------------------------------------------

create table if not exists public.tutor_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','mastered')),
  attempts int not null default 0,
  total_probes int not null default 0,
  first_mastered_at timestamptz,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, section_id)
);

create index if not exists idx_tutor_mastery_user on public.tutor_mastery(user_id);
create index if not exists idx_tutor_mastery_section_status
  on public.tutor_mastery(section_id, status);

-- updated_at triggers ------------------------------------------------------

create or replace function public.set_tutor_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_tutor_rubrics_updated_at on public.tutor_rubrics;
create trigger set_tutor_rubrics_updated_at before update on public.tutor_rubrics
  for each row execute function public.set_tutor_updated_at();

drop trigger if exists set_tutor_mastery_updated_at on public.tutor_mastery;
create trigger set_tutor_mastery_updated_at before update on public.tutor_mastery
  for each row execute function public.set_tutor_updated_at();

-- RLS ----------------------------------------------------------------------

alter table public.tutor_rubrics  enable row level security;
alter table public.tutor_sessions enable row level security;
alter table public.tutor_turns    enable row level security;
alter table public.tutor_mastery  enable row level security;

-- Rubrics: any authenticated user may read approved rubrics (so the student
-- side can show the checkpoint question). Admins manage.
drop policy if exists "read approved rubrics" on public.tutor_rubrics;
create policy "read approved rubrics" on public.tutor_rubrics
  for select using (status = 'approved' or public.is_admin());

drop policy if exists "admins manage rubrics" on public.tutor_rubrics;
create policy "admins manage rubrics" on public.tutor_rubrics
  for all using (public.is_admin()) with check (public.is_admin());

-- Sessions: user reads/inserts their own; admins read all.
-- Note: n8n writes go through service role and bypass RLS.
drop policy if exists "users read own tutor sessions" on public.tutor_sessions;
create policy "users read own tutor sessions" on public.tutor_sessions
  for select using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "users insert own tutor sessions" on public.tutor_sessions;
create policy "users insert own tutor sessions" on public.tutor_sessions
  for insert with check ((select auth.uid()) = user_id);

-- Turns: user reads turns of their own sessions; admins read all.
drop policy if exists "users read own tutor turns" on public.tutor_turns;
create policy "users read own tutor turns" on public.tutor_turns
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.tutor_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

-- Mastery: user reads their own; admins read all.
drop policy if exists "users read own tutor mastery" on public.tutor_mastery;
create policy "users read own tutor mastery" on public.tutor_mastery
  for select using ((select auth.uid()) = user_id or public.is_admin());
