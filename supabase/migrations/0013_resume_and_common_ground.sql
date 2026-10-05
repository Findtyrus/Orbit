-- Resume-based background (the PDF itself is never stored, only what's extracted) and per-person common ground.
-- Safe to run more than once.

alter table public.profiles
  add column if not exists resume            jsonb,        -- {summary, education[], experience[], skills[], activities[], certifications[], hometown}
  add column if not exists resume_updated_at timestamptz;

alter table public.synopses
  add column if not exists common_ground text[] not null default '{}';
