-- Fixes real duplicate event rows caused by a classic SQL gotcha: the
-- `unique(name, region)` constraint never caught duplicates for
-- Major/Champs events because region was NULL, and NULL is never equal to
-- NULL in SQL - every seed run created a fresh "Dallas Open" etc. row
-- instead of matching the existing one. Cup/Elite events (always a real
-- region value) were never affected. See PROJECT.md §8f.
--
-- Run ONCE in the Supabase SQL editor. Safe to run again if needed - each
-- step is a no-op once there's nothing left to merge/delete.

-- 1. Repoint event_placements from duplicate event rows onto one canonical
--    row per (name, region) - the lowest id in each duplicate group.
with canonical as (
  select min(id) as keep_id, name, coalesce(region, '') as region_key
  from events
  group by name, coalesce(region, '')
),
dupes as (
  select e.id as dupe_id, c.keep_id
  from events e
  join canonical c on e.name = c.name and coalesce(e.region, '') = c.region_key
  where e.id <> c.keep_id
)
update event_placements ep
set event_id = d.keep_id
from dupes d
where ep.event_id = d.dupe_id;

-- 2. Delete the now-orphaned duplicate event rows.
with canonical as (
  select min(id) as keep_id, name, coalesce(region, '') as region_key
  from events
  group by name, coalesce(region, '')
)
delete from events e
where e.id not in (select keep_id from canonical);

-- 3. De-duplicate any event_placements rows that collapsed onto the same
--    (team_id, event_id) pair as a result of step 1's repointing (e.g. the
--    same team's Dallas Open placement existed once per duplicate event row).
delete from event_placements a
using event_placements b
where a.id > b.id
  and a.team_id = b.team_id
  and a.event_id = b.event_id;

-- 4. Stop storing NULL for global events - '' behaves correctly with the
--    existing plain unique(name, region) constraint, NULL never did.
update events set region = '' where region is null;
alter table events alter column region set default '';
alter table events alter column region set not null;
