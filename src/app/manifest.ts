import type { MetadataRoute } from 'next';

/**
 * Makes the tool installable from the browser's "Add to home screen".
 *
 * Worth having because counselling runs over several days: a student who has
 * paid comes back repeatedly to compare a new shortlist, and an icon on the
 * home screen beats hunting through browser history for a URL they never
 * bookmarked.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JEE College Finder',
    short_name: 'College Finder',
    description: 'Colleges within reach of your JEE rank, based on previous-year JoSAA closing ranks.',
    start_url: '/find',
    scope: '/',
    id: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1D4ED8',
    orientation: 'portrait',
    lang: 'en-IN',
    categories: ['education'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Android crops installed icons to a circle. The maskable variant carries
      // the safe-zone padding so the monogram survives that crop rather than
      // having its corners shaved off.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
