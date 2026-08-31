-- Public read access for the stats site's frontend, which uses the anon key.
-- The seed script uses the service_role key and bypasses RLS entirely, so this
-- doesn't affect it. Run once in the Supabase SQL editor after schema.sql.
-- See PROJECT.md §8b/§9 for why this is needed (RLS defaults to fail-closed).

alter table teams enable row level security;
alter table events enable row level security;
alter table points_scale enable row level security;
alter table event_placements enable row level security;
alter table player_event_stats enable row level security;
alter table players enable row level security;

create policy "Public read access" on teams for select using (true);
create policy "Public read access" on events for select using (true);
create policy "Public read access" on points_scale for select using (true);
create policy "Public read access" on event_placements for select using (true);
create policy "Public read access" on player_event_stats for select using (true);
create policy "Public read access" on players for select using (true);
