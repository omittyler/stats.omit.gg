import type { MatchListEntry } from './matches';

export type BracketMatch = {
  seriesLabel: string;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  winner: string | null;
  /** False for results entered from a supplied bracket with no tracked series behind them (no match page to link to). */
  linked: boolean;
};

export type DoubleElimBracket = {
  upper: BracketMatch[][]; // upper[0] = winners round 1
  lower: BracketMatch[][]; // lower[0] = losers round 1
  grandFinal: BracketMatch[]; // 2 entries when there was a bracket reset
  /** [from, to] series labels: each match to the next match its winner played, for the connector lines. */
  edges: [string, string][];
  /** False when the tracked series don't form a clean double-elimination bracket. */
  complete: boolean;
  /** Single-elimination playoff (`upper` holds every round, `lower`/`grandFinal` are empty). */
  singleElim?: boolean;
  thirdPlace?: BracketMatch;
};

export type GroupStanding = { teamName: string; seriesWon: number; seriesLost: number; mapsWon: number; mapsLost: number };
export type Group = { name: string; standings: GroupStanding[] };

export type EventBracket = {
  groups: Group[];
  playoffs: DoubleElimBracket;
};

type BracketFormat = {
  /** Series in the final bracket stage - always the event's last N series. */
  playoffSeries: number;
  /** Show the earlier series as a group stage (a series/map W-L table per group). */
  groupStage: boolean;
  /** Official series scores (team1, team2) for series whose map data is missing or incomplete, from the supplied bracket. */
  scoreOverrides?: Record<string, [number, number]>;
  /**
   * Official group tables as supplied (our team names), shown instead of tables
   * computed from our matches - our group-stage data is missing some series
   * and maps, and the official tiebreakers can't be derived from it.
   */
  groupTables?: GroupStanding[][];
  /** Group-stage results per group from a supplied bracket, for events with no tracked group series; tables are computed from these. */
  groupResults?: [string, number, string, number][][];
  /**
   * Matches per round copied from the supplied bracket, used instead of
   * working rounds out from series order: a series label, or - for events
   * with no tracked series - the result itself [team1, score1, team2, score2].
   */
  layout?: BracketLayout;
};

type LayoutEntry = string | [string, number, string, number];
type BracketLayout = {
  upper: LayoutEntry[][];
  lower: LayoutEntry[][];
  grandFinal: LayoutEntry[];
  /** Single-elimination playoff: every round goes in `upper`; `lower` and `grandFinal` stay empty. */
  singleElim?: boolean;
  thirdPlace?: LayoutEntry;
};

// Only events the user has supplied an official bracket for get a View
// Bracket button (per user 2026-09-28) - every other event's tracked
// matches are partial or don't line up, so a drawn bracket would be a guess.
// Keyed `${eventName}|${region}`. Champs (screenshots supplied 2026-09-28):
// 4 GSL groups of 4 (20 series) then an 8-team double-elim bracket stage
// (14 series); every series was checked against those screenshots. NA Elite
// Stages 1-3 (screenshots supplied 2026-09-29): only the 8-team bracket
// stage was supplied, so their round-robin group stages aren't shown.
const row = (teamName: string, seriesWon: number, seriesLost: number, mapsWon: number, mapsLost: number): GroupStanding => ({
  teamName,
  seriesWon,
  seriesLost,
  mapsWon,
  mapsLost,
});

