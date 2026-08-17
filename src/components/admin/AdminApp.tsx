'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminPayments from './AdminPayments';
import AdminVisitors from './AdminVisitors';
import AdminGrant from './AdminGrant';

type Tab = 'overview' | 'users' | 'grant' | 'payments' | 'visitors';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'overview', label: 'Overview', hint: 'Traffic, funnel and revenue' },
  { id: 'users', label: 'Students', hint: 'Search, grant and revoke' },
  { id: 'grant', label: 'Give access', hint: 'By email and mobile number' },
  { id: 'payments', label: 'Payments', hint: 'Every order and its outcome' },
  { id: 'visitors', label: 'Visitor log', hint: 'Live arrivals and sources' },
];

export default function AdminApp({ label, dbReady }: { label: string; dbReady: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');

  async function signOut() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div className="admin-top-inner">
          <div>
            <p className="admin-eyebrow">JEE College Finder</p>
            <h1 className="admin-title">Admin</h1>
          </div>
          <div className="admin-top-actions">
            <Link href="/" className="btn btn-ghost">View site</Link>
            <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
          </div>
        </div>

        <nav className="admin-tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="admin-tab"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
              title={t.hint}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="admin-main">
        {!dbReady ? (
          <div className="panel" style={{ background: 'var(--border-tint)', borderColor: 'var(--border-line)' }}>
            <h2 style={{ fontSize: 17 }}>Connect Supabase to switch this on</h2>
            <p style={{ marginTop: 10, fontSize: 14.5, color: 'var(--ink-2)' }}>
              The panel reads from Supabase, and no connection is configured. Add{' '}
              <code className="num">SUPABASE_URL</code> and{' '}
              <code className="num">SUPABASE_SERVICE_ROLE_KEY</code> to your environment variables, run{' '}
              <code className="num">supabase/schema.sql</code> in the Supabase SQL editor, then redeploy.
            </p>
            <p style={{ marginTop: 10, fontSize: 14.5, color: 'var(--ink-2)' }}>
              Until then the site still works and still takes payments &mdash; access just lives in the browser
              cookie only, so students cannot restore it on another device.
            </p>
          </div>
        ) : (
          <>
            {tab === 'overview' && <AdminOverview />}
            {tab === 'users' && <AdminUsers />}
            {tab === 'grant' && <AdminGrant />}
            {tab === 'payments' && <AdminPayments />}
            {tab === 'visitors' && <AdminVisitors />}
          </>
        )}
      </main>

      <p className="admin-foot">Signed in as {label}. Sessions last 12 hours.</p>
    </div>
  );
}
