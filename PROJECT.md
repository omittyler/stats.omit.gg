# stats.omit.gg — Project Documentation

Living source of truth for this project. Update this file as decisions are made, scope changes, or work progresses — it should always be enough on its own for a new session (or a different Claude Code account) to pick up the work with no other context.

Last updated: 2026-08-26

---

## 1. Project Summary

A Call of Duty Challengers (amateur/semi-pro tier) player and team statistics hub, modeled conceptually on [breakingpoint.gg](https://breakingpoint.gg) (which covers the pro-level CDL). Lives as a standalone app on the subdomain `stats.omit.gg`, linked from the main omit.gg Webflow site (not embedded as an iframe).

**Explicitly excluded**, per breakingpoint.gg being a reference, not a template to clone: their proprietary "BP Rtg" custom rating stat, and their "Cards" collectible feature. Everything else structurally is fair game to adapt.

## 2. Status

**Phase:** Pre-build / planning. No code written yet as of 2026-08-26.

**Blocking full build-out:** player statistics (kills/deaths/damage/weapon data) from the official stats provider have not arrived — this blocks `matches`/`maps`/`player_map_stats`/`player_weapon_stats`. However, team rosters, team logos, player photos, and event placings ARE available now, sourced by the user from the Call of Duty Esports Wiki — see §6 for the intake process. So teams/players/standings can be built with real data now; match pages and stat tables wait on the provider data.

**Timeline context:** The initial stats data load will be the full 2026 Challengers season (historical/backfilled — confirmed 2026-08-26, this data exists and will be the first import). No new stats data is expected until the 2027 season starts in January 2027. The point of building now is to have a working system live and ready *before* the 2027 season starts, using the 2026 season as the dataset to build and test against.

## 3. Architecture Decisions (already made — do not re-litigate without reason)

| Decision | Choice | Why |
|---|---|---|
| Data layer | Supabase (Postgres) | Free tier covers early scale, relational fit for granular per-map/per-weapon/per-round stats, pairs easily with Next.js |
| Frontend | Next.js on Vercel | Cost, SSR/SEO for player/team pages, ecosystem fit with Supabase |
| Hosting | Standalone app on subdomain `stats.omit.gg`, linked (not iframed) from main omit.gg Webflow site | Subdomain is indexable by search engines; an iframe would not be |
| CMS | Not using Webflow CMS for stats data | Webflow CMS item limits and filtering engine don't scale to granular per-map/per-weapon stats; user wants full data ownership |
| Data ingestion (stats) | Provider supplies stats data via Google Sheet/CSV/Excel, imported through a password-protected admin page | Not manual entry. Admin tool parses CSV/XLSX, matches rows against existing players/maps/events (update, not duplicate), shows a pre-commit preview (e.g. "14 new stat lines, 3 updates, 2 flagged rows") before writing to the DB |
| Data ingestion (rosters/logos/placings) | Manual one-time pull from the Call of Duty Esports Wiki into CSV + image files, dropped into the repo — see §6 | Wiki domains are blocked to Claude's browser tooling in this environment and returned errors on direct fetch (fandom.com: policy block + HTTP 402; liquipedia.net: HTTP 403, consistent with their anti-scraping stance). No live API integration was attempted or should be attempted against either site without going through their official, ToS-compliant APIs |
| Future nice-to-have | Direct Google Sheets API sync to skip manual export | Not in v1 scope |
| Data granularity | Per-map AND per-weapon, per-round level — not just per-match aggregates | Confirmed by user as a hard requirement |
| Admin auth | Simple shared-password gate on the admin import page (v1) | Fastest to build; only the user and their stats provider need access. Revisit if admin access needs to scale to more people later |
| Standings scope | Both per-event standings AND an aggregated overall-season standings view (points summed across events) — not per-event only | The 2026 season (the initial dataset) has no cross-event running system yet; the whole point of this project is to have that aggregated view ready before the 2027 season starts |
| Points formula | **Superseded 2026-08-26.** CDC Points are NOT manually supplied — they're computed from a placement (rank) looked up against an official points scale that varies by event type (Cup / Elite / Major-Open / Finals-Champs). Full scale in `data/reference/cdc_points_and_prizing.md`. Finals/Champs awards **zero CDC points** (confirmed), prize money only | User provided the official CDC Points & Prizing tables; this is a real formula now, not an unknown |
| Prize money | Track prize earnings per placement and surface aggregated season earnings on Team pages and Player pages | User wants earnings displayed as part of team/player season history, not just internal bookkeeping |
| Team logo fallback | A sentinel `Default` team / `Default.png` logo exists in the teams lookup. When importing player statistics or bracket/match data, if a team name doesn't match any known team, use `Default.png` as its logo but keep the real team name from the import — never drop/rename the team | Stats and bracket imports will reference teams by name; not every team will have a logo on file at import time, and the site shouldn't break or hide a team just because artwork is missing |

## 4. Confirmed Page Types (v1 scope)

### 4.1 Match Page — `/match/[id]`
- Header: event name/logo, date, both teams (logo + name), overall series score (e.g. 3-2).
- Map-by-map summary strip: map name, mode, score, both team logos — sourced from a per-map results table.
- Tabbed stat table: **Overview** tab (series aggregate) + one tab per map actually played. Series length varies (Bo3/Bo5/Bo7) — tabs must be generated dynamically from maps that exist for that match, never hardcoded to a fixed count.
- Columns per player: Kills, Deaths, K/D, +/-, Damage. **No proprietary rating column.**
- Kill % and damage % per team shown via a computed graph/bar (each team's share of total kills/damage for that map or match).
- **Blocked** on player statistics data (§2) — schema/UI can be built, but not populated with real data yet.

### 4.2 Team Page — `/teams/[id]`
- Header: logo, team name, org/affiliation, social links.
- Roster: player photos + names, linking to individual player pages.
- Standings position + current points.
- Coach name.
- Last 5 matches (W/L strip).
- Sections: Team Stats, Matches, Events. (No Cards/News BP-ecosystem tabs.)
- **Added 2026-08-26:** season prize earnings (aggregated from event placements, see §3 "Prize money") — display location within the page TBD when building (likely header callout or a Team Stats sub-section).
- **Buildable now** with real data (logo, roster, socials, coach, standings position, prize earnings once placings.csv lands) except "Last 5 matches" and "Team Stats" (win/loss-based), which depend on match/stats data.

### 4.3 Player Page — `/players/[id]`
- Header: photo, name, social links.
- Bio block: real name, alias/nickname, birthday/age, country, role/position.
- Season headline stats: a few callout stats (Overall K/D, per-mode K/D e.g. Hardpoint/S&D/Control), each shown with the player's current rank and a comparison value for context.
- Sections: Overview, Last 5 Matches, Matches, Event Stats, Events. (No Cards.)
- **Added 2026-08-26:** season prize earnings, attributed at the player level (see §3 "Prize money", and §7 for the open question on exactly how team-level prize money splits to individual players).
- **Buildable now**: header + bio block. **Blocked**: season headline stats, match-dependent sections, and player-level earnings (depends on the attribution logic in §7 being resolved).

### 4.4 Standings Page — `/standings`
- Tabs must be **dynamically generated** from an `events` table (`type`: Cup / Elite Qualifier / Elite Playoff / Major / Champs, plus `season`/`order` for sequencing). Do NOT hardcode tabs like CDL's "Major 1–4/Champs" — Challengers has more event types and new ones shouldn't require code changes.
- Columns: Rank, Team, Points, MW (Match Wins), ML (Match Losses), MW%, GW (Game/Map Wins), GL (Game/Map Losses), GW%.
- MW/ML/GW/GL/win% are derived/computed from match and map results already in the database.
- **Superseded 2026-08-26 — Points ARE computed**, not manually supplied. A team's `points` for an event = lookup(event_type, placement) against the official CDC Points scale in `data/reference/cdc_points_and_prizing.md`. Summary of the scale:
  - **Cup:** 1st=2000 ... down to 33rd-64th=100.
  - **Elite:** single combined 1st-12th scale (15000 down to 2500), but see the two-stage nuance below — a team's placement number for lookup purposes can come from either the Qualifier or the Playoff stage.
  - **Major/Open:** 1st=25000 ... down to 49th-64th=500.
  - **Finals/Champs:** **zero CDC points, confirmed** — cash prize only, since qualification into Finals is already earned via points from other events during the season.
  - Exact placement-range → points/prize values are in the reference file; don't duplicate/hand-copy them here, link to it.
  - **Elite two-stage mechanic (confirmed 2026-08-26):** Elite is a 12-team split with two connected stages. Top 8 from the Qualifier advance to the Playoff; their final points/prize come from **Playoff** placement (1st-8th on the scale). The bottom 4 (9th-12th) are already eliminated after the Qualifier and take their points/prize directly from **Qualifier** placement (9th-10th and 11th-12th tiers). So `Elite Qualifier` and `Elite Playoff` stay as two distinct events in the schema (they're genuinely separate brackets/matches), but a team's CDC-points-relevant "final placement" comes from whichever stage was actually their last one — this needs to be resolved at points-calculation time, not assumed to come from one fixed event type. Exact bracket/advancement data isn't in hand yet (see §7) — implement this once real Elite bracket data arrives rather than guessing the mechanism further.
- **Decided (2026-08-26):** v1 includes BOTH per-event standings tabs AND an aggregated overall-season standings view (points summed across all events for a season). This is a core requirement, not a nice-to-have — see timeline context in §2. The `standings_points`/placements schema and queries need to support summing across events within a season, not just per-event lookups.
- **Buildable now**: Rank/Team/Points — Points can now be computed from placement once `placings.csv` lands (§6), rather than needing a manually-supplied points value. MW/ML/GW/GL/win% columns are **blocked** on match data.

### 4.5 Supporting pages (implied, not detailed yet)
- Matches list page.
- Teams & Players directory page.

## 5. Draft Database Schema (tentative — pending real stats data sample)

Do not treat as final. Adjust field names/structure/granularity once the real stats data sample arrives. `players`, `teams`, `events`, and a placings/points table can be populated with real data now (§6); the rest stay schema-only until stats data arrives.

- **`players`** — bio fields, team reference, socials
- **`teams`** — name, logo, org, coach, socials. Logo resolution must fall back to a `Default.png`-style logo (keeping the real team name) when a team encountered during stats/bracket import has no known logo — see §3 "Team logo fallback" and §6
- **`events`** — name, type (Cup/Elite Qualifier/Elite Playoff/Major/Champs), season, order/date
- **`matches`** — event reference, two teams, overall series score, date *(blocked on stats data)*
- **`maps`** — one row per map played in a match (match_id, map_name, mode, map_number, per-team score) *(blocked on stats data)*
- **`player_map_stats`** — one row per player per map (kills, deaths, damage, +/-, obj-based stats as needed) *(blocked on stats data)*
- **`player_weapon_stats`** — one row per player per map per weapon (kills, accuracy, headshots) *(blocked on stats data)*
- **`event_placements`** (renamed from `standings_points`, 2026-08-26) — team, event, placement (rank or tied-rank value, e.g. 5 for a "5th-6th" tie). **`points` and `prize_usd` are NOT stored directly** — computed at query time (or via a materialized/derived column) by looking up `(event.type, placement)` against `points_scale`. Populated from wiki placings data now (§6)
- **`points_scale`** (new, 2026-08-26) — reference table encoding `data/reference/cdc_points_and_prizing.md`: `event_type`, `placement_min`, `placement_max`, `cdc_points`, `prize_usd` (and a regional variant for Cup — NA/EU vs AP/LA prize amounts differ even though CDC points don't; model as either a `region` column or two prize columns, decide when building). This table is the actual "points formula" — see §3.
- **Prize money aggregation** (new, 2026-08-26): team-level season earnings = sum of `prize_usd` across that team's `event_placements` for the season. Player-level earnings need an attribution rule (team prize split across roster) — **not yet decided**, see §7.

## 6. Data Intake Process (rosters, logos, placings)

Source: [Call of Duty Esports Wiki](https://cod-esports.fandom.com/wiki/Call_of_Duty_Challengers), 2026 season pages. This is a manual, one-time pull done by the user — not an automated scrape or API integration (see §3 for why: both the fandom wiki and Liquipedia are inaccessible to Claude's tooling in this environment, and Liquipedia's block in particular reflects a deliberate anti-scraping/ToS posture that should be respected, not routed around).

**Process:**
1. User copies team/roster/placement tables from the wiki into a spreadsheet, and separately downloads player photos and team logos.
2. Spreadsheet exported as CSV and dropped into `data/incoming/` in this repo. Expected files and columns are documented in `data/incoming/README.md`: `teams.csv`, `players.csv`, `placings.csv`. Note `placings.csv` should record each team's raw placement (rank) per event — NOT a points value; points are now computed via `points_scale` (see §5).
3. Images dropped into `public/players/` and `public/teams/` respectively (see README.md in each folder for naming convention).
4. Once files are present, build a one-off seed script to load them into Supabase — this does not need the full admin-import-tool UI (that tool is specifically for the recurring stats-provider workflow, see §3).

**Status as of 2026-08-26:** `teams.csv` dropped in — a simple `Team Name` / `File Name` (logo) lookup table, 26 rows. All 26 corresponding logo PNGs (including `Default.png`) are already present in `public/teams/` and verified to match the CSV filenames exactly. Includes a special `Default` / `Default.png` sentinel row: when player-statistics or bracket/match imports (future, from the official stats provider) reference a team name not present in this lookup, that team should get `Default.png` as its logo while keeping its real name from the import — never dropped or silently renamed. This fallback logic needs to be built into whatever import/matching code resolves team logos, not just this one-off seed script. `players.csv` and `placings.csv` (and player photos in `public/players/`) not yet dropped in.

## 7. Open Questions / Explicit Blockers

Track these here; resolve and move to §3/§8 (decisions/changelog) once answered.

- [ ] Player statistics (kills/deaths/damage/weapon data) from the stats provider — **not yet received**. Hard blocker on `matches`/`maps`/`player_map_stats`/`player_weapon_stats` (see §2, §5).
- [ ] Elite bracket/advancement data — need the actual mechanism connecting Elite Qualifier and Elite Playoff results so a team's final points-relevant placement (1-12) can be computed correctly per the two-stage rule in §4.4. Don't hand-wave this when building; get real bracket data first.
- [ ] Player-level prize money attribution — team prize earnings are confirmed in scope (§3), but how a team's prize splits across individual players (equal split among active roster at time of event? something else?) is not yet decided. This likely also needs roster-history-over-time tracking we don't have a model for yet.
- [ ] omit.gg's existing Webflow branding (colors, fonts, logo usage) — not yet reviewed. Needed before frontend styling begins.
- [ ] Hosting/DNS setup for `stats.omit.gg` subdomain on Vercel — not yet configured.
- [ ] Git remote — repo is git-initialized locally (see §10 Version Control) but has no remote yet. Decide on a private GitHub repo (or other) when ready to back up / deploy from it.
- [ ] `players.csv` and `placings.csv` (and player photos) from the wiki — process defined (§6), not yet dropped in.

Resolved — see Changelog §8 and inline notes in §3/§4.4/§5: standings scope (aggregated + per-event), admin auth approach (simple password), historical data (2026 season exists and is the initial import), data intake approach for rosters/logos/placings (manual pull, not API — see §3/§6), CDC points formula (computed via `points_scale`, see §3/§5), Finals/Champs awards zero points (confirmed), prize money is in scope and tracked at team level.

## 8. Changelog

Append a dated entry each session with what changed — decisions made, scope added/cut, code milestones. Keep entries short; this is a log, not a diary.

- **2026-08-26** — Project kicked off. Architecture, page specs, and draft schema captured from initial planning conversation (see §3–§5). Project directory created but empty; no code written yet. Decided to maintain this file as the portable, in-repo source of truth (separate from any Claude Code account-specific memory), so the project can be resumed from any account/session.
- **2026-08-26** — Repo initialized (git, local only, no remote yet — see §10). Initial commit `822b21e` with PROJECT.md/CLAUDE.md/.gitignore.
- **2026-08-26** — Resolved four open questions: standings will include an aggregated overall-season view in addition to per-event (see §3, §4.4) — driven by the 2027-season-readiness timeline goal; points formula still not provided, `standings_points` stays manually-supplied (no change); admin import tool will use a simple shared-password gate (see §3); historical 2026 season data exists and will be the initial import (see §2 timeline context).
- **2026-08-26** — Clarified that team rosters, team logos, player photos, and event placings ARE available now (sourced from the CoD Esports Wiki), separate from player statistics which are still blocked. Attempted to access the wiki and Liquipedia directly (browser tool + WebFetch) — both inaccessible (policy block / 402 / 403) — so intake will be a manual one-time pull, not a live scrape or API integration. Created `data/incoming/` (with column-template README for teams/players/placings CSVs) and `public/players/`, `public/teams/` (for image drops).
- **2026-08-26** — `teams.csv` (26 teams, `Team Name`/`File Name` columns) and all 26 matching logo PNGs dropped in and verified. Captured a new decision: a `Default`/`Default.png` sentinel exists for teams encountered later (via stats/bracket import) that have no known logo — fall back to the default logo but always keep the real team name. See §3 and §5.
- **2026-08-26** — User provided the official CDC Points & Prizing tables (saved to `data/reference/cdc_points_and_prizing.md`), resolving the previously-open points-formula question. **This reverses a prior decision**: points are computed from placement via a `points_scale` lookup (varies by event type: Cup/Elite/Major-Open/Finals-Champs), not manually supplied by the provider. Confirmed Finals/Champs awards zero CDC points (prize only). Confirmed Elite is a two-stage split (Qualifier feeds Playoff; top 8 get Playoff placement, bottom 4 get Qualifier placement) — exact bracket mechanics still need real data, tracked as an open question. Also decided prize money is in scope: track team-level season earnings and display on Team/Player pages; player-level attribution logic still undecided. Schema updated: `standings_points` renamed `event_placements` (stores raw placement, not points), added `points_scale` reference table. See §3, §4.2-4.4, §5, §7.

## 9. Immediate Next Steps

1. User pulls remaining roster/placings/photo data from the wiki per the process in §6 and drops files into `data/incoming/` and `public/players/`.
2. Once those files land, write a one-off seed script to load teams/players/event_placements into Supabase, including the `points_scale` reference table from `data/reference/cdc_points_and_prizing.md`.
3. Resolve remaining open questions in §7 (branding, hosting, git remote).
4. Pull omit.gg's existing Webflow branding before frontend styling work begins.
5. Build: Supabase schema (incl. season-aggregated standings query support), Next.js pages for the four page types + directory pages — teams/players/standings pages can go live with real data before match/stat data arrives.
6. When the stats provider data arrives: admin CSV/XLSX import tool with simple password auth and preview-before-commit, plus the match page and stat tables.

## 10. Version Control

- Local git repo initialized 2026-08-26 at the project root. Commit identity is repo-local (not global): `Tyler Porteous <tyler@omit.gg>`.
- No remote configured yet (see §7 open questions) — history currently exists only on this machine.
- Commits are made on request, not automatically after every change — ask to have work committed at a good checkpoint.
