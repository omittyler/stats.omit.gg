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
- **Buildable now** with real data (logo, roster, socials, coach, standings position) except "Last 5 matches" and "Team Stats", which depend on match/stats data.

### 4.3 Player Page — `/players/[id]`
- Header: photo, name, social links.
- Bio block: real name, alias/nickname, birthday/age, country, role/position.
- Season headline stats: a few callout stats (Overall K/D, per-mode K/D e.g. Hardpoint/S&D/Control), each shown with the player's current rank and a comparison value for context.
- Sections: Overview, Last 5 Matches, Matches, Event Stats, Events. (No Cards.)
- **Buildable now**: header + bio block. **Blocked**: season headline stats and match-dependent sections.

### 4.4 Standings Page — `/standings`
- Tabs must be **dynamically generated** from an `events` table (`type`: Cup / Elite Qualifier / Elite Playoff / Major / Champs, plus `season`/`order` for sequencing). Do NOT hardcode tabs like CDL's "Major 1–4/Champs" — Challengers has more event types and new ones shouldn't require code changes.
- Columns: Rank, Team, Points, MW (Match Wins), ML (Match Losses), MW%, GW (Game/Map Wins), GL (Game/Map Losses), GW%.
- MW/ML/GW/GL/win% are derived/computed from match and map results already in the database.
- **Points are NOT computed.** Challengers uses a different (and not yet provided) points formula than CDL, possibly varying by event type. Treat `points` as a value supplied directly by the stats provider per team per event, until a formula is given.
- **Decided (2026-08-26):** v1 includes BOTH per-event standings tabs AND an aggregated overall-season standings view (points summed across all events for a season). This is a core requirement, not a nice-to-have — see timeline context in §2. The `standings_points` schema/queries need to support summing across events within a season, not just per-event lookups.
- **Buildable now**: Rank/Team/Points come from wiki placings data (§6). MW/ML/GW/GL/win% columns are **blocked** on match data.

### 4.5 Supporting pages (implied, not detailed yet)
- Matches list page.
- Teams & Players directory page.

## 5. Draft Database Schema (tentative — pending real stats data sample)

Do not treat as final. Adjust field names/structure/granularity once the real stats data sample arrives. `players`, `teams`, `events`, and a placings/points table can be populated with real data now (§6); the rest stay schema-only until stats data arrives.

- **`players`** — bio fields, team reference, socials
- **`teams`** — name, logo, org, coach, socials
- **`events`** — name, type (Cup/Elite Qualifier/Elite Playoff/Major/Champs), season, order/date
- **`matches`** — event reference, two teams, overall series score, date *(blocked on stats data)*
- **`maps`** — one row per map played in a match (match_id, map_name, mode, map_number, per-team score) *(blocked on stats data)*
- **`player_map_stats`** — one row per player per map (kills, deaths, damage, +/-, obj-based stats as needed) *(blocked on stats data)*
- **`player_weapon_stats`** — one row per player per map per weapon (kills, accuracy, headshots) *(blocked on stats data)*
- **`standings_points`** — team, event, points, placement (manually supplied per current decision, see §4.4) — populated from wiki placings data now

## 6. Data Intake Process (rosters, logos, placings)

