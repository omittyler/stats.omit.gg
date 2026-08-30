# `player_event_stats` — Column Mapping

Maps `data/incoming/bo7_stats/*.csv` columns onto the `player_event_stats` table (see PROJECT.md §5). One wide row per player per event (or per full-season rollup, for the two "Full Season" files) — chosen over a normalized per-mode table because it maps almost 1:1 onto the source CSVs and every UI use (Player Event Stats section, Team Stats rollup) wants the whole row at once anyway.

Verified against 3 sample files (Dallas Open, Elite 1 NA, Full Season NA) — all 11 files share this exact 105-column structure (header row 1 has category labels, header row 2 has the real per-column labels). All abbreviation meanings below are confirmed via `data/incoming/Stat_Abbreviations.csv` (user-provided, 2026-08-30).

**Known source glitch:** every file's row-2 header is missing the "DMG" label in the Overall block — it's replaced by a stray raw number (e.g. `1905859`). Confirmed by user 2026-08-30: that column is `DMG`, the label is just corrupted in the export.

## Identity / per-event summary (7 columns, no block prefix)

| CSV header | Column | Notes |
|---|---|---|
| `Player` | `player_name` | |
| `Team` (or `Current`/`Team` split header in the two "Full Season" files) | `team_name` | Team as fielded for that event — same per-event-roster philosophy as `event_placements` (PROJECT.md §3). For "Full Season" files this is more like "team as of the snapshot," not one specific event |
| `Matches` → `Total` | `matches_total` | Total matches played |
| `Matches` → `Ws` | `matches_w` | Match wins |
| `Matches` → `Ls` | `matches_l` | Match losses |
| `Maps` → `Total` | `maps_total` | Total maps played |
| `Maps` → `Ws` | `maps_w` | Map wins |
| `Maps` → `Ls` | `maps_l` | Map losses |

Plus an `event_id` FK (not a CSV column — derived from which file the row came from) and a `game` tag (`Black Ops 7` for everything in `bo7_stats/`, per PROJECT.md §3).

## Overall block (16 columns, prefix `overall_`) — combined across all 3 modes

| CSV header | Column | Meaning |
|---|---|---|
| K | `overall_k` | Kills |
| D | `overall_d` | Deaths |
| K/D | `overall_kd` | Kill/Death ratio |
| A | `overall_a` | Assists |
| KA/D | `overall_kad` | (Kills+Assists)/Death ratio |
| +/- | `overall_plusminus` | Kills minus Deaths |
| N/T | `overall_non_traded_kills` | Non-Traded Kills |
| NT% | `overall_non_traded_kills_pct` | Non-Traded Kills as % of total kills |
| HS | `overall_hs` | Headshots |
| DMG | `overall_dmg` | Damage (label corrupted in source, see above) |
| DMG/K | `overall_dmg_per_k` | Damage per Kill |
| DMG/10 | `overall_dmg_per_10` | Damage per 10 minutes |
| R K/D | `overall_round_kd` | Round Kill/Death ratio |
| K/10 | `overall_k_per_10` | Kills per 10 minutes |
| SR | `overall_slayer_rating` | Slayer Rating |
| DR | `overall_damage_rating` | Damage Rating |

## Hardpoint block (26 columns, prefix `hp_`)

| CSV header | Column | Meaning |
|---|---|---|
| Maps | `hp_maps` | Hardpoint maps played |
| Ws | `hp_w` | Hardpoint map wins |
| Ls | `hp_l` | Hardpoint map losses |
| PF | `hp_pf` | Points For |
| PA | `hp_pa` | Points Allowed |
| K | `hp_k` | Kills |
| D | `hp_d` | Deaths |
| K/D | `hp_kd` | Kill/Death ratio |
| A | `hp_a` | Assists |
| KA/D | `hp_kad` | (Kills+Assists)/Death ratio |
| +/- | `hp_plusminus` | Kills minus Deaths |
| N/T | `hp_non_traded_kills` | Non-Traded Kills |
| NT% | `hp_non_traded_kills_pct` | Non-Traded Kills % of Hardpoint kills |
| HS | `hp_hs` | Headshots |
| DMG | `hp_dmg` | Damage |
| DMG/K | `hp_dmg_per_k` | Damage per Kill |
| HT | `hp_hill_time` | Hill Time |
| HT/10 | `hp_hill_time_per_10` | Hill Time per 10 minutes |
| ObjK | `hp_objective_kills` | Objective Kills |
| CON | `hp_contest_time` | Contest Time |
| K/10 | `hp_k_per_10` | Kills per 10 minutes |
| D/10 | `hp_d_per_10` | Deaths per 10 minutes |
| A/10 | `hp_a_per_10` | Assists per 10 minutes |
| DMG/10 | `hp_dmg_per_10` | Damage per 10 minutes |
| E/10 | `hp_engagements_per_10` | Engagements per 10 minutes |
| TIME | `hp_time` | Time Played |

