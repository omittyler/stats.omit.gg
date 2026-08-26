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
| column | notes |
|---|---|
| `team_name` | must match a `team_name` in teams.csv |
| `event_name` | e.g. "2026 Season Elite Qualifier" |
| `event_type` | Cup / Elite Qualifier / Elite Playoff / Major / Champs |
| `season` | e.g. 2026 |
| `region` | if the event is region-specific |
| `placement` | final rank/place, e.g. 1, 2, 3 |
| `points` | only if the wiki shows a points value — leave blank if not, per PROJECT.md the points formula isn't finalized |

## Naming isn't precious
If the wiki's columns don't map exactly to the above, just export what you've got — exact header names and structure can be adjusted once real files are here. This template exists so the first pass lines up cleanly, not as a hard requirement.
