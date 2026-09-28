import { getEnrichedPlacements, type EnrichedPlacement } from './standings';
import { getAllMatches, type MatchListEntry } from './matches';
import { CURRENT_GAME, gameSlug, type GameValue } from './season';

export type EventSummary = {
  eventName: string;
  eventType: string;
  eventDate: string | null;
  region: string;
  teamCount: number;
  matchCount: number;
  totalPrize: number;
  winner: string | null;
  topPlacements: { teamName: string; placementMin: number; placementMax: number }[];
};

export type EventDetail = EventSummary & {
  placements: EnrichedPlacement[];
  matches: MatchListEntry[];
};

// Same composite key used everywhere else an event is grouped (MatchesList,
// PlayerEventsTable): Cup shares one name across regions with region as a
// separate column, so eventName alone isn't unique.
function eventKey(eventName: string, region: string) {
  return `${eventName}|${region}`;
}

/** Link to an event's detail page - region only when set (Majors/Champs have none). */
export function eventHref(event: { eventName: string; region: string }, game: GameValue) {
  const params = new URLSearchParams({ game: gameSlug(game) });
  if (event.region) params.set('region', event.region);
  return `/events/${encodeURIComponent(event.eventName)}?${params.toString()}`;
}

function summarize(placements: EnrichedPlacement[], matchCount: number): EventSummary {
  const sorted = [...placements].sort((a, b) => a.placementMin - b.placementMin);
  const first = sorted[0];
  return {
    eventName: first.eventName,
    eventType: first.eventType,
    eventDate: first.eventDate,
    region: first.region,
    teamCount: sorted.length,
    matchCount,
    totalPrize: sorted.reduce((sum, p) => sum + p.prizeUsd, 0),
    winner: sorted.find((p) => p.placementMin === 1)?.teamName ?? null,
    topPlacements: sorted.slice(0, 3).map((p) => ({
      teamName: p.teamName,
      placementMin: p.placementMin,
      placementMax: p.placementMax,
    })),
  };
}

/**
 * Every event this season (one entry per event + region, built from
 * placements so it inherits getEnrichedPlacements' AP/LATAM and pickup-team
 * scoping), newest first. Powers the /events list page.
 */
export async function getEvents(game: string = CURRENT_GAME): Promise<EventSummary[]> {
  const [placements, matches] = await Promise.all([getEnrichedPlacements(game), getAllMatches()]);

  const matchCounts = new Map<string, number>();
  for (const m of matches) {
    if (m.game !== game) continue;
    const key = eventKey(m.eventName, m.region);
    matchCounts.set(key, (matchCounts.get(key) ?? 0) + 1);
  }

  const groups = new Map<string, EnrichedPlacement[]>();
  for (const p of placements) {
    const key = eventKey(p.eventName, p.region);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return [...groups.entries()]
    .map(([key, rows]) => summarize(rows, matchCounts.get(key) ?? 0))
    .sort(
      (a, b) =>
        (b.eventDate ?? '').localeCompare(a.eventDate ?? '') ||
        a.eventName.localeCompare(b.eventName) ||
        a.region.localeCompare(b.region)
    );
}

/** One event's full results (every placement) plus its matches, for /events/[name]. */
export async function getEventDetail(
  eventName: string,
  region: string,
  game: string = CURRENT_GAME
): Promise<EventDetail | null> {
  const [placements, matches] = await Promise.all([getEnrichedPlacements(game), getAllMatches()]);

  const eventPlacements = placements
    .filter((p) => p.eventName === eventName && p.region === region)
    .sort((a, b) => a.placementMin - b.placementMin || a.teamName.localeCompare(b.teamName));
  if (!eventPlacements.length) return null;

  const eventMatches = matches.filter(
    (m) => m.game === game && m.eventName === eventName && m.region === region
  );

  return {
    ...summarize(eventPlacements, eventMatches.length),
    placements: eventPlacements,
    matches: eventMatches,
  };
}
