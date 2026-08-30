// Real event dates, provided by the user 2026-08-30. Same date applies across
// all regions (confirmed) - Cup/Elite Stage dates are keyed by number, Major/
// Champs by their exact placings.csv event_name. "LCQ" (2026-07-05) is
// deliberately excluded - user confirmed no placement data is needed for it.
// See PROJECT.md §8d for why dates matter now: computing a team's current
// standing requires finding each player's most recent event to know their
// current team, since CDC points travel with the player, not the team.

const CUP_DATES = {
  1: '2025-12-07', 2: '2025-12-14', 3: '2025-12-21', 4: '2026-01-11', 5: '2026-01-25',
  6: '2026-02-22', 7: '2026-03-08', 8: '2026-03-22', 9: '2026-04-12', 10: '2026-04-26',
  11: '2026-05-10', 12: '2026-06-07', 13: '2026-06-21',
};

const ELITE_STAGE_DATES = {
  1: '2026-01-22', 2: '2026-03-19', 3: '2026-05-07', 4: '2026-06-18',
};

const NAMED_EVENT_DATES = {
  '2026 Major 1 - Dallas Open': '2026-02-01',
  '2026 Major 2 - Birmingham Open': '2026-03-29',
  '2026 Major 3 - Atlanta Open': '2026-05-17',
  '2026 Major 4 - Paris Open': '2026-06-28',
  '2026 Champs - Challengers Finals': '2026-07-19',
};

export function getEventDate({ event_type, event_name, stage }) {
  if (event_type === 'Cup') {
    const match = event_name.match(/Cup (\d+)/);
    return match ? CUP_DATES[Number(match[1])] ?? null : null;
  }
  if (event_type === 'Elite') {
    return ELITE_STAGE_DATES[Number(stage)] ?? null;
  }
  return NAMED_EVENT_DATES[event_name] ?? null;
}
