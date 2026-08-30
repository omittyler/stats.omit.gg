import Link from 'next/link';
import { getEnrichedPlacements, computeStandings } from '@/lib/standings';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function formatPlacement(min: number, max: number) {
  return min === max ? `${min}` : `${min}-${max}`;
}

function formatPrize(prizeUsd: number) {
  return prizeUsd > 0 ? `$${prizeUsd.toLocaleString()}` : '-';
}

export default async function TeamPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const teamName = decodeURIComponent(rawName);

  const { data: teamRow } = await supabase
    .from('teams')
    .select('name, logo_filename')
    .eq('name', teamName)
    .maybeSingle();

  const placements = await getEnrichedPlacements();
  const { teamStandings } = await computeStandings(placements);
  const standing = teamStandings.find((t) => t.name === teamName);

  const history = placements
    .filter((p) => p.teamName === teamName)
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));

  if (!teamRow && !standing && !history.length) {
    return (
      <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
        <p>Team &ldquo;{teamName}&rdquo; not found.</p>
        <Link href="/standings">&larr; Back to standings</Link>
      </main>
    );
  }

  // "Current roster" is specifically THIS team's own most recent event's roster -
  // not just "whoever's own most-recent event happened to be with this team"
  // (that grouping, used for the team's points total, can include a player who
  // hasn't actually played the team's latest event if their own last appearance
  // predates it). Everyone else who's ever played for this team goes under
  // Previous Players instead. Confirmed 2026-08-30.
  const currentRoster = history[0]?.players ?? [];
  const previousPlayers = [...new Set(history.slice(1).flatMap((h) => h.players))].filter(
    (p) => !currentRoster.includes(p)
  );

  return (
    <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <p>
        <Link href="/standings">&larr; Back to standings</Link>
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {teamRow && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/teams/${teamRow.logo_filename}`}
            alt={teamName}
            width={64}
            height={64}
            style={{ objectFit: 'contain' }}
          />
        )}
        <h1 style={{ margin: 0 }}>{teamName}</h1>
      </div>

      <p style={{ color: '#9aa0ac' }}>
        Current season points (sum of current roster):{' '}
        <strong>{(standing?.points ?? 0).toLocaleString()}</strong>
      </p>

      <h2>Current Roster</h2>
      {currentRoster.length ? (
        <ul>
          {currentRoster.map((p) => (
            <li key={p}>
              <Link href={`/players/${encodeURIComponent(p)}`}>{p}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: '#9aa0ac' }}>No current roster on record.</p>
      )}

      {previousPlayers.length > 0 && (
        <>
          <h2>Previous Players</h2>
          <ul>
            {previousPlayers.map((p) => (
              <li key={p}>
                <Link href={`/players/${encodeURIComponent(p)}`}>{p}</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Events</h2>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Placement</th>
            <th>Prize</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i}>
              <td>{h.eventName}</td>
              <td>{formatPlacement(h.placementMin, h.placementMax)}</td>
              <td>{formatPrize(h.prizeUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
