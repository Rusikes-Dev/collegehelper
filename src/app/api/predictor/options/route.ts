import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * Everything the predictor form offers is read from the database. No branch,
 * city, category or round is hard-coded, so importing a new dataset changes
 * the form without a deploy.
 */
export async function GET() {
  const db = supabaseAdmin();
  const settings = await getSettings();

  const [branches, cities, seatTypes, rounds] = await Promise.all([
    db.from('branches').select('id, name, family').order('name'),
    db.from('colleges').select('city').eq('is_published', true).not('city', 'is', null),
    db.from('seat_types').select('category_group, special').order('category_group'),
    db
      .from('cutoff_datasets')
      .select('cap_round, round_order')
      .eq('is_published', true)
      .eq('academic_year', settings.activeYear)
      .order('round_order'),
  ]);

  return NextResponse.json({
    academicYear: settings.activeYear,
    accessMode: settings.accessMode,
    pricePaise: settings.pricePaise,
    branches: branches.data ?? [],
    cities: [...new Set((cities.data ?? []).map((c: any) => c.city))].sort(),
    categories: [...new Set((seatTypes.data ?? []).map((s: any) => s.category_group))].sort(),
    specials: [...new Set((seatTypes.data ?? []).map((s: any) => s.special).filter(Boolean))].sort(),
    rounds: (rounds.data ?? []).map((r: any) => r.cap_round),
  });
}
