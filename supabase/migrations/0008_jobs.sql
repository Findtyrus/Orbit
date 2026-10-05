-- Job search: saved postings (per user) and a shared cache of provider results to stay inside API quotas.

alter table public.profiles add column location text not null default '';  -- preferred job location

create table public.saved_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  source       text not null default 'adzuna',
  external_id  text not null,
  title        text not null,
  company      text,
  location     text,
  url          text not null,
  posted_at    timestamptz,
  salary       text,
  description  text,
  status       text not null default 'Saved'
                 check (status in ('Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected')),
  firm_id      uuid references public.firms on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, source, external_id)
);
create trigger saved_jobs_touch before update on public.saved_jobs
  for each row execute function public.touch_updated_at();

alter table public.saved_jobs enable row level security;
create policy "own saved jobs" on public.saved_jobs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Public job-board results are identical for everyone, so cache them by query. Server-only (no policies).
create table public.job_cache (
  key         text primary key,
  results     jsonb not null,
  fetched_at  timestamptz not null default now()
);
alter table public.job_cache enable row level security;
