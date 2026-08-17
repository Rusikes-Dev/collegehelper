/**
 * Display helpers shared by the student UI and the admin panel.
 * Client-safe: no server-only imports, no environment access.
 */

const NUM = new Intl.NumberFormat('en-IN');

export const num = (n: number | null | undefined): string => NUM.format(n ?? 0);

/** Paise to rupees, with the symbol and no stray decimals on round amounts. */
export function inr(paise: number | null | undefined): string {
  const rupees = (paise ?? 0) / 100;
  return `\u20b9${NUM.format(Number.isInteger(rupees) ? rupees : Number(rupees.toFixed(2)))}`;
}

export function pct(part: number, whole: number, digits = 1): string {
  if (!whole) return '\u2014';
  return `${((part / whole) * 100).toFixed(digits)}%`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** "3 min ago", "2 days ago" — the form you want when scanning a live log. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'],
  ];
  let value = seconds / 60;
  let unit: Intl.RelativeTimeFormatUnit = 'minute';
  for (const [divisor, next] of steps.slice(1)) {
    if (Math.abs(value) < divisor) break;
    value /= divisor;
    unit = next;
  }
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.round(value), unit);
}

export function daysLeft(iso: string | null | undefined): string {
  if (!iso) return 'never expires';
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (d < 0) return 'expired';
  if (d === 0) return 'expires today';
  return `${d} day${d === 1 ? '' : 's'} left`;
}
