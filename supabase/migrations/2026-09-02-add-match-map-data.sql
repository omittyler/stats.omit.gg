-- Adds per-match, per-map, per-player stats from data/incoming/bo7_match_stats/
-- (the "BO7 Season - <mode> Match Map Data.csv" files) - the granular data the
-- Match page was cut from v1 for lack of (see PROJECT.md §4.1/§9). Run once in
-- the Supabase SQL editor against the already-live database.
-- See PROJECT.md §8ag and schema.sql for the up-to-date definition.

-- One row per Series (e.g. "SR001") - a single best-of set between two teams
-- within one known event. Series IDs whose number falls outside every mapped
-- range (see scripts/seed/lib/matchSeriesRanges.js) aren't seeded at all -
-- there's no reliable way to know which event they belong to, and nothing
-- here should be guessed.
create table if not exists matches (
  id bigint generated always as identity primary key,
  event_id bigint not null references events(id),
  series_label text not null unique, -- e.g. "SR001", straight from the source data - kept for traceability/debugging
  team1_name text not null,
  team2_name text not null
);

-- One row per individual map/game played within a match. `map_number` is the
-- source data's own position-in-series counter (shared across modes, so a
-- Hardpoint/S&D/Overload rotation might read 1, 2, 3, 4, 5 across all three
-- source files for one series) - trusted as-is, not recomputed.
create table if not exists match_maps (
  id bigint generated always as identity primary key,
  match_id bigint not null references matches(id),
  mode text not null check (mode in ('Hardpoint', 'Search and Destroy', 'Overload')),
  map_name text not null,
  map_number int not null,
  team1_score int not null, -- Hardpoint/Overload: points; Search and Destroy: rounds
  team2_score int not null,

  unique (match_id, map_number)
);

-- One row per player per map. Column-by-column source mapping: PROJECT.md §8ag.
-- Fields that don't apply to a given map's mode (e.g. `plants` on a Hardpoint
-- map) are always null, never 0 - 0 would falsely claim the player had a
-- chance to plant and didn't.
create table if not exists match_map_player_stats (
  id bigint generated always as identity primary key,
  match_map_id bigint not null references match_maps(id),
  player_name text not null,
  team_name text not null,

  k int, d int, a int, non_traded_kills int, headshots int, damage int,

  hill_time numeric, objective_kills int, contest numeric, -- Hardpoint only
  plants int, defuses int, first_bloods int, first_deaths int, rounds int, -- Search and Destroy only
  goals int, -- Overload only
  time numeric, -- Hardpoint and Overload

  unique (match_map_id, player_name)
);

alter table matches enable row level security;
alter table match_maps enable row level security;
alter table match_map_player_stats enable row level security;

create policy "Public read access" on matches for select using (true);
create policy "Public read access" on match_maps for select using (true);
create policy "Public read access" on match_map_player_stats for select using (true);
