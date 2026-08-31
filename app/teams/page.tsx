import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function TeamsDirectoryPage() {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('name, logo_filename')
    .order('name');

  if (error) {
    return (
      <main className="container">
        <p>Error loading teams: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Teams</h1>
      <p className="note">
        Every team that has fielded a roster in the 2026 Black Ops 7 season, including ad-hoc Cup
        entrants. A missing logo falls back to a placeholder.
      </p>
      <div className="team-grid">
        {(teams ?? []).map((team) => (
          <Link key={team.name} href={`/teams/${encodeURIComponent(team.name)}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/teams/${team.logo_filename}`} alt={team.name} />
            <span>{team.name}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
