import Link from 'next/link';
import { GAMES, type GameValue } from '@/lib/season';

/**
 * The BO7/MW4 toggle used on every page that needs one (standings, players,
 * teams, home, team/player detail). Plain server-rendered `<Link>`s to
 * `?game=<slug>` rather than client state - each linked page's own server
 * component re-reads `searchParams` and refetches with that game, same as
 * clicking any other in-app link. `.table-filter-row a` (app/globals.css)
 * makes these look identical to the existing client-side button filters
 * (region, etc.) elsewhere on these same pages.
 */
export function GameFilterLinks({
  basePath,
  selected,
  extraParams,
}: {
  basePath: string;
  selected: GameValue;
  extraParams?: Record<string, string>;
}) {
  return (
    <div className="table-filter-row">
      {GAMES.map((g) => {
        const params = new URLSearchParams({ ...extraParams, game: g.slug });
        return (
          <Link
            key={g.slug}
            href={`${basePath}?${params.toString()}`}
            className={selected === g.value ? 'active' : ''}
          >
            {g.short}
          </Link>
        );
      })}
    </div>
  );
}
