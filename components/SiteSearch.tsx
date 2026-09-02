'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchIndexPlayer } from '@/lib/standings';

const MAX_RESULTS_PER_GROUP = 6;

export default function SiteSearch({ teams, players }: { teams: string[]; players: SearchIndexPlayer[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const regions = [...new Set(players.map((p) => p.region || 'Other'))].sort();

  const q = query.trim().toLowerCase();
  const matchedTeams = q ? teams.filter((t) => t.toLowerCase().includes(q)).slice(0, MAX_RESULTS_PER_GROUP) : [];
  const matchedPlayers = q
    ? players
        .filter((p) => p.name.toLowerCase().includes(q))
        .filter((p) => regionFilter === 'all' || (p.region || 'Other') === regionFilter)
        .slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const hasResults = matchedTeams.length > 0 || matchedPlayers.length > 0;

  function goTo(type: 'teams' | 'players', name: string) {
    setQuery('');
    setOpen(false);
    router.push(`/${type}/${encodeURIComponent(name)}`);
  }

  return (
    <div className="site-search" ref={containerRef}>
      <input
        type="text"
        placeholder="Search players or teams..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && q && (
        <div className="site-search-results">
          {regions.length > 1 && (
            <div className="site-search-region-row">
              <button
                className={regionFilter === 'all' ? 'active' : ''}
                onClick={() => setRegionFilter('all')}
                type="button"
              >
                All
              </button>
              {regions.map((r) => (
                <button
                  key={r}
                  className={regionFilter === r ? 'active' : ''}
                  onClick={() => setRegionFilter(r)}
                  type="button"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          {hasResults ? (
            <>
              {matchedTeams.length > 0 && (
                <div className="site-search-group">
                  <div className="site-search-group-label">Teams</div>
                  {matchedTeams.map((t) => (
                    <button key={t} onClick={() => goTo('teams', t)}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {matchedPlayers.length > 0 && (
                <div className="site-search-group">
                  <div className="site-search-group-label">Players</div>
                  {matchedPlayers.map((p) => (
                    <button key={p.name} onClick={() => goTo('players', p.name)}>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="site-search-empty">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
