import Link from 'next/link';
import { computeStandings } from '@/lib/standings';

// See app/standings/page.tsx - same reason: avoid Next.js caching this fetch
// and showing stale numbers after the underlying data changes.
export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const { playerStandings } = await computeStandings();

  return (
    <main className="container">
      <h1>Black Ops 7 (BO7) Player Points</h1>
      <p className="note">
        Sum of CDC points earned across every Black Ops 7 (BO7) event, attributed to the player (full placement
        points each roster player, not split). &ldquo;Current Team&rdquo; is that player&apos;s most
        recent event by date. See <Link href="/standings">team standings</Link>, which are built from
        these totals.
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Current Team</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {playerStandings.map((player, i) => (
              <tr key={player.name}>
                <td>{i + 1}</td>
                <td>
                  <Link href={`/players/${encodeURIComponent(player.name)}`}>{player.name}</Link>
                </td>
                <td>
                  <Link href={`/teams/${encodeURIComponent(player.currentTeam)}`}>
                    {player.currentTeam}
                  </Link>
                </td>
                <td>{player.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
