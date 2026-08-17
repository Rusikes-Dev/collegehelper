import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { recordVisit, recordEvent, supabaseConfigured } from '@/lib/db';
import { decodeAttribution, parseUserAgent, isBot } from '@/lib/attribution';
import { readSession } from '@/lib/session';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';

export const runtime = 'nodejs';

/**
 * The analytics beacon.
 *
 * Always returns 204, whatever happens. A failed write here is a missing row
 * in a dashboard, and it must never surface as an error in a student's
 * browser or slow down the page they are actually trying to read.
 *
 * What is stored: a random visitor id, the path, the source, a coarse device
 * label and a country code. What is not stored: IP addresses, rank values,
 * or anything typed into the form.
 */

const schema = z.object({
  path: z.string().max(200).default('/'),
  referrer: z.string().max(300).optional().nullable(),
  landing: z.boolean().default(false),
  event: z.string().max(60).optional(),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(req: Request) {
  try {
    if (!supabaseConfigured()) return noContent();

    const gate = rateLimit(clientKey(req, 'track'), LIMITS.track);
    if (!gate.ok) return noContent();

    const h = await headers();
    const ua = h.get('user-agent') ?? '';
    if (isBot(ua)) return noContent();

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return noContent();
    const body = parsed.data;

    const jar = await cookies();
    const visitorId = jar.get('jcf_vid')?.value;
    if (!visitorId) return noContent();

    const attribution = decodeAttribution(jar.get('jcf_attr')?.value);
    const session = await readSession().catch(() => null);
    const userId = session?.userId ?? null;

    if (body.event) {
      recordEvent({ name: body.event, visitorId, userId, props: body.props });
      return noContent();
    }

    recordVisit({
      visitorId,
      userId,
      path: body.path,
      referrer: body.referrer ?? null,
      attribution,
      landing: body.landing,
      device: parseUserAgent(ua),
      // Vercel adds these at the edge; they are absent locally, which is fine.
      country: h.get('x-vercel-ip-country'),
      region: h.get('x-vercel-ip-country-region'),
      city: h.get('x-vercel-ip-city'),
    });

    return noContent();
  } catch (e) {
    console.warn('[track] dropped', (e as Error)?.message);
    return noContent();
  }
}
