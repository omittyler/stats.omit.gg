import Link from 'next/link';
import { computeStandings } from '@/lib/standings';

// Standings change whenever placings.csv/the DB changes (re-seeds, corrections).
// Without this, Next.js caches the underlying Supabase fetch and can keep
// showing stale numbers after a fix, even on a hard refresh.
export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const { teamStandings } = await computeStandings();

  return (
    <main className="container">
      <h1>Black Ops 7 (BO7) Team Standings</h1>
      <p className="note">
        A team&apos;s points are the sum of its <strong>current roster&apos;s</strong> individual point
        totals — CDC points are earned by, and travel with, the player, not the team. &ldquo;Current
        team&rdquo; is derived from each player&apos;s most recent event by date. See{' '}
        <Link href="/players">the player leaderboard</Link> for individual totals, and PROJECT.md §8d
        for a couple of known name-collision caveats.
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {teamStandings.map((team, i) => (
              <tr key={team.name}>
                <td>{i + 1}</td>
                <td>
                  <Link href={`/teams/${encodeURIComponent(team.name)}`}>{team.name}</Link>
                </td>
                <td>{team.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
