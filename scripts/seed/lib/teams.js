/** Loads existing teams into a name->id cache to avoid a round trip per lookup. */
export async function loadTeamCache(supabase) {
  const { data, error } = await supabase.from('teams').select('id,name');
  if (error) throw error;
  return new Map(data.map((t) => [t.name, t.id]));
}

/**
 * Returns the id for `name`, creating it with the Default.png fallback logo if it
 * doesn't exist yet — see PROJECT.md §3 "Team logo fallback".
 */
export async function getOrCreateTeamId(supabase, cache, name) {
  if (cache.has(name)) return cache.get(name);
  const { data, error } = await supabase
    .from('teams')
    .insert({ name, logo_filename: 'Default.png' })
    .select('id')
    .single();
  if (error) throw error;
  cache.set(name, data.id);
  return data.id;
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
