import Link from 'next/link';
import { getAdmin } from '@/lib/admin';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/settings', label: 'Predictor settings' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/users', label: 'Users & access' },
  { href: '/admin/cutoffs', label: 'Cutoff data' },
  { href: '/admin/colleges', label: 'Colleges' },
  { href: '/admin/analytics', label: 'Analytics' },
];

/**
 * Chrome only. Authorisation is enforced per page by requireAdminPage() and
 * per API route by requireAdmin(), because this layout also wraps the login
 * page and must stay reachable when signed out.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <h1 className="font-display text-xl font-semibold text-ink">CollegeHelper admin</h1>
        {admin && <span className="text-sm text-ink-muted">{admin.email}</span>}
      </div>
      {admin && (
        <nav className="mb-6 flex flex-wrap gap-1.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-card border border-rule px-3 py-2 text-sm text-ink-muted hover:bg-surface hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
      {children}
    </div>
  );
}
