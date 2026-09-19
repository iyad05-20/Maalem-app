import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// ─── dotenv must be called here because this module is evaluated before
// server.js has a chance to call dotenv.config() (ESM imports are hoisted).
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '❌ SUPABASE_URL and SUPABASE_KEY must be set in .env\n' +
    '   Make sure the .env file is present in apps/backend/'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
