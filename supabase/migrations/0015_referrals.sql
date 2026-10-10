-- Invite a friend: each student gets a code; when a friend signs up and imports LinkedIn, both get free time.
create table public.referral_codes (
  user_id uuid primary key references auth.users on delete cascade,
  code    text not null unique
);
create table public.referrals (
  id          bigint generated always as identity primary key,
  referrer_id uuid not null references auth.users on delete cascade,
  referred_id uuid not null unique references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  rewarded_at timestamptz
);
create index referrals_referrer on public.referrals (referrer_id);
-- Server-only tables: no policies, so no client access.
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
