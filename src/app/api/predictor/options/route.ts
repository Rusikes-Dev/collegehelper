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

  // Surfaced so an empty form can be diagnosed from the response itself.
  // Contains no user or secret data.
  const errors = {
    branches: branches.error?.message ?? null,
    seatTypes: seatTypes.error?.message ?? null,
    rounds: rounds.error?.message ?? null,
  };

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
    diagnostics: { errors, generatedAt: new Date().toISOString() },
  });
}
