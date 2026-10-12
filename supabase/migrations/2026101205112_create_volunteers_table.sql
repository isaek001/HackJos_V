-- HackJos 2026 · volunteers table
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  team text not null,
  team_name text not null,
  availability text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Indexes for the admin dashboard filters/search
create index if not exists volunteers_team_idx on public.volunteers (team);
create index if not exists volunteers_created_at_idx on public.volunteers (created_at desc);

-- Row Level Security: the frontend uses the anon (public) key,
-- so it needs explicit policies. Demo setup: anyone can apply,
-- and the admin page (same anon key) can read + remove entries.
-- TODO: lock this down later (e.g. Supabase Auth for admins,
-- or move writes behind an Edge Function using the service_role key).
alter table public.volunteers enable row level security;

drop policy if exists "volunteers_public_insert" on public.volunteers;
create policy "volunteers_public_insert"
  on public.volunteers for insert
  to anon
  with check (true);

drop policy if exists "volunteers_public_read" on public.volunteers;
create policy "volunteers_public_read"
  on public.volunteers for select
  to anon
  using (true);

drop policy if exists "volunteers_public_delete" on public.volunteers;
create policy "volunteers_public_delete"
  on public.volunteers for delete
  to anon
  using (true);
