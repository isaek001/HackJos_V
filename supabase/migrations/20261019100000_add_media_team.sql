-- HackJos 2026 · add the Media team
--
-- Media is the seventh volunteer team. It needs a row in team_settings so
-- the admin dashboard can toggle it like the others. It is inserted enabled,
-- so the team is selectable on the public form straight away.
--
-- Rows for teams that no longer exist are left alone: an admin may have
-- switched them off, and keeping the row means re-adding a team later does
-- not silently re-open it.

insert into public.team_settings (team_id, enabled)
values ('media', true)
on conflict (team_id) do nothing;
