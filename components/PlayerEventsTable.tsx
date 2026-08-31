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

type Tile = { label: string; value: string };

function StatTile({ label, value }: Tile) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>
    </div>
  );
}

function StatSection({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <div className="stat-detail-section">
      <h4>{title}</h4>
      <div className="stat-tile-grid">
        {tiles.map((t) => (
          <StatTile key={t.label} {...t} />
        ))}
      </div>
    </div>
  );
}

function StatDetail({ stats }: { stats: EventStatsSummary }) {
  const sections: { title: string; tiles: Tile[] }[] = [
    {
      title: 'Overall',
      tiles: [
        { label: 'Kills', value: String(stats.overallK ?? '-') },
        { label: 'Deaths', value: String(stats.overallD ?? '-') },
        { label: 'K/D', value: formatKd(stats.overallK, stats.overallD, stats.overallKd) },
        { label: 'Damage', value: stats.overallDmg?.toLocaleString() ?? '-' },
        { label: 'Slayer Rating', value: stats.overallSlayerRating?.toFixed(2) ?? '-' },
      ],
    },
  ];

  if ((stats.hpMaps ?? 0) > 0) {
    sections.push({
      title: 'Hardpoint',
      tiles: [
        { label: 'Maps', value: String(stats.hpMaps) },
        { label: 'Kills', value: String(stats.hpK ?? '-') },
        { label: 'Deaths', value: String(stats.hpD ?? '-') },
        { label: 'K/D', value: formatKd(stats.hpK, stats.hpD, stats.hpKd) },
      ],
    });
  }
  if ((stats.sndMaps ?? 0) > 0) {
    sections.push({
      title: 'Search & Destroy',
      tiles: [
        { label: 'Maps', value: String(stats.sndMaps) },
        { label: 'Kills', value: String(stats.sndK ?? '-') },
        { label: 'Deaths', value: String(stats.sndD ?? '-') },
        { label: 'K/D', value: formatKd(stats.sndK, stats.sndD, stats.sndKd) },
      ],
    });
  }
  if ((stats.ovlMaps ?? 0) > 0) {
    sections.push({
      title: 'Overload',
      tiles: [
        { label: 'Maps', value: String(stats.ovlMaps) },
        { label: 'Kills', value: String(stats.ovlK ?? '-') },
        { label: 'Deaths', value: String(stats.ovlD ?? '-') },
        { label: 'K/D', value: formatKd(stats.ovlK, stats.ovlD, stats.ovlKd) },
      ],
    });
  }

  return (
    <div className="stat-detail">
      {sections.map((s) => (
        <StatSection key={s.title} title={s.title} tiles={s.tiles} />
      ))}
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
