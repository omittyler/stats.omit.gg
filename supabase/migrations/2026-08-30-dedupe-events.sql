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
-- Order matters here: rows must be de-duplicated (step 1) BEFORE being
-- repointed onto the canonical event (step 2), otherwise two placement rows
-- for the same team can both try to become the same (team_id, event_id) pair
-- and violate event_placements' own unique constraint mid-update.

-- 1. For each team, keep only ONE event_placements row per canonical event
--    group (i.e. across all of that event's duplicate rows combined) -
--    whichever has the lowest id. Delete the rest.
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

-- 2. Repoint each surviving row onto its canonical event id (safe now - at
--    most one row per team remains per group, so no collision is possible).
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
