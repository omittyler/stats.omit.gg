import { GAMES, parseGameSlug } from './season';
import { getEnrichedPlacements } from './standings';
import { getEvents } from './events';
import { hasBracket } from './bracket';
import { getAllMatches } from './matches';
import { cdlTeamsForGame } from './officialCdlTeams';

/**
 * generateStaticParams sources for every dynamic page. The site is a static
 * export (`output: 'export'` in next.config.js, hosted on GitHub Pages), so a
 * page only exists if its params are listed here at build time - anything
 * else is a 404 until the next build. Each takes the parent route's params so
 * the same function serves both `/players/[name]` and `/[game]/players/[name]`.
 *
 * A static export refuses a dynamic route whose list comes back empty (e.g.
 * MW4 events before any MW4 data is seeded), so those get one placeholder
 * entry that renders the page's own "not found" message.
 */
export type ParentParams = { params?: Partial<Record<string, string>> };

const PLACEHOLDER = '_none';

function orPlaceholder<T>(list: T[], placeholder: T): T[] {
  return list.length ? list : [placeholder];
}

// Player/team pages render (with a placeholder for the season content) for
// anyone known in ANY game - see their "existsInAnyGame" handling - so every
// game's pages cover the same union of names.
async function allPlacements() {
  return (await Promise.all(GAMES.map((g) => getEnrichedPlacements(g.value)))).flat();
}

export async function playerParams(): Promise<{ name: string }[]> {
  const names = new Set((await allPlacements()).flatMap((p) => p.players));
  return orPlaceholder([...names].map((name) => ({ name })), { name: PLACEHOLDER });
}

export async function teamParams(): Promise<{ name: string }[]> {
  const names = new Set((await allPlacements()).map((p) => p.teamName));
  for (const g of GAMES) for (const t of cdlTeamsForGame(g.value)) names.add(t);
  return orPlaceholder([...names].map((name) => ({ name })), { name: PLACEHOLDER });
}

/** Events without a region (Majors/Champs) live at /events/[name]; the rest at /events/[name]/[region]. */
export async function eventParams(
  { params }: ParentParams,
  opts: { withRegion: boolean; bracketOnly?: boolean }
): Promise<{ name: string; region?: string }[]> {
  const events = (await getEvents(parseGameSlug(params?.game)))
    .filter((e) => Boolean(e.region) === opts.withRegion)
    .filter((e) => !opts.bracketOnly || hasBracket(e));
  const list = events.map((e) => (opts.withRegion ? { name: e.eventName, region: e.region } : { name: e.eventName }));
  return orPlaceholder(list, opts.withRegion ? { name: PLACEHOLDER, region: PLACEHOLDER } : { name: PLACEHOLDER });
}

export async function matchParams(): Promise<{ series: string }[]> {
  const series = new Set((await getAllMatches()).map((m) => m.seriesLabel));
  return orPlaceholder([...series].map((s) => ({ series: s })), { series: PLACEHOLDER });
}
