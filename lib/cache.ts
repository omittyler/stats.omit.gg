import { unstable_cache } from 'next/cache';

/**
 * Added 2026-10-05 when the site ran on Vercel and rendered every page per
 * visit (that used up Vercel's free CPU allowance). Since the move to a static
 * export (PROJECT.md §10) pages are only rendered during `next build`, where
 * this still matters: a build prerenders thousands of pages, and sharing each
 * loader's result between them avoids re-running every Supabase query and
 * re-parsing the Full Season CSVs for each page. The revalidate window is
 * irrelevant to the exported files - they only change on the next build.
 */
export const STATS_CACHE_SECONDS = 600;

/**
 * Wraps a data loader so its result is shared across requests (keyed by
 * `key` plus its JSON-stringified arguments) and rebuilt at most once every
 * STATS_CACHE_SECONDS. Results go through JSON, so loaders must return plain
 * data - Maps are cached as entry arrays by the callers that need them.
 * Skipped under `next dev` so a fresh `npm run seed` shows up immediately in a
 * local preview.
 */
export function cached<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>) {
  if (process.env.NODE_ENV === 'development') return fn;
  return unstable_cache(fn, [key], { revalidate: STATS_CACHE_SECONDS, tags: ['stats'] });
}
