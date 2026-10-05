-- AI access control and half-price overnight processing.

-- Per-account preference: people can use Orbit with AI switched off entirely.
alter table public.profiles add column ai_enabled boolean not null default true;

-- Overnight memory updates go through Anthropic's Message Batches API (50% cheaper).
-- Server-only tables: RLS on, no policies.
create table public.ai_batches (
  id             text primary key,             -- Anthropic batch id
  kind           text not null default 'memories',
  status         text not null default 'submitted' check (status in ('submitted', 'done')),
  request_count  int not null default 0,
  created_at     timestamptz not null default now(),
  collected_at   timestamptz
);
create table public.ai_batch_items (
  batch_id           text not null references public.ai_batches on delete cascade,
  contact_id         uuid not null references public.contacts on delete cascade,
  user_id            uuid not null references auth.users on delete cascade,
  interactions_seen  timestamptz,               -- newest interaction included in the request
  source_count       int not null default 0,
  primary key (batch_id, contact_id)
);
create index ai_batch_items_contact on public.ai_batch_items (contact_id);

alter table public.ai_batches     enable row level security;
alter table public.ai_batch_items enable row level security;
