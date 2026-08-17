import type { NextConfig } from 'next';

/**
 * Security headers.
 *
 * The Razorpay entries are deliberately wildcarded to `*.razorpay.com`. Their
 * checkout hands off to bank and UPI pages on subdomains that are not
 * documented and do change, and a CSP that blocks one of those does not fail
 * visibly — it fails as a student who cannot pay and never tells you. Payments
 * are the thing least worth being clever about here.
 */

const RAZORPAY = 'https://*.razorpay.com';

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next's own bootstrap scripts.
  `script-src 'self' 'unsafe-inline' ${RAZORPAY}`,
  `frame-src ${RAZORPAY}`,
  `connect-src 'self' ${RAZORPAY} https://lumberjack.razorpay.com`,
  `img-src 'self' data: blob: ${RAZORPAY}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  // Clickjacking defence in the modern form; X-Frame-Options is kept below for
  // older browsers that ignore this directive.
  "frame-ancestors 'none'",
  // Left unset deliberately: bank and UPI redirects post forms to hosts that
  // cannot be enumerated ahead of time.
].join('; ');

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pdfkit ships its own font binaries and must not be bundled.
  serverExternalPackages: ['pdfkit'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      // Belt and braces alongside robots.txt: these must never be indexed, and
      // a header applies even when a page is reached by a link we did not write.
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/results',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default config;
