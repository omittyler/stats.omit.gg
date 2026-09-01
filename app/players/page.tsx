import { computeStandings, getTeamLogos, getAllPlayerDetails } from '@/lib/standings';
import { getPlayerQuickStats } from '@/lib/statLeaderboards';
import { OFFICIAL_CDL_TEAMS } from '@/lib/officialCdlTeams';
import PlayersTable from '@/components/PlayersTable';

// See app/standings/page.tsx - same reason: avoid Next.js caching this fetch
// and showing stale numbers after the underlying data changes.
export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const [{ playerStandings }, logos, playerDetails, quickStats] = await Promise.all([
    computeStandings(),
    getTeamLogos(),
    getAllPlayerDetails(),
    getPlayerQuickStats(),
  ]);

  // Current CDL players (e.g. Beans, Diamondcon) are excluded from this list
  // entirely, not just given a lower rank - confirmed by user 2026-09-02.
  // Same live, most-recent-event-wins concept as the K/D-style leaderboards
  // (lib/statLeaderboards.ts isEligible, PROJECT.md §8y): someone who returns
  // to a real Challengers org later in the season reappears here automatically.
  // Rank is computed AFTER this filter, not from the original array index, so
  // ranks stay contiguous (1, 2, 3...) rather than skipping the removed rows.
  const rows = playerStandings
    .filter((p) => !OFFICIAL_CDL_TEAMS.has(p.currentTeam))
    .map((p, i) => {
      const stats = quickStats.get(p.name.toLowerCase());
      return {
        ...p,
        rank: i + 1,
        kd: stats?.kd ?? null,
        slayerRating: stats?.slayerRating ?? null,
        nonTradedKillPct: stats?.nonTradedKillPct ?? null,
        matchesTotal: stats?.matchesTotal ?? null,
      };
    });
  const origins = Object.fromEntries([...playerDetails].map(([name, d]) => [name, d.origin ?? '']));

  return (
    <main className="container container-wide">
      <div className="page-hero">
        <h1>Black Ops 7 Player List</h1>
      </div>
      <div className="card">
        <PlayersTable rows={rows} logos={logos} origins={origins} />
      </div>
    </main>
  );
}
