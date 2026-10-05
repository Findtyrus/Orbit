-- Resume-based background (the PDF itself is never stored, only what's extracted) and per-person common ground.

alter table public.profiles
  add column resume            jsonb,        -- {summary, education[], experience[], skills[], activities[], certifications[], hometown}
  add column resume_updated_at timestamptz;

alter table public.synopses
  add column common_ground text[] not null default '{}';
