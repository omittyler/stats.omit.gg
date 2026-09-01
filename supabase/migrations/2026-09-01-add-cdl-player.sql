-- Adds the cdl_player flag to the players table (from player_details.csv's
-- new "CDL Player" column - see PROJECT.md §8s).
-- Run once in the Supabase SQL editor against the already-live database.

alter table players add column if not exists cdl_player boolean not null default false;
