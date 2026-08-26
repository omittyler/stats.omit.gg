# Data Intake — Incoming Files

Drop spreadsheet exports here from the [Call of Duty Esports Wiki](https://cod-esports.fandom.com/wiki/Call_of_Duty_Challengers) (2026 season). One file per table below is easiest, but everything in one workbook with separate tabs works too.

This covers what's available now (rosters, logos, placings) per [PROJECT.md](../PROJECT.md) §2 — player statistics (kills/deaths/damage/weapon data) are a separate, later drop from the official stats provider and don't belong here.

## `teams.csv`
| column | notes |
|---|---|
| `team_name` | as shown on the wiki |
| `org` | organization/affiliation, if different from team_name |
| `region` | e.g. North America, Europe |
| `coach` | coach name, if listed |
| `logo_filename` | filename you saved the logo as in `/public/teams/` (see below) |
| `social_links` | any socials listed (Twitter/X, etc.) — comma-separated is fine |

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
