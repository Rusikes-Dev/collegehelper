import { NextResponse } from 'next/server';
import { predictorInputSchema } from '@/lib/validation';
import { getSettings } from '@/lib/settings';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { classify, summarise, type CutoffRow } from '@/lib/predictor';
import { branchGroupFor } from '@/lib/branch-groups';
import { currentUserIdFromCookie, hasActiveGrant, anonId } from '@/lib/access';
import { track } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/**
 * The paywall lives here and nowhere else.
 *
 * When the predictor is PAID and the caller has no access grant, the rows are
 * never serialised into the response at all. The caller gets counts only, so
 * the paid content cannot be recovered from the network tab.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const parsed = predictorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check your inputs.' },
      { status: 422 },
    );
  }
  const input = parsed.data;
  const settings = await getSettings();
  const db = supabaseAdmin();

  // The student picked one to three branch groups; turn them into branch ids
  // using the same rules the form displayed.
  let branchIds: string[] | null = null;
  if (input.branchGroups?.length && input.branchGroups.length < 3) {
    const { data: branches } = await db.from('branches').select('id, name');
    const wanted = new Set(input.branchGroups);
    branchIds = (branches ?? [])
      .filter((b: any) => wanted.has(branchGroupFor(b.name ?? '')))
      .map((b: any) => b.id as string);
    if (!branchIds.length) branchIds = null;
  }

  const { data, error } = await db.rpc('predict_colleges', {
    p_academic_year: settings.activeYear,
    p_cap_rounds: input.capRounds?.length ? input.capRounds : null,
    p_rank_type: input.rankType,
    p_value: input.value,
    p_category_group: input.categoryGroup ?? null,
    p_gender: input.gender,
    p_university_scope: input.universityScope?.length ? input.universityScope : null,
    p_branch_ids: branchIds,
    p_cities: null,
    p_specials: input.specials?.length ? input.specials : null,
    p_limit: 400,
    // Without these the function bands rows with its own defaults and the
    // thresholds set in /admin only affect the labels, not the selection.
    p_good_pct: settings.thresholds.good_chance_percentile,
    p_possible_pct: settings.thresholds.possible_percentile,
    p_good_ratio: settings.thresholds.good_chance_rank_ratio,
    p_possible_ratio: settings.thresholds.possible_rank_ratio,
  });

  if (error) {
    console.error('predict_colleges failed:', error.message);
    return NextResponse.json(
      { error: 'We could not load cutoff data just now. Please try again.' },
      { status: 503 },
    );
  }

  const rows = classify(
    (data ?? []) as CutoffRow[],
    input.rankType,
    input.value,
    settings.thresholds,
  );
  const summary = summarise(rows);

  const userId = currentUserIdFromCookie();
  const unlocked =
    settings.accessMode === 'FREE' || (!!userId && (await hasActiveGrant(userId)));

  const anon = anonId();
  await Promise.all([
    db.from('predictor_sessions').insert({
      user_id: userId,
      anon_id: anon,
      academic_year: settings.activeYear,
      rank_type: input.rankType,
      rank_value: input.value,
      category_group: input.categoryGroup ?? null,
      gender: input.gender,
      preferred_branch_ids: branchIds,
      cap_rounds: input.capRounds ?? null,
      result_count: summary.total,
    }),
    track('predictor_completed', { anonId: anon, userId, properties: { unlocked } }),
  ]);

  return NextResponse.json({
    academicYear: settings.activeYear,
    unlocked,
    accessMode: settings.accessMode,
    pricePaise: settings.pricePaise,
    summary,
    results: unlocked ? rows : [],
  });
}
