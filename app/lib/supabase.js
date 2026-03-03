import { createClient } from '@supabase/supabase-js';

// Server-side client uses the service role key, which bypasses RLS.
// All queries MUST filter by user_id from Clerk auth() — never trust client input for isolation.
export function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
