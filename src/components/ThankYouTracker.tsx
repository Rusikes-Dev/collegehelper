'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from './Analytics';

/**
 * Fires the purchase conversion exactly once per page load.
 *
 * Split out of the thank-you page so that page can stay a server component
 * and read the real access grant. The ref guard matters in development, where
 * React's strict mode mounts every effect twice and would otherwise double
 * every conversion in your funnel.
 *
 * It reports the *confirmed* state rather than the fact of arriving here, so a
 * student who lands on this page with a payment still settling is not counted
 * as a sale that never happened.
 */
export default function ThankYouTracker({ unlocked }: { unlocked: boolean }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(unlocked ? 'purchase_confirmed' : 'thank_you_pending');
  }, [unlocked]);

  return null;
}
