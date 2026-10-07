import { PREFIXED_GAME_SLUGS } from '@/lib/season';

/**
 * Every game except CURRENT_GAME is prebuilt under its slug (`/mw4/standings`,
 * see gameHref in lib/season.ts). Pages in here re-export the plain-path page
 * of the same name, which reads the `game` param.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_GAME_SLUGS.map((game) => ({ game }));
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
