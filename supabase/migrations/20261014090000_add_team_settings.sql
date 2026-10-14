-- HackJos 2026 · team availability settings
-- Lets an admin switch individual volunteer teams on or off from the
-- public application form (e.g. once a team is fully staffed).

create table if not exists public.team_settings (
  team_id text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.team_settings enable row level security;

-- Everyone (including the public form) needs to read this to know
-- which teams are selectable.
drop policy if exists "team_settings_public_read" on public.team_settings;
create policy "team_settings_public_read"
  on public.team_settings for select
  to anon
  using (true);

-- Upserts happen from the admin dashboard, which uses the anon key.
drop policy if exists "team_settings_public_write" on public.team_settings;
create policy "team_settings_public_write"
  on public.team_settings for insert
  to anon
  with check (true);

drop policy if exists "team_settings_public_update" on public.team_settings;
create policy "team_settings_public_update"
  on public.team_settings for update
  to anon
  using (true)
  with check (true);

-- Seed every team as enabled so the form behaves normally on first load.
insert into public.team_settings (team_id, enabled)
values
  ('technical', true),
  ('mentors', true),
  ('swags', true),
  ('registration', true),
  ('ushering', true),
  ('welfare', true)
on conflict (team_id) do nothing;