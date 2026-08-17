/**
 * Where a visitor came from.
 *
 * Two rules make the numbers in the admin panel trustworthy:
 *
 *  1. First touch wins. The source is captured on the first page of the first
 *     visit and pinned in a cookie for a year. Otherwise every student who
 *     leaves and comes back through a bookmark is re-attributed to "direct",
 *     and organic search looks like it converts far worse than it does.
 *  2. Self-referrals are ignored. A click from your own page is not a source.
 */

export interface Attribution {
  source: string;
  medium: string;
  campaign: string | null;
  term: string | null;
  content: string | null;
  referrer: string | null;
  referrerHost: string | null;
  landing: string | null;
  at: number;
}

/** Hosts that mean "someone searched for us". */
const SEARCH_ENGINES: Record<string, string> = {
  'google.': 'google', 'bing.': 'bing', 'duckduckgo.': 'duckduckgo', 'yahoo.': 'yahoo',
  'ecosia.': 'ecosia', 'brave.': 'brave', 'baidu.': 'baidu', 'yandex.': 'yandex',
  'startpage.': 'startpage', 'qwant.': 'qwant',
};

/** Hosts that mean "someone shared us". Instagram and WhatsApp matter most here. */
const SOCIAL: Record<string, string> = {
  'instagram.': 'instagram', 'l.instagram.': 'instagram',
  'facebook.': 'facebook', 'l.facebook.': 'facebook', 'fb.': 'facebook',
  'whatsapp.': 'whatsapp', 'wa.me': 'whatsapp', 'api.whatsapp.': 'whatsapp',
  'youtube.': 'youtube', 'youtu.be': 'youtube',
  't.co': 'twitter', 'twitter.': 'twitter', 'x.com': 'twitter',
  'reddit.': 'reddit', 'out.reddit.': 'reddit',
  'linkedin.': 'linkedin', 'lnkd.in': 'linkedin',
  'telegram.': 'telegram', 't.me': 'telegram',
  'quora.': 'quora', 'pinterest.': 'pinterest', 'snapchat.': 'snapchat',
};

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function classify(host: string): { source: string; medium: string } {
  for (const [needle, name] of Object.entries(SEARCH_ENGINES)) {
    if (host.startsWith(needle) || host === needle.replace(/\.$/, '')) return { source: name, medium: 'organic' };
  }
  for (const [needle, name] of Object.entries(SOCIAL)) {
    if (host === needle || host.startsWith(needle) || host.endsWith(`.${needle.replace(/\.$/, '')}`)) {
      return { source: name, medium: 'social' };
    }
  }
  return { source: host, medium: 'referral' };
}

/**
 * Medium implied by a source name alone.
 *
 * Instagram and WhatsApp links usually arrive with no referrer at all — the
 * app strips it — so a link tagged `utm_source=instagram` and nothing else
 * would otherwise be filed under medium "none" and sit in the same bucket as
 * genuine direct traffic. That single bucket is where most of the useful
 * signal would go missing, since it is how a student-facing tool actually
 * spreads.
 */
function mediumForSource(source: string): string | null {
  const s = source.toLowerCase();
  if (Object.values(SEARCH_ENGINES).includes(s)) return 'organic';
  if (Object.values(SOCIAL).includes(s)) return 'social';
  return null;
}

const clean = (v: string | null | undefined, max = 120): string | null => {
  const s = (v ?? '').trim().slice(0, max);
  return s || null;
};

/**
 * Reads attribution out of a request URL plus its referrer.
 * `selfHost` is this site's own hostname, so internal navigation is not
 * mistaken for a referral.
 */
export function attributionFrom(url: URL, referrer: string | null, selfHost: string | null): Attribution {
  const p = url.searchParams;
  const utmSource = clean(p.get('utm_source'), 60);
  const utmMedium = clean(p.get('utm_medium'), 60);
  const refHostRaw = hostOf(referrer);
  const refHost = refHostRaw && selfHost && refHostRaw === selfHost.replace(/^www\./, '') ? null : refHostRaw;

  // An explicit tag beats a guess, but source and medium are resolved
  // independently: a link tagged with only utm_source must still get its
  // medium worked out rather than falling through to "none".
  const fromReferrer = refHost ? classify(refHost) : null;

  // gclid and fbclid arrive with the referrer stripped on many browsers.
  const fromClickId =
    p.get('gclid') ? { source: 'google', medium: 'cpc' }
    : p.get('fbclid') ? { source: 'facebook', medium: 'social' }
    : null;

  const source = utmSource ?? fromReferrer?.source ?? fromClickId?.source ?? 'direct';
  const medium =
    utmMedium
    ?? fromReferrer?.medium
    ?? fromClickId?.medium
    ?? (utmSource ? mediumForSource(utmSource) ?? 'referral' : 'none');

  return {
    source,
    medium,
    campaign: clean(p.get('utm_campaign'), 80),
    term: clean(p.get('utm_term'), 80),
    content: clean(p.get('utm_content'), 80),
    referrer: clean(referrer, 200),
    referrerHost: refHost,
    landing: `${url.pathname}`.slice(0, 200),
    at: Date.now(),
  };
}

export function encodeAttribution(a: Attribution): string {
  // Next.js percent-encodes cookie values on the way out and decodes them on
  // the way in, so no encoding is applied here. Doing it as well would double
  // the size of a cookie that rides along on every single request.
  return JSON.stringify(a);
}

/** Tolerant of both the encoded and the plain form, so an older cookie still reads. */
export function decodeAttribution(raw: string | undefined): Attribution | null {
  if (!raw) return null;
  for (const candidate of [raw, safeDecode(raw)]) {
    if (!candidate) continue;
    try {
      const a = JSON.parse(candidate) as Attribution;
      if (a && typeof a.source === 'string') return a;
    } catch {
      /* try the next form */
    }
  }
  return null;
}

function safeDecode(v: string): string | null {
  try { return decodeURIComponent(v); } catch { return null; }
}

/* ------------------------------------------------------------------ */
/* Device                                                              */
/* ------------------------------------------------------------------ */

export interface DeviceInfo { device: string; os: string; browser: string }

/**
 * Coarse UA parsing. Enough to answer "are my users on phones?", which is the
 * only question the admin panel asks of it. No fingerprinting.
 */
export function parseUserAgent(ua: string): DeviceInfo {
  const s = ua.toLowerCase();

  const tablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s);
  const mobile = !tablet && /mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s);
  const device = tablet ? 'tablet' : mobile ? 'mobile' : 'desktop';

  const os =
    /iphone|ipad|ipod/.test(s) ? 'iOS'
    : /android/.test(s) ? 'Android'
    : /windows/.test(s) ? 'Windows'
    : /mac os x/.test(s) ? 'macOS'
    : /linux/.test(s) ? 'Linux'
    : 'Other';

  const browser =
    /edg\//.test(s) ? 'Edge'
    : /opr\/|opera/.test(s) ? 'Opera'
    : /samsungbrowser/.test(s) ? 'Samsung Internet'
    : /chrome|crios/.test(s) ? 'Chrome'
    : /firefox|fxios/.test(s) ? 'Firefox'
    : /safari/.test(s) ? 'Safari'
    : 'Other';

  return { device, os, browser };
}

const BOT = /bot|crawler|spider|crawling|slurp|facebookexternalhit|preview|lighthouse|headless|curl|wget|python-requests|axios|monitor|pingdom|uptime/i;

export function isBot(ua: string): boolean {
  return !ua || BOT.test(ua);
}
