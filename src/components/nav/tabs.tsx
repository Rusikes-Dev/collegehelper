'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Gauge, Info, Megaphone, Search } from 'lucide-react';

/**
 * Five destinations, fixed for the life of the app.
 *
 * The whole site is one of these five screens, so a student never has to work
 * out where they are or how to get back. On a phone they sit in a bar at the
 * bottom, within thumb reach; from the `md` breakpoint up the same five move
 * into the header and the bar disappears.
 */
export const TABS = [
  { href: '/', label: 'Predict', icon: Gauge, exact: true },
  { href: '/colleges', label: 'Search', icon: Search, exact: false },
  { href: '/services', label: 'Services', icon: Building2, exact: false },
  { href: '/cet-updates', label: 'Updates', icon: Megaphone, exact: false },
  { href: '/about', label: 'About', icon: Info, exact: false },
] as const;

function useActive() {
  const pathname = usePathname() ?? '/';
  const isAdmin = pathname.startsWith('/admin');
  const active = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);
  return { pathname, isAdmin, active };
}

export function TopBar() {
  const { isAdmin, active } = useActive();
  if (isAdmin) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="screen-wide flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-[1.0625rem] font-bold tracking-tight text-brand">
            CollegeHelper
          </span>
          <span className="text-xs text-ink-faint">.xyz</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {TABS.map((t) => {
            const on = active(t.href, t.exact);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className={
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
                  (on ? 'bg-brand-tint text-brand' : 'text-ink-muted hover:text-ink')
                }
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <span className="tnum rounded-full border border-line px-2.5 py-1 text-[0.6875rem] text-ink-muted md:hidden">
          MHT-CET 2026-27
        </span>
      </div>
    </header>
  );
}

export function TabBar() {
  const { isAdmin, active } = useActive();
  if (isAdmin) return null;

  return (
    <nav
      aria-label="Main"
      className="tabbar-inset fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white shadow-bar md:hidden"
    >
      <ul className="mx-auto flex max-w-screen">
        {TABS.map((t) => {
          const on = active(t.href, t.exact);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className="flex h-15 flex-col items-center justify-center gap-1"
              >
                <span
                  className={
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors ' +
                    (on ? 'bg-brand-tint text-brand' : 'text-ink-faint')
                  }
                >
                  <Icon size={19} strokeWidth={on ? 2.4 : 1.9} aria-hidden />
                </span>
                <span
                  className={
                    'text-[0.6875rem] leading-none ' +
                    (on ? 'font-semibold text-brand' : 'text-ink-muted')
                  }
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
