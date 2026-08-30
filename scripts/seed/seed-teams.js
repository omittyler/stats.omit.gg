import { readCsvObjects } from './lib/csv.js';
import { supabase } from './lib/supabaseClient.js';

export async function seedTeams() {
  const rows = readCsvObjects('data/incoming/teams.csv');
  const payload = rows.map((r) => ({ name: r['Team Name'], logo_filename: r['File Name'] }));

  const { error } = await supabase.from('teams').upsert(payload, { onConflict: 'name' });
  if (error) throw error;

  console.log(`teams: upserted ${payload.length} rows from teams.csv`);
}
