-- Run once in the Supabase SQL editor. Adds event_date to the already-live
-- `events` table (schema.sql alone won't retroactively add columns to an
-- existing table). See PROJECT.md §8d for why this is needed: CDC points are
-- tracked per PLAYER and travel with them between teams, so computing a
-- team's current standing requires knowing each player's most recent event
-- (by real date) to find their current team.

alter table events add column if not exists event_date date;
