import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { STAT_FIELDS } from './statFields';
import { computeStandings, type EventStatsSummary, type RankedStat } from './standings';
import { OFFICIAL_CDL_TEAMS } from './officialCdlTeams';

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
  'damage-rating': {
    title: 'Damage Rating',
    resultKey: 'damageRating',
    formatValue: (v: number) => v.toLocaleString(),
  },
  'hardpoint-kd': {
    title: 'Hardpoint K/D',
    resultKey: 'hpKd',
    formatValue: (v: number) => v.toFixed(2),
  },
  'hardpoint-k-per-10': {
    title: 'Hardpoint K/10M',
    resultKey: 'hpKPer10',
    formatValue: (v: number) => v.toFixed(2),
  },
  'hardpoint-dmg-per-10': {
    title: 'Hardpoint DMG/10M',
    resultKey: 'hpDmgPer10',
    formatValue: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  },
  'search-and-destroy-kd': {
    title: 'Search & Destroy K/D',
    resultKey: 'sndKd',
    formatValue: (v: number) => v.toFixed(2),
  },
  'search-and-destroy-kpr': {
    title: 'Search & Destroy KPR',
    resultKey: 'sndKPerR',
    formatValue: (v: number) => v.toFixed(2),
  },
  'search-and-destroy-opening-duel-win-pct': {
    title: 'Search & Destroy Opening Duel Win %',
    resultKey: 'sndOpeningDuelWinPct',
    formatValue: (v: number) => `${v.toFixed(0)}%`,
  },
  'overload-kd': {
    title: 'Overload K/D',
    resultKey: 'ovlKd',
    formatValue: (v: number) => v.toFixed(2),
  },
  'overload-k-per-10': {
    title: 'Overload K/10M',
    resultKey: 'ovlKPer10',
    formatValue: (v: number) => v.toFixed(2),
  },
  'overload-dmg-per-10': {
    title: 'Overload DMG/10M',
    resultKey: 'ovlDmgPer10',
    formatValue: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
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

  // These leaderboards exist to highlight Challengers players specifically -
  // a player currently on an official CDL team (even one with real
  // Challengers-earned stats in the Full Season files, e.g. picked up
  // mid-season) is excluded, confirmed by user 2026-09-01. "Currently" is
  // the same live, most-recent-event-wins concept as everywhere else in the
  // app - someone who returns to a real Challengers org later in the season
  // reappears automatically, no extra bookkeeping needed here.
  const { playerStandings } = await computeStandings();
  const currentCdlPlayers = new Set(
    playerStandings.filter((p) => OFFICIAL_CDL_TEAMS.has(p.currentTeam)).map((p) => p.name.toLowerCase())
  );

  // Eligibility bar for every leaderboard category, confirmed by user
  // 2026-08-31 (supersedes an earlier, unconfirmed 2-match placeholder that
  // only applied to the ratio-based categories, and didn't apply to Damage
  // at all).
  const MIN_MATCHES = 15;

  function isEligible(r: StatRow): boolean {
    if ((r.matches_total ?? 0) < MIN_MATCHES) return false;
    return !currentCdlPlayers.has(canonicalize(r.player_name).toLowerCase());
  }

  function cap(list: StatLeaderboardEntry[]): StatLeaderboardEntry[] {
    return limit ? list.slice(0, limit) : list;
  }

  function topByRatio(k: string, d: string): StatLeaderboardEntry[] {
    return cap(
      rows
        .filter((r) => isEligible(r) && (r[d] ?? 0) > 0)
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
        .filter((r) => isEligible(r) && r[field] !== null)
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
  const damageRating = topByValue('overall_damage_rating');
  const slayerRating = topByValue('overall_slayer_rating');
  const hpKPer10 = topByValue('hp_k_per_10');
  const hpDmgPer10 = topByValue('hp_dmg_per_10');
  const sndKPerR = topByValue('snd_k_per_r');
  const sndOpeningDuelWinPct = topByValue('snd_opening_duel_win_pct');
  const ovlKPer10 = topByValue('ovl_k_per_10');
  const ovlDmgPer10 = topByValue('ovl_dmg_per_10');

  return {
    kd,
    slayerRating,
    damageRating,
    hpKd,
    hpKPer10,
    hpDmgPer10,
    sndKd,
    sndKPerR,
    sndOpeningDuelWinPct,
    ovlKd,
    ovlKPer10,
    ovlDmgPer10,
  };
}

// Same 16 stats ranked in getPlayerEventStatsSummaries (lib/standings.ts),
// but read from the raw Full Season CSV field names used in this file.
const SEASON_RANKED_FIELDS = [
  'overall_kd',
  'overall_kad',
  'overall_slayer_rating',
  'overall_damage_rating',
  'hp_kd',
  'hp_hill_time_per_10',
  'hp_k_per_10',
  'hp_dmg_per_10',
  'snd_kd',
  'snd_opening_duel_win_pct',
  'snd_k_per_r',
  'snd_dmg_per_r',
  'ovl_kd',
  'ovl_goals_per_10',
  'ovl_k_per_10',
  'ovl_dmg_per_10',
] as const;

/**
 * One player's whole-season stat block, in the same shape as a single
 * event's (EventStatsSummary) - so the player page can render it with the
 * same <StatDetail> component, just ranked against every OTHER player in
 * the Full Season data instead of one event's field.
 */
export async function getPlayerSeasonStats(playerName: string): Promise<EventStatsSummary | null> {
  const canonicalNames = buildCanonicalNameMap();
  const rows = FULL_SEASON_FILES.flatMap((file) =>
    parseFullSeasonFile(path.join('data/incoming/bo7_stats', file))
  ).map((r) => ({ ...r, player_name: canonicalNames.get(r.player_name.toLowerCase()) ?? r.player_name }));

  const target = rows.find((r) => r.player_name === playerName);
  if (!target) return null;

  function rankOf(field: (typeof SEASON_RANKED_FIELDS)[number]): RankedStat {
    const value = target![field];
    if (value === null) return { value: null, rank: null };
    const sorted = rows
      .map((r) => r[field])
      .filter((v): v is number => v !== null)
      .sort((a, b) => b - a);
    return { value, rank: sorted.indexOf(value) + 1 };
  }

  return {
    matchesTotal: target.matches_total,
    matchesW: target.matches_w,
    matchesL: target.matches_l,
    mapsTotal: target.maps_total,
    mapsW: target.maps_w,
    mapsL: target.maps_l,

    overallKd: rankOf('overall_kd'),
    overallKad: rankOf('overall_kad'),
    overallSlayerRating: rankOf('overall_slayer_rating'),
    overallDamageRating: rankOf('overall_damage_rating'),

    hpMaps: target.hp_maps,
    hpKd: rankOf('hp_kd'),
    hpHillTimePer10: rankOf('hp_hill_time_per_10'),
    hpKPer10: rankOf('hp_k_per_10'),
    hpDmgPer10: rankOf('hp_dmg_per_10'),

    sndMaps: target.snd_maps,
    sndKd: rankOf('snd_kd'),
    sndOpeningDuelWinPct: rankOf('snd_opening_duel_win_pct'),
    sndKPerR: rankOf('snd_k_per_r'),
    sndDmgPerR: rankOf('snd_dmg_per_r'),

    ovlMaps: target.ovl_maps,
    ovlKd: rankOf('ovl_kd'),
    ovlGoalsPer10: rankOf('ovl_goals_per_10'),
    ovlKPer10: rankOf('ovl_k_per_10'),
    ovlDmgPer10: rankOf('ovl_dmg_per_10'),
  };
}
