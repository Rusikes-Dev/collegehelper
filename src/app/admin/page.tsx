import type { Metadata } from 'next';
import { readAdminSession, adminConfigured } from '@/lib/admin';
import { supabaseConfigured } from '@/lib/db';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminApp from '@/components/admin/AdminApp';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

/**
 * The panel is gated on the server, so an unauthenticated visitor never
 * receives the admin markup at all — there is no client flag to flip and no
 * hidden component to reveal in DevTools.
 */
export default async function AdminPage() {
  const session = await readAdminSession();

  if (!session) return <AdminLogin configured={adminConfigured()} />;

  return <AdminApp label={session.label} dbReady={supabaseConfigured()} />;
}
