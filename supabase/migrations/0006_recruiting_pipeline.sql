-- Recruiting pipeline: target firms move through stages; people link to firms by company name;
-- each person moves through a coffee-chat pipeline.

create table public.firms (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  aliases     text[] not null default '{}',   -- other names the firm appears under, e.g. {A&M}
  category    text,                           -- Big 4, Regional CPA, Boutique IB, Middle-market IB, PE, Corporate…
  stage       text not null default 'Researching' check (stage in
                ('Researching', 'Networking', 'Referral', 'Applied', 'Interviewing', 'Offer', 'Closed')),
  priority    int not null default 2 check (priority between 1 and 3),  -- 1 = dream firm
  deadline    date,                           -- application deadline
  role        text,                           -- the role you're targeting there
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index firms_user_name on public.firms (user_id, lower(name));
create trigger firms_touch before update on public.firms
  for each row execute function public.touch_updated_at();

alter table public.firms enable row level security;
create policy "own firms" on public.firms for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Coffee-chat pipeline per person (replaces the unused free-text default).
update public.contacts set stage = 'New'
  where stage not in ('New', 'Reached out', 'Chat scheduled', 'Chatted', 'Referred me', 'Mentor');
alter table public.contacts alter column stage set default 'New';
alter table public.contacts add constraint contacts_stage_check check (stage in
  ('New', 'Reached out', 'Chat scheduled', 'Chatted', 'Referred me', 'Mentor'));
