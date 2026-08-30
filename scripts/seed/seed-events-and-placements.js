import { readCsvObjects, parsePlacementRange } from './lib/csv.js';
import { getOrCreateTeamId, loadTeamCache, chunk } from './lib/teams.js';
import { supabase } from './lib/supabaseClient.js';

// All of placings.csv so far is the 2026 Black Ops 7 season — revisit once Modern
// Warfare 4 season data (data/incoming/mw4_stats/) arrives with its own event rows.
const GAME = 'Black Ops 7';

function eventKey(name, region) {
  return `${name}|${region || ''}`;
}

export async function seedEventsAndPlacements() {
  const rows = readCsvObjects('data/incoming/placings.csv');

  const events = new Map();
  for (const row of rows) {
    const key = eventKey(row.event_name, row.region);
    if (!events.has(key)) {
      events.set(key, {
        name: row.event_name,
        type: row.event_type,
        game: GAME,
        season: Number(row.season),
        stage: row.stage ? Number(row.stage) : null,
        region: row.region || null,
      });
    }
  }

  const eventPayload = [...events.values()];
  const { error: eventsError } = await supabase
    .from('events')
    .upsert(eventPayload, { onConflict: 'name,region' });
  if (eventsError) throw eventsError;
  console.log(`events: upserted ${eventPayload.length} rows from placings.csv`);

  const { data: eventRows, error: fetchError } = await supabase.from('events').select('id,name,region');
  if (fetchError) throw fetchError;
  const eventCache = new Map(eventRows.map((e) => [eventKey(e.name, e.region), e.id]));

  const teamCache = await loadTeamCache(supabase);
  const placements = [];
  for (const row of rows) {
    const teamId = await getOrCreateTeamId(supabase, teamCache, row.team_name);
    const eventId = eventCache.get(eventKey(row.event_name, row.region));
    const [placementMin, placementMax] = parsePlacementRange(row.placement);

    placements.push({
      team_id: teamId,
      event_id: eventId,
      placement_min: placementMin,
      placement_max: placementMax,
      player1: row.player1 || null,
      player2: row.player2 || null,
      player3: row.player3 || null,
      player4: row.player4 || null,
    });
  }

  for (const batch of chunk(placements, 500)) {
    const { error } = await supabase
      .from('event_placements')
      .upsert(batch, { onConflict: 'team_id,event_id' });
    if (error) throw error;
  }
  console.log(`event_placements: upserted ${placements.length} rows from placings.csv`);
}
