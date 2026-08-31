import { requireAdminPage } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GrantAccessForm } from '@/components/admin/grant-access-form';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireAdminPage();
  const db = supabaseAdmin();
  const q = (searchParams.q ?? '').trim();

  let query = db
    .from('app_users')
    .select('id, name, email, phone, created_at, access_grants(id, source, created_at, revoked_at, expires_at)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (q) query = query.or(`email.ilike.%${q}%,phone.ilike.%${q}%,name.ilike.%${q}%`);

  const { data } = await query;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-display-sm font-semibold text-ink">Users & access</h2>

      <div className="card p-5">
        <h3 className="font-medium text-ink">Grant access manually</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Creates the user if they do not exist yet, then grants access from the admin
          panel. Useful when a payment succeeded but the callback did not land.
        </p>
        <div className="mt-4">
          <GrantAccessForm />
        </div>
      </div>

      <form className="flex gap-2" action="/admin/users">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email or phone"
          className="w-full max-w-sm rounded-card border border-rule px-3 py-2 text-sm"
        />
        <button className="rounded-card border border-rule px-3 py-2 text-sm hover:bg-surface">
          Search
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-ink-muted">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Access</th>
              <th className="p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u: any) => {
              const live = (u.access_grants ?? []).filter(
                (g: any) =>
                  !g.revoked_at && (!g.expires_at || new Date(g.expires_at) > new Date()),
              );
              return (
                <tr key={u.id} className="border-b border-rule/60">
                  <td className="p-3 text-ink">{u.name ?? '\u2014'}</td>
                  <td className="p-3 text-ink-muted">{u.email}</td>
                  <td className="tnum p-3 text-ink-muted">{u.phone}</td>
                  <td className="p-3">
                    {live.length ? (
                      <span className="rounded-full bg-good-tint px-2 py-0.5 text-xs text-good">
                        active &middot; {live[0].source}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-faint">none</span>
                    )}
                  </td>
                  <td className="p-3 text-ink-muted">
                    {new Date(u.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!(data ?? []).length && (
          <p className="p-6 text-sm text-ink-muted">No users match that search.</p>
        )}
      </div>
    </div>
  );
}
