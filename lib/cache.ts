import { unstable_cache } from 'next/cache';

/**
 * How long (seconds) a cached result is reused before it is rebuilt from
 * Supabase / the data files. Every page reads `?game=` so every page renders
 * on request; without this, each visit re-ran every query, re-parsed the
 * Full Season CSVs and recomputed standings, which used up Vercel's free
 * Fluid Active CPU allowance (4h/month) by 2026-10-05. Data only changes when
 * someone re-seeds, so a few minutes of staleness costs nothing.
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
