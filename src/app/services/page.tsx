import type { Metadata } from 'next';
import Link from 'next/link';
import { BedDouble, Building2, KeyRound, UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Hostels, PG accommodation, flats and mess listings near Maharashtra engineering colleges. Coming soon on CollegeHelper.',
  alternates: { canonical: '/services' },
};

/**
 * Nothing here is live yet, and the page says so plainly rather than
 * collecting sign-ups for something that does not exist. Edit PLANNED below as
 * each service is ready and move it into its own page.
 */
const PLANNED = [
  {
    icon: Building2,
    title: 'Hostels',
    body: 'College and private hostels near each campus, with what they cost and what is included.',
  },
  {
    icon: BedDouble,
    title: 'PG rooms',
    body: 'Paying-guest rooms close to campus, listed by walking distance and monthly rent.',
  },
  {
    icon: KeyRound,
    title: 'Flats',
    body: 'Flats to share or rent for students, with deposit and rent stated up front.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Mess and tiffin',
    body: 'Mess plans and tiffin services around each college, veg and non-veg, monthly rates.',
  },
];

export default function ServicesPage() {
  return (
    <div className="screen">
      <PageHeader
        title="Services"
        intro="Once you know which college you are going to, the next problem is where you will live and eat. That is what we are building next."
      />

      <ul className="panel divide-rows overflow-hidden">
        {PLANNED.map((s) => (
          <li key={s.title} className="flex gap-3.5 p-4">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"
              aria-hidden
            >
              <s.icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[0.9375rem] font-semibold text-ink">{s.title}</span>
                <span className="rounded-full bg-wash px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-muted">
                  Coming soon
                </span>
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{s.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-card border border-line bg-wash p-4">
        <p className="text-sm font-semibold text-ink">Run a hostel, PG or mess?</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          We are building the first list of places near Maharashtra engineering colleges.
          Get in touch and we will add yours when the section opens.
        </p>
        <Link
          href="/about"
          className="mt-3 inline-flex text-sm font-semibold text-brand hover:underline"
        >
          Contact us
        </Link>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-ink-faint">
        None of these services are live yet. Nothing on this page can be booked or paid for,
        and no listing here is an endorsement.
      </p>
    </div>
  );
}
