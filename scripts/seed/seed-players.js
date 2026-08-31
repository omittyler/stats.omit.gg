import { writeFile } from 'node:fs/promises';
import { readCsvObjects } from './lib/csv.js';
import { supabase } from './lib/supabaseClient.js';

// "January 21, 2002" / "May 26,1999" parse fine via Date(). "September 24"
// (no year given in the source) does not carry enough information - and
// JS's Date() would otherwise silently default it to some arbitrary year -
// so those are rejected and logged instead of guessed.
function parseBirthday(raw) {
  const value = (raw || '').trim();
  if (!value) return null;
  if (!/\d{4}/.test(value)) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export async function seedPlayers() {
  const rows = readCsvObjects('data/incoming/player_details.csv');
  const skippedBirthdays = [];

  const payload = rows.map((r) => {
    const birthday = parseBirthday(r.birthday);
    if (r.birthday && !birthday) {
      skippedBirthdays.push({ gamertag: r.gamertag, birthday: r.birthday });
    }
    return {
      gamertag: r.gamertag,
      full_name: r['full name'] || null,
      origin: r.origin || null,
      birthday,
      photo_filename: r.photo || null,
      twitter_url: r.twitter || null,
      twitch_url: r.twitch || null,
    };
  });

  const { error } = await supabase.from('players').upsert(payload, { onConflict: 'gamertag' });
  if (error) throw error;

  if (skippedBirthdays.length) {
    await writeFile('scripts/seed/skipped-birthdays.json', JSON.stringify(skippedBirthdays, null, 2));
    console.log(
      `players: ${skippedBirthdays.length} birthdays had no year and were left null — see scripts/seed/skipped-birthdays.json`
    );
  }

  console.log(`players: upserted ${payload.length} rows from player_details.csv`);
}
