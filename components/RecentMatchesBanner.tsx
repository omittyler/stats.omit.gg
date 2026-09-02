import Link from 'next/link';
import type { RecentMatch } from '@/lib/matches';
import { getEventLogo } from '@/lib/matches';
import { formatShortDate } from '@/lib/format';

// The season year prefix is redundant in a compact banner where every match
// is the same season - "2026 Champs - Challengers Finals" -> "Champs -
// Challengers Finals". Display-only; the stored event name is untouched.
function shortEventName(eventName: string) {
  return eventName.replace(/^\d{4}\s+/, '');
}

function TeamRow({
  name,
  logo,
  score,
  won,
}: {
  name: string;
  logo: string;
  score: number;
  won: boolean;
}) {
  return (
    <div className={`recent-match-team ${won ? 'recent-match-team-win' : 'recent-match-team-loss'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/teams/${logo}`} alt="" />
      <span className="recent-match-team-name">{name}</span>
      <span className="recent-match-team-score">{score}</span>
    </div>
  );
}

export default function RecentMatchesBanner({
  matches,
  logos,
}: {
  matches: RecentMatch[];
  logos: Record<string, string>;
}) {
  if (!matches.length) return null;

  return (
    <div className="recent-matches-banner">
      <div className="recent-matches-row">
        {matches.map((m) => {
          const eventLogo = getEventLogo(m.eventName);
          const team1Won = m.team1Score > m.team2Score;
          return (
            <Link key={m.seriesLabel} href={`/matches/${encodeURIComponent(m.seriesLabel)}`} className="recent-match-card">
              <div className="recent-match-meta">
                <span>{m.eventDate ? formatShortDate(m.eventDate) : ''}</span>
                {eventLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="recent-match-event-logo" src={`/events/${eventLogo}`} alt="" />
                ) : (
                  <span className="recent-match-event-name">{shortEventName(m.eventName)}</span>
                )}
              </div>
              <TeamRow
                name={m.team1Name}
                logo={logos[m.team1Name] ?? 'Default.png'}
                score={m.team1Score}
                won={team1Won}
              />
              <TeamRow
                name={m.team2Name}
                logo={logos[m.team2Name] ?? 'Default.png'}
                score={m.team2Score}
                won={!team1Won}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
