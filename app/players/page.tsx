import Link from 'next/link';
import { computeStandings } from '@/lib/standings';

// See app/standings/page.tsx - same reason: avoid Next.js caching this fetch
// and showing stale numbers after the underlying data changes.
export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const { playerStandings } = await computeStandings();

  return (
    <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <h1>2026 Season Player Points</h1>
      <p style={{ color: '#9aa0ac', fontSize: '0.9rem' }}>
        Sum of CDC points earned across every 2026 event, attributed to the player (full placement
        points each roster player, not split). &ldquo;Current Team&rdquo; is that player&apos;s most
        recent event by date. See <Link href="/standings">team standings</Link>, which are built from
        these totals. Known caveat: a couple of handles ("Apollo", "Law") are confirmed to be two
        different real people who were never given distinct spellings — their totals here
        incorrectly merge those two people until that's fixed at the source (PROJECT.md §7).
      </p>
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
              <td>{player.name}</td>
              <td>{player.currentTeam}</td>
              <td>{player.points.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