Source: [Call of Duty Esports Wiki](https://cod-esports.fandom.com/wiki/Call_of_Duty_Challengers), 2026 season pages. This is a manual, one-time pull done by the user — not an automated scrape or API integration (see §3 for why: both the fandom wiki and Liquipedia are inaccessible to Claude's tooling in this environment, and Liquipedia's block in particular reflects a deliberate anti-scraping/ToS posture that should be respected, not routed around).

**Process:**
1. User copies team/roster/placement tables from the wiki into a spreadsheet, and separately downloads player photos and team logos.
2. Spreadsheet exported as CSV and dropped into `data/incoming/` in this repo. Expected files and columns are documented in `data/incoming/README.md`: `teams.csv`, `players.csv`, `placings.csv`.
3. Images dropped into `public/players/` and `public/teams/` respectively (see README.md in each folder for naming convention).
4. Once files are present, build a one-off seed script to load them into Supabase — this does not need the full admin-import-tool UI (that tool is specifically for the recurring stats-provider workflow, see §3).

**Status as of 2026-08-26:** folders and README templates created (`data/incoming/`, `public/players/`, `public/teams/`); no actual data files dropped in yet.

## 7. Open Questions / Explicit Blockers

Track these here; resolve and move to §3/§8 (decisions/changelog) once answered.

- [ ] Player statistics (kills/deaths/damage/weapon data) from the stats provider — **not yet received**. Hard blocker on `matches`/`maps`/`player_map_stats`/`player_weapon_stats` (see §2, §5).
- [ ] Challengers points formula — not yet provided; `standings_points` stays manually-supplied per team per event until/unless a formula is given later.
- [ ] omit.gg's existing Webflow branding (colors, fonts, logo usage) — not yet reviewed. Needed before frontend styling begins.
- [ ] Hosting/DNS setup for `stats.omit.gg` subdomain on Vercel — not yet configured.
- [ ] Git remote — repo is git-initialized locally (see §10 Version Control) but has no remote yet. Decide on a private GitHub repo (or other) when ready to back up / deploy from it.
- [ ] Actual roster/placings/image files from the wiki — process defined (§6), files not yet dropped in.

Resolved — see Changelog §8 and inline notes in §3/§4.4: standings scope (aggregated + per-event), admin auth approach (simple password), historical data (2026 season exists and is the initial import), data intake approach for rosters/logos/placings (manual pull, not API — see §3/§6).

## 8. Changelog

Append a dated entry each session with what changed — decisions made, scope added/cut, code milestones. Keep entries short; this is a log, not a diary.

- **2026-08-26** — Project kicked off. Architecture, page specs, and draft schema captured from initial planning conversation (see §3–§5). Project directory created but empty; no code written yet. Decided to maintain this file as the portable, in-repo source of truth (separate from any Claude Code account-specific memory), so the project can be resumed from any account/session.
- **2026-08-26** — Repo initialized (git, local only, no remote yet — see §10). Initial commit `822b21e` with PROJECT.md/CLAUDE.md/.gitignore.
- **2026-08-26** — Resolved four open questions: standings will include an aggregated overall-season view in addition to per-event (see §3, §4.4) — driven by the 2027-season-readiness timeline goal; points formula still not provided, `standings_points` stays manually-supplied (no change); admin import tool will use a simple shared-password gate (see §3); historical 2026 season data exists and will be the initial import (see §2 timeline context).
- **2026-08-26** — Clarified that team rosters, team logos, player photos, and event placings ARE available now (sourced from the CoD Esports Wiki), separate from player statistics which are still blocked. Attempted to access the wiki and Liquipedia directly (browser tool + WebFetch) — both inaccessible (policy block / 402 / 403) — so intake will be a manual one-time pull, not a live scrape or API integration. Created `data/incoming/` (with column-template README for teams/players/placings CSVs) and `public/players/`, `public/teams/` (for image drops).

## 9. Immediate Next Steps

1. User pulls roster/placings/logo/photo data from the wiki per the process in §6 and drops files into `data/incoming/` and `public/players/` `public/teams/`.
2. Once those files land, write a one-off seed script to load teams/players/standings_points into Supabase.
3. Resolve remaining open questions in §7 (branding, hosting, git remote).
4. Pull omit.gg's existing Webflow branding before frontend styling work begins.
5. Build: Supabase schema (incl. season-aggregated standings query support), Next.js pages for the four page types + directory pages — teams/players/standings pages can go live with real data before match/stat data arrives.
6. When the stats provider data arrives: admin CSV/XLSX import tool with simple password auth and preview-before-commit, plus the match page and stat tables.

## 10. Version Control

- Local git repo initialized 2026-08-26 at the project root. Commit identity is repo-local (not global): `Tyler Porteous <tyler@omit.gg>`.
- No remote configured yet (see §7 open questions) — history currently exists only on this machine.
- Commits are made on request, not automatically after every change — ask to have work committed at a good checkpoint.
