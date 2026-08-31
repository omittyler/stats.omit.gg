import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { STAT_FIELDS } from './statFields';

export type StatLeaderboardEntry = { playerName: string; value: number; qualifyingEvents: number };

const FULL_SEASON_FILES = [
  'BO7 Full Season - NA Player Stats.csv',
  'BO7 Full Season - EU Player Stats.csv',
];

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.trim().replace(/,/g, '').replace(/%$/, '');
  if (cleaned === '' || cleaned === '#DIV/0!') return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

type StatRow = { player_name: string } & Record<string, number | null>;

function parseFullSeasonFile(filePath: string): StatRow[] {
  const raw = readFileSync(filePath, 'utf8');
  const rows: string[][] = parse(raw, { columns: false, skip_empty_lines: true, trim: true });
  const dataRows = rows.slice(2); // skip the two category/label header rows
  return dataRows.map((cols) => {
    const stats: Record<string, number | null> = {};
    STAT_FIELDS.forEach((field, i) => {
      stats[field] = toNumber(cols[i + 2]);
    });
    return { player_name: cols[0], ...stats };
  });
}

/**
 * Builds a case-insensitive lookup to placings.csv's canonical spelling for a
 * name, so leaderboard entries link to an existing /players/[name] page even
 * when bo7_stats capitalizes the handle differently (a recurring mismatch
 * throughout this project - see PROJECT.md §8b/§8d).
 */
function buildCanonicalNameMap(): Map<string, string> {
  const raw = readFileSync('data/incoming/placings.csv', 'utf8');
  const rows: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  const map = new Map<string, string>();
  for (const row of rows) {
    for (const key of ['player1', 'player2', 'player3', 'player4']) {
      const name = row[key];
      if (name && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), name);
    }
  }
  return map;
}

/**
 * Season-aggregate stat leaderboards, read directly from the "BO7 Full Season"
 * files - these are the stats provider's own complete season totals per
 * player, not something summed from the partial per-event files (which only
 * cover 9 of ~18 tracked events, see PROJECT.md §7). One row per player
 * already IS their season total, so no aggregation across rows is needed here.
 */
export const STAT_CATEGORIES = {
  kd: { title: 'K/D Ratio', resultKey: 'kd', formatValue: (v: number) => v.toFixed(2) },
  'slayer-rating': {
    title: 'Slayer Rating',
    resultKey: 'slayerRating',
    formatValue: (v: number) => v.toFixed(2),
  },
  damage: { title: 'Damage', resultKey: 'damage', formatValue: (v: number) => v.toLocaleString() },
  'hardpoint-kd': {
    title: 'Hardpoint K/D',
    resultKey: 'hpKd',
    formatValue: (v: number) => v.toFixed(2),
  },
  'search-and-destroy-kd': {
    title: 'Search & Destroy K/D',
    resultKey: 'sndKd',
    formatValue: (v: number) => v.toFixed(2),
  },
  'overload-kd': {
    title: 'Overload K/D',
    resultKey: 'ovlKd',
    formatValue: (v: number) => v.toFixed(2),
  },
} as const;

export type StatCategorySlug = keyof typeof STAT_CATEGORIES;

/**
 * Season-aggregate stat leaderboards, read directly from the "BO7 Full Season"
 * files - these are the stats provider's own complete season totals per
 * player, not something summed from the partial per-event files (which only
 * cover 9 of ~18 tracked events, see PROJECT.md §7). One row per player
 * already IS their season total, so no aggregation across rows is needed here.
 *
 * Pass `limit` to cap each list (e.g. 5 for the home page); omit it for the
 * full leaderboard pages.
 */
export async function getStatLeaderboards(limit?: number) {
  const canonicalNames = buildCanonicalNameMap();
  const rows = FULL_SEASON_FILES.flatMap((file) =>
    parseFullSeasonFile(path.join('data/incoming/bo7_stats', file))
  );

  function canonicalize(name: string): string {
    return canonicalNames.get(name.toLowerCase()) ?? name;
  }

  // Ratio-based leaderboards (K/D, Slayer Rating) require at least this many
  // matches, otherwise a small sample could top the list unfairly - not
  // explicitly discussed with the user, flagged as a judgment call.
  const MIN_MATCHES = 2;

  function cap(list: StatLeaderboardEntry[]): StatLeaderboardEntry[] {
    return limit ? list.slice(0, limit) : list;
  }

  function topByRatio(k: string, d: string): StatLeaderboardEntry[] {
    return cap(
      rows
        .filter((r) => (r.matches_total ?? 0) >= MIN_MATCHES && (r[d] ?? 0) > 0)
        .map((r) => ({
          playerName: canonicalize(r.player_name),
          value: (r[k] ?? 0) / (r[d] as number),
          qualifyingEvents: r.matches_total ?? 0,
        }))
        .sort((a, b) => b.value - a.value)
    );
  }

  function topByValue(field: string): StatLeaderboardEntry[] {
    return cap(
      rows
        .filter((r) => r[field] !== null)
        .map((r) => ({
          playerName: canonicalize(r.player_name),
          value: r[field] as number,
          qualifyingEvents: r.matches_total ?? 0,
        }))
        .sort((a, b) => b.value - a.value)
    );
  }

  const kd = topByRatio('overall_k', 'overall_d');
  const hpKd = topByRatio('hp_k', 'hp_d');
  const sndKd = topByRatio('snd_k', 'snd_d');
  const ovlKd = topByRatio('ovl_k', 'ovl_d');
  const damage = topByValue('overall_dmg');
  const slayerRating = cap(
    rows
      .filter((r) => (r.matches_total ?? 0) >= MIN_MATCHES && r.overall_slayer_rating !== null)
      .map((r) => ({
        playerName: canonicalize(r.player_name),
        value: r.overall_slayer_rating as number,
        qualifyingEvents: r.matches_total ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
  );

  return { kd, slayerRating, damage, hpKd, sndKd, ovlKd };
}
