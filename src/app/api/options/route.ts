import { NextResponse } from 'next/server';
import { loadDataset, programOptions } from '@/lib/dataset';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';
import { paymentsConfigured, PRICE_PAISE } from '@/lib/razorpay';
import { supabaseConfigured } from '@/lib/db';

/** Public form metadata: programmes, institute types, and what the data covers. */
export async function GET(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'options'), LIMITS.options);
    if (!gate.ok) return apiError('Too many requests. Please wait a moment.', 'RATE_LIMITED', 429);

    const ds = loadDataset();
    return NextResponse.json(
      {
        programs: programOptions(ds),
        instituteTypes: Object.entries(ds.instituteTypes).map(([code, v]) => ({
          code, label: v.label, full: v.full,
          available: (ds.byInstituteType.get(code as never)?.length ?? 0) > 0,
        })),
        institutes: ds.instituteList.map((i) => ({ id: i.id, name: i.name, type: i.type, state: i.state })),
        coverage: {
          years: ds.meta.years,
          rounds: ds.meta.rounds,
          rowCount: ds.meta.rowCount,
          instituteCount: ds.instituteList.length,
          updatedAt: ds.meta.generatedAt,
          source: ds.meta.source,
        },
        pricePaise: PRICE_PAISE,
        paymentsEnabled: paymentsConfigured(),
        // Restoring access needs somewhere to have stored the grant.
        restoreEnabled: supabaseConfigured(),
      },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } },
    );
  } catch (e) {
    return handleError(e);
  }
}