const SUPPLIED_BRACKETS: Record<string, BracketFormat> = {
  '2026 Champs - Challengers Finals|': {
    playoffSeries: 14,
    groupStage: true,
    // Decimate Gaming vs Treaty 1 Gaming (Group C losers' match) has no map data.
    scoreOverrides: { SR742: [0, 3] },
  },
  '2026 NA Elite Stage 1|NA': {
    playoffSeries: 14,
    groupStage: true,
    groupTables: [
      [
        row('FiveFears', 3, 2, 12, 10),
        row('Telluride Bush Gaming', 3, 2, 13, 8),
        row('For Fun Black', 3, 2, 10, 10),
        row('OMiT Brooklyn', 3, 2, 11, 7),
        row('High Treason', 2, 3, 7, 10),
        row('NexT Threat Black', 1, 4, 6, 14),
      ],
      [
        row('Project Notorious', 5, 0, 15, 2),
        row('Huntsmen', 4, 1, 12, 6),
        row('Falcons Academy Green', 3, 2, 13, 7),
        row('Falcons Academy White', 2, 3, 8, 11),
        row('CABAL Gaming', 1, 4, 5, 13),
        row('Stallions Black', 0, 5, 1, 15),
      ],
    ],
    // Falcons Academy White vs Huntsmen (Losers Round 1) is missing a map; official result 3-1.
    scoreOverrides: { SR142: [3, 1] },
  },
  '2026 NA Elite Stage 2|NA': {
    playoffSeries: 14,
    groupStage: true,
    groupTables: [
      [
        row('Telluride Bush Gaming', 4, 1, 12, 7),
        row('OMiT Brooklyn', 4, 1, 13, 7),
        row('Death By CABAL', 3, 2, 11, 7),
        row('Falcons Academy Green', 3, 2, 12, 8),
        row('CABAL Gaming', 1, 4, 6, 12),
        row('FriesInTheBag', 0, 5, 2, 15),
      ],
      [
        row('Project Notorious', 5, 0, 15, 4),
        row('For Fun and FeLo', 3, 2, 9, 11),
        row('For Fun Esports', 2, 3, 12, 10),
        row('FaZe Falcons', 2, 3, 7, 11),
        row('Stallions Black', 2, 3, 8, 11),
        row('Huntsmen', 1, 4, 10, 14),
      ],
    ],
    // Series numbers aren't in play order here (OMiT Brooklyn's Losers Round 3
    // is SR358 but its Losers Round 2 is SR359), so rounds come from the
    // supplied bracket, in its order.
    layout: {
      upper: [['SR345', 'SR344', 'SR346', 'SR347'], ['SR351', 'SR350'], ['SR357']],
      lower: [['SR348', 'SR349'], ['SR359', 'SR356'], ['SR358'], ['SR361']],
      grandFinal: ['SR363'],
    },
  },
  // No series were tracked for Stage 4 at all, so its bracket stage is the
  // supplied bracket's results as-is (boxes don't link to a match page), and
  // its group tables are the supplied ones.
  '2026 NA Elite Stage 4|NA': {
    playoffSeries: 0,
    groupStage: true,
    groupTables: [
      [
        row('CABAL Gaming', 5, 0, 15, 6),
        row('Telluride Bush Gaming', 4, 1, 14, 8),
        row('OMiT Brooklyn', 3, 2, 12, 8),
        row('Stallions Bush', 2, 3, 7, 11),
        row('Torn Esports', 1, 4, 6, 13),
        row('Stallions', 0, 5, 7, 15),
      ],
      [
        row('Huntsmen', 4, 1, 14, 8),
        row('Project Notorious', 4, 1, 14, 7),
        row('BitterSweet', 3, 2, 11, 8),
        row('Falcons Academy Green', 2, 3, 10, 10),
        row('OMNiA Gaming', 2, 3, 9, 13),
        row('OT Nation', 0, 5, 3, 15),
      ],
    ],
    layout: {
      upper: [
        [
          ['CABAL Gaming', 3, 'Falcons Academy Green', 2],
          ['Project Notorious', 1, 'OMiT Brooklyn', 3],
          ['Huntsmen', 3, 'Stallions Bush', 2],
          ['Telluride Bush Gaming', 3, 'BitterSweet', 1],
        ],
        [
          ['CABAL Gaming', 3, 'OMiT Brooklyn', 1],
          ['Huntsmen', 0, 'Telluride Bush Gaming', 3],
        ],
        [['CABAL Gaming', 2, 'Telluride Bush Gaming', 3]],
      ],
      lower: [
        [
          ['Falcons Academy Green', 3, 'Project Notorious', 1],
          ['Stallions Bush', 1, 'BitterSweet', 3],
        ],
        [
          ['Huntsmen', 3, 'Falcons Academy Green', 0],
          ['OMiT Brooklyn', 2, 'BitterSweet', 3],
        ],
        [['Huntsmen', 3, 'BitterSweet', 1]],
        [['CABAL Gaming', 3, 'Huntsmen', 2]],
      ],
      grandFinal: [['Telluride Bush Gaming', 4, 'CABAL Gaming', 1]],
    },
  },  '2026 EU Elite Stage 1|EU': {
    playoffSeries: 14,
    groupStage: true,
    groupTables: [
      [
        row('Clutch Rayn', 5, 0, 15, 4),
        row('Dark Horse Esports', 4, 1, 14, 7),
        row('Treaty 1 Gaming', 3, 2, 10, 9),
        row('Night Vibes', 2, 3, 9, 11),
        row('Lewtees Lions', 1, 4, 7, 14),
        row('Rauzan Esport', 0, 5, 5, 15),
      ],
      [
        row('ROC Esports', 5, 0, 15, 7),
        row('Synes', 4, 1, 13, 7),
        row('Project 7', 3, 2, 12, 8),
        row('Hybrid Nations', 2, 3, 9, 11),
        row('Light Unlimited', 1, 4, 7, 13),
        row('Los Lentejas', 0, 5, 5, 15),
      ],
    ],
  },
  '2026 EU Elite Stage 2|EU': {
    playoffSeries: 14,
    groupStage: true,
    // SR352 (Losers Round 2) used to read For Fun EU 3-1 Orgless - flipped in
    // the source, fixed in the database 2026-09-29 (FLIPPED_SERIES in
    // seed-match-maps.js). LR3 and the Grand Final are a map short. Rounds are
    // laid out from the supplied bracket.
    scoreOverrides: { SR355: [2, 3], SR362: [4, 1] },
    layout: {
      upper: [['SR337', 'SR336', 'SR338', 'SR339'], ['SR342', 'SR343'], ['SR354']],
      lower: [['SR340', 'SR341'], ['SR352', 'SR353'], ['SR355'], ['SR360']],
      grandFinal: ['SR362'],
    },
    groupTables: [
      [
        row('ROC Esports', 5, 0, 15, 4),
        row('For Fun EU', 3, 2, 11, 8),
        row('ABLE Esports', 3, 2, 10, 8),
        row('Majin Club', 2, 3, 7, 12),
        row('The Vicious', 1, 4, 7, 12),
        row('R8 Esports', 1, 4, 7, 13),
      ],
      [
        row('Project 7', 5, 0, 15, 3),
        row('Orgless (EU S2)', 4, 1, 13, 7),
        row('Decimate Gaming', 3, 2, 12, 10),
        row('Treaty 1 Gaming', 2, 3, 9, 13),
        row('Vitalize Esports', 1, 4, 7, 13),
        row('Avently', 0, 5, 5, 15),
      ],
    ],
  },
  '2026 EU Elite Stage 3|EU': {
    playoffSeries: 14,
    groupStage: true,
    // Group B in our data is well off the official table (NAJD, Exceptional,
    // Treaty 1 and NOA all differ), so the supplied tables are used.
    groupTables: [
      [
        row('OMiT', 5, 0, 15, 3),
        row('OMNiA Invicta', 3, 2, 12, 7),
        row('ROC Esports', 3, 2, 10, 9),
        row('Hybrid Nations', 2, 3, 9, 12),
        row('Team Lin', 1, 4, 5, 12),
        row('Decimate Gaming', 1, 4, 6, 14),
      ],
      [
        row('Project 7', 5, 0, 15, 2),
        row('NAJD', 3, 2, 10, 9),
        row('Exceptional Gaming', 2, 3, 8, 11),
        row('Treaty 1 Gaming', 2, 3, 8, 10),
        row('The Vicious', 2, 3, 8, 12),
        row('NOA', 1, 4, 8, 13),
      ],
    ],
  },
  // No series tracked for EU Stage 4 either - results from the supplied
  // bracket. LTL / LewTee's Lads = "Orgless (EU S4)" in our placings.
  '2026 EU Elite Stage 4|EU': {
    playoffSeries: 0,
    groupStage: true,
    layout: {
      upper: [
        [
          ['ROC Esports', 3, 'BTD Esports', 2],
          ['Project 7', 3, 'Exceptional Gaming', 2],
          ['OMiT', 3, 'Team France', 0],
          ['ASK Esport', 3, 'Orgless (EU S4)', 0],
        ],
        [
          ['ROC Esports', 0, 'Project 7', 3],
          ['OMiT', 3, 'ASK Esport', 0],
        ],
        [['Project 7', 3, 'OMiT', 2]],
      ],
      lower: [
        [
          ['BTD Esports', 0, 'Exceptional Gaming', 3],
          ['Team France', 3, 'Orgless (EU S4)', 0],
        ],
        [
          ['ASK Esport', 2, 'Exceptional Gaming', 3],
          ['ROC Esports', 3, 'Team France', 2],
        ],
        [['Exceptional Gaming', 3, 'ROC Esports', 0]],
        [['OMiT', 3, 'Exceptional Gaming', 0]],
      ],
      grandFinal: [['Project 7', 0, 'OMiT', 4]],
    },
    groupTables: [
      [
        row('ROC Esports', 4, 1, 13, 5),
        row('ASK Esport', 4, 1, 13, 10),
        row('Exceptional Gaming', 3, 2, 11, 11),
        row('Team France', 2, 3, 11, 10),
        row('The Atlas Lions', 1, 4, 6, 13),
        row('ROC Ascension', 1, 4, 8, 13),
      ],
      [
        row('OMiT', 5, 0, 15, 1),
        row('Project 7', 3, 2, 11, 6),
        row('Orgless (EU S4)', 3, 2, 9, 8),
        row('BTD Esports', 2, 3, 7, 10),
        row('Treaty 1 Gaming', 2, 3, 8, 10),
        row('Team Lin', 0, 5, 0, 15),
      ],
    ],
  },
  // Esports World Cup (exhibition; supplied 2026-09-29): no series tracked.
  // Two 8-team double-elimination groups (4 advance from each), then a
  // single-elimination playoff with a 3rd-place match. Screenshot
  // abbreviations checked against the EWC placings.
  '2026 Esports World Cup|': {
    playoffSeries: 0,
    groupStage: true,
    groupResults: [
      [
        ['FaZe Vegas', 3, 'The Pit EU', 0],
        ['Toronto KOI', 3, 'Carolina Royal Ravens', 0],
        ['G2 Minnesota', 3, 'Cloud9 New York', 0],
        ['Paris Gentle Mates', 3, 'OMiT', 0],
        ['FaZe Vegas', 3, 'Toronto KOI', 1],
        ['G2 Minnesota', 3, 'Paris Gentle Mates', 0],
        ['The Pit EU', 3, 'Carolina Royal Ravens', 2],
        ['Cloud9 New York', 3, 'OMiT', 1],
        ['Paris Gentle Mates', 3, 'The Pit EU', 1],
        ['Toronto KOI', 3, 'Cloud9 New York', 1],
      ],
      [
        ['OpTic Texas', 3, 'Team WaR', 1],
        ['Los Angeles Thieves', 3, 'Boston Breach', 0],
        ['Miami Heretics', 3, 'Vancouver Surge', 1],
        ['Riyadh Falcons', 3, 'Project Notorious', 1],
        ['OpTic Texas', 2, 'Los Angeles Thieves', 3],
        ['Miami Heretics', 1, 'Riyadh Falcons', 3],
        ['Team WaR', 3, 'Boston Breach', 0],
        ['Vancouver Surge', 1, 'Project Notorious', 3],
        ['Miami Heretics', 3, 'Team WaR', 0],
        ['OpTic Texas', 3, 'Project Notorious', 0],
      ],
    ],
    layout: {
      singleElim: true,
      upper: [
        [
          ['G2 Minnesota', 3, 'Miami Heretics', 4],
          ['Riyadh Falcons', 4, 'Paris Gentle Mates', 3],
          ['Los Angeles Thieves', 4, 'Toronto KOI', 0],
          ['FaZe Vegas', 0, 'OpTic Texas', 4],
        ],
        [
          ['Miami Heretics', 4, 'Riyadh Falcons', 0],
          ['Los Angeles Thieves', 3, 'OpTic Texas', 4],
        ],
        [['Miami Heretics', 3, 'OpTic Texas', 5]],
      ],
      lower: [],
      grandFinal: [],
      thirdPlace: ['Riyadh Falcons', 3, 'Los Angeles Thieves', 4],
    },
  },  // Group stage tables supplied 2026-09-29 too.
  '2026 NA Elite Stage 3|NA': {
    playoffSeries: 14,
    groupStage: true,
    groupTables: [
      [
        row('Huntsmen', 5, 0, 15, 4),
        row('Stallions', 3, 2, 11, 8),
        row('For Fun Esports', 3, 2, 12, 10),
        row('Torn Esports', 2, 3, 8, 13),
        row('BitterSweet', 1, 4, 9, 14),
        row('Team Orchid', 1, 4, 7, 13),
      ],
      [
        row('Project Notorious', 4, 1, 14, 3),
        row('FaZe Falcons', 3, 2, 13, 10),
        row('OMiT Brooklyn', 3, 2, 11, 8),
        row('CABAL Gaming', 2, 3, 8, 13),
        row('Telluride Bush Gaming', 2, 3, 9, 11),
        row('Out The Mud', 1, 4, 3, 13),
      ],
    ],
  },
};

