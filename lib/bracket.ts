import type { MatchListEntry } from './matches';

export type BracketMatch = {
  seriesLabel: string;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  winner: string | null;
};

export type DoubleElimBracket = {
  upper: BracketMatch[][]; // upper[0] = upper round 1
  lower: BracketMatch[][];
  grandFinal: BracketMatch[]; // 2 entries when there was a bracket reset
  /** False when the tracked matches don't form a clean double-elimination bracket (missing series). */
  complete: boolean;
};

export type GroupStanding = { teamName: string; seriesWon: number; seriesLost: number; mapsWon: number; mapsLost: number };
export type Group = { name: string; standings: GroupStanding[]; matches: BracketMatch[] };

export type EventBracket = {
  groups: Group[];
  playoffs: DoubleElimBracket | null;
};

// Every tracked playoff in the data is an 8-team double-elimination bracket:
// 4 + 2 + 1 upper, 2 + 2 + 1 + 1 lower, 1 grand final = 14 series
// (data/reference/match_format_rules.md). Elite and Champs play a group
// stage first - round-robin groups of 6 for Elite, 4-team groups for Champs -
// and the last 14 series of the event are the playoff.
const PLAYOFF_SERIES = 14;

function toBracketMatch(m: MatchListEntry, later: MatchListEntry[]): BracketMatch {
  let winner: string | null = null;
  if (m.team1Score > m.team2Score) winner = m.team1Name;
  else if (m.team2Score > m.team1Score) winner = m.team2Name;
  else {
    // A few series have incomplete map data and read as a tie (e.g. 2-2).
    // The team that goes on to play again is the one that advanced.
    const appearances = (team: string) => later.filter((l) => l.team1Name === team || l.team2Name === team).length;
    const a1 = appearances(m.team1Name);
    const a2 = appearances(m.team2Name);
    if (a1 !== a2) winner = a1 > a2 ? m.team1Name : m.team2Name;
  }
  return {
    seriesLabel: m.seriesLabel,
    team1Name: m.team1Name,
    team2Name: m.team2Name,
    team1Score: m.team1Score,
    team2Score: m.team2Score,
    winner,
  };
}

/**
 * Rebuilds a double-elimination bracket from series in play order. The data
 * has no round column, so each series is placed by its teams' records going
 * in: both unbeaten = upper bracket, both with one loss = lower bracket, one
 * of each = grand final. Round number = one past the latest round either
 * team has already played on that side, which reproduces the standard
 * layout (e.g. an upper-bracket loser drops in against the lower-bracket
 * survivor of the matching round).
 */
export function buildDoubleElim(matches: MatchListEntry[]): DoubleElimBracket {
  const losses = new Map<string, number>();
  const upperRound = new Map<string, number>();
  const lowerRound = new Map<string, number>();
  const upper: BracketMatch[][] = [];
  const lower: BracketMatch[][] = [];
  const grandFinal: BracketMatch[] = [];
  let complete = true;

  matches.forEach((raw, i) => {
    const m = toBracketMatch(raw, matches.slice(i + 1));
    const l1 = losses.get(m.team1Name) ?? 0;
    const l2 = losses.get(m.team2Name) ?? 0;
    if (l1 >= 2 || l2 >= 2 || !m.winner) complete = false;

    if (grandFinal.length > 0 || l1 !== l2) {
      // Only the grand final (and its reset) should mix an unbeaten team
      // with a one-loss team; anywhere earlier means series are missing.
      if (i < matches.length - 2) complete = false;
      grandFinal.push(m);
    } else if (l1 === 0) {
      const round = Math.max(upperRound.get(m.team1Name) ?? 0, upperRound.get(m.team2Name) ?? 0) + 1;
      (upper[round - 1] ??= []).push(m);
      upperRound.set(m.team1Name, round);
      upperRound.set(m.team2Name, round);
    } else {
      const round = Math.max(lowerRound.get(m.team1Name) ?? 0, lowerRound.get(m.team2Name) ?? 0) + 1;
      (lower[round - 1] ??= []).push(m);
      lowerRound.set(m.team1Name, round);
      lowerRound.set(m.team2Name, round);
    }

    if (m.winner) {
      const loser = m.winner === m.team1Name ? m.team2Name : m.team1Name;
      losses.set(loser, (losses.get(loser) ?? 0) + 1);
    }
  });

  if (grandFinal.length === 0 || upper.some((r) => !r) || lower.some((r) => !r)) complete = false;
  return { upper, lower, grandFinal, complete };
}

/** Splits group-stage series into groups (teams that played each other) with a W-L table for each. */
export function buildGroups(matches: MatchListEntry[]): Group[] {
  const parent = new Map<string, string>();
  const find = (t: string): string => {
    if (!parent.has(t)) parent.set(t, t);
    const p = parent.get(t)!;
    if (p === t) return t;
    const root = find(p);
    parent.set(t, root);
    return root;
  };
  for (const m of matches) parent.set(find(m.team1Name), find(m.team2Name));

  const byRoot = new Map<string, MatchListEntry[]>();
  for (const m of matches) {
    const root = find(m.team1Name);
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root)!.push(m);
  }

  return [...byRoot.values()].map((groupMatches, i) => {
    const table = new Map<string, GroupStanding>();
    const row = (team: string) => {
      if (!table.has(team)) table.set(team, { teamName: team, seriesWon: 0, seriesLost: 0, mapsWon: 0, mapsLost: 0 });
      return table.get(team)!;
    };
    const bracketMatches = groupMatches.map((m, j) => toBracketMatch(m, groupMatches.slice(j + 1)));
    for (const m of bracketMatches) {
      const r1 = row(m.team1Name);
      const r2 = row(m.team2Name);
      r1.mapsWon += m.team1Score;
      r1.mapsLost += m.team2Score;
      r2.mapsWon += m.team2Score;
      r2.mapsLost += m.team1Score;
      if (m.winner === m.team1Name) {
        r1.seriesWon++;
        r2.seriesLost++;
      } else if (m.winner === m.team2Name) {
        r2.seriesWon++;
        r1.seriesLost++;
      }
    }
    const standings = [...table.values()].sort(
      (a, b) =>
        b.seriesWon - a.seriesWon ||
        a.seriesLost - b.seriesLost ||
        b.mapsWon - b.mapsLost - (a.mapsWon - a.mapsLost) ||
        a.teamName.localeCompare(b.teamName)
    );
    return { name: `Group ${String.fromCharCode(65 + i)}`, standings, matches: bracketMatches };
  });
}

export function buildEventBracket(eventType: string, matches: MatchListEntry[]): EventBracket {
  const ordered = [...matches].sort((a, b) => a.seriesLabel.localeCompare(b.seriesLabel));
  if (!ordered.length) return { groups: [], playoffs: null };

  const hasGroupStage = (eventType === 'Elite' || eventType === 'Champs') && ordered.length > PLAYOFF_SERIES;
  const groupMatches = hasGroupStage ? ordered.slice(0, -PLAYOFF_SERIES) : [];
  const playoffMatches = hasGroupStage ? ordered.slice(-PLAYOFF_SERIES) : ordered;

  return { groups: buildGroups(groupMatches), playoffs: buildDoubleElim(playoffMatches) };
}
