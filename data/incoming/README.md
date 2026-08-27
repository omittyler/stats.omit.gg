# Data Intake — Incoming Files

Drop spreadsheet exports here from the [Call of Duty Esports Wiki](https://cod-esports.fandom.com/wiki/Call_of_Duty_Challengers) (2026 season). One file per table below is easiest, but everything in one workbook with separate tabs works too.

This covers what's available now (rosters, logos, placings) per [PROJECT.md](../PROJECT.md) §2 — player statistics (kills/deaths/damage/weapon data) are a separate, later drop from the official stats provider and don't belong here.

## `teams.csv` — DONE (dropped in 2026-08-26)
Actual format used, simpler than originally templated — this file is a **team-name-to-logo lookup table**, not full team metadata:

| column | notes |
|---|---|
| `Team Name` | as shown on the wiki |
| `File Name` | filename of the logo saved in `/public/teams/` |

**Special row: `Default` / `Default.png`.** This is a fallback sentinel, not a real team. When importing player statistics or bracket/match data later, if a team name in that import doesn't match any `Team Name` in this file, use `Default.png` as the logo but keep the real team name text from the import — do not drop or rename the team. See PROJECT.md §6 for how this should be implemented.

Org/region/coach/social links weren't part of this pull — add a separate file later if/when that data is gathered, rather than assuming it's missing from teams.csv by mistake.

## `players.csv`
| column | notes |
|---|---|
| `player_name` | alias/gamertag as shown on the wiki |
| `real_name` | if listed |
| `team_name` | must match a `team_name` in teams.csv |
| `country` | if listed |
| `role` | position/role, if listed |
| `photo_filename` | filename you saved the photo as in `/public/players/` (see below) |

## `placings.csv`
Updated 2026-08-26 to match the resolved points-formula and Elite stage/region decisions in PROJECT.md §3-§5 — **do not include a points or prize column**. Points and prize are always computed from `(event_type, placement)` via the lookup table in `data/reference/cdc_points_and_prizing.md`, never entered directly.

| column | notes |
|---|---|
| `team_name` | must match a `Team Name` in `teams.csv` |
| `event_name` | human-readable, e.g. "2026 NA Elite Stage 1", "2026 Global Major 1", "2026 Champs" |
| `event_type` | one of: `Cup`, `Elite`, `Major`, `Champs` (no separate Qualifier/Playoff types — see below) |
| `season` | e.g. `2026` |
| `stage` | Elite only — `1`, `2`, `3`, etc. Leave blank for Cup/Major/Champs |
| `region` | region code (e.g. `NA`, `EU`, `AP`, `LA`) for region-specific events (Elite, likely Cups). Leave blank for global events (Major, Champs) |
| `placement` | the team's final rank, e.g. `1`, `2`, `5`. For tied placements (e.g. "5th-6th" on the official scale) either the exact number or a range like `5-6` works — the points lookup matches by range either way |
| `player1`, `player2`, `player3`, `player4` | **added 2026-08-26.** The 4 players on this team's roster for THIS specific event/placement — gives us the per-event roster directly, so player-level prize splits (25% each, see PROJECT.md §3/§7) work immediately without waiting on full player statistics. Use the same alias/name that will appear in `players.csv` once that's compiled, so they match up later — exact matching gets reconciled at import time either way. |

**Elite specifically:** each row is one team's single, final placement for that stage (1-12) — not separate Qualifier and Playoff rows. Top-8 teams get their Playoff finish; teams that didn't advance (9th-12th) get their Qualifier finish. See PROJECT.md §4.4 for why this is already resolved into one number per team per stage.

**Elite: only paste placements 1st-12th.** The Qualifier bracket is often much bigger (e.g. 32 teams), but everyone below 12th earns zero CDC points, so there's no need to transcribe them — skip straight past whatever the wiki shows for 13th place onward. (Cup and Major/Open are different: paste their FULL placement range, since those scales pay points much further down.)

## `player_map_stats.csv` / `player_weapon_stats.csv` (future — full player statistics)
Not part of the wiki pull — this is the historical 2026-season player statistics the user will drop in separately. Recommended shape below is a **long/tidy layout** (one row per player per map, not one wide row per match with every player's columns side by side) — much easier to import reliably than a pivoted spreadsheet. If the actual source data isn't naturally in this shape, export what you've got as-is rather than forcing it; the import gets adapted to match reality, same as every other file here.

**`player_map_stats.csv`** — one row per player per map:
| column | notes |
|---|---|
| `event_name`, `event_type`, `season`, `stage`, `region` | same event-identifying columns as `placings.csv` |
| `match_name` / `match_id` | identifies the series (e.g. "Team A vs Team B") so maps group into a match |
| `map_number` | 1, 2, 3... |
| `map_name` | e.g. "Highrise" |
| `mode` | Hardpoint / S&D / Control |
| `team_name` | the team this player was on for THIS map — this doubles as the per-event roster, see PROJECT.md §7 |
| `player_name` | |
| `kills`, `deaths`, `damage`, `+/-` | plus objective stats (hill time, plants/defuses, ticks) once known |

**`player_weapon_stats.csv`** — same event/match/map/team/player context columns, plus `weapon_name`, `kills`, `accuracy`, `headshots`.

Because `team_name` is recorded per map/match here, this data resolves the "rosters change between events" problem for player-level prize-money attribution (§7) without needing a separate manual roster file.

## Naming isn't precious
If the wiki's columns don't map exactly to the above, just export what you've got — exact header names and structure can be adjusted once real files are here. This template exists so the first pass lines up cleanly, not as a hard requirement.
