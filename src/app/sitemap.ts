import type { MetadataRoute } from 'next';
import { COLLEGES } from '@/data/colleges';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collegehelper.xyz';

/**
 * The five tabs plus one URL per written-up college. A college with no page
 * gets no URL, because a thin auto-generated page helps nobody and is the sort
 * of thing search engines rightly ignore.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/colleges', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/cet-updates', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/services', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
  ].map((r) => ({
    url: `${site}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  return [
    ...routes,
    ...COLLEGES.map((c) => ({
      url: `${site}/colleges/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
