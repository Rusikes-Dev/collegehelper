import type { Metadata, Viewport } from 'next';
import { Public_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { TabBar, TopBar } from '@/components/nav/tabs';
import { SiteFooter } from '@/components/site-footer';

/**
 * Two typefaces, one job each.
 *
 * Public Sans is drawn for public-information services: plain, legible at
 * small sizes on a cheap phone, and with none of the personality of a
 * marketing font. IBM Plex Mono carries every percentile, rank and course
 * code, because tabular figures are what make a column of cutoffs readable.
 */
const sans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-public-sans',
  display: 'swap',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collegehelper.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'CollegeHelper \u2014 MHT-CET college predictor',
    template: '%s | CollegeHelper',
  },
  description:
    'Enter your MHT-CET percentile or merit rank and see the Maharashtra ' +
    'engineering colleges you have a real chance at, using official CAP round ' +
    'cutoff data.',
  applicationName: 'CollegeHelper',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'CollegeHelper',
    locale: 'en_IN',
    url: siteUrl,
    title: 'MHT-CET college predictor',
    description:
      'Official CAP Round I, II and III cutoffs, turned into a straight answer ' +
      'about where you stand.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#10346B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col bg-white">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <TopBar />
        <main id="main" className="tabbar-gap flex-1 md:pb-10">
          {children}
        </main>
        <SiteFooter />
        <TabBar />
      </body>
    </html>
  );
}
