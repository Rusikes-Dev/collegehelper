import type { MetadataRoute } from 'next';
import { collegeIndex } from '@/data/colleges';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collegehelper.xyz';

/**
 * The five tabs, the reference pages, and one URL per college in the CAP
 * dataset.
 *
 * Every one of those pages carries a branch list and the official closing
 * figures for three rounds, so none of them is the thin auto-generated page
 * search engines rightly ignore.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/colleges', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/cet-updates', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/services', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
    // Reference and trust pages. /methodology and /faq are substantive content
    // and are weighted accordingly; the policies are indexable but low priority.
    { path: '/methodology', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/disclaimer', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  ].map((r) => ({
    url: `${site}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  return [
    ...routes,
    ...collegeIndex().map((c) => ({
      url: `${site}/colleges/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
