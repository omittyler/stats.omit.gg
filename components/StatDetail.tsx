import type { ReactNode } from 'react';
import type { EventStatsSummary, RankedStat } from '@/lib/standings';

const dec = (v: number) => v.toFixed(2);
const pct = (v: number) => `${v.toFixed(0)}%`;

function RankedBlock({
  title,
  stat,
  format,
}: {
  title: string;
  stat: RankedStat;
  format: (v: number) => string;
}) {
  return (
    <div className="stat-pair-block">
      <span className="stat-pair-title">{title}</span>
      <div className="stat-pair-values">
        <span className="stat-pair-value">{stat.value !== null ? format(stat.value) : '-'}</span>
        <span className="stat-pair-rank">{stat.rank !== null ? `#${stat.rank}` : '-'}</span>
      </div>
    </div>
  );
}

function TotalsBlock({
  title,
  total,
  w,
  l,
}: {
  title: string;
  total: number | null;
  w: number | null;
  l: number | null;
}) {
  const winPct = w !== null && l !== null && w + l > 0 ? Math.round((w / (w + l)) * 100) : null;
  return (
    <div className="stat-pair-block">
      <span className="stat-pair-title">{title}</span>
      <span className="stat-pair-value" style={{ fontSize: '1.2rem' }}>
        {total ?? '-'}
      </span>
      <div className="stat-pair-values">
        <span className="stat-pair-rank">{w ?? '-'}W</span>
        <span className="stat-pair-rank">{l ?? '-'}L</span>
        <span className="stat-pair-rank">{winPct !== null ? `${winPct}%` : '-'}</span>
      </div>
    </div>
  );
}

function StatPairRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="stat-pair-row">
      {left}
      {right}
    </div>
  );
}

/**
 * Renders one EventStatsSummary - shared between the per-event dropdown
 * (components/PlayerEventsTable.tsx, ranked against that event's field) and
 * the season-total box on the player page (ranked against the whole season).
 * No hooks/interactivity of its own, so it's safe in both a client component
 * and a plain server component.
 */
export function StatDetail({ stats }: { stats: EventStatsSummary }) {
  return (
    <div className="stat-detail">
      <StatPairRow
        left={<TotalsBlock title="Matches" total={stats.matchesTotal} w={stats.matchesW} l={stats.matchesL} />}
        right={<TotalsBlock title="Maps" total={stats.mapsTotal} w={stats.mapsW} l={stats.mapsL} />}
      />

      <h4 className="stat-section-title">Overall</h4>
      <StatPairRow
        left={<RankedBlock title="K/D" stat={stats.overallKd} format={dec} />}
        right={<RankedBlock title="KA/D" stat={stats.overallKad} format={dec} />}
      />
      <StatPairRow
        left={<RankedBlock title="Slayer Rating" stat={stats.overallSlayerRating} format={dec} />}
        right={<RankedBlock title="Damage Rating" stat={stats.overallDamageRating} format={dec} />}
      />

      {(stats.hpMaps ?? 0) > 0 && (
        <>
          <h4 className="stat-section-title">Hardpoint</h4>
          <StatPairRow
            left={<RankedBlock title="K/D" stat={stats.hpKd} format={dec} />}
            right={<RankedBlock title="Hill Time per 10" stat={stats.hpHillTimePer10} format={dec} />}
          />
          <StatPairRow
            left={<RankedBlock title="Kills per 10" stat={stats.hpKPer10} format={dec} />}
            right={<RankedBlock title="Damage per 10" stat={stats.hpDmgPer10} format={dec} />}
          />
        </>
      )}

      {(stats.sndMaps ?? 0) > 0 && (
        <>
          <h4 className="stat-section-title">Search &amp; Destroy</h4>
          <StatPairRow
            left={<RankedBlock title="K/D" stat={stats.sndKd} format={dec} />}
            right={
              <RankedBlock title="Opening Duel Win %" stat={stats.sndOpeningDuelWinPct} format={pct} />
            }
          />
          <StatPairRow
            left={<RankedBlock title="Kills per Round" stat={stats.sndKPerR} format={dec} />}
            right={<RankedBlock title="Damage per Round" stat={stats.sndDmgPerR} format={dec} />}
          />
        </>
      )}

      {(stats.ovlMaps ?? 0) > 0 && (
        <>
          <h4 className="stat-section-title">Overload</h4>
          <StatPairRow
            left={<RankedBlock title="K/D" stat={stats.ovlKd} format={dec} />}
            right={<RankedBlock title="Goals per 10" stat={stats.ovlGoalsPer10} format={dec} />}
          />
          <StatPairRow
            left={<RankedBlock title="Kills per 10" stat={stats.ovlKPer10} format={dec} />}
            right={<RankedBlock title="Damage per 10" stat={stats.ovlDmgPer10} format={dec} />}
          />
        </>
      )}
    </div>
  );
}
