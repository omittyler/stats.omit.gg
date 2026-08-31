'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import type { EventStatsSummary } from '@/lib/standings';

export type PlayerEventRow = {
  eventName: string;
  region: string;
  teamName: string;
  placementMin: number;
  placementMax: number;
  points: number;
};

function formatPlacement(min: number, max: number) {
  return min === max ? `${min}` : `${min}-${max}`;
}

function formatKd(k: number | null, d: number | null, kd: number | null) {
  if (kd !== null) return kd.toFixed(2);
  if (k !== null && d !== null && d > 0) return (k / d).toFixed(2);
  return '-';
}

function StatDetail({ stats }: { stats: EventStatsSummary }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: '12px 4px' }}>
      <div>
        <strong>Overall</strong>
        <div className="note">
          K: {stats.overallK ?? '-'} · D: {stats.overallD ?? '-'} · K/D:{' '}
          {formatKd(stats.overallK, stats.overallD, stats.overallKd)} · DMG:{' '}
          {stats.overallDmg?.toLocaleString() ?? '-'} · Slayer Rating:{' '}
          {stats.overallSlayerRating?.toFixed(2) ?? '-'}
        </div>
      </div>
      {(stats.hpMaps ?? 0) > 0 && (
        <div>
          <strong>Hardpoint</strong>
          <div className="note">
            Maps: {stats.hpMaps} · K: {stats.hpK ?? '-'} · D: {stats.hpD ?? '-'} · K/D:{' '}
            {formatKd(stats.hpK, stats.hpD, stats.hpKd)}
          </div>
        </div>
      )}
      {(stats.sndMaps ?? 0) > 0 && (
        <div>
          <strong>Search &amp; Destroy</strong>
          <div className="note">
            Maps: {stats.sndMaps} · K: {stats.sndK ?? '-'} · D: {stats.sndD ?? '-'} · K/D:{' '}
            {formatKd(stats.sndK, stats.sndD, stats.sndKd)}
          </div>
        </div>
      )}
      {(stats.ovlMaps ?? 0) > 0 && (
        <div>
          <strong>Overload</strong>
          <div className="note">
            Maps: {stats.ovlMaps} · K: {stats.ovlK ?? '-'} · D: {stats.ovlD ?? '-'} · K/D:{' '}
            {formatKd(stats.ovlK, stats.ovlD, stats.ovlKd)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayerEventsTable({
  history,
  statsByEvent,
}: {
  history: PlayerEventRow[];
  statsByEvent: Record<string, EventStatsSummary>;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <table>
      <thead>
        <tr>
          <th>Event</th>
          <th>Team</th>
          <th>Placement</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {history.map((h, i) => {
          const key = `${h.eventName}|${h.region}`;
          const stats = statsByEvent[key];
          const isOpen = expanded === i;
          return (
            <Fragment key={i}>
              <tr onClick={() => setExpanded(isOpen ? null : i)} style={{ cursor: 'pointer' }}>
                <td>{h.eventName}</td>
                <td>
                  <Link
                    href={`/teams/${encodeURIComponent(h.teamName)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {h.teamName}
                  </Link>
                </td>
                <td>{formatPlacement(h.placementMin, h.placementMax)}</td>
                <td>{h.points.toLocaleString()}</td>
              </tr>
              {isOpen && (
                <tr>
                  <td colSpan={4} style={{ background: 'var(--bg)' }}>
                    {stats ? (
                      <StatDetail stats={stats} />
                    ) : (
                      <p className="note" style={{ padding: '8px 4px' }}>
                        Currently no player statistics available.
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
