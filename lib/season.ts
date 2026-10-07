/**
 * The site's supported games/seasons - the single place a page-level game
 * toggle reads its options from (see components/GameFilterLinks.tsx),
 * replacing what used to be a locally-hardcoded list in MatchesList.tsx.
 *
 * `slug` is what actually appears in a non-current game's URL prefix
 * (`/mw4/standings`, see gameHref below) - short and
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
 * checklist). Pages at their plain path (`/standings`) show this game; every
 * other game lives under its slug (`/mw4/standings`), so BO7 stays fully
 * viewable via the toggle either way.
 */
export const CURRENT_GAME: GameValue = 'Black Ops 7';

/** A `[game]` route param (or anything unrecognized/missing) -> a real GameValue, defaulting to CURRENT_GAME. */
export function parseGameSlug(slug: string | string[] | undefined): GameValue {
  const found = GAMES.find((g) => g.slug === slug);
  return found ? found.value : CURRENT_GAME;
}

export function gameSlug(value: GameValue): string {
  return GAMES.find((g) => g.value === value)?.slug ?? GAMES[0].slug;
}

/**
 * The site is a static export (GitHub Pages, PROJECT.md §10), so a game can't
 * be picked with `?game=` - every page is prebuilt once per game instead.
 * CURRENT_GAME keeps the plain path; any other game gets its slug as a
 * prefix (app/[game]/...). `path` is a site path starting with `/`.
 */
export function gameHref(path: string, game: GameValue): string {
  if (game === CURRENT_GAME) return path;
  return `/${gameSlug(game)}${path === '/' ? '' : path}`;
}

/** Slugs of the games that live under a `/<slug>` prefix (everything but CURRENT_GAME). */
export const PREFIXED_GAME_SLUGS: string[] = GAMES.filter((g) => g.value !== CURRENT_GAME).map((g) => g.slug);

/**
 * A dynamic route param back to its real name. Prebuilt params can arrive
 * either raw or still URL-encoded depending on how the page was reached, and
 * a raw name containing `%` would make a bare decodeURIComponent throw.
 */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
