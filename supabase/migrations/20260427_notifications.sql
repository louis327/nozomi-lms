-- Notifications: per-user inbox surfaced via the topbar bell.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fan-out helper: when a new section lands in a published course,
-- create a notification for every enrolled user.
create or replace function public.notify_on_new_section()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_course_title text;
  v_course_status text;
begin
  select c.id, c.title, c.status
    into v_course_id, v_course_title, v_course_status
  from public.courses c
  join public.modules m on m.course_id = c.id
  where m.id = new.module_id;

  if v_course_status is distinct from 'published' then
    return new;
  end if;

  insert into public.notifications (user_id, kind, title, body, href)
  select
    e.user_id,
    'new_section',
    'New lesson: ' || new.title,
    'Just added to ' || v_course_title || '.',
    '/courses/' || v_course_id || '/learn/' || new.id
  from public.enrollments e
  where e.course_id = v_course_id;

  return new;
end;
$$;

drop trigger if exists sections_after_insert_notify on public.sections;
create trigger sections_after_insert_notify
  after insert on public.sections
  for each row execute function public.notify_on_new_section();