export function hasBracket(event: { eventName: string; region: string }): boolean {
  return `${event.eventName}|${event.region}` in SUPPLIED_BRACKETS;
}

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
    linked: true,
  };
}

/**
 * Rebuilds a double-elimination bracket from series in play order. The data
 * has no round column, so each series is placed by its teams' records going
 * in: both unbeaten = winners bracket, both with one loss = losers bracket,
 * one of each = grand final. Round number = one past the latest round either
 * team has already played on that side, which reproduces the standard
 * layout (a winners-bracket loser drops in against the losers-bracket
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

  if (grandFinal.length === 0) complete = false;

  const edges = bracketEdges(upper, lower, grandFinal);

  // Order each round by where its winners go next (working back from the
  // final round), so the connector lines don't cross - same layout as the
  // official bracket.
  const target = new Map(edges);
  for (const rounds of [upper, lower]) {
    for (let r = rounds.length - 2; r >= 0; r--) {
      const nextRound = rounds[r + 1].map((m) => m.seriesLabel);
      const pos = (m: BracketMatch) => {
        const i = nextRound.indexOf(target.get(m.seriesLabel) ?? '');
        return i === -1 ? nextRound.length : i;
      };
      rounds[r] = [...rounds[r]].sort((a, b) => pos(a) - pos(b));
    }
  }

  return { upper, lower, grandFinal, edges, complete };
}

/**
 * [from, to] for the connector lines: each match to the match its winner
 * played in the next round on the same side, with each side's final feeding
 * the grand final. Follows the bracket's rounds rather than series numbers,
 * which aren't always in play order.
 */
