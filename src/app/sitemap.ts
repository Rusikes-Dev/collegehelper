import type { MetadataRoute } from 'next';
import { PAGES } from '@/content/pages';
import { SITE } from '@/lib/site';

/**
 * The sitemap lists what a search engine should index, which is not the same
 * as every route that exists.
 *
 * Left out on purpose:
 *   /results     personal, gated, and noindex
 *   /thank-you   a confirmation page; indexing it would put "payment
 *                successful" in front of people who have not paid
 *   /admin       yours, not the public's
 *   /api/*       not pages
 *
 * Priorities are relative to each other, not absolute scores. The two that
 * convert — the search form and the checkout — sit above the explainer pages,
 * which in turn sit above the legal ones.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = SITE.url.replace(/\/$/, '');

  const priorityFor = (slug: string): number => {
    if (slug === 'how-it-works') return 0.8;
    // Legal pages must be reachable — Razorpay checks for them — but they are
    // not what anyone is searching for.
    if (['privacy', 'terms', 'refunds', 'disclaimer'].includes(slug)) return 0.3;
    if (slug === 'contact') return 0.5;
    return 0.6;
  };

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/find`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/pay`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/restore`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ...PAGES.map((p) => ({
      url: `${base}/${p.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: priorityFor(p.slug),
    })),
  ];
}
