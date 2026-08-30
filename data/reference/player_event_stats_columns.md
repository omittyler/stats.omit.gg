# `player_event_stats` — Column Mapping

Maps `data/incoming/bo7_stats/*.csv` columns onto the `player_event_stats` table (see PROJECT.md §5). One wide row per player per event (or per full-season rollup, for the two "Full Season" files) — chosen over a normalized per-mode table because it maps almost 1:1 onto the source CSVs and every UI use (Player Event Stats section, Team Stats rollup) wants the whole row at once anyway.

Verified against 3 sample files (Dallas Open, Elite 1 NA, Full Season NA) — all 11 files share this exact 105-column structure (header row 1 has category labels, header row 2 has the real per-column labels).

**Column naming convention:** literal/faithful to the source abbreviation, snake_case, prefixed by block (`overall_`, `hp_`, `snd_`, `ovl_`). Not expanded into guessed full English names — several abbreviations have an unconfirmed exact meaning (flagged below); renaming them to a guessed meaning risks being wrong. Confirm-then-rename later if desired.

**Known source glitch:** every file's row-2 header is missing the "DMG" label in the Overall block — it's replaced by a stray raw number (e.g. `1905859`). Confirmed by user 2026-08-30: that column is `DMG`, the label is just corrupted in the export.

## Identity / per-event summary (7 columns, no block prefix)

| CSV header | Column | Notes |
|---|---|---|
| `Player` | `player_name` | |
| `Team` (or `Current`/`Team` split header in the two "Full Season" files) | `team_name` | Team as fielded for that event — same per-event-roster philosophy as `event_placements` (PROJECT.md §3). For "Full Season" files this is more like "team as of the snapshot," not one specific event |
| `Matches` → `Total` | `matches_total` | |
| `Matches` → `Ws` | `matches_w` | |
| `Matches` → `Ls` | `matches_l` | |
| `Maps` → `Total` | `maps_total` | |
| `Maps` → `Ws` | `maps_w` | |
| `Maps` → `Ls` | `maps_l` | |

Plus an `event_id` FK (not a CSV column — derived from which file the row came from) and a `game` tag (`Black Ops 7` for everything in `bo7_stats/`, per PROJECT.md §3).

## Overall block (16 columns, prefix `overall_`) — combined across all 3 modes

| CSV header | Column | Notes |
|---|---|---|
| K | `overall_k` | |
| D | `overall_d` | |
| K/D | `overall_kd` | |
| A | `overall_a` | |
| KA/D | `overall_kad` | (K+A)/D, presumably |
| +/- | `overall_plusminus` | |
| N/T | `overall_nt` | **Unconfirmed** — guessing "non-traded deaths," a common competitive-CoD stat |
| NT% | `overall_nt_pct` | Same caveat as N/T |
| HS | `overall_hs` | Headshots |
| DMG | `overall_dmg` | Label corrupted in source, see above |
| DMG/K | `overall_dmg_per_k` | |
| DMG/10 | `overall_dmg_per_10` | Damage per 10 minutes, presumably |
| R K/D | `overall_r_kd` | **Unconfirmed** meaning of "R" |
| K/10 | `overall_k_per_10` | |
| SR | `overall_sr` | **Unconfirmed** — possibly a rating score (~0-100 range in sample data) |
| DR | `overall_dr` | **Unconfirmed** — large-magnitude number (~similar scale to DMG), not a ratio |

## Hardpoint block (26 columns, prefix `hp_`)

| CSV header | Column | Notes |
|---|---|---|
| Maps | `hp_maps` | Maps played in this mode specifically |
| Ws | `hp_w` | |
| Ls | `hp_l` | |
| PF | `hp_pf` | Points For — Hardpoint is a points-race mode |
| PA | `hp_pa` | Points Against |
| K | `hp_k` | |
| D | `hp_d` | |
| K/D | `hp_kd` | |
| A | `hp_a` | |
| KA/D | `hp_kad` | |
| +/- | `hp_plusminus` | |
| N/T | `hp_nt` | |
| NT% | `hp_nt_pct` | |
| HS | `hp_hs` | |
| DMG | `hp_dmg` | |
| DMG/K | `hp_dmg_per_k` | |
| HT | `hp_ht` | **Unconfirmed** — likely "Hill Time" (seconds/minutes on the hill) |
| HT/10 | `hp_ht_per_10` | |
| ObjK | `hp_obj_k` | Objective kills, presumably (kills while on/near the hill) |
| CON | `hp_con` | **Unconfirmed** — possibly "Contested" hill time/count |
| K/10 | `hp_k_per_10` | |
| D/10 | `hp_d_per_10` | |
| A/10 | `hp_a_per_10` | |
| DMG/10 | `hp_dmg_per_10` | |
| E/10 | `hp_e_per_10` | **Unconfirmed** — "Engagements per 10"? |
| TIME | `hp_time` | Total time played in this mode (decimal, unit unconfirmed — likely minutes) |

