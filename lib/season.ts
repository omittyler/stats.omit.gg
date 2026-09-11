/**
 * The site's supported games/seasons - the single place a page-level game
 * toggle reads its options from (see components/GameFilterLinks.tsx),
 * replacing what used to be a locally-hardcoded list in MatchesList.tsx.
 *
 * `slug` is what actually appears in a page's `?game=` URL - short and
 * decoupled from `value`/`label`, so those can change wording without
 * breaking any link. `value` is the exact string stored in `events.game` in
 * the DB (see scripts/seed/seed-events-and-placements.js's `GAME` constant).
 */
export const GAMES = [
  { slug: 'bo7', value: 'Black Ops 7', label: 'Black Ops 7 (2026 Season)', short: 'BO7' },
  { slug: 'mw4', value: 'Modern Warfare 4', label: 'Modern Warfare 4 (2027 Season)', short: 'MW4' },
] as const;

export type GameValue = (typeof GAMES)[number]['value'];

/**
 * The site's default/focused season - the one flip point for "make MW4 the
 * main focus" once real MW4 data is seeded (PROJECT.md - MW4 launch
 * checklist). Every page below defaults to this when no `?game=` is given;
 * BO7 stays fully viewable via the toggle either way.
 */
export const CURRENT_GAME: GameValue = 'Black Ops 7';

/** `?game=<slug>` (or anything unrecognized/missing) -> a real GameValue, defaulting to CURRENT_GAME. */
export function parseGameSlug(slug: string | string[] | undefined): GameValue {
  const found = GAMES.find((g) => g.slug === slug);
  return found ? found.value : CURRENT_GAME;
}

export function gameSlug(value: GameValue): string {
  return GAMES.find((g) => g.value === value)?.slug ?? GAMES[0].slug;
}
