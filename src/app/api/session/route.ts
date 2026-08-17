import { NextResponse } from 'next/server';
import { readSession, clearSession, hasAccess } from '@/lib/session';
import { getAccessState, supabaseConfigured } from '@/lib/db';
import { maskEmail, maskPhone } from '@/lib/contact';
import { handleError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Whether the current session exists and is unlocked.
 *
 * Contact details come back masked. The client only needs to show the student
 * which address their access is attached to; the full value is already theirs
 * and never has to travel again.
 */
export async function GET() {
  try {
    const s = await readSession();
    if (!s) return NextResponse.json({ active: false, paid: false });

    const paid = await hasAccess(s);
    let accessUntil: string | null = null;
    if (paid && supabaseConfigured() && s.userId) {
      accessUntil = (await getAccessState(s.userId).catch(() => null))?.until ?? null;
    }

    return NextResponse.json({
      active: true,
      paid,
      accessUntil,
      email: s.email ? maskEmail(s.email) : null,
      phone: s.phone ? maskPhone(s.phone) : null,
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