## Search and Destroy block (28 columns, prefix `snd_`)

| CSV header | Column | Notes |
|---|---|---|
| Maps | `snd_maps` | |
| Ws | `snd_w` | |
| Ls | `snd_l` | |
| RF | `snd_rf` | Rounds For |
| RA | `snd_ra` | Rounds Against |
| K | `snd_k` | |
| D | `snd_d` | |
| K/D | `snd_kd` | |
| A | `snd_a` | |
| KA/D | `snd_kad` | |
| +/- | `snd_plusminus` | |
| N/T | `snd_nt` | |
| NT% | `snd_nt_pct` | |
| HS | `snd_hs` | |
| DMG | `snd_dmg` | |
| DMG/K | `snd_dmg_per_k` | |
| Pl | `snd_plants` | Bomb plants |
| Def | `snd_defuses` | Bomb defuses |
| FBs | `snd_first_bloods` | First bloods |
| FDs | `snd_first_deaths` | First deaths |
| FB% | `snd_fb_pct` | First-blood rate |
| WR% | `snd_wr_pct` | **Unconfirmed** — "Win Rate %" per round or per map? |
| K/R | `snd_k_per_r` | Per round |
| D/R | `snd_d_per_r` | |
| A/R | `snd_a_per_r` | |
| DMG/R | `snd_dmg_per_r` | |
| E/R | `snd_e_per_r` | **Unconfirmed**, same caveat as hp_e_per_10 |
| Rds | `snd_rounds` | Total rounds played |

## Overload block (25 columns, prefix `ovl_`)

| CSV header | Column | Notes |
|---|---|---|
| Maps | `ovl_maps` | |
| Ws | `ovl_w` | |
| Ls | `ovl_l` | |
| RF | `ovl_rf` | Rounds For |
| RA | `ovl_ra` | Rounds Against |
| K | `ovl_k` | |
| D | `ovl_d` | |
| K/D | `ovl_kd` | |
| A | `ovl_a` | |
| KA/D | `ovl_kad` | |
| +/- | `ovl_plusminus` | |
| N/T | `ovl_nt` | |
| NT% | `ovl_nt_pct` | |
| HS | `ovl_hs` | |
| DMG | `ovl_dmg` | |
| DMG/K | `ovl_dmg_per_k` | |
| GLS | `ovl_gls` | **Unconfirmed** — Overload's objective isn't literally "goals," meaning TBD |
| GLS/10 | `ovl_gls_per_10` | |
| OCK | `ovl_ock` | **Unconfirmed** — possibly "Objective/Overload Core Kills" |
| K/10 | `ovl_k_per_10` | |
| D/10 | `ovl_d_per_10` | |
| A/10 | `ovl_a_per_10` | |
| DMG/10 | `ovl_dmg_per_10` | |
| E/10 | `ovl_e_per_10` | |
| TIME | `ovl_time` | |

## Total column count

7 (identity/summary) + 16 (Overall) + 26 (Hardpoint) + 28 (Search & Destroy) + 25 (Overload) = **102 CSV-sourced columns**, plus `event_id`/`game` added at seed time = **104 columns** in `player_event_stats`.

## Open items (not blocking schema creation, but worth confirming for accurate UI labels later)

Unconfirmed abbreviations: `N/T`/`NT%`, `R K/D`, `SR`, `DR`, `HT`, `ObjK`, `CON`, `E/10`/`E/R`, `WR%`, `GLS`, `OCK`. Columns are named literally after the abbreviation for now so nothing is blocked on this — revisit if/when exact definitions are confirmed.
