-- Per-section draft/published status. Admins can flag a section as 'draft'
-- to hide it from students even while the course is published.

alter table public.sections
  add column if not exists status text not null default 'published'
  check (status in ('draft', 'published'));

create index if not exists idx_sections_status on public.sections(status);

-- Replace student-visible sections policy: course must be published AND section must be published.
drop policy if exists "Anyone can read sections of published courses" on public.sections;
create policy "Anyone can read published sections of published courses"
  on public.sections for select
  using (
    status = 'published'
    and exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_id and c.status = 'published'
    )
  );

-- Replace student-visible content_blocks policy: parent section must be published too.
drop policy if exists "Anyone can read content of published courses" on public.content_blocks;
create policy "Anyone can read content of published sections"
  on public.content_blocks for select
  using (
    exists (
      select 1 from public.sections s
      join public.modules m on m.id = s.module_id
      join public.courses c on c.id = m.course_id
      where s.id = section_id
        and s.status = 'published'
        and c.status = 'published'
    )
  );

-- Notification trigger: skip when the new section is a draft.
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
  if new.status is distinct from 'published' then
    return new;
  end if;

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
