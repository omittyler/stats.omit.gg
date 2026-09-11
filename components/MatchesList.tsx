'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MatchListEntry } from '@/lib/matches';
import { getEventLogo } from '@/lib/matches';
import { formatFullDate, formatEventNameForEventsList } from '@/lib/format';
import { GAMES, CURRENT_GAME } from '@/lib/season';

// Only Black Ops 7 has any real data today (Modern Warfare 4's season
// hasn't started - data/incoming/mw4_stats/ is empty, PROJECT.md §2) but the
// filter is built against the real `events.game` values now so it's ready
// the moment MW4 matches actually get seeded, rather than needing this
// component rebuilt later. GAMES/CURRENT_GAME are shared with every other
// game-scoped page (lib/season.ts) rather than kept as a local list here.
const GAME_OPTIONS = GAMES.map((g) => ({ value: g.value, label: g.label }));

// AP/LATAM are scoped out of the whole site (PROJECT.md §7), and global
// events (Majors/Champs) have no region at all - so "All" is the only way
// to see those once this filter is set to a specific region, same tradeoff
// already accepted by the identical All/NA/EU pattern on /players.
const REGION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'NA', label: 'NA' },
  { value: 'EU', label: 'EU' },
] as const;

const PAGE_SIZE = 10;

function TeamRow({ name, logo, score, won }: { name: string; logo: string; score: number; won: boolean }) {
  return (
    <div className={`matches-list-team ${won ? 'matches-list-team-win' : 'matches-list-team-loss'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/teams/${logo}`} alt="" />
      <span className="matches-list-team-name">{name}</span>
      <span className="matches-list-team-score">{score}</span>
    </div>
  );
}

function EventHeader({ eventName, eventDate, region }: { eventName: string; eventDate: string | null; region: string }) {
  const eventLogo = getEventLogo(eventName);
  return (
    <>
      {eventLogo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="matches-list-header-logo" src={`/events/${eventLogo}`} alt={eventName} />
      )}
      <div className="matches-list-header-text">
        {/* Name always shown, even with a logo - Elite's NA/EU stages share
            one logo (and often the same date), so the logo/date alone can't
            tell two groups apart. Region tag covers the opposite case: Cup
            events share one NAME across regions (region is a separate
            column, not embedded in the name like Elite) - see getAllMatches
            in lib/matches.ts. Only rendered when non-empty (global events
            like Majors/Champs have no region). */}
        <span className="matches-list-header-name">
          {formatEventNameForEventsList(eventName)}
          {region && <span className="region-tag">{region}</span>}
        </span>
        <span className="matches-list-header-date">{eventDate ? formatFullDate(eventDate) : 'Date unknown'}</span>
      </div>
    </>
  );
}

function EventGroup({
  eventName,
  eventDate,
  region,
  matches,
  logos,
  expanded,
  onToggle,
}: {
  eventName: string;
  eventDate: string | null;
  region: string;
  matches: MatchListEntry[];
  logos: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = matches.slice(0, visibleCount);

  if (!expanded) {
    return (
      <div className="matches-list-group">
        <button className="matches-list-collapsed-header" onClick={onToggle} type="button">
          <EventHeader eventName={eventName} eventDate={eventDate} region={region} />
          <span className="matches-list-collapsed-count">{matches.length} matches</span>
        </button>
      </div>
    );
  }

  return (
    <div className="matches-list-group">
      <button className="matches-list-expanded-header" onClick={onToggle} type="button">
        <EventHeader eventName={eventName} eventDate={eventDate} region={region} />
      </button>
      {visible.map((m) => {
        const team1Won = m.team1Score > m.team2Score;
        return (
          <Link key={m.seriesLabel} href={`/matches/${encodeURIComponent(m.seriesLabel)}`} className="matches-list-row">
            <div className="matches-list-teams">
              <TeamRow name={m.team1Name} logo={logos[m.team1Name] ?? 'Default.png'} score={m.team1Score} won={team1Won} />
              <TeamRow name={m.team2Name} logo={logos[m.team2Name] ?? 'Default.png'} score={m.team2Score} won={!team1Won} />
            </div>
          </Link>
        );
      })}
      {visibleCount < matches.length && (
        <button className="matches-list-load-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} type="button">
          Load more
        </button>
      )}
    </div>
  );
}

export default function MatchesList({
  matches,
  logos,
}: {
  matches: MatchListEntry[];
  logos: Record<string, string>;
}) {
  const [game, setGame] = useState<string>(CURRENT_GAME);
  const [region, setRegion] = useState<string>(REGION_OPTIONS[0].value);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  function toggleEvent(eventName: string) {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventName)) next.delete(eventName);
      else next.add(eventName);
      return next;
    });
  }

  const filtered = matches.filter((m) => m.game === game && (region === 'all' || m.region === region));

  // Grouped by event (eventName + region together - eventName alone is NOT
  // a unique event key, see the getAllMatches comment in lib/matches.ts:
  // Cup shares one name across regions with region as a separate column,
  // Elite embeds region in the name instead but the composite key still
  // works fine for it too) via a Map, not "consecutive rows share an
  // event" - Elite's NA/EU stages share one series-number range (see
  // scripts/seed/lib/matchSeriesRanges.js), so their matches interleave
  // when sorted by series number and are NOT contiguous in `filtered`. A Map
  // preserves insertion order, and since `filtered` is already sorted
  // newest-first, each event's first-seen position is its own most recent
  // match - giving correctly newest-first-ordered groups without needing a
  // separate sort pass.
  const groupsByEvent = new Map<
    string,
    { eventName: string; eventDate: string | null; region: string; matches: MatchListEntry[] }
  >();
  for (const m of filtered) {
    const key = `${m.eventName}|${m.region}`;
    const existing = groupsByEvent.get(key);
    if (existing) {
      existing.matches.push(m);
    } else {
      groupsByEvent.set(key, { eventName: m.eventName, eventDate: m.eventDate, region: m.region, matches: [m] });
    }
  }
  const groups = [...groupsByEvent.values()];

  return (
    <div>
      <div className="table-filter-row">
        {GAME_OPTIONS.map((opt) => (
          <button key={opt.value} className={game === opt.value ? 'active' : ''} onClick={() => setGame(opt.value)}>
            {opt.label}
          </button>
        ))}
      </div>
      <div className="table-filter-row">
        {REGION_OPTIONS.map((opt) => (
          <button key={opt.value} className={region === opt.value ? 'active' : ''} onClick={() => setRegion(opt.value)}>
            {opt.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && <p className="note">No matches for this game/region yet.</p>}

      {groups.map((group, i) => {
        const key = `${group.eventName}|${group.region}`;
        return (
          <EventGroup
            key={key}
            eventName={group.eventName}
            eventDate={group.eventDate}
            region={group.region}
            matches={group.matches}
            logos={logos}
            // The most recent event (first group) starts expanded; every
            // other event starts collapsed to just its header, per user
            // request - expandedEvents only tracks manual overrides of that
            // default, so index 0 stays expanded unless explicitly collapsed.
            expanded={i === 0 ? !expandedEvents.has(key) : expandedEvents.has(key)}
            onToggle={() => toggleEvent(key)}
          />
        );
      })}
    </div>
  );
}
