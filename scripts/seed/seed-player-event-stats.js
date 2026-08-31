import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readCsvObjects, readCsvRows, toNumber } from './lib/csv.js';
import { buildPlayerTeamIndex, resolvePlayerTeam, findPrefixCandidates } from './lib/playerTeamIndex.js';
import { STAT_FIELDS } from './lib/statFields.js';
import { chunk } from './lib/teams.js';
import { supabase } from './lib/supabaseClient.js';

const STATS_DIR = 'data/incoming/bo7_stats';
const GAME = 'Black Ops 7';

// Manually reviewed bo7_stats <-> placings.csv name mappings that will never
// exact- or prefix-match automatically (e.g. bo7_stats "D3" vs placings.csv
// "D3L1V3R" — placings.csv already has the correct spelling, there's nothing
// to fix there; bo7_stats just uses a shorter nickname). Each entry was
// confirmed against the candidate report by cross-checking the source data,
// not guessed — see PROJECT.md §7/§8b. This file is committed (not gitignored
// like the generated reports) since it's a deliberate, auditable record.
function loadConfirmedAliases() {
  const raw = readFileSync('scripts/seed/confirmed-aliases.json', 'utf8');
  const entries = JSON.parse(raw);
  return new Map(entries.map((e) => [`${e.file}|${e.bo7_stats_name.toLowerCase()}`, e]));
}

// Maps each per-event bo7_stats file to the (event_name, region) it matches in
// placings.csv. The two "Full Season" rollup files are deliberately excluded —
// they aren't tied to one event, so the player-name/team lookup below can't run
// against them cleanly. See PROJECT.md §7.
const EVENT_FILES = [
  { file: 'BO7 Dallas Open - Players Stats.csv', name: '2026 Major 1 - Dallas Open', region: null },
  { file: 'BO7 Birmingham Open - Players Stats.csv', name: '2026 Major 2 - Birmingham Open', region: null },
  { file: 'BO7 Atlanta Open - Players Stats.csv', name: '2026 Major 3 - Atlanta Open', region: null },
  { file: 'BO7 Elite 1 - NA Player Stats.csv', name: '2026 NA Elite Stage 1', region: 'NA' },
  { file: 'BO7 Elite 1 - EU Player Stats.csv', name: '2026 EU Elite Stage 1', region: 'EU' },
  { file: 'BO7 Elite 2 - NA Player Stats.csv', name: '2026 NA Elite Stage 2', region: 'NA' },
  { file: 'BO7 Elite 2 - EU Player Stats.csv', name: '2026 EU Elite Stage 2', region: 'EU' },
  { file: 'BO7 Elite 3 - NA Player Stats.csv', name: '2026 NA Elite Stage 3', region: 'NA' },
  { file: 'BO7 Elite 3 - EU Player Stats.csv', name: '2026 EU Elite Stage 3', region: 'EU' },
  { file: 'BO7 Paris Open - Players Stats.csv', name: '2026 Major 4 - Paris Open', region: null },
  { file: 'BO7 Champs - Player Stats.csv', name: '2026 Champs - Challengers Finals', region: null },
];

function eventKey(name, region) {
  return `${name}|${region || ''}`;
}

function parseStatsFile(filePath) {
  const rows = readCsvRows(filePath);
  const dataRows = rows.slice(2); // skip the two category/label header rows
  return dataRows.map((cols) => {
    const stats = {};
    STAT_FIELDS.forEach((field, i) => {
      stats[field] = toNumber(cols[i + 2]);
    });
    return { player_name: cols[0], team_code: cols[1] || null, stats };
  });
}

