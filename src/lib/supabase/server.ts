import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Creates a Supabase client authenticated as the given user (via their JWT access token).
 * This respects RLS policies — rows with auth.uid() = user_id will be accessible.
 */
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a Supabase admin client using the service role key.
 * Bypasses RLS — use ONLY in secure server-side API routes, never expose to client.
 * Falls back to anon key if service role key is not configured.
 */
export function createAdminClient() {
  if (!supabaseServiceKey) {
    console.warn(
      '[QuickPrint] SUPABASE_SERVICE_ROLE_KEY not set. ' +
        'Using anon key as fallback. RLS may block some server-side operations.'
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
