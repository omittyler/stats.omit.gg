import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Add them to .env.local (see .env.example).'
  );
}

// Uses the public anon key, gated by Row Level Security policies (see
// supabase/rls_policies.sql) - this is safe to expose to the browser.
export const supabase = createClient(url, anonKey);
