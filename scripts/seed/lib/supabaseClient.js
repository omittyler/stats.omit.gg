import 'dotenv/config';
import { config as loadEnvLocal } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Next.js convention: real credentials live in .env.local (gitignored), not .env.
loadEnvLocal({ path: '.env.local', override: true });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local ' +
    'and fill in your Supabase project\'s URL and service-role key (Project Settings -> API).'
  );
}

export const supabase = createClient(url, key, { auth: { persistSession: false } });
