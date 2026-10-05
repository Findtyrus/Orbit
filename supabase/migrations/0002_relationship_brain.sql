-- Relationship Brain: your own profile (context for the AI), structured per-person memory,
-- open loops (commitments), and a transparent relationship score.

create table public.profiles (
  user_id     uuid primary key default auth.uid() references auth.users on delete cascade,
  name        text not null default '',
  about       text not null default '',   -- who you are: background, school, experience
  goals       text not null default '',   -- what you're working toward right now
  updated_at  timestamptz not null default now()
);

-- Living AI memory per contact (extends the phase-1 synopsis row).
alter table public.synopses
  add column facts             jsonb not null default '{}',   -- career / they_told_you / you_told_them / advice_given / personal
  add column next_step         text,
  add column why_now           text,
  add column suggested_message text,
  add column follow_up_on      date,
  add column interactions_seen timestamptz;                   -- newest interaction the memory was built from

create table public.commitments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  contact_id  uuid not null references public.contacts on delete cascade,
  text        text not null,
  owner       text not null default 'me' check (owner in ('me', 'them')),
  due_on      date,
  status      text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  source      text not null default 'ai' check (source in ('ai', 'manual')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);
create index commitments_open on public.commitments (user_id, status, due_on);
create index commitments_contact on public.commitments (contact_id);

alter table public.profiles    enable row level security;
alter table public.commitments enable row level security;
create policy "own profile"     on public.profiles    for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own commitments" on public.commitments for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Relationship score (0-100), every point explainable:
--   up to 25  conversation volume (1.25 per real interaction, capped at 20)
--   up to 20  reciprocity (both sides talk = 20, only they reach out = 10, only you = 3)
--   up to 25  recency (14d 25 · 30d 20 · 60d 14 · 120d 8 · 1y 3)
--   up to 15  meetings and calls (5 each, capped at 3)
--   up to 10  depth: you've written notes about them (5) or logged notes (5)
--   up to  5  longevity: conversations span more than 90 days
-- Tier: New (never talked) · Dormant (>180d quiet) · Strong ≥70 · Warm ≥45 · Developing.
drop view public.contact_status;
create view public.contact_status with (security_invoker = true) as
select
  c.*,
  st.last_interaction_at,
  st.last_outbound_at,
  st.last_inbound_at,
  st.interaction_count,
  st.meeting_count,
  st.last_direction,
  case when c.cadence_days is null then null
       else (coalesce(st.last_interaction_at::date, c.connected_on, c.created_at::date) + c.cadence_days)
  end as next_due,
  sc.score,
  case when st.interaction_count = 0 then 'New'
       when st.last_interaction_at < now() - interval '180 days' then 'Dormant'
       when sc.score >= 70 then 'Strong'
       when sc.score >= 45 then 'Warm'
       else 'Developing'
  end as strength,
  -- Your message or email was the last word, 5-60 days ago, and they haven't answered.
  coalesce(st.last_direction = 'out' and st.last_kind in ('linkedin_message', 'email')
    and st.last_interaction_at < now() - interval '5 days'
    and st.last_interaction_at > now() - interval '60 days', false) as awaiting_reply
from public.contacts c
left join lateral (
  -- A private note to self isn't contact, so it never counts as an interaction.
  select
    max(i.occurred_at) filter (where i.is_real)                                       as last_interaction_at,
    min(i.occurred_at) filter (where i.is_real)                                       as first_interaction_at,
    max(i.occurred_at) filter (where i.direction = 'out' or i.kind in ('meeting', 'call')) as last_outbound_at,
    max(i.occurred_at) filter (where i.direction = 'in')                           as last_inbound_at,
    count(*) filter (where i.is_real)                                                 as interaction_count,
    count(*) filter (where i.direction = 'in')                                     as inbound_count,
    count(*) filter (where i.direction = 'out')                                    as outbound_count,
    count(*) filter (where i.kind in ('meeting', 'call'))                          as meeting_count,
    count(*) filter (where not i.is_real)                                             as note_count,
    (array_agg(i.direction order by i.occurred_at desc) filter (where i.is_real))[1]  as last_direction,
    (array_agg(i.kind order by i.occurred_at desc) filter (where i.is_real))[1]       as last_kind
  from (
    select x.*, not (x.kind = 'note' and x.direction is null) as is_real
    from public.interactions x where x.contact_id = c.id
  ) i
) st on true
cross join lateral (
  select least(100, round(
      least(st.interaction_count, 20) * 1.25
    + case when st.inbound_count > 0 and st.outbound_count > 0 then 20
           when st.inbound_count > 0 then 10
           when st.outbound_count > 0 then 3 else 0 end
    + case when st.last_interaction_at is null then 0
           when st.last_interaction_at > now() - interval '14 days' then 25
           when st.last_interaction_at > now() - interval '30 days' then 20
           when st.last_interaction_at > now() - interval '60 days' then 14
           when st.last_interaction_at > now() - interval '120 days' then 8
           when st.last_interaction_at > now() - interval '365 days' then 3 else 0 end
    + least(st.meeting_count, 3) * 5
    + case when coalesce(c.notes, '') <> '' then 5 else 0 end
    + case when st.note_count > 0 then 5 else 0 end
    + case when st.last_interaction_at - st.first_interaction_at > interval '90 days' then 5 else 0 end
  ))::int as score
) sc;
