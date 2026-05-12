-- Optional per-module overrides for the hero card.
--   label   — overrides the auto-computed "Module N" heading
--   eyebrow — overrides the course-title eyebrow above it
-- Both nullable; when null, the hero falls back to the auto values.

alter table public.modules
  add column if not exists label text,
  add column if not exists eyebrow text;
