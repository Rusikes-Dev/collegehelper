'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Cookie consent.
 *
 * This banner exists only because of Google Analytics. Everything the product
 * itself needs — the signed session cookie, the visitor id — is strictly
 * necessary or first-party, and neither needs permission under the ePrivacy
 * rules the banner is answering.
 *
 * Two consequences worth keeping:
 *
 *   1. When no GA id is configured, the banner never renders at all. Showing a
 *      consent dialog for cookies you do not set is theatre, and it costs real
 *      conversions on a paid tool.
 *   2. Reject is a real reject, and it is as prominent as accept. A dismissed
 *      or ignored banner counts as no consent, so nothing loads. Consent that
 *      is hard to refuse is not consent.
 */

export const CONSENT_KEY = 'jcf_consent';
export type Consent = 'granted' | 'denied';

/** Fired on the window so the analytics loader can react without a shared store. */
export const CONSENT_EVENT = 'jcf:consent';

export function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    // Private browsing can throw on access. Treat it as "not yet decided",
    // which fails closed: no third-party script runs.
    return null;
  }
}

function writeConsent(value: Consent): void {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export default function CookieBanner({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Read after mount, never during render: the server has no localStorage,
    // and reading it during render would produce a hydration mismatch.
    if (readConsent() === null) setOpen(true);
  }, [enabled]);

  if (!enabled || !open) return null;

  const decide = (value: Consent) => { writeConsent(value); setOpen(false); };

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-body"
    >
      <div className="cookie-inner">
        <div>
          <p id="cookie-title" style={{ fontWeight: 600, fontSize: 15 }}>Analytics cookies</p>
          <p id="cookie-body" style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink-2)' }}>
            We&rsquo;d like to use Google Analytics to see which pages help students and which don&rsquo;t.
            It is entirely optional. The cookies that keep you signed in and remember your purchase are
            essential and are set either way.{' '}
            <Link href="/privacy">Privacy policy</Link>.
          </p>
        </div>
        <div className="cookie-actions">
          <button className="btn btn-secondary" onClick={() => decide('denied')}>Reject</button>
          <button className="btn btn-primary" onClick={() => decide('granted')}>Accept</button>
        </div>
      </div>
    </div>
  );
}
