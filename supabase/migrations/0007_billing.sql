-- Stripe billing. Rows are written only by the Stripe webhook (service role); users can read their own.
-- Every account gets a 14-day Pro trial from sign-up without a card (computed from auth.users.created_at).

create table public.subscriptions (
  user_id                 uuid primary key references auth.users on delete cascade,
  stripe_customer_id      text not null unique,
  stripe_subscription_id  text unique,
  status                  text,          -- Stripe status: trialing, active, past_due, canceled, …
  price_id                text,
  plan_interval           text,          -- month | year
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  updated_at              timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "read own subscription" on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
