-- HackJos 2026 · publish team_settings over Realtime
-- Supabase does not add new tables to the supabase_realtime publication
-- automatically, so postgres_changes never fires for team_settings until
-- it is listed here. Without this the public form only picks up an admin's
-- team switch on the next full page load.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_settings'
  ) then
    alter publication supabase_realtime add table public.team_settings;
  end if;
end
$$;
