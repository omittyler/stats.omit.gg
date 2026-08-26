# stats.omit.gg — Project Documentation

Living source of truth for this project. Update this file as decisions are made, scope changes, or work progresses — it should always be enough on its own for a new session (or a different Claude Code account) to pick up the work with no other context.

Last updated: 2026-08-26

---

## 1. Project Summary

A Call of Duty Challengers (amateur/semi-pro tier) player and team statistics hub, modeled conceptually on [breakingpoint.gg](https://breakingpoint.gg) (which covers the pro-level CDL). Lives as a standalone app on the subdomain `stats.omit.gg`, linked from the main omit.gg Webflow site (not embedded as an iframe).

**Explicitly excluded**, per breakingpoint.gg being a reference, not a template to clone: their proprietary "BP Rtg" custom rating stat, and their "Cards" collectible feature. Everything else structurally is fair game to adapt.

## 2. Status

**Phase:** Pre-build / planning. No code written yet as of 2026-08-26.

**Blocking the next real build step:** the real data sample (Google Sheet/CSV/Excel) from the Challengers stats provider has not arrived. Schema below is a draft hypothesis, not final — do not treat it as locked until a real sample has been mapped against it.

## 3. Architecture Decisions (already made — do not re-litigate without reason)

| Decision | Choice | Why |
|---|---|---|
| Data layer | Supabase (Postgres) | Free tier covers early scale, relational fit for granular per-map/per-weapon/per-round stats, pairs easily with Next.js |
| Frontend | Next.js on Vercel | Cost, SSR/SEO for player/team pages, ecosystem fit with Supabase |
| Hosting | Standalone app on subdomain `stats.omit.gg`, linked (not iframed) from main omit.gg Webflow site | Subdomain is indexable by search engines; an iframe would not be |
| CMS | Not using Webflow CMS for stats data | Webflow CMS item limits and filtering engine don't scale to granular per-map/per-weapon stats; user wants full data ownership |
| Data ingestion | Provider supplies data via Google Sheet/CSV/Excel, imported through a password-protected admin page | Not manual entry. Admin tool parses CSV/XLSX, matches rows against existing players/maps/events (update, not duplicate), shows a pre-commit preview (e.g. "14 new stat lines, 3 updates, 2 flagged rows") before writing to the DB |
| Future nice-to-have | Direct Google Sheets API sync to skip manual export | Not in v1 scope |
| Data granularity | Per-map AND per-weapon, per-round level — not just per-match aggregates | Confirmed by user as a hard requirement |

## 4. Confirmed Page Types (v1 scope)

### 4.1 Match Page — `/match/[id]`
- Header: event name/logo, date, both teams (logo + name), overall series score (e.g. 3-2).
- Map-by-map summary strip: map name, mode, score, both team logos — sourced from a per-map results table.
- Tabbed stat table: **Overview** tab (series aggregate) + one tab per map actually played. Series length varies (Bo3/Bo5/Bo7) — tabs must be generated dynamically from maps that exist for that match, never hardcoded to a fixed count.
- Columns per player: Kills, Deaths, K/D, +/-, Damage. **No proprietary rating column.**
- Kill % and damage % per team shown via a computed graph/bar (each team's share of total kills/damage for that map or match).

### 4.2 Team Page — `/teams/[id]`
- Header: logo, team name, org/affiliation, social links.
- Roster: player photos + names, linking to individual player pages.
- Standings position + current points.
- Coach name.
- Last 5 matches (W/L strip).
- Sections: Team Stats, Matches, Events. (No Cards/News BP-ecosystem tabs.)

### 4.3 Player Page — `/players/[id]`
- Header: photo, name, social links.
- Bio block: real name, alias/nickname, birthday/age, country, role/position.
- Season headline stats: a few callout stats (Overall K/D, per-mode K/D e.g. Hardpoint/S&D/Control), each shown with the player's current rank and a comparison value for context.
- Sections: Overview, Last 5 Matches, Matches, Event Stats, Events. (No Cards.)

### 4.4 Standings Page — `/standings`
- Tabs must be **dynamically generated** from an `events` table (`type`: Cup / Elite Qualifier / Elite Playoff / Major / Champs, plus `season`/`order` for sequencing). Do NOT hardcode tabs like CDL's "Major 1–4/Champs" — Challengers has more event types and new ones shouldn't require code changes.
- Columns: Rank, Team, Points, MW (Match Wins), ML (Match Losses), MW%, GW (Game/Map Wins), GL (Game/Map Losses), GW%.
- MW/ML/GW/GL/win% are derived/computed from match and map results already in the database.
- **Points are NOT computed.** Challengers uses a different (and not yet provided) points formula than CDL, possibly varying by event type. Treat `points` as a value supplied directly by the stats provider per team per event, until a formula is given.
- **Open question:** should there also be an aggregated overall-season standings view (points summed across all events) in addition to per-event standings? Not yet decided — ask user before building.

### 4.5 Supporting pages (implied, not detailed yet)
- Matches list page.
- Teams & Players directory page.

## 5. Draft Database Schema (tentative — pending real data sample)

Do not treat as final. Adjust field names/structure/granularity once the real data sample arrives.

- **`players`** — bio fields, team reference, socials
- **`teams`** — name, logo, org, coach, socials
- **`events`** — name, type (Cup/Elite Qualifier/Elite Playoff/Major/Champs), season, order/date
- **`matches`** — event reference, two teams, overall series score, date
- **`maps`** — one row per map played in a match (match_id, map_name, mode, map_number, per-team score)
- **`player_map_stats`** — one row per player per map (kills, deaths, damage, +/-, obj-based stats as needed)
- **`player_weapon_stats`** — one row per player per map per weapon (kills, accuracy, headshots) — needed for the per-weapon granularity requirement
- **`standings_points`** — team, event, points (manually supplied per current decision, see §4.4)

## 6. Open Questions / Explicit Blockers

Track these here; resolve and move to §3/§7 (decisions/changelog) once answered.

- [ ] Real data sample from the Challengers stats provider — **not yet received**. Blocks finalizing schema.
- [ ] Aggregated overall-season standings view vs. per-event-only — needs user decision.
- [ ] Challengers points formula — not yet provided; if given later, `standings_points` could become computed instead of manually supplied.
- [ ] Admin import tool auth approach — simple password vs. more robust auth — not yet specified.
- [ ] Historical/backfilled Challengers data — does it exist, or does this start fresh going forward?
- [ ] omit.gg's existing Webflow branding (colors, fonts, logo usage) — not yet reviewed. Needed before frontend styling begins.
- [ ] Hosting/DNS setup for `stats.omit.gg` subdomain on Vercel — not yet configured.

## 7. Changelog

Append a dated entry each session with what changed — decisions made, scope added/cut, code milestones. Keep entries short; this is a log, not a diary.

- **2026-08-26** — Project kicked off. Architecture, page specs, and draft schema captured from initial planning conversation (see §3–§6). Project directory created but empty; no code written yet. Decided to maintain this file as the portable, in-repo source of truth (separate from any Claude Code account-specific memory), so the project can be resumed from any account/session.

## 8. Immediate Next Steps

1. Get the real data sample from the stats provider; map real columns to the draft schema in §5, flag inconsistent naming/formatting, produce a clean "source of truth" template for future updates.
2. Resolve open questions in §6 (aggregated standings view, points formula, admin auth, historical data, branding, hosting).
3. Pull omit.gg's existing Webflow branding before frontend styling work begins.
4. Build: Supabase schema, Next.js pages for the four page types + directory pages, admin CSV/XLSX import tool with preview-before-commit.
