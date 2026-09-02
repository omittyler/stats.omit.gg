import Link from 'next/link';
import { getMatchDetail, isLanEvent, getEventLogo, getMapThumbnail } from '@/lib/matches';
import { getTeamLogos } from '@/lib/standings';
import MatchTabs, { type OverviewPlayerRow } from '@/components/MatchTabs';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params;
  const match = await getMatchDetail(decodeURIComponent(series));
  if (!match) return { title: `Match — stats.omit.gg` };
  return { title: `${match.team1Name} vs ${match.team2Name} — stats.omit.gg` };
}

export default async function MatchPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params;
  const match = await getMatchDetail(decodeURIComponent(series));

  if (!match) {
    return (
      <main className="container">
        <p>Match &ldquo;{series}&rdquo; not found.</p>
        <Link href="/">&larr; Back home</Link>
      </main>
    );
  }

  const logos = await getTeamLogos();
  const eventLogo = getEventLogo(match.eventName);

  const mapsWonTeam1 = match.maps.filter((m) => m.team1Score > m.team2Score).length;
  const mapsWonTeam2 = match.maps.filter((m) => m.team2Score > m.team1Score).length;

  // Overview = each player's totals summed across every map they played this
  // series - only the fields present on every mode (k/d/a/damage), same
  // reasoning as MatchTabs' modeColumns note.
  const overviewByPlayer = new Map<string, OverviewPlayerRow>();
  for (const map of match.maps) {
    for (const p of map.players) {
      const existing = overviewByPlayer.get(p.playerName);
      if (existing) {
        existing.k += p.k ?? 0;
        existing.d += p.d ?? 0;
        existing.a += p.a ?? 0;
        existing.damage += p.damage ?? 0;
      } else {
        overviewByPlayer.set(p.playerName, {
          playerName: p.playerName,
          teamName: p.teamName,
          k: p.k ?? 0,
          d: p.d ?? 0,
          a: p.a ?? 0,
          damage: p.damage ?? 0,
        });
      }
    }
  }

  return (
    <main className="container">
      <Link className="back-link" href={`/teams/${encodeURIComponent(match.team1Name)}`}>
        &larr; Back to {match.team1Name}
      </Link>

      <div className="page-hero">
        <div className="entity-hero-meta match-event-meta">
          {eventLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="event-logo" src={`/events/${eventLogo}`} alt={match.eventName} />
          ) : (
            <span>{match.eventName}</span>
          )}
          <span>· {isLanEvent(match.eventType) ? 'LAN' : 'Online'} Match</span>
        </div>
        <div className="match-header">
          <div className="match-header-team">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/teams/${logos[match.team1Name] ?? 'Default.png'}`} alt="" width={64} height={64} />
            <Link href={`/teams/${encodeURIComponent(match.team1Name)}`}>{match.team1Name}</Link>
          </div>
          <div className="match-header-score">
            {mapsWonTeam1} - {mapsWonTeam2}
          </div>
          <div className="match-header-team">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/teams/${logos[match.team2Name] ?? 'Default.png'}`} alt="" width={64} height={64} />
            <Link href={`/teams/${encodeURIComponent(match.team2Name)}`}>{match.team2Name}</Link>
          </div>
        </div>
      </div>

      <div className="match-map-chips">
        {match.maps.map((m, i) => {
          const team1Won = m.team1Score > m.team2Score;
          const thumbnail = getMapThumbnail(m.mapName);
          return (
            <div key={i} className="match-map-chip">
              {thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="match-map-chip-thumb" src={`/maps/${thumbnail}`} alt="" />
              ) : (
                <div className="match-map-chip-thumb match-map-chip-thumb-empty" />
              )}
              <div className="note">{m.mode}</div>
              <div className="match-map-chip-name">{m.mapName}</div>
              <div className={`match-map-chip-score ${team1Won ? 'match-map-chip-team1' : 'match-map-chip-team2'}`}>
                {m.team1Score} - {m.team2Score}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <MatchTabs
          overview={[...overviewByPlayer.values()]}
          maps={match.maps}
          team1Name={match.team1Name}
          team2Name={match.team2Name}
        />
      </div>
    </main>
  );
}
