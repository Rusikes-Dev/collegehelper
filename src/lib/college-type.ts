/**
 * The CAP data prints thirty distinct institute statuses, from "Un-Aided" to
 * "Un-Aided Autonomous Linguistic Minority - Gujarathi(Jain)". That precision
 * matters on the college's own page, where the exact status is shown as
 * printed. It is useless as a filter: nobody browses by "Gujarathi(Jain)".
 *
 * These are the four groups a student actually chooses between, plus a flag
 * for autonomy, which is the distinction that changes how a college is run.
 *
 * Client-safe: no filesystem access, so the search UI can import it.
 */

export type TypeGroup = 'Government' | 'Aided' | 'University' | 'Private';

export const TYPE_GROUPS: TypeGroup[] = ['Government', 'Aided', 'University', 'Private'];

export function typeGroup(status: string | null): TypeGroup | null {
  if (!status) return null;
  const s = status.toLowerCase();
  // Order matters: "Un-Aided" contains "aided" as a substring.
  if (s.includes('un-aided')) return 'Private';
  if (s.includes('aided')) return 'Aided';
  if (s.includes('deemed') || s.includes('university')) return 'University';
  if (s.includes('government')) return 'Government';
  return 'Private';
}

export const isAutonomous = (status: string | null) =>
  Boolean(status && status.toLowerCase().includes('autonomous'));

/** Minority status, shown on the college page because it affects admission. */
export function minorityNote(status: string | null): string | null {
  if (!status) return null;
  const m = /(?:Linguistic|Religious) Minority\s*-\s*(.+)$/i.exec(status);
  return m ? m[1].trim() : null;
}

/** A short label for a list row, e.g. "Private · Autonomous". */
export function typeLabel(status: string | null): string {
  const group = typeGroup(status);
  if (!group) return 'Status not listed';
  return isAutonomous(status) ? `${group} · Autonomous` : group;
}
