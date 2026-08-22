import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/**
 * Nothing here is a security control — a crawler that ignores robots.txt is
 * not stopped by it. The real gates are `requirePaidSession()` on the results
 * API and the password on the admin panel. This exists so well-behaved
 * crawlers do not waste budget on pages that are personal, gated or
 * meaningless without a session.
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/results',   // personal and paid
          '/admin',     // yours
          '/thank-you', // post-payment confirmation
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
