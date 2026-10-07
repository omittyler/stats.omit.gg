'use client';

import { useEffect } from 'react';
import { GAMES, CURRENT_GAME, gameHref } from '@/lib/season';

/**
 * Before the static-export move (PROJECT.md §10), the game toggle and an
 * event's region lived in the query string (`/standings?game=mw4`,
 * `/events/<name>?region=NA`). GitHub Pages ignores query strings, so old
 * links would silently show the default view - this sends them to the
 * matching path-based page instead (`/mw4/standings`, `/events/<name>/NA`).
 */
export default function LegacyQueryRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameSlug = params.get('game');
    const region = params.get('region');
    if (!gameSlug && !region) return;

    let path = window.location.pathname.replace(/\/$/, '') || '/';
    if (region && path.startsWith('/events/')) {
      const bracket = path.endsWith('/bracket');
      const base = bracket ? path.slice(0, -'/bracket'.length) : path;
      path = `${base}/${encodeURIComponent(region)}${bracket ? '/bracket' : ''}`;
    }
    const game = GAMES.find((g) => g.slug === gameSlug)?.value ?? CURRENT_GAME;
    const target = gameHref(path, game);
    window.location.replace(target === '/' ? '/' : `${target}/`);
  }, []);
  return null;
}
