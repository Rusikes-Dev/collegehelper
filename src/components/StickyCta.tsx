'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Thumb-reachable call to action, phones only.
 *
 * Where it does NOT appear matters as much as where it does:
 *
 *   - `/find` already ends in a sticky submit button. Two fixed bars stacked
 *     on a 360px screen would leave almost no page.
 *   - `/results` has its own action bar for the choice list and PDF.
 *   - `/admin` is not the student site.
 *   - `/thank-you` and `/pay` are mid-transaction; nudging someone sideways
 *     during checkout is how you lose the checkout.
 *
 * It also stays hidden until the hero CTA has scrolled away, so a student who
 * can already see the button is not shown a second copy of it covering the
 * text they are reading.
 */

const HIDDEN_ON = ['/find', '/results', '/admin', '/thank-you', '/pay', '/restore'];

export default function StickyCta({ price }: { price: string }) {
  const pathname = usePathname() ?? '/';
  const [show, setShow] = useState(false);

  const suppressed = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (suppressed) { setShow(false); return; }

    // Watch the hero CTA when there is one; show the bar once it leaves view.
    const anchor = document.getElementById('hero-cta');
    if (!anchor) { setShow(true); return; }

    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { rootMargin: '-8px 0px 0px 0px' },
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, [suppressed, pathname]);

  if (suppressed) return null;

  return (
    <div className="sticky-cta" data-show={show ? 'true' : 'false'} aria-hidden={!show}>
      <div className="sticky-cta-text">
        <span style={{ fontWeight: 600, fontSize: 14.5 }}>See your college list</span>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{price} one time &middot; about two minutes</span>
      </div>
      <Link href="/find" className="btn btn-primary" tabIndex={show ? 0 : -1}>
        Find my colleges
      </Link>
    </div>
  );
}
