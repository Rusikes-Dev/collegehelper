import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { TabBar, TopBar } from '@/components/nav/tabs';
import { SiteFooter } from '@/components/site-footer';

/**
 * One family for text, one for figures.
 *
 * Archivo is a grotesque with enough grit to hold a headline at 700 and enough
 * discipline to set a paragraph at 400, and it stays legible at 13px on a
 * cheap Android screen — which matters more here than novelty. Display sizes
 * get tighter tracking rather than a second typeface.
 *
 * IBM Plex Mono carries every percentile, rank and course code. Tabular
 * figures are the only reason: a column of closing cutoffs is comparable by
 * eye only when the digits line up.
 */
const sans = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-archivo',
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
  themeColor: '#4C3AA8',
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
