-- Adds the players table (bios/photos from data/incoming/player_details.csv).
-- Run once in the Supabase SQL editor against the already-live database.
-- See PROJECT.md §5/§8j and schema.sql for the up-to-date definition.

create table if not exists players (
  id bigint generated always as identity primary key,
  gamertag text not null unique,
  full_name text,
  origin text,
  birthday date,
  photo_filename text,
  twitter_url text,
  twitch_url text
);

alter table players enable row level security;
create policy "Public read access" on players for select using (true);
