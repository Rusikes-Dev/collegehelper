import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Admin authorisation.
 *
 * Identity comes from Supabase Auth; authority comes from a row in
 * admin_users. The /admin URL is not a secret and is never treated as one:
 * every admin page and every admin API route calls requireAdmin().
 */
export type AdminUser = { id: string; email: string; role: string };

export async function getAdmin(): Promise<AdminUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdmin()
    .from('admin_users')
    .select('id, email, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!data || !data.is_active) return null;
  return { id: data.id as string, email: data.email as string, role: data.role as string };
}

/** For API routes: throws, so the handler can return 403. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new Error('UNAUTHORISED');
  return admin;
}

/**
 * For admin pages: redirects to the login screen instead of throwing.
 *
 * The gate lives on each page rather than in the shared layout, because the
 * layout also wraps the login page itself — gating there would redirect the
 * login page to itself forever.
 */
export async function requireAdminPage(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
