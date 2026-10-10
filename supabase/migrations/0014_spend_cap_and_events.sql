-- Monthly AI spend cap per student, plus a small event log for the signup funnel.

-- Estimated AI cost (USD) per day, so the month can be summed against a cap.
alter table public.ai_usage add column cost numeric(10, 4) not null default 0;

-- Like spend_ai, but also refuses when this calendar month's estimated cost would pass p_month_cap.
-- Returns 'ok', 'day' (daily count cap hit) or 'month' (monthly budget used).
create function public.spend_ai2(p_user uuid, p_kind text, p_cap int, p_n int, p_cost numeric, p_month_cap numeric)
returns text language plpgsql security definer set search_path = '' as $$
declare used int; spent numeric;
begin
  if p_kind not in ('memories', 'asks', 'preps', 'drafts') then raise exception 'bad kind %', p_kind; end if;
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  insert into public.ai_usage (user_id) values (p_user) on conflict do nothing;
  select coalesce(sum(cost), 0) into spent from public.ai_usage
    where user_id = p_user and day >= date_trunc('month', current_date)::date;
  if spent + p_cost > p_month_cap then return 'month'; end if;
  execute format('update public.ai_usage set %1$I = %1$I + $1, cost = cost + $4 where user_id = $2 and day = current_date and %1$I + $1 <= $3 returning %1$I', p_kind)
    into used using p_n, p_user, p_cap, p_cost;
  return case when used is null then 'day' else 'ok' end;
end $$;
revoke execute on function public.spend_ai2 from public, anon, authenticated;

-- Funnel events. Written by the server only (no policies, so no client access).
create table public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,               -- signup, linkedin_import, first_outreach, subscribed, active:YYYY-MM-DD
  props      jsonb not null default '{}', -- signup carries {source, medium, campaign}
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.events enable row level security;

-- The numbers that matter, by where the student came from. Read it in the SQL editor:
--   select * from public.funnel_by_source;
create view public.funnel_by_source as
with s as (
  select user_id, created_at, coalesce(nullif(props->>'source', ''), 'direct') as src
  from public.events where name = 'signup'
)
select s.src as source,
  count(*) as signups,
  count(*) filter (where exists (select 1 from public.events e where e.user_id = s.user_id
    and e.name = 'linkedin_import' and e.created_at <= s.created_at + interval '48 hours')) as imported_in_48h,
  count(*) filter (where exists (select 1 from public.events e where e.user_id = s.user_id
    and e.name like 'active:%' and e.created_at >= s.created_at + interval '7 days'
    and e.created_at < s.created_at + interval '14 days')) as returned_week_two,
  count(*) filter (where exists (select 1 from public.events e where e.user_id = s.user_id and e.name = 'subscribed')) as paid
from s group by s.src order by signups desc;
revoke all on public.funnel_by_source from public, anon, authenticated;
