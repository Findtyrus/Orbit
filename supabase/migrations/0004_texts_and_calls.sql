-- Texts (iMessage/SMS) and phone calls, synced from your Mac by scripts/sync-mac.mjs.

alter table public.contacts add column phone text;   -- normalized: last 10 digits for US numbers, else all digits
create index contacts_user_phone on public.contacts (user_id, phone);

alter table public.interactions drop constraint interactions_kind_check;
alter table public.interactions add constraint interactions_kind_check
  check (kind in ('linkedin_message', 'email', 'meeting', 'note', 'call', 'text'));

-- Rebuilt so the view picks up the new phone column (c.* is expanded when a view is created),
-- and so an unanswered text counts as "waiting on a reply".
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
  coalesce(st.last_direction = 'out' and st.last_kind in ('linkedin_message', 'email', 'text')
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
