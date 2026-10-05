-- Multi-user launch: onboarding profile fields, per-user AI usage limits.

alter table public.profiles
  add column school        text not null default '',
  add column grad_year     int,
  add column target_roles  text[] not null default '{}',  -- e.g. {Audit, Transaction Advisory, Investment Banking}
  add column target_firms  text[] not null default '{}',
  add column onboarded_at  timestamptz;

-- Daily AI usage counters, enforced server-side so one account can't run up the bill.
create table public.ai_usage (
  user_id   uuid not null references auth.users on delete cascade,
  day       date not null default current_date,
  memories  int not null default 0,
  asks      int not null default 0,
  preps     int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "read own usage" on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

-- Atomically spend `n` units of `kind` if it fits under `cap`; returns whether it was allowed.
-- security definer so users can't write their own counters directly.
create function public.spend_ai(p_user uuid, p_kind text, p_cap int, p_n int default 1)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used int;
begin
  if p_kind not in ('memories', 'asks', 'preps') then raise exception 'bad kind %', p_kind; end if;
  insert into public.ai_usage (user_id) values (p_user) on conflict do nothing;
  execute format('update public.ai_usage set %1$I = %1$I + $1 where user_id = $2 and day = current_date and %1$I + $1 <= $3 returning %1$I', p_kind)
    into used using p_n, p_user, p_cap;
  return used is not null;
end $$;
revoke execute on function public.spend_ai from public, anon, authenticated;
