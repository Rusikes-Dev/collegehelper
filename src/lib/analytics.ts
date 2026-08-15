/**
 * Privacy-conscious event tracking.
 *
 * Counts what happened, never who it happened to. No rank values, no category,
 * no identifiers, no cookies of its own. Events are dropped entirely unless a
 * provider is wired up, so the default build sends nothing anywhere.
 */

export type AnalyticsEvent =
  | 'landing_view'
  | 'form_start'
  | 'find_colleges_click'
  | 'payment_initiated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'results_generated'
  | 'filter_applied'
  | 'choice_added'
  | 'choice_list_reordered'
  | 'pdf_downloaded';

/**
 * Only these keys may accompany an event, and each is a coarse bucket or a
 * count. Anything that could narrow down an individual is deliberately absent.
 */
export interface EventProps {
  /** Bucketed result count: '0' | '1-10' | '11-50' | '51-200' | '200+'. */
  resultBucket?: string;
  instituteType?: string;
  choiceCount?: number;
  errorCode?: string;
}

export function bucket(n: number): string {
  if (n === 0) return '0';
  if (n <= 10) return '1-10';
  if (n <= 50) return '11-50';
  if (n <= 200) return '51-200';
  return '200+';
}

declare global {
  interface Window { plausible?: (event: string, opts?: { props: EventProps }) => void }
}

export function track(event: AnalyticsEvent, props: EventProps = {}): void {
  if (typeof window === 'undefined') return;

  // Respect an explicit do-not-track signal.
  if (navigator.doNotTrack === '1') return;

  // Wire a provider here. Plausible is shown because it is cookieless and does
  // not fingerprint; swap in whichever cookieless provider you prefer.
  window.plausible?.(event, { props });

  if (process.env.NODE_ENV === 'development') console.debug('[analytics]', event, props);
}
