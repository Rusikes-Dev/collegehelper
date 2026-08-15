import { NextResponse } from 'next/server';
import { loadDataset, rowsForTypes } from '@/lib/dataset';
import { evaluate } from '@/lib/eligibility';
import { searchSchema, fieldErrors } from '@/lib/validation';
import { newSession, writeSession, readSession } from '@/lib/session';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';
import { PRICE_PAISE } from '@/lib/razorpay';
import type { StudentProfile, SearchPreferences } from '@/lib/types';

/**
 * Runs the search and opens a session for it.
 *
 * The free response carries counts only: enough for the student to see the
 * search worked and decide whether it is worth paying for, with no institute
 * or programme names. The full result set sits behind the payment gate.
 */
export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'search'), LIMITS.results);
    if (!gate.ok) return apiError('Too many searches. Please wait a moment.', 'RATE_LIMITED', 429);

    const parsed = searchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please check the highlighted fields.', code: 'VALIDATION', fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }
    const v = parsed.data;

    const student: StudentProfile = {
      ranks: {
        mainCrl: v.mainCrl,
        mainCategory: v.mainCategory ?? null,
        mainPwd: v.mainPwd ?? null,
        advancedCrl: v.advancedCrl ?? null,
        advancedCategory: v.advancedCategory ?? null,
        advancedPwd: v.advancedPwd ?? null,
      },
      category: v.category,
      isPwd: v.isPwd,
      gender: v.gender,
      homeState: v.homeState,
    };
    const preferences: SearchPreferences = { instituteTypes: v.instituteTypes, programIds: v.programIds };

    const ds = loadDataset();
    let rows = rowsForTypes(ds, preferences.instituteTypes);
    if (preferences.programIds !== 'ALL') {
      const wanted = new Set(preferences.programIds);
      rows = rows.filter((r) => wanted.has(r.programId));
    }

    const result = evaluate({ rows, institutes: ds.institutes, programs: ds.programs, student });

    // Reuse an existing paid session when the student re-runs the identical
    // search, so nobody is charged twice for the same thing.
    const existing = await readSession();
    const sameSearch =
      existing?.paid &&
      JSON.stringify(existing.student) === JSON.stringify(student) &&
      JSON.stringify(existing.preferences) === JSON.stringify(preferences);

    const session = sameSearch ? existing! : newSession(student, preferences);
    await writeSession(session);

    const byType: Record<string, number> = {};
    const institutes = new Set<number>();
    const programs = new Set<number>();
    for (const m of result.eligible) {
      byType[m.institute.type] = (byType[m.institute.type] ?? 0) + 1;
      institutes.add(m.institute.id);
      programs.add(m.program.id);
    }

    return NextResponse.json({
      alreadyPaid: Boolean(sameSearch),
      pricePaise: PRICE_PAISE,
      summary: {
        eligible: result.eligible.length,
        nearMisses: result.nearMisses.length,
        institutes: institutes.size,
        programs: programs.size,
        byType,
      },
      unevaluated: result.unevaluated,
      ranksUsed: result.ranksUsed,
      coverage: { years: ds.meta.years, rounds: ds.meta.rounds },
    });
  } catch (e) {
    return handleError(e);
  }
}
