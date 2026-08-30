import { NextResponse } from 'next/server';
import { z } from 'zod';
import { track, referrerHost, TRACKED_EVENTS } from '@/lib/analytics';
import { anonId, currentUserIdFromCookie } from '@/lib/access';

export const dynamic = 'force-dynamic';

const schema = z.object({
  event: z.enum(TRACKED_EVENTS),
  path: z.string().max(300).optional(),
  properties: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  // Silently accept bad payloads: an analytics beacon should never surface an
  // error to the person using the site.
  if (!parsed.success) return NextResponse.json({ ok: true });

  await track(parsed.data.event, {
    anonId: anonId(),
    userId: currentUserIdFromCookie(),
    path: parsed.data.path ?? null,
    referrerHost: referrerHost(req.headers.get('referer')),
    properties: parsed.data.properties,
  });
  return NextResponse.json({ ok: true });
}
