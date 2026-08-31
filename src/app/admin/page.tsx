import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings, formatPrice } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('en-IN');

export default async function AdminHome() {
  await requireAdminPage();
  const db = supabaseAdmin();
  const settings = await getSettings();

  const since = (days: number) =>
    new Date(Date.now() - days * 86400_000).toISOString();

  const [buyers, paid, today, week, colleges, cutoffs, unpublished] = await Promise.all([
    db.from('app_users').select('id', { count: 'exact', head: true }),
    db.from('payments').select('amount_paise').eq('status', 'paid'),
    db
      .from('payments')
      .select('amount_paise')
      .eq('status', 'paid')
      .gte('created_at', since(1)),
    db
      .from('payments')
      .select('amount_paise')
      .eq('status', 'paid')
      .gte('created_at', since(7)),
    db.from('colleges').select('id', { count: 'exact', head: true }).eq('is_published', true),
    db.from('cutoff_records').select('id', { count: 'exact', head: true }),
    db.from('colleges').select('id', { count: 'exact', head: true }).eq('is_published', false),
  ]);

  const sum = (rows: any[] | null) =>
    (rows ?? []).reduce((t, r) => t + (r.amount_paise ?? 0), 0);

  const cards = [
    ['Predictor mode', settings.accessMode, '/admin/settings'],
    ['Price', formatPrice(settings.pricePaise), '/admin/settings'],
    ['Total revenue', formatPrice(sum(paid.data)), '/admin/payments'],
    ['Paid orders', nf.format(paid.data?.length ?? 0), '/admin/payments'],
    ['Revenue today', formatPrice(sum(today.data)), '/admin/payments'],
    ['Revenue this week', formatPrice(sum(week.data)), '/admin/payments'],
    ['Registered users', nf.format(buyers.count ?? 0), '/admin/users'],
    ['Published colleges', nf.format(colleges.count ?? 0), '/admin/colleges'],
    ['Cutoff records', nf.format(cutoffs.count ?? 0), '/admin/cutoffs'],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href} className="card p-4 hover:border-brand-ring">
            <p className="text-xs text-ink-muted">{label}</p>
            <p className="tnum mt-1 text-2xl font-medium text-ink">{value}</p>
          </Link>
        ))}
      </div>

      {(unpublished.count ?? 0) > 0 && (
        <div className="card border-possible/30 bg-possible-tint p-4">
          <p className="text-sm text-possible">
            {nf.format(unpublished.count ?? 0)} colleges are imported but not published,
            so they do not appear on the site or in predictor results.{' '}
            <Link href="/admin/colleges" className="font-medium underline">
              Review them
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
