'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EventStatsSummary } from '@/lib/standings';
import type { TeamMatchSummary } from '@/lib/matches';
import { StatDetail } from './StatDetail';
import PlayerEventsTable, { type PlayerEventRow } from './PlayerEventsTable';

export default function PlayerStatsEventsTabs({
  seasonStats,
  history,
  statsByEvent,
  logos,
  recentMatches,
}: {
  seasonStats: EventStatsSummary | null;
  history: PlayerEventRow[];
  statsByEvent: Record<string, EventStatsSummary>;
  logos: Record<string, string>;
  recentMatches: TeamMatchSummary[];
}) {
  const [tab, setTab] = useState<'stats' | 'events' | 'matches'>('stats');

  return (
    <div>
      <div className="table-filter-row">
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
          Season Stats
        </button>
        <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>
          Events
        </button>
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>
          Latest Matches
        </button>
      </div>

      {tab === 'stats' && (
        <>
          <p className="note">Ranked against every other player&apos;s Black Ops 7 (BO7) full-season totals.</p>
          {seasonStats ? (
            <StatDetail stats={seasonStats} />
          ) : (
            <p className="note">Currently no player statistics available.</p>
          )}
        </>
      )}

      {tab === 'events' && (
        <>
          <p className="note">Click an event to see this player&apos;s stats from it, if available.</p>
          <PlayerEventsTable history={history} statsByEvent={statsByEvent} logos={logos} />
        </>
      )}

      {tab === 'matches' &&
        (recentMatches.length ? (
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Opponent</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {recentMatches.map((m) => (
                <tr key={m.seriesLabel}>
                  <td>{m.eventName}</td>
                  <td>
                    <Link href={`/teams/${encodeURIComponent(m.opponent)}`} className="match-opponent">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/teams/${logos[m.opponent] ?? 'Default.png'}`} alt="" width={20} height={20} />
                      {m.opponent}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/matches/${encodeURIComponent(m.seriesLabel)}`}
                      className={m.mapsWon > m.mapsLost ? 'match-result-win' : 'match-result-loss'}
                    >
                      {m.mapsWon > m.mapsLost ? 'W' : 'L'} {m.mapsWon} - {m.mapsLost}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="note">No match data available for this player.</p>
        ))}
    </div>
  );
}