function bracketEdges(upper: BracketMatch[][], lower: BracketMatch[][], grandFinal: BracketMatch[]): [string, string][] {
  const has = (m: BracketMatch | undefined, team: string | null) =>
    !!m && !!team && (m.team1Name === team || m.team2Name === team);
  const edges: [string, string][] = [];
  for (const rounds of [upper, lower]) {
    rounds.forEach((round, r) => {
      for (const m of round) {
        const next =
          r < rounds.length - 1 ? rounds[r + 1].find((n) => has(n, m.winner)) : has(grandFinal[0], m.winner) ? grandFinal[0] : undefined;
        if (next) edges.push([m.seriesLabel, next.seriesLabel]);
      }
    });
  }
  if (grandFinal.length > 1 && has(grandFinal[1], grandFinal[0].winner)) {
    edges.push([grandFinal[0].seriesLabel, grandFinal[1].seriesLabel]);
  }
  return edges;
}

/** A bracket laid out exactly as given, for events whose series aren't in play order or weren't tracked at all. */
function buildFromLayout(matches: MatchListEntry[], layout: BracketLayout): DoubleElimBracket {
  const bySeries = new Map(matches.map((m) => [m.seriesLabel, m]));
  let complete = true;
  let manual = 0;
  const pick = (entries: LayoutEntry[]) =>
    entries.flatMap((entry) => {
      if (typeof entry !== 'string') {
        const [team1Name, team1Score, team2Name, team2Score] = entry;
        const winner = team1Score > team2Score ? team1Name : team2Name;
        return [{ seriesLabel: `manual-${manual++}`, team1Name, team2Name, team1Score, team2Score, winner, linked: false }];
      }
      const label = entry;
      const m = bySeries.get(label);
      if (!m) {
        complete = false;
        return [];
      }
      const bm = toBracketMatch(m, []);
      if (!bm.winner) complete = false;
      return [bm];
    });
  const upper = layout.upper.map(pick);
  const lower = layout.lower.map(pick);
  const grandFinal = pick(layout.grandFinal);
  const thirdPlace = layout.thirdPlace ? pick([layout.thirdPlace])[0] : undefined;
  return {
    upper,
    lower,
    grandFinal,
    edges: bracketEdges(upper, lower, grandFinal),
    complete,
    singleElim: layout.singleElim,
    thirdPlace,
  };
}

