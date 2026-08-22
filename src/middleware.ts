import { NextResponse, type NextRequest } from 'next/server';
import { attributionFrom, encodeAttribution } from '@/lib/attribution';

/**
 * Two first-party cookies, set once and then left alone:
 *
 *   jcf_vid   a random visitor id, so page views can be grouped into sessions
 *             and people without turning anyone into a name.
 *   jcf_attr  where this visitor first arrived from, pinned for a year.
 *
 * Doing this in middleware rather than in the browser means attribution is
 * captured on the very first response, before any script has run, so a visitor
 * who bounces in two seconds is still counted against the right source.
 */

const VISITOR_COOKIE = 'jcf_vid';
const ATTR_COOKIE = 'jcf_attr';
const YEAR = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const existingVid = req.cookies.get(VISITOR_COOKIE)?.value;
  const vid = existingVid ?? crypto.randomUUID();

  if (!existingVid) {
    res.cookies.set(VISITOR_COOKIE, vid, {
      httpOnly: false, // the client beacon reads it back
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: YEAR,
    });
  }

  // First touch only. A returning visitor keeps the source that brought them in.
  const hasAttr = Boolean(req.cookies.get(ATTR_COOKIE)?.value);
  const taggedNow = req.nextUrl.searchParams.has('utm_source') || req.nextUrl.searchParams.has('gclid');

  if (!hasAttr || taggedNow) {
    const attr = attributionFrom(req.nextUrl, req.headers.get('referer'), req.nextUrl.hostname);
    res.cookies.set(ATTR_COOKIE, encodeAttribution(attr), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: YEAR,
    });
  }

  return res;
}

export const config = {
  // Page requests only. Static assets and API routes would just add noise,
  // and every icon that falls through here costs a middleware invocation on
  // Vercel for a file that never changes.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icon-192.png|icon-512.png|icon-maskable-512.png|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
};
