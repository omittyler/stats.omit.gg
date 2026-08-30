-- stats.omit.gg — initial schema
-- Run this once in the Supabase SQL editor (or `supabase db push`) before running scripts/seed/index.js.
-- See PROJECT.md §5 for the design rationale.

create table if not exists teams (
  id bigint generated always as identity primary key,
  name text not null unique,
  logo_filename text not null default 'Default.png'
);

create table if not exists events (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null check (type in ('Cup', 'Elite', 'Major', 'Champs')),
  game text not null default 'Black Ops 7',
  season int not null,
  stage int,
  region text,
  unique (name, region)
);

-- CDC Points & Prizing lookup — data/reference/cdc_points_and_prizing.md is the source of truth.
-- Points/prize are never stored on a placement row; always looked up here by (event_type, placement).
create table if not exists points_scale (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('Cup', 'Elite', 'Major', 'Champs')),
  placement_min int not null,
  placement_max int not null,
  cdc_points int not null,
  prize_usd numeric,           -- NA/EU prize for Cup; the only prize for Elite/Major/Champs
  prize_usd_ap_la numeric,     -- Cup only — AP/LA prize differs from NA/EU; null for every other event type
  unique (event_type, placement_min, placement_max)
);

create table if not exists event_placements (
  id bigint generated always as identity primary key,
  team_id bigint not null references teams(id),
  event_id bigint not null references events(id),
  placement_min int not null,
  placement_max int not null,
  player1 text,
  player2 text,
  player3 text,
  player4 text,
  unique (team_id, event_id)
);

-- One row per player per event, matching data/incoming/bo7_stats/*.csv.
-- Column-by-column source mapping: data/reference/player_event_stats_columns.md
create table if not exists player_event_stats (
  id bigint generated always as identity primary key,
  player_name text not null,
  team_name text,            -- team as fielded for this event (may not resolve to a teams.id — see seed script)
  event_id bigint references events(id),
  game text not null default 'Black Ops 7',

  matches_total int, matches_w int, matches_l int,
  maps_total int, maps_w int, maps_l int,

  overall_k int, overall_d int, overall_kd numeric, overall_a int, overall_kad numeric,
  overall_plusminus int, overall_non_traded_kills int, overall_non_traded_kills_pct numeric,
  overall_hs int, overall_dmg int, overall_dmg_per_k numeric, overall_dmg_per_10 numeric,
  overall_round_kd numeric, overall_k_per_10 numeric, overall_slayer_rating numeric, overall_damage_rating numeric,

  hp_maps int, hp_w int, hp_l int, hp_pf int, hp_pa int,
  hp_k int, hp_d int, hp_kd numeric, hp_a int, hp_kad numeric, hp_plusminus int,
  hp_non_traded_kills int, hp_non_traded_kills_pct numeric, hp_hs int, hp_dmg int, hp_dmg_per_k numeric,
  hp_hill_time numeric, hp_hill_time_per_10 numeric, hp_objective_kills int, hp_contest_time numeric,
  hp_k_per_10 numeric, hp_d_per_10 numeric, hp_a_per_10 numeric, hp_dmg_per_10 numeric,
  hp_engagements_per_10 numeric, hp_time numeric,

  snd_maps int, snd_w int, snd_l int, snd_rf int, snd_ra int,
  snd_k int, snd_d int, snd_kd numeric, snd_a int, snd_kad numeric, snd_plusminus int,
  snd_non_traded_kills int, snd_non_traded_kills_pct numeric, snd_hs int, snd_dmg int, snd_dmg_per_k numeric,
  snd_plants int, snd_defuses int, snd_first_bloods int, snd_first_deaths int,
  snd_fb_pct numeric, snd_opening_duel_win_pct numeric,
  snd_k_per_r numeric, snd_d_per_r numeric, snd_a_per_r numeric, snd_dmg_per_r numeric,
  snd_engagements_per_r numeric, snd_rounds int,

  ovl_maps int, ovl_w int, ovl_l int, ovl_rf int, ovl_ra int,
  ovl_k int, ovl_d int, ovl_kd numeric, ovl_a int, ovl_kad numeric, ovl_plusminus int,
  ovl_non_traded_kills int, ovl_non_traded_kills_pct numeric, ovl_hs int, ovl_dmg int, ovl_dmg_per_k numeric,
  ovl_goals int, ovl_goals_per_10 numeric, ovl_objective_kills int,
  ovl_k_per_10 numeric, ovl_d_per_10 numeric, ovl_a_per_10 numeric, ovl_dmg_per_10 numeric,
  ovl_engagements_per_10 numeric, ovl_time numeric,

  unique (player_name, event_id)
);
