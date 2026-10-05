-- Gmail + Calendar sync: connection status and meetings (with AI prep briefs).

alter table public.google_accounts
  add column needs_reconnect boolean not null default false,
  add column last_error      text;

create table public.meetings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  google_event_id text not null,
  title           text not null default '',
  description     text,
  location        text,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  attendees       jsonb not null default '[]',   -- [{email, name}] excluding you
  contact_ids     uuid[] not null default '{}',
  prep            jsonb,                          -- AI meeting brief, generated on demand
  debriefed       boolean not null default false, -- you logged how it went
  created_at      timestamptz not null default now(),
  unique (user_id, google_event_id)
);
create index meetings_user_start on public.meetings (user_id, start_at);
create index meetings_contacts on public.meetings using gin (contact_ids);

alter table public.meetings enable row level security;
create policy "own meetings" on public.meetings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Connection status for the UI (never exposes the token itself).
create view public.google_status with (security_invoker = false) as
  select user_id, email, last_gmail_sync, last_calendar_sync, needs_reconnect, last_error
  from public.google_accounts
  where user_id = (select auth.uid());
grant select on public.google_status to authenticated;
