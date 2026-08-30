import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collegehelper.xyz';

/**
 * Only published colleges are listed. Thin auto-generated pages are exactly
 * what the spec warns against, so a college with no data does not get a URL
 * here until an admin publishes it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['', '/colleges', '/college-predictor', '/about', '/contact'].map(
    (path) => ({
      url: `${site}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.8,
    }),
  );

  try {
    const { data } = await supabaseAdmin()
      .from('colleges')
      .select('slug, updated_at')
      .eq('is_published', true)
      .limit(5000);

    return [
      ...staticRoutes,
      ...(data ?? []).map((c: any) => ({
        url: `${site}/colleges/${c.slug}`,
        lastModified: new Date(c.updated_at ?? Date.now()),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