export async function seedPlayerEventStats() {
  const placingsRows = readCsvObjects('data/incoming/placings.csv');
  const playerTeamIndex = buildPlayerTeamIndex(placingsRows);
  const confirmedAliases = loadConfirmedAliases();

  const { data: eventRows, error: fetchError } = await supabase.from('events').select('id,name,region');
  if (fetchError) throw fetchError;
  const eventCache = new Map(eventRows.map((e) => [eventKey(e.name, e.region), e.id]));

  const resolvedByKey = new Map(); // `${player_name}|${event_id}` -> rows[] (>1 means a real duplicate, not a bug)
  const unresolved = [];
  const candidates = []; // exact match missed, but exactly one fuzzy (prefix) candidate found — needs manual confirmation

  for (const { file, name, region } of EVENT_FILES) {
    const key = eventKey(name, region);
    const eventId = eventCache.get(key);
    if (!eventId) {
      console.warn(`No matching event for "${name}" (region ${region}) — skipping ${file}`);
      continue;
    }

    const parsed = parseStatsFile(path.join(STATS_DIR, file));

    // Pass 1: exact/alias matches only. Also records, per team_code, which real
    // team that code corroborates - a code with zero exact matches (e.g. every
    // player on that team is missing from placings.csv) gives NO corroboration,
    // no matter how unique a later prefix match against some unrelated team's
    // roster looks. This is what catches false positives like bo7_stats "Tkay"
    // (team code OXO, a team absent from placings.csv entirely) coincidentally
    // prefix-matching unrelated "OutBreak Gaming"'s real player "tK" - confirmed
    // 2026-08-30 after that exact mistake made it into a first draft of this file.
    const teamCodeCorroboration = new Map(); // team_code -> Set<teamName>
    const pending = [];
    for (const { player_name, team_code, stats } of parsed) {
      const alias = confirmedAliases.get(`${file}|${player_name.toLowerCase()}`);
      const resolved = alias
        ? { teamName: alias.team_name, canonicalName: alias.canonical_name }
        : resolvePlayerTeam(playerTeamIndex, key, player_name);
      if (!resolved) {
        pending.push({ player_name, team_code, stats });
        continue;
      }
      if (team_code) {
        if (!teamCodeCorroboration.has(team_code)) teamCodeCorroboration.set(team_code, new Set());
        teamCodeCorroboration.get(team_code).add(resolved.teamName);
      }
      const { teamName, canonicalName } = resolved;
      const dupeKey = `${canonicalName}|${eventId}`;
      const row = { player_name: canonicalName, team_name: teamName, event_id: eventId, game: GAME, ...stats, _file: file };
      if (!resolvedByKey.has(dupeKey)) resolvedByKey.set(dupeKey, []);
      resolvedByKey.get(dupeKey).push(row);
    }

    // Pass 2: only now try fuzzy (prefix) matches, requiring the guessed team to be
    // corroborated by at least one other exact-matched teammate under the same code.
    for (const { player_name, team_code, stats } of pending) {
      if (!team_code) {
        unresolved.push({ file, player_name, team_code, reason: 'team code missing in source' });
        continue;
      }
      const fuzzy = findPrefixCandidates(playerTeamIndex, key, player_name);
      const corroborated = teamCodeCorroboration.get(team_code);
      if (fuzzy.length === 1 && corroborated?.size === 1 && corroborated.has(fuzzy[0].teamName)) {
        candidates.push({
          file,
          team_code,
          bo7_stats_name: player_name,
          candidate_placings_name: fuzzy[0].canonicalName,
          candidate_team: fuzzy[0].teamName,
        });
      } else {
        unresolved.push({
          file,
          player_name,
          team_code,
          reason: fuzzy.length === 1 ? 'prefix match found but not corroborated by another teammate under the same team code' : undefined,
        });
      }
    }
  }

  const toInsert = [];
  const duplicates = [];
  for (const rows of resolvedByKey.values()) {
    if (rows.length === 1) {
      const { _file, ...row } = rows[0];
      toInsert.push(row);
    } else {
      // Same player appears more than once for the same event in the source data —
      // a genuine data anomaly, not a resolver bug. Flag for manual review rather
      // than guessing which row (or whether to merge them) is correct.
      duplicates.push(...rows.map(({ _file, ...row }) => ({ file: _file, ...row })));
    }
  }

  for (const batch of chunk(toInsert, 500)) {
    const { error } = await supabase
      .from('player_event_stats')
      .upsert(batch, { onConflict: 'player_name,event_id' });
    if (error) throw error;
  }
  console.log(`player_event_stats: upserted ${toInsert.length} rows from bo7_stats/`);

  if (unresolved.length) {
    const reportPath = 'scripts/seed/unresolved-player-event-stats.json';
    await writeFile(reportPath, JSON.stringify(unresolved, null, 2));
    console.warn(
      `player_event_stats: ${unresolved.length} rows could not be matched to a team ` +
      `(player name not found, or ambiguous, in placings.csv for that event) — skipped, not guessed. ` +
      `See ${reportPath}.`
    );
  }

  if (duplicates.length) {
    const reportPath = 'scripts/seed/duplicate-player-event-stats.json';
    await writeFile(reportPath, JSON.stringify(duplicates, null, 2));
    console.warn(
      `player_event_stats: ${duplicates.length} rows are duplicates — the same player appears ` +
      `more than once for the same event in the source CSV(s). Skipped, not merged/picked. ` +
      `See ${reportPath}.`
    );
  }

  if (candidates.length) {
    const reportPath = 'scripts/seed/candidate-player-event-stats.json';
    await writeFile(reportPath, JSON.stringify(candidates, null, 2));
    console.warn(
      `player_event_stats: ${candidates.length} rows have exactly one likely name match ` +
      `(e.g. bo7_stats "D3" vs placings.csv "D3L1V3R") but are NOT inserted — verify each one, ` +
      `add confirmed matches to scripts/seed/confirmed-aliases.json, and re-run. See ${reportPath}.`
    );
  }
}
