import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  noStore();

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

  // Surfaced so an empty form can be diagnosed from the response itself.
  // Contains no user or secret data.
  const errors = {
    branches: branches.error?.message ?? null,
    cities: cities.error?.message ?? null,
    seatTypes: seatTypes.error?.message ?? null,
    rounds: rounds.error?.message ?? null,
  };

  return NextResponse.json({
    academicYear: settings.activeYear,
    accessMode: settings.accessMode,
    pricePaise: settings.pricePaise,
    branches: branches.data ?? [],
    cities: [...new Set((cities.data ?? []).map((c: any) => c.city))].sort(),
    categories: [...new Set((seatTypes.data ?? []).map((s: any) => s.category_group))].sort(),
    specials: [...new Set((seatTypes.data ?? []).map((s: any) => s.special).filter(Boolean))].sort(),
    rounds: (rounds.data ?? []).map((r: any) => r.cap_round),
    diagnostics: { errors, generatedAt: new Date().toISOString() },
  });
}