/** Splits group-stage series into groups (teams that played each other), in order of each group's first series. */
function splitGroups(matches: MatchListEntry[]): MatchListEntry[][] {
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
  return [...byRoot.values()];
}

/** Series and map W-L per team, best record first (series, then map difference). */
function groupStandings(matches: MatchListEntry[]): GroupStanding[] {
  const table = new Map<string, GroupStanding>();
  const row = (team: string) => {
    if (!table.has(team)) table.set(team, { teamName: team, seriesWon: 0, seriesLost: 0, mapsWon: 0, mapsLost: 0 });
    return table.get(team)!;
  };
  matches.forEach((raw, i) => {
    const m = toBracketMatch(raw, matches.slice(i + 1));
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
  });
  return [...table.values()].sort(
    (a, b) =>
      b.seriesWon - a.seriesWon ||
      a.seriesLost - b.seriesLost ||
      b.mapsWon - b.mapsLost - (a.mapsWon - a.mapsLost) ||
      a.teamName.localeCompare(b.teamName)
  );
}

/** null when the event has no supplied bracket (see SUPPLIED_BRACKETS). */
export function buildEventBracket(
  event: { eventName: string; region: string },
  matches: MatchListEntry[]
): EventBracket | null {
  const format = SUPPLIED_BRACKETS[`${event.eventName}|${event.region}`];
  if (!format) return null;

  const ordered = [...matches]
    .sort((a, b) => a.seriesLabel.localeCompare(b.seriesLabel))
    .map((m) => {
      const override = format.scoreOverrides?.[m.seriesLabel];
      return override ? { ...m, team1Score: override[0], team2Score: override[1] } : m;
    });
  const layoutSeries = new Set(
    (format.layout ? [...format.layout.upper.flat(), ...format.layout.lower.flat(), ...format.layout.grandFinal] : []).filter(
      (e): e is string => typeof e === 'string'
    )
  );
  const groupMatches = format.layout
    ? ordered.filter((m) => !layoutSeries.has(m.seriesLabel))
    : ordered.slice(0, -format.playoffSeries);
  const playoffMatches = ordered.slice(-format.playoffSeries);

  const groupName = (i: number) => `Group ${String.fromCharCode(65 + i)}`;
  const groups = !format.groupStage
    ? []
    : format.groupTables
      ? format.groupTables.map((standings, i) => ({ name: groupName(i), standings }))
      : format.groupResults
        ? format.groupResults.map((results, i) => ({
            name: groupName(i),
            standings: groupStandings(
              results.map(([team1Name, team1Score, team2Name, team2Score]) => ({ team1Name, team1Score, team2Name, team2Score }) as MatchListEntry)
            ),
          }))
        : splitGroups(groupMatches).map((g, i) => ({ name: groupName(i), standings: groupStandings(g) }));

  return { groups, playoffs: format.layout ? buildFromLayout(ordered, format.layout) : buildDoubleElim(playoffMatches) };
}
