-- Append-only progress log written by the n8n tutor workflow as it
-- moves through each stage. The Next.js SSE endpoint polls this table
-- (filtered by turn_correlation_id) and streams new rows to the client.
--
-- correlation_id is a UUID generated client-side per turn — it is opaque
-- to the client and acts as a capability token for the SSE stream.

create table if not exists public.tutor_turn_progress (
  id uuid primary key default gen_random_uuid(),
  turn_correlation_id uuid not null,
  stage text not null,
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tutor_turn_progress_corr
  on public.tutor_turn_progress(turn_correlation_id, created_at);

-- Garbage-collect rows older than 24h to keep this thin.
create index if not exists idx_tutor_turn_progress_age
  on public.tutor_turn_progress(created_at);

-- No RLS: only the service role writes (n8n) and reads (Next.js SSE).
-- If a third party guessed the correlation UUID they could see the
-- progress events, but the events are not sensitive (just stage names).
