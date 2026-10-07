import Link from 'next/link';
import { computeStandings } from '@/lib/standings';
import { supabase } from '@/lib/supabase';
import { GAMES, parseGameSlug } from '@/lib/season';
import { GameFilterLinks } from '@/components/GameFilterLinks';

const TOP_N = 16;

export default async function TeamsDirectoryPage({ params }: { params: Promise<{ game?: string }> }) {
  const game = parseGameSlug((await params).game);
  const gameInfo = GAMES.find((g) => g.value === game)!;

  const { teamStandings } = await computeStandings(undefined, game);
  const topTeams = teamStandings.slice(0, TOP_N);

  const { data: teamRows, error } = topTeams.length
    ? await supabase
        .from('teams')
        .select('name, logo_filename')
        .in('name', topTeams.map((t) => t.name))
    : { data: [], error: null };

  if (error) {
    return (
      <main className="container">
        <p>Error loading teams: {error.message}</p>
      </main>
    );
  }

  const logoByName = new Map((teamRows ?? []).map((t) => [t.name, t.logo_filename]));

  return (
    <main className="container">
      <div className="page-hero">
        <h1>Top {TOP_N} Teams — {gameInfo.label}</h1>
      </div>
      <GameFilterLinks basePath="/teams" selected={game} />
      {topTeams.length ? (
        <div className="team-grid">
          {topTeams.map((team, i) => (
            <Link key={team.name} href={`/teams/${encodeURIComponent(team.name)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/teams/${logoByName.get(team.name) ?? 'Default.png'}`} alt={team.name} />
              <span>
                #{i + 1} {team.name}
              </span>
              <span className="note">{team.points.toLocaleString()} pts</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="note">No teams yet for {gameInfo.label}.</p>
      )}
    </main>
  );
}
