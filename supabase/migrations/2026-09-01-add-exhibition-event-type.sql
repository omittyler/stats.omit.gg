-- Widens events.type and points_scale.event_type to allow 'Exhibition' -
-- for non-CDC events like the Esports World Cup (real prize money, but
-- never any CDC points - see PROJECT.md §8v). Run once in the Supabase SQL
-- editor against the already-live database.

alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check
  check (type in ('Cup', 'Elite', 'Major', 'Champs', 'Exhibition'));

alter table points_scale drop constraint if exists points_scale_event_type_check;
alter table points_scale add constraint points_scale_event_type_check
  check (event_type in ('Cup', 'Elite', 'Major', 'Champs', 'Exhibition'));
