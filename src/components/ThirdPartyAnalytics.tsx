'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { ANALYTICS, hasGA, hasPlausible } from '@/lib/site';
import { CONSENT_EVENT, readConsent, type Consent } from './CookieBanner';

/**
 * Optional third-party analytics, on top of the first-party tracking that
 * always runs and always feeds the admin panel.
 *
 * The two providers are treated differently on purpose:
 *
 *   - **Plausible** is cookieless and stores nothing on the device, so it
 *     loads immediately and is not gated behind the banner. Asking permission
 *     for it would be asking permission for nothing.
 *   - **GA4** sets cookies and profiles across sites, so it does not load at
 *     all until the student has actively accepted. Not on dismiss, not on
 *     scroll — on accept.
 *
 * Both are off entirely unless the matching env var is set, so the default
 * build ships no third-party script.
 */
export default function ThirdPartyAnalytics() {
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return (
    <>
      {hasPlausible() && (
        <Script
          strategy="afterInteractive"
          data-domain={ANALYTICS.plausibleDomain}
          src="https://plausible.io/js/script.js"
        />
      )}

      {hasGA() && consent === 'granted' && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS.ga4}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              // IP anonymisation is on and ad personalisation off: this is a
              // tool for school leavers, and their data is not for sale.
              gtag('config', '${ANALYTICS.ga4}', {
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
              });
            `}
          </Script>
        </>
      )}
    </>
  );
}
