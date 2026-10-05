-- Daily outreach queue: Orbit drafts a few messages each day; the user edits and sends every one themselves.

create table public.outreach_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  contact_id  uuid not null references public.contacts on delete cascade,
  kind        text not null check (kind in ('intro', 'follow_up', 'check_in')),
  reason      text not null default '',     -- why this person today, shown on the card
  channel     text not null check (channel in ('linkedin', 'email')),
  subject     text,
  body        text not null,
  status      text not null default 'pending' check (status in ('pending', 'sent', 'skipped')),
  for_date    date not null default current_date,
  created_at  timestamptz not null default now(),
  acted_at    timestamptz,
  unique (user_id, contact_id, for_date)
);
create index outreach_queue_user_day on public.outreach_queue (user_id, for_date, status);

alter table public.outreach_queue enable row level security;
create policy "own outreach" on public.outreach_queue for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Drafts get their own daily AI allowance.
alter table public.ai_usage add column drafts int not null default 0;

create or replace function public.spend_ai(p_user uuid, p_kind text, p_cap int, p_n int default 1)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used int;
begin
  if p_kind not in ('memories', 'asks', 'preps', 'drafts') then raise exception 'bad kind %', p_kind; end if;
  insert into public.ai_usage (user_id) values (p_user) on conflict do nothing;
  execute format('update public.ai_usage set %1$I = %1$I + $1 where user_id = $2 and day = current_date and %1$I + $1 <= $3 returning %1$I', p_kind)
    into used using p_n, p_user, p_cap;
  return used is not null;
end $$;
revoke execute on function public.spend_ai from public, anon, authenticated;
