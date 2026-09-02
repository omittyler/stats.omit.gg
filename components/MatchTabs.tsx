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

function kd(k: number, d: number) {
  return d > 0 ? (k / d).toFixed(2) : k.toFixed(2);
}

function plusMinus(k: number, d: number) {
  const v = k - d;
  return v > 0 ? `+${v}` : `${v}`;
}

// Mode-specific extra columns shown only on a per-map tab, never Overview -
// mixing e.g. Hardpoint hill time with a Search and Destroy map's plants
// wouldn't mean anything summed together. See PROJECT.md §8ag.
function modeColumns(mode: string) {
  if (mode === 'Hardpoint') return ['Hill Time', 'Obj K', 'Contest'] as const;
  if (mode === 'Search and Destroy') return ['Plants', 'Defuses', 'First Bloods', 'First Deaths'] as const;
  return ['Goals']; // Overload
}

function modeValue(mode: string, col: string, p: MatchMapDetail['players'][number]) {
  if (col === 'Hill Time') return p.hillTime;
  if (col === 'Obj K') return p.objectiveKills;
  if (col === 'Contest') return p.contest;
  if (col === 'Plants') return p.plants;
  if (col === 'Defuses') return p.defuses;
  if (col === 'First Bloods') return p.firstBloods;
  if (col === 'First Deaths') return p.firstDeaths;
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
              <td style={{ textAlign: 'right' }}>{p.k != null && p.d != null ? kd(p.k, p.d) : '—'}</td>
              <td style={{ textAlign: 'right' }}>{p.k != null && p.d != null ? plusMinus(p.k, p.d) : '—'}</td>
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
      <div className="table-filter-row">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        {maps.map((m, i) => (
          <button key={i} className={tab === i ? 'active' : ''} onClick={() => setTab(i)}>
            Map {m.mapNumber}
          </button>
        ))}
      </div>

      <table>
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
