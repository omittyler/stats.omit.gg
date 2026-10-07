import Link from 'next/link';
import { GAMES, gameHref, type GameValue } from '@/lib/season';

/**
 * The BO7/MW4 toggle used on every page that needs one (standings, players,
 * teams, home, team/player detail, events). Plain `<Link>`s to the same page
 * prebuilt for each game (`/standings` vs `/mw4/standings`, see gameHref) -
 * the site is a static export, so there's no server to re-read a `?game=`
 * query. `.table-filter-row a` (app/globals.css) makes these look identical
 * to the existing client-side button filters (region, etc.) elsewhere on
 * these same pages.
 */
export function GameFilterLinks({ basePath, selected }: { basePath: string; selected: GameValue }) {
  return (
    <div className="table-filter-row">
      {GAMES.map((g) => (
        <Link
          key={g.slug}
          href={gameHref(basePath, g.value)}
          className={selected === g.value ? 'active' : ''}
        >
          {g.short}
        </Link>
      ))}
    </div>
  );
}
