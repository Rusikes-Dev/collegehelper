import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS completely.
 *
 * The `server-only` import above makes the build fail if this file is ever
 * pulled into a client component, which is the mistake that would leak the
 * key. Use it only where the server itself is the authority: verifying a
 * payment, granting access, reading cutoff rows behind the paywall.
 *
 * The client is untyped for now. Once the schema is applied, run
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 * and swap `any` for the generated `Database` type to get column-level
 * checking on every query in the app.
 */
type Db = SupabaseClient<any, 'public', any>;

let cached: Db | null = null;

export function supabaseAdmin(): Db {
  if (!cached) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'Supabase admin client needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    cached = createClient(url, key, { auth: { persistSession: false } });
  }
  return cached;
}
