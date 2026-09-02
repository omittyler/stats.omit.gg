'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MatchMapDetail } from '@/lib/matches';

export type OverviewPlayerRow = {
  playerName: string;
  teamName: string;
  k: number;
  d: number;
  a: number;
  damage: number;
};

function kdRatio(k: number, d: number) {
  return d > 0 ? k / d : k;
}

function kd(k: number, d: number) {
  return kdRatio(k, d).toFixed(2);
}

function plusMinusValue(k: number, d: number) {
  return k - d;
}

function plusMinus(k: number, d: number) {
  const v = plusMinusValue(k, d);
  return v > 0 ? `+${v}` : `${v}`;
}

function statClass(value: number, goodThreshold: number) {
  return value >= goodThreshold ? 'stat-good' : 'stat-bad';
}

// Mode-specific extra columns shown only on a per-map tab, never Overview -
// mixing e.g. Hardpoint hill time with a Search and Destroy map's plants
// wouldn't mean anything summed together. See PROJECT.md §8ag.
function modeColumns(mode: string) {
  if (mode === 'Hardpoint') return ['Hill Time', 'Obj K'] as const;
  if (mode === 'Search and Destroy') return ['Plants', 'Defuses', 'First Bloods'] as const;
  return ['Goals']; // Overload
}

function modeValue(mode: string, col: string, p: MatchMapDetail['players'][number]) {
  if (col === 'Hill Time') return p.hillTime;
  if (col === 'Obj K') return p.objectiveKills;
  if (col === 'Plants') return p.plants;
  if (col === 'Defuses') return p.defuses;
  if (col === 'First Bloods') return p.firstBloods;
  if (col === 'Goals') return p.goals;
  return null;
}

function TeamRows<T extends { playerName: string; teamName: string; k: number | null; d: number | null }>({
  players,
  team1Name,
  team2Name,
  extraColumns,
}: {
  players: T[];
  team1Name: string;
  team2Name: string;
  extraColumns?: (p: T) => (number | null)[];
}) {
  const byTeam = [team1Name, team2Name].map((teamName) => ({
    teamName,
    rows: players.filter((p) => p.teamName === teamName),
  }));

  return (
    <>
      {byTeam.map(({ teamName, rows }) => (
        <tbody key={teamName}>
          <tr className="match-team-divider">
            <td colSpan={extraColumns ? 5 + extraColumns(rows[0] ?? ({} as T)).length : 5}>{teamName}</td>
          </tr>
          {rows.map((p) => (
            <tr key={p.playerName}>
              <td>
                <Link href={`/players/${encodeURIComponent(p.playerName)}`}>{p.playerName}</Link>
              </td>
              <td style={{ textAlign: 'right' }}>{p.k ?? '—'}</td>
              <td style={{ textAlign: 'right' }}>{p.d ?? '—'}</td>
              <td
                style={{ textAlign: 'right' }}
                className={p.k != null && p.d != null ? statClass(kdRatio(p.k, p.d), 1) : undefined}
              >
                {p.k != null && p.d != null ? kd(p.k, p.d) : '—'}
              </td>
              <td
                style={{ textAlign: 'right' }}
                className={p.k != null && p.d != null ? statClass(plusMinusValue(p.k, p.d), 0) : undefined}
              >
                {p.k != null && p.d != null ? plusMinus(p.k, p.d) : '—'}
              </td>
              {extraColumns &&
                extraColumns(p).map((v, i) => (
                  <td key={i} style={{ textAlign: 'right' }}>
                    {v ?? '—'}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      ))}
    </>
  );
}

export default function MatchTabs({
  overview,
  maps,
  team1Name,
  team2Name,
}: {
  overview: OverviewPlayerRow[];
  maps: MatchMapDetail[];
  team1Name: string;
  team2Name: string;
}) {
  const [tab, setTab] = useState<'overview' | number>('overview');
  const activeMap = typeof tab === 'number' ? maps[tab] : null;

  return (
    <div>
      <div className="table-filter-row match-tabs-row">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        {maps.map((m, i) => (
          <button key={i} className={tab === i ? 'active' : ''} onClick={() => setTab(i)}>
            Map {m.mapNumber}
          </button>
        ))}
      </div>

      <table className="match-stats-table">
        <colgroup>
          <col className="match-stats-col-player" />
          <col className="match-stats-col-stat" />
          <col className="match-stats-col-stat" />
          <col className="match-stats-col-stat" />
          <col className="match-stats-col-stat" />
          {(activeMap ? modeColumns(activeMap.mode) : ['Damage']).map((c) => (
            <col key={c} className="match-stats-col-stat" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th>Player</th>
            <th style={{ textAlign: 'right' }}>Kills</th>
            <th style={{ textAlign: 'right' }}>Deaths</th>
            <th style={{ textAlign: 'right' }}>K/D</th>
            <th style={{ textAlign: 'right' }}>+/-</th>
            {activeMap &&
              modeColumns(activeMap.mode).map((c) => (
                <th key={c} style={{ textAlign: 'right' }}>
                  {c}
                </th>
              ))}
            {!activeMap && <th style={{ textAlign: 'right' }}>Damage</th>}
          </tr>
        </thead>
        {activeMap ? (
          <TeamRows
            players={activeMap.players}
            team1Name={team1Name}
            team2Name={team2Name}
            extraColumns={(p) => modeColumns(activeMap.mode).map((c) => modeValue(activeMap.mode, c, p))}
          />
        ) : (
          <TeamRows
            players={overview}
            team1Name={team1Name}
            team2Name={team2Name}
            extraColumns={(p) => [p.damage]}
          />
        )}
      </table>
    </div>
  );
}
