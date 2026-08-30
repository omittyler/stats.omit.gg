import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readCsvObjects, readCsvRows, toNumber } from './lib/csv.js';
import { buildPlayerTeamIndex, resolvePlayerTeam } from './lib/playerTeamIndex.js';
import { STAT_FIELDS } from './lib/statFields.js';
import { chunk } from './lib/teams.js';
import { supabase } from './lib/supabaseClient.js';

const STATS_DIR = 'data/incoming/bo7_stats';
const GAME = 'Black Ops 7';

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

  const { data: eventRows, error: fetchError } = await supabase.from('events').select('id,name,region');
  if (fetchError) throw fetchError;
  const eventCache = new Map(eventRows.map((e) => [eventKey(e.name, e.region), e.id]));

  const toInsert = [];
  const unresolved = [];

  for (const { file, name, region } of EVENT_FILES) {
    const key = eventKey(name, region);
    const eventId = eventCache.get(key);
    if (!eventId) {
      console.warn(`No matching event for "${name}" (region ${region}) — skipping ${file}`);
      continue;
    }

    const parsed = parseStatsFile(path.join(STATS_DIR, file));
    for (const { player_name, team_code, stats } of parsed) {
      const teamName = resolvePlayerTeam(playerTeamIndex, key, player_name);
      if (!teamName) {
        unresolved.push({ file, player_name, team_code });
        continue;
      }
      toInsert.push({
        player_name,
        team_name: teamName,
        event_id: eventId,
        game: GAME,
        ...stats,
      });
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
}
