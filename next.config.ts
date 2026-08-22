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

/**
 * Analytics origins.
 *
 * Listed unconditionally rather than only when the env var is set. The header
 * is built once at build time, and a CSP that silently differs between
 * environments is the kind of thing that passes locally and blocks a script in
 * production. Neither host can do anything if no script tag ever points at it,
 * so naming them costs nothing.
 */
const GOOGLE_ANALYTICS = 'https://www.googletagmanager.com https://www.google-analytics.com';
const GA_CONNECT = 'https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com';
const PLAUSIBLE = 'https://plausible.io';

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next's own bootstrap scripts.
  `script-src 'self' 'unsafe-inline' ${RAZORPAY} ${GOOGLE_ANALYTICS} ${PLAUSIBLE}`,
  `frame-src ${RAZORPAY}`,
  `connect-src 'self' ${RAZORPAY} https://lumberjack.razorpay.com ${GA_CONNECT} ${PLAUSIBLE}`,
  `img-src 'self' data: blob: ${RAZORPAY} ${GOOGLE_ANALYTICS}`,
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
      // A confirmation page must never be indexed: it would put a "payment
      // successful" page in front of people who have not paid.
      {
        source: '/thank-you',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      // Icons and the manifest change only on deploy, so they can be cached hard.
      {
        source: '/:file(favicon.ico|apple-icon.png|icon.svg|icon-192.png|icon-512.png|icon-maskable-512.png)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default config;
