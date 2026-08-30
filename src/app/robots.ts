import type { MetadataRoute } from 'next';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collegehelper.xyz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
