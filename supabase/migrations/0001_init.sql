-- Personal networking CRM: contacts, their interaction timeline, AI synopses, Google tokens.
-- Every row is owned by an auth user and locked down with RLS.

create table public.contacts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  first_name       text not null default '',
  last_name        text not null default '',
  email            text,
  company          text,
  title            text,
  linkedin_slug    text,
  linkedin_url     text,
  connected_on     date,
  source           text not null default 'manual',      -- linkedin_connection | linkedin_message | gmail | calendar | manual
  stage            text not null default 'Connected',
  cadence_days     int check (cadence_days is null or cadence_days > 0),  -- null = no keep-in-touch reminder
  snoozed_until    date,
  starred          boolean not null default false,
  notes            text,
  tags             text[] not null default '{}',
  hubspot_id       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, linkedin_slug)
);
create index contacts_user_email on public.contacts (user_id, lower(email));

create table public.interactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  contact_id   uuid not null references public.contacts on delete cascade,
  kind         text not null check (kind in ('linkedin_message', 'email', 'meeting', 'note', 'call')),
  direction    text check (direction in ('in', 'out')),
  occurred_at  timestamptz not null,
  subject      text,
  body         text,
  external_id  text,   -- dedupe key from the source system
  created_at   timestamptz not null default now(),
  unique (user_id, contact_id, kind, external_id)
);
create index interactions_contact_time on public.interactions (contact_id, occurred_at desc);

create table public.synopses (
  contact_id     uuid primary key references public.contacts on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  summary        text not null,
  talking_points text[] not null default '{}',
  open_loops     text[] not null default '{}',
  source_count   int not null default 0,
  generated_at   timestamptz not null default now()
);

-- OAuth tokens for Gmail/Calendar sync. Server-only: no RLS policies, so only the service role can read.
create table public.google_accounts (
  user_id        uuid primary key references auth.users on delete cascade,
  email          text not null,
  refresh_token  text not null,
  scopes         text,
  last_gmail_sync    timestamptz,
  last_calendar_sync timestamptz,
  created_at     timestamptz not null default now()
);

-- Keep updated_at fresh.
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger contacts_touch before update on public.contacts
  for each row execute function public.touch_updated_at();

-- Derived "when to reach out" status per contact.
create view public.contact_status with (security_invoker = true) as
select
  c.*,
  li.last_interaction_at,
  li.last_outbound_at,
  li.interaction_count,
  case when c.cadence_days is null then null
       else (coalesce(li.last_interaction_at::date, c.connected_on, c.created_at::date) + c.cadence_days)
  end as next_due
from public.contacts c
left join lateral (
  -- A private note to self isn't contact, so it doesn't reset the keep-in-touch clock.
  select max(i.occurred_at) filter (where not (i.kind = 'note' and i.direction is null)) as last_interaction_at,
         max(i.occurred_at) filter (where i.direction = 'out' or i.kind in ('meeting', 'call')) as last_outbound_at,
         count(*)                                                 as interaction_count
  from public.interactions i where i.contact_id = c.id
) li on true;

alter table public.contacts        enable row level security;
alter table public.interactions    enable row level security;
alter table public.synopses        enable row level security;
alter table public.google_accounts enable row level security;

create policy "own contacts"     on public.contacts     for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own interactions" on public.interactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own synopses"     on public.synopses     for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
