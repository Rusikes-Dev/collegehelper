import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Analytics from '@/components/Analytics';
import './globals.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'JEE College Finder \u2014 Colleges you can get at your JEE rank',
    template: '%s | JEE College Finder',
  },
  description:
    'Enter your JEE Main or JEE Advanced rank and see which IIT, NIT, IIIT and GFTI programmes had closing ranks within your reach last year. Build a choice list and download it as a PDF.',
  keywords: ['JEE college predictor', 'JoSAA cutoff', 'JEE Main college predictor', 'JEE Advanced rank', 'NIT cutoff', 'IIT cutoff', 'JoSAA choice list'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'JEE College Finder',
    title: 'Find JEE colleges you can get at your rank',
    description: 'Previous-year JoSAA closing ranks matched to your rank and category. \u20b949 one-time.',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title: 'JEE College Finder', description: 'Colleges within reach of your JEE rank, based on previous-year JoSAA closing ranks.' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1D4ED8' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1621' },
  ],
};

const FOOTER_LINKS = [
  { group: 'Tool', links: [['Find my colleges', '/find'], ['Restore my access', '/restore'], ['How it works', '/how-it-works'], ['JoSAA cutoffs', '/josaa-cutoff']] },
  { group: 'Predictors', links: [['JEE Main predictor', '/jee-main-college-predictor'], ['JEE Advanced predictor', '/jee-advanced-college-predictor'], ['College list', '/jee-college-list']] },
  { group: 'Legal', links: [['Privacy policy', '/privacy'], ['Terms & conditions', '/terms'], ['Refund policy', '/refunds'], ['Disclaimer', '/disclaimer'], ['Contact us', '/contact']] },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <a href="#main" className="btn btn-secondary sr-only">Skip to main content</a>

        <header style={{ borderBottom: '1px solid var(--rule)', position: 'sticky', top: 0, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)', zIndex: 40 }}>
          <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'var(--ink)' }}>
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-num)', fontSize: 13, fontWeight: 600 }}>JC</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16.5, letterSpacing: '-.02em' }}>JEE College Finder</span>
            </Link>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Link href="/restore" className="btn btn-ghost" style={{ fontSize: 14.5 }}>Restore access</Link>
              <Link href="/find" className="btn btn-primary" style={{ padding: '10px 16px', fontSize: 14.5 }}>Find my colleges</Link>
            </nav>
          </div>
        </header>

        <main id="main">{children}</main>

        <Analytics />

        <footer style={{ borderTop: '1px solid var(--rule)', background: 'var(--surface)', marginTop: 72, paddingBlock: '40px 32px' }}>
          <div className="wrap">
            <div style={{ display: 'grid', gap: 28, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {FOOTER_LINKS.map((col) => (
                <div key={col.group}>
                  <p style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', marginBottom: 10 }}>{col.group}</p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                    {col.links.map(([label, href]) => (
                      <li key={href}><Link href={href} style={{ color: 'var(--ink-2)', textDecoration: 'none', fontSize: 14.5 }}>{label}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--rule)', fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
              Cutoff figures are previous-year opening and closing ranks published by JoSAA. They are shown for counselling guidance only and do not
              guarantee admission. JEE College Finder is not affiliated with JoSAA, the NTA, the IITs, the NITs or any participating institute.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
