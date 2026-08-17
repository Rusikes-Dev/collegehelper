/**
 * Email and phone handling.
 *
 * The pair (email, phone) is the credential a student uses to get their
 * results back on a new device, so normalisation has to be deterministic:
 * "+91 98765 43210", "098765 43210" and "9876543210" must all resolve to the
 * same stored value, or restoring access silently fails for the people most
 * likely to need it.
 */

export const PHONE_HINT = 'Indian mobile number, with or without +91.';
const PHONE_ERROR = 'Enter a 10-digit Indian mobile number, starting 6, 7, 8 or 9.';

/** Lowercased and trimmed. Gmail dot/plus tricks are left alone deliberately:
 *  collapsing them would merge accounts the student thinks are separate. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  // Deliberately permissive on the local part, strict on the shape.
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) && email.length <= 254;
}

/**
 * Reduces any Indian mobile number to its 10 significant digits.
 * Returns null when the input cannot be one.
 */
export function normalisePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '');

  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 13 && d.startsWith('091')) d = d.slice(3);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);

  if (d.length !== 10) return null;
  if (!/^[6-9]/.test(d)) return null;
  return d;
}

/** Display form: +91 98765 43210. */
export function formatPhone(phone: string): string {
  if (phone.length !== 10) return phone;
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

/** Masks contact details in anything that may be logged or shown in bulk. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 2)}${'*'.repeat(6)}${phone.slice(-2)}` : '***';
}

export interface ContactInput { name?: string | null; email: string; phone: string }
export interface ContactResult {
  ok: boolean;
  value?: { name: string | null; email: string; phone: string };
  fields?: Record<string, string>;
}

/** One validator shared by the paywall, the restore page and the admin panel. */
export function parseContact(input: {
  name?: unknown; email?: unknown; phone?: unknown;
}): ContactResult {
  const fields: Record<string, string> = {};

  const rawEmail = typeof input.email === 'string' ? input.email : '';
  const rawPhone = typeof input.phone === 'string' ? input.phone : '';
  const rawName = typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';

  const email = normaliseEmail(rawEmail);
  if (!email) fields.email = 'Enter your email address.';
  else if (!isValidEmail(email)) fields.email = 'That email address does not look right. Check for a typo.';

  const phone = normalisePhone(rawPhone);
  if (!rawPhone.trim()) fields.phone = 'Enter your mobile number.';
  else if (!phone) fields.phone = PHONE_ERROR;

  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value: { name: rawName || null, email, phone: phone! } };
}
