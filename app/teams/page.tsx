import Link from 'next/link';
import { computeStandings } from '@/lib/standings';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TOP_N = 16;

export default async function TeamsDirectoryPage() {
  const { teamStandings } = await computeStandings();
  const topTeams = teamStandings.slice(0, TOP_N);

  const { data: teamRows, error } = await supabase
    .from('teams')
    .select('name, logo_filename')
    .in('name', topTeams.map((t) => t.name));

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
        <h1>Top 16 Teams</h1>
      </div>
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
    </main>
  );
}
