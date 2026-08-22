/**
 * Single source of truth for the things that are *yours* rather than the
 * product's: contact details, business identity and analytics ids.
 *
 * Everything here is safe to render in the browser. Anything secret belongs in
 * an environment variable read on the server, not in this file.
 *
 * Razorpay requires reachable contact details on the live site, and both the
 * contact page and the footer read from here, so there is one place to change
 * when the address or the support email changes.
 */

export const SITE = {
  name: 'JEE College Finder',
  shortName: 'College Finder',
  tagline: 'Colleges within reach of your JEE rank',

  /** Canonical origin. Set NEXT_PUBLIC_SITE_URL in Vercel before going live. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com',

  /** Support inbox. Shown publicly and used by Razorpay for buyer contact. */
  email: 'rushikeshlade3014s@gmail.com',

  /**
   * Optional. Fill these in when you have them; every place that renders them
   * checks for an empty string first, so a blank value is simply omitted
   * rather than printing "undefined" on a legal page.
   */
  phone: '',
  addressLines: [] as string[],
  legalName: '',

  /** Typical first-reply time, shown on the contact page so nobody is left guessing. */
  responseTime: 'within 24 hours, usually much sooner',

  locale: 'en-IN',
  country: 'IN',
  currency: 'INR',
} as const;

export const MAILTO = `mailto:${SITE.email}`;

/** Prefilled subject lines, so a support mail arrives already triaged. */
export function supportMailto(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject, ...(body ? { body } : {}) });
  return `${MAILTO}?${params.toString()}`;
}

/* ------------------------------------------------------------------ *
 * Analytics
 *
 * The first-party tracker (src/components/Analytics.tsx) always runs and
 * always feeds the admin panel. These are *optional extras* for when you want
 * Google's reporting as well. Both are off unless the env var is set, so the
 * default build ships no third-party script at all.
 * ------------------------------------------------------------------ */

export const ANALYTICS = {
  /** GA4 measurement id, e.g. G-XXXXXXXXXX. */
  ga4: process.env.NEXT_PUBLIC_GA_ID ?? '',
  /** Plausible domain, e.g. your-domain.com. Cookieless, needs no consent. */
  plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? '',
} as const;

export const hasGA = () => ANALYTICS.ga4.startsWith('G-');
export const hasPlausible = () => ANALYTICS.plausibleDomain.length > 0;

/** True when a consent decision is needed before any script may load. */
export const needsCookieConsent = () => hasGA();
