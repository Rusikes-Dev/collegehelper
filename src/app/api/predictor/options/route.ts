import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { BRANCH_GROUPS, branchGroupFor } from '@/lib/branch-groups';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Everything the form needs, in one request.
 *
 * Branches are collapsed into three groups here rather than in the browser, so
 * the grouping the student sees and the grouping the query applies can never
 * drift apart. City is not offered: it split small result sets into empty ones
 * and students were filtering themselves out of colleges they would have taken.
 */
export async function GET() {
  noStore();

  const db = supabaseAdmin();
  const settings = await getSettings();

  const [branches, seatTypes, rounds] = await Promise.all([
    db.from('branches').select('id, name'),
    db.from('seat_types').select('category_group, special').order('category_group'),
    db
      .from('cutoff_datasets')
      .select('cap_round, round_order')
      .eq('is_published', true)
      .eq('academic_year', settings.activeYear)
      .order('round_order'),
  ]);

  const counts = new Map<string, number>();
  for (const b of branches.data ?? []) {
    const key = branchGroupFor((b as any).name ?? '');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // An empty form still needs to be diagnosable from the response, but a
  // database driver's error text can name tables, columns and constraints. The
  // response therefore carries booleans only; the message itself goes to the
  // server log, where it is useful and not public.
  const failures = {
    branches: Boolean(branches.error),
    seatTypes: Boolean(seatTypes.error),
    rounds: Boolean(rounds.error),
  };
  for (const [name, err] of [
    ['branches', branches.error],
    ['seatTypes', seatTypes.error],
    ['rounds', rounds.error],
  ] as const) {
    if (err) console.error(`predictor options: ${name} query failed:`, err.message);
  }

  return NextResponse.json({
    academicYear: settings.activeYear,
    accessMode: settings.accessMode,
    pricePaise: settings.pricePaise,
    branchGroups: BRANCH_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      blurb: g.blurb,
      count: counts.get(g.key) ?? 0,
    })),
    categories: [...new Set((seatTypes.data ?? []).map((s: any) => s.category_group))].sort(),
    specials: [...new Set((seatTypes.data ?? []).map((s: any) => s.special).filter(Boolean))].sort(),
    rounds: (rounds.data ?? []).map((r: any) => r.cap_round),
    diagnostics: { failures, generatedAt: new Date().toISOString() },
  });
}
