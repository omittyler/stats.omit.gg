# Seed script

One-off loader from `data/incoming/` CSVs into Supabase — not the recurring stats-provider
admin import tool (see PROJECT.md §3 for that distinction).

## Setup (once)

1. Create a Supabase project (supabase.com) if you haven't already.
2. Run `supabase/schema.sql` in the Supabase SQL editor to create the tables.
3. Copy `.env.example` to `.env.local` and fill in your project's URL and service-role key
   (Project Settings -> API in the dashboard). Never commit `.env.local`.
4. `npm install`

## Run

```
npm run seed
```

Runs in order: `teams.csv` -> `points_scale` (hardcoded from `data/reference/cdc_points_and_prizing.md`)
-> `placings.csv` (events + event_placements) -> `bo7_stats/*.csv` (player_event_stats).
Every step upserts on its table's natural key, so re-running is safe.

## `player_event_stats` team resolution

`bo7_stats/*.csv` identifies teams by short codes (`TBG`, `P7N`, `HUN`, ...), not the full
names used everywhere else. The seed script resolves each stat row's real team by looking
up that player's name directly in `placings.csv` for the same event — not by guessing from
the code. A player who isn't found (or who maps to more than one team for that event, a
real ambiguity elsewhere in this dataset) is skipped and logged to
`scripts/seed/unresolved-player-event-stats.json` (gitignored) instead of guessed. Check
that file after a run and decide case by case — don't bulk-accept it.

The two "BO7 Full Season" files are not seeded — they're rollups, not tied to one event, so
this per-event lookup can't run against them. See PROJECT.md §7.