## Search and Destroy block (28 columns, prefix `snd_`)

| CSV header | Column | Meaning |
|---|---|---|
| Maps | `snd_maps` | S&D maps played |
| Ws | `snd_w` | S&D map wins |
| Ls | `snd_l` | S&D map losses |
| RF | `snd_rf` | Rounds For |
| RA | `snd_ra` | Rounds Against |
| K | `snd_k` | Kills |
| D | `snd_d` | Deaths |
| K/D | `snd_kd` | Kill/Death ratio |
| A | `snd_a` | Assists |
| KA/D | `snd_kad` | (Kills+Assists)/Death ratio |
| +/- | `snd_plusminus` | Kills plus or minus Deaths |
| N/T | `snd_non_traded_kills` | Non-Traded Kills |
| NT% | `snd_non_traded_kills_pct` | Non-Traded Kills % of S&D kills |
| HS | `snd_hs` | Headshots |
| DMG | `snd_dmg` | Damage |
| DMG/K | `snd_dmg_per_k` | Damage per Kill |
| Pl | `snd_plants` | Bomb Plants |
| Def | `snd_defuses` | Bomb Defuses |
| FBs | `snd_first_bloods` | First Bloods |
| FDs | `snd_first_deaths` | First Deaths |
| FB% | `snd_fb_pct` | First Blood % of rounds played |
| WR% | `snd_opening_duel_win_pct` | Opening Duel Win Rate % |
| K/R | `snd_k_per_r` | Kills per Round |
| D/R | `snd_d_per_r` | Deaths per Round |
| A/R | `snd_a_per_r` | Assists per Round |
| DMG/R | `snd_dmg_per_r` | Damage per Round |
| E/R | `snd_engagements_per_r` | Engagements per Round |
| Rds | `snd_rounds` | Rounds Played |

## Overload block (25 columns, prefix `ovl_`)

| CSV header | Column | Meaning |
|---|---|---|
| Maps | `ovl_maps` | Overload maps played |
| Ws | `ovl_w` | Overload map wins |
| Ls | `ovl_l` | Overload map losses |
| RF | `ovl_rf` | Rounds For |
| RA | `ovl_ra` | Rounds Allowed |
| K | `ovl_k` | Kills |
| D | `ovl_d` | Deaths |
| K/D | `ovl_kd` | Kill/Death ratio |
| A | `ovl_a` | Assists |
| KA/D | `ovl_kad` | (Kills+Assists)/Death ratio |
| +/- | `ovl_plusminus` | Kills plus or minus Deaths |
| N/T | `ovl_non_traded_kills` | Non-Traded Kills |
| NT% | `ovl_non_traded_kills_pct` | Non-Traded Kills % of Overload kills |
| HS | `ovl_hs` | Headshots |
| DMG | `ovl_dmg` | Damage |
| DMG/K | `ovl_dmg_per_k` | Damage per Kill |
| GLS | `ovl_goals` | Goals |
| GLS/10 | `ovl_goals_per_10` | Goals per 10 minutes |
| OCK | `ovl_objective_kills` | Objective Kills |
| K/10 | `ovl_k_per_10` | Kills per 10 minutes |
| D/10 | `ovl_d_per_10` | Deaths per 10 minutes |
| A/10 | `ovl_a_per_10` | Assists per 10 minutes |
| DMG/10 | `ovl_dmg_per_10` | Damage per 10 minutes |
| E/10 | `ovl_engagements_per_10` | Engagements per 10 minutes |
| TIME | `ovl_time` | Time Played |

## Total column count

7 (identity/summary) + 16 (Overall) + 26 (Hardpoint) + 28 (Search & Destroy) + 25 (Overload) = **102 CSV-sourced columns**, plus `event_id`/`game` added at seed time = **104 columns** in `player_event_stats`.

## Source

`data/incoming/Stat_Abbreviations.csv` (column A: section heading, column B: abbreviation, column C: meaning) is the authoritative legend for all of the above — provided by the user 2026-08-30. Its own text has a consistent typo ("Overoad" instead of "Overload" in most Overload-section rows); corrected silently above since one row in the same section spells it correctly and the intent is unambiguous.
