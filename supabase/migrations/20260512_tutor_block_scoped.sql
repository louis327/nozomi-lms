-- Move tutor rubrics + sessions from section-level to block-level scope.
-- A rubric now grades answers to a specific content_block (a workbook
-- prompt or structured prompt). Sessions are likewise scoped to a single
-- prompt block.
--
-- section_id is kept for backward compatibility and for the rare case of
-- a section-wide rubric (we'll archive the existing ones, but the column
-- stays so a section-level rubric is still expressible).

alter table public.tutor_rubrics
  add column if not exists block_id uuid references public.content_blocks(id) on delete cascade,
  add column if not exists coachable_score real,
  add column if not exists classifier_reason text;

create index if not exists idx_tutor_rubrics_block on public.tutor_rubrics(block_id);

-- Block-level uniqueness: at most one active rubric per (block, status='approved')
-- Drafts can coexist while admins review. Enforce on a partial index.
create unique index if not exists ux_tutor_rubrics_block_approved
  on public.tutor_rubrics(block_id)
  where status = 'approved' and block_id is not null;

alter table public.tutor_sessions
  add column if not exists block_id uuid references public.content_blocks(id) on delete cascade;

create index if not exists idx_tutor_sessions_user_block
  on public.tutor_sessions(user_id, block_id)
  where status = 'active' and block_id is not null;
