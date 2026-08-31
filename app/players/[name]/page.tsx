import Link from 'next/link';
import { getEnrichedPlacements, computeStandings } from '@/lib/standings';

export const dynamic = 'force-dynamic';

function formatPlacement(min: number, max: number) {
  return min === max ? `${min}` : `${min}-${max}`;
}

export default async function PlayerPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const playerName = decodeURIComponent(rawName);

  const placements = await getEnrichedPlacements();
  const { playerStandings } = await computeStandings(placements);
  const standing = playerStandings.find((p) => p.name === playerName);

  const history = placements
    .filter((p) => p.players.includes(playerName))
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));

  if (!standing) {
    return (
      <main className="container">
        <p>Player &ldquo;{playerName}&rdquo; not found.</p>
        <Link href="/players">&larr; Back to player points</Link>
      </main>
    );
  }

  return (
    <main className="container">
      <Link className="back-link" href="/players">
        &larr; Back to player points
      </Link>
      <h1>{playerName}</h1>
      <p className="note">
        Current team:{' '}
        <Link href={`/teams/${encodeURIComponent(standing.currentTeam)}`}>{standing.currentTeam}</Link>
        {' — '}Season points:{' '}
        <strong style={{ color: 'var(--text)' }}>{standing.points.toLocaleString()}</strong>
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Events</h2>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Team</th>
              <th>Placement</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td>{h.eventName}</td>
                <td>
                  <Link href={`/teams/${encodeURIComponent(h.teamName)}`}>{h.teamName}</Link>
                </td>
                <td>{formatPlacement(h.placementMin, h.placementMax)}</td>
                <td>{h.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
