'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Sends one page view per route change.
 *
 * sendBeacon is used where available so the request survives the student
 * navigating away or closing the tab mid-flight, which on a phone is most of
 * the time. The admin panel is excluded: your own visits should not appear in
 * your own traffic numbers.
 */
export default function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (last.current === pathname) return;
    last.current = pathname;

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      landing: first.current,
    });
    first.current = false;

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
      }
    } catch {
      /* analytics must never break the page */
    }
  }, [pathname]);

  return null;
}

/** Funnel milestones. Fire and forget; never awaited by the UI. */
export function trackEvent(event: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ event, props, path: location.pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
    }
  } catch {
    /* ignore */
  }
}
