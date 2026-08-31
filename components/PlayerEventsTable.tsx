'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import type { EventStatsSummary } from '@/lib/standings';
import { StatDetail } from './StatDetail';

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
                      <p className="note" style={{ padding: '16px 4px' }}>
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
