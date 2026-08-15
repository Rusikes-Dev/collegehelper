import type { MetadataRoute } from 'next';
import { PAGES } from '@/content/pages';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/find`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...PAGES.map((p) => ({
      url: `${SITE}/${p.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: p.slug === 'how-it-works' ? 0.8 : 0.5,
    })),
  ];
}
