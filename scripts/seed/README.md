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
the code. Matching is case-insensitive (the two sources capitalize handles inconsistently),
and `placings.csv`'s spelling is always the one stored, since it's the curated source.

Three outcomes when a player's name doesn't exactly match, all gitignored reports, none
auto-loaded into the database:
- **`unresolved-player-event-stats.json`** — no match, or the name is genuinely ambiguous
  (maps to more than one team for that event — a real conflict elsewhere in this dataset,
  not a resolver bug).
- **`candidate-player-event-stats.json`** — no exact match, but exactly one *prefix* match
  (e.g. bo7_stats "D3" vs placings.csv "D3L1V3R" — the two sources truncate/shorten handles
  in both directions) that's also **corroborated**: at least one other player under the same
  team code in that file already exact-matched to that same team. A blank or uncorroborated
  team code isn't enough on its own — a unique prefix match against the wrong team is a real
  risk, not a theoretical one. Two confirmed examples from cross-checking real seed runs:
  Birmingham's blank-team-code "Coti" turned out to have different K/D than the already-
  matched "CotiCR" (a different, coincidentally similarly-named real player); Dallas's "Tkay"
  (team code OXO, a team entirely absent from placings.csv) coincidentally prefix-matched
  unrelated "OutBreak Gaming"'s real player "tK" before the corroboration requirement caught
  it. Rows without corroboration land in the unresolved report instead, tagged with why.

  **To confirm a candidate:** verify it (cross-check the raw CSV row, individual stats, or
  teammates — don't just eyeball the names), then add an entry to
  `scripts/seed/confirmed-aliases.json` (`{ file, bo7_stats_name, canonical_name, team_name }`)
  and re-run. Editing `placings.csv` usually isn't the fix here — in most cases it already has
  the correct spelling and bo7_stats is the one using a shortened nickname, so there's nothing
  to change there. `confirmed-aliases.json` is committed (not gitignored) since it's a
  deliberate, auditable record of what's been manually verified.
- **`duplicate-player-event-stats.json`** — the same player appears more than once for the
  same event in the source CSV — a genuine data anomaly, not merged or picked between.

Check these after every run and decide case by case — don't bulk-accept any of them.

The two "BO7 Full Season" files are not seeded — they're rollups, not tied to one event, so
this per-event lookup can't run against them. See PROJECT.md §7.
