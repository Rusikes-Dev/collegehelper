import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

/**
 * IBM Plex across three roles. Plex was chosen over the usual UI sans for two
 * concrete reasons: it ships genuine tabular figures, which matter because
 * this site is mostly columns of ranks and percentiles, and it has a Devanagari
 * companion if the site is ever offered in Marathi.
 */
const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const serif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-plex-serif',
  display: 'swap',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collegehelper.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'CollegeHelper \u2014 MHT-CET college information and predictor',
    template: '%s | CollegeHelper',
  },
  description:
    'Explore Maharashtra engineering college information and find MHT-CET ' +
    'colleges based on your percentile or merit rank, using official CAP ' +
    'round cutoff data.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'CollegeHelper',
    locale: 'en_IN',
    url: siteUrl,
    title: 'Find the right college with confidence',
    description:
      'MHT-CET college predictor and college information, built on official ' +
      'CAP Round I, II and III cutoff data.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#143C8C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
