import { requireAdmin } from '@/lib/admin';
import { adminUsers, audit, supabaseConfigured } from '@/lib/db';
import { apiError, handleError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Exports the user list as CSV, for a mail merge or your accountant.
 *
 * Fields are quoted and any leading =, +, - or @ is prefixed with a quote, so
 * a value cannot execute as a formula when the file is opened in Excel.
 */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!supabaseConfigured()) return apiError('Supabase is not configured.', 'DB_UNCONFIGURED', 503);

    const filter = ['all', 'paid', 'free', 'blocked'].includes(new URL(req.url).searchParams.get('filter') ?? '')
      ? new URL(req.url).searchParams.get('filter')!
      : 'all';

    const data = await adminUsers('', 5000, 0, filter);
    const header = [
      'name', 'email', 'phone', 'has_access', 'access_until', 'payments',
      'spend_inr', 'source', 'medium', 'campaign', 'landing', 'blocked', 'signed_up',
    ];

    const lines = [header.join(',')];
    for (const u of data.rows ?? []) {
      lines.push([
        u.name, u.email, u.phone, u.has_access ? 'yes' : 'no', u.access_until ?? '',
        u.payment_count, (u.spend_paise / 100).toFixed(2), u.first_source, u.first_medium,
        u.first_campaign, u.first_landing, u.blocked ? 'yes' : 'no', u.created_at,
      ].map(csvCell).join(','));
    }

    audit('users_exported', null, { by: admin.label, filter, count: data.rows?.length ?? 0 });

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(`\uFEFF${lines.join('\r\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="jcf-users-${filter}-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
