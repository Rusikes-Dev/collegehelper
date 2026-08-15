import { NextResponse } from 'next/server';
import { readSession, clearSession } from '@/lib/session';
import { handleError } from '@/lib/api';

/** Whether the current session exists and is unlocked. Never returns secrets. */
export async function GET() {
  try {
    const s = await readSession();
    if (!s) return NextResponse.json({ active: false, paid: false });
    return NextResponse.json({
      active: true,
      paid: s.paid,
      category: s.student.category,
      mainCrl: s.student.ranks.mainCrl,
      advancedCrl: s.student.ranks.advancedCrl ?? null,
      instituteTypes: s.preferences.instituteTypes,
      expiresAt: s.expiresAt,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
