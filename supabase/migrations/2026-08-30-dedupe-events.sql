-- Fixes real duplicate event rows caused by a classic SQL gotcha: the
-- `unique(name, region)` constraint never caught duplicates for
-- Major/Champs events because region was NULL, and NULL is never equal to
-- NULL in SQL - every seed run created a fresh "Dallas Open" etc. row
-- instead of matching the existing one. Cup/Elite events (always a real
-- region value) were never affected. See PROJECT.md §8f.
--
-- Run ONCE in the Supabase SQL editor. Safe to run again if needed - each
-- step is a no-op once there's nothing left to merge/delete.
--
-- Order matters throughout: rows referencing a duplicate event must be
-- de-duplicated BEFORE being repointed onto the canonical event, otherwise
-- two rows for the same team/player can collide on the same (x, event_id)
-- pair mid-update and violate that table's own unique constraint. Both
-- event_placements AND player_event_stats reference events(id), so both
-- need this same two-step treatment before the duplicate event rows can be
-- deleted (confirmed by two separate errors hitting this migration -
-- event_placements' own unique constraint, then a foreign key from
-- player_event_stats that was missed in an earlier version of this file).

-- 1a. event_placements: keep only ONE row per team per canonical event
--     group (lowest id), delete the rest.
with canonical as (
  select min(id) as keep_id, name, coalesce(region, '') as region_key
  from events
  group by name, coalesce(region, '')
),
event_to_canonical as (
  select e.id as event_id, c.keep_id
  from events e
  join canonical c on e.name = c.name and coalesce(e.region, '') = c.region_key
),
ranked as (
  select ep.id, ep.team_id, etc.keep_id,
         row_number() over (partition by ep.team_id, etc.keep_id order by ep.id) as rn
  from event_placements ep
  join event_to_canonical etc on ep.event_id = etc.event_id
)
delete from event_placements
where id in (select id from ranked where rn > 1);

-- 1b. event_placements: repoint each surviving row onto its canonical event id.
with canonical as (
  select min(id) as keep_id, name, coalesce(region, '') as region_key
  from events
  group by name, coalesce(region, '')
),
event_to_canonical as (
  select e.id as event_id, c.keep_id
  from events e
  join canonical c on e.name = c.name and coalesce(e.region, '') = c.region_key
)
update event_placements ep
set event_id = etc.keep_id
from event_to_canonical etc
where ep.event_id = etc.event_id
  and ep.event_id <> etc.keep_id;

-- 2a. player_event_stats: same treatment, keyed by player_name instead of team_id.
with canonical as (
  select min(id) as keep_id, name, coalesce(region, '') as region_key
  from events
  group by name, coalesce(region, '')
),
event_to_canonical as (
  select e.id as event_id, c.keep_id
  from events e
  join canonical c on e.name = c.name and coalesce(e.region, '') = c.region_key
),
ranked as (
  select pes.id, pes.player_name, etc.keep_id,
         row_number() over (partition by pes.player_name, etc.keep_id order by pes.id) as rn
  from player_event_stats pes
  join event_to_canonical etc on pes.event_id = etc.event_id
)
delete from player_event_stats
where id in (select id from ranked where rn > 1);

-- 2b. player_event_stats: repoint each surviving row onto its canonical event id.
with canonical as (
  select min(id) as keep_id, name, coalesce(region, '') as region_key
  from events
  group by name, coalesce(region, '')
),
event_to_canonical as (
  select e.id as event_id, c.keep_id
  from events e
  join canonical c on e.name = c.name and coalesce(e.region, '') = c.region_key
)
update player_event_stats pes
set event_id = etc.keep_id
from event_to_canonical etc
where pes.event_id = etc.event_id
  and pes.event_id <> etc.keep_id;

-- 3. Delete the now-orphaned duplicate event rows.
with canonical as (
  select min(id) as keep_id, name, coalesce(region, '') as region_key
  from events
  group by name, coalesce(region, '')
)
delete from events e
where e.id not in (select keep_id from canonical);

-- 4. Stop storing NULL for global events - '' behaves correctly with the
--    existing plain unique(name, region) constraint, NULL never did.
update events set region = '' where region is null;
alter table events alter column region set default '';
alter table events alter column region set not null;
