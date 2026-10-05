-- First-run walkthrough: remembered per account (not per device) so it never reappears once finished or skipped.
alter table public.profiles add column tour_done_at timestamptz;
