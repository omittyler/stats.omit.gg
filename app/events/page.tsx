import Link from 'next/link';
import { getEvents, eventHref, bracketHref, type EventSummary } from '@/lib/events';
import { getEventLogo } from '@/lib/matches';
import { formatEventNameForEventsList, formatFullDate, formatPlacementOrdinal, formatUsd } from '@/lib/format';
import { GAMES, parseGameSlug, type GameValue } from '@/lib/season';
import { GameFilterLinks } from '@/components/GameFilterLinks';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Events — stats.omit.gg',
  description: 'Every Call of Duty Challengers event this season, with results.',
};

// Grouped by event type, LANs first - same Major/Champs = LAN split as
// isLanEvent in lib/matches.ts.
const SECTIONS = [
  { title: 'LAN Events', types: ['Major', 'Champs'] },
  { title: 'Elite', types: ['Elite'] },
  { title: 'Cups', types: ['Cup'] },
  { title: 'Exhibition', types: ['Exhibition'] },
];

function EventCard({ event, game }: { event: EventSummary; game: GameValue }) {
  const logo = getEventLogo(event.eventName);
  return (
    // The whole card opens the event (the title link is stretched over it in
    // CSS); View Bracket sits above that so it can be its own link.
    <div className="event-card">
      <div className="event-card-logo">
        {logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={`/events/${logo}`} alt="" />
        ) : (
          <span>{event.eventType}</span>
        )}
      </div>
      <div className="event-card-body">
        <h3>
          <Link href={eventHref(event, game)} className="event-card-link">
            {formatEventNameForEventsList(event.eventName)}
          </Link>
          {event.region && <span className="region-tag">{event.region}</span>}
        </h3>
        <div className="note">{event.eventDate ? formatFullDate(event.eventDate) : 'Date unknown'}</div>
        <ol>
          {event.topPlacements.map((p, i) => (
            <li key={i}>
              <span className="placement">{formatPlacementOrdinal(p.placementMin, p.placementMax)}</span>
              <span className="team-name">{p.teamName}</span>
            </li>
          ))}
        </ol>
        <div className="event-card-meta">
          <span>{event.teamCount} {event.teamCount === 1 ? 'team' : 'teams'}</span>
          {event.matchCount > 0 && <span>{event.matchCount} {event.matchCount === 1 ? 'match' : 'matches'}</span>}
          {event.totalPrize > 0 && <span>{formatUsd(event.totalPrize)}</span>}
        </div>
        {event.matchCount > 0 && (
          <Link href={bracketHref(event, game)} className="bracket-button">
            View Bracket
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: slug } = await searchParams;
  const game = parseGameSlug(slug);
  const gameInfo = GAMES.find((g) => g.value === game)!;

  const events = await getEvents(game);

  return (
    <main className="container container-wide">
      <div className="page-hero">
        <h1>Events — {gameInfo.label}</h1>
        <p className="note">Every tracked event this season, newest first. Click one for full results and matches.</p>
      </div>
      <GameFilterLinks basePath="/events" selected={game} />

      {events.length === 0 && <p className="note">No events yet for {gameInfo.label}.</p>}

      {SECTIONS.map((section) => {
        const sectionEvents = events.filter((e) => section.types.includes(e.eventType));
        if (!sectionEvents.length) return null;
        return (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <div className="event-grid">
              {sectionEvents.map((event) => (
                <EventCard key={`${event.eventName}|${event.region}`} event={event} game={game} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
