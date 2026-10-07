import { computeStandings, getTeamLogos } from '@/lib/standings';
import { GAMES, parseGameSlug } from '@/lib/season';
import { GameFilterLinks } from '@/components/GameFilterLinks';
import StandingsTable from '@/components/StandingsTable';

export default async function StandingsPage({ params }: { params: Promise<{ game?: string }> }) {
  const game = parseGameSlug((await params).game);
  const gameInfo = GAMES.find((g) => g.value === game)!;

  const [{ teamStandings }, logos] = await Promise.all([computeStandings(undefined, game), getTeamLogos()]);

  // Rank is fixed to each team's actual points-based standing, computed here
  // before sorting - so it stays correct even when the table is re-sorted by
  // Team name instead of Points.
  const rows = teamStandings.map((t, i) => ({ ...t, rank: i + 1 }));

  return (
    <main className="container">
      <div className="page-hero">
        <h1>{gameInfo.label} Team Standings</h1>
      </div>
      <GameFilterLinks basePath="/standings" selected={game} />
      <div className="card">
        {rows.length ? (
          <StandingsTable rows={rows} logos={logos} />
        ) : (
          <p className="note">No standings yet for {gameInfo.label}.</p>
        )}
      </div>
    </main>
  );
}
