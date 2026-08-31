import Link from 'next/link';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';
import { CONTACT, DATA, SITE_NAME } from '@/lib/site';

/**
 * Still deliberately plain, but no longer a dead end.
 *
 * Two jobs. The first is the one it always had: say who is behind the site and
 * who is not, which is the question a parent asks before paying anything. The
 * second is new — the policy and methodology pages exist now, and a visitor
 * looking for them looks here. Every link points at a page with real content on
 * it; there are no social icons for accounts that do not exist.
 */
const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Find a college',
    links: [
      { href: '/', label: 'College predictor' },
      { href: '/colleges', label: 'Search colleges' },
      { href: '/cet-updates', label: 'CET updates' },
      { href: '/services', label: 'Services' },
    ],
  },
  {
    heading: 'Understand the data',
    links: [
      { href: '/methodology', label: 'Data and method' },
      { href: '/faq', label: 'Frequently asked questions' },
      { href: '/disclaimer', label: 'Disclaimer' },
    ],
  },
  {
    heading: 'The site',
    links: [
      { href: '/about', label: 'About and contact' },
      { href: '/restore-access', label: 'Restore my access' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of use' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-wash">
      <div className="screen-wide py-8">
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-faint">
                {col.heading}
              </h2>
              <ul className="mt-2.5 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-block py-0.5 text-[0.8125rem] text-ink-muted hover:text-brand hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-7 space-y-2 border-t border-line pt-5">
          <p className="text-xs leading-relaxed text-ink-muted">{AFFILIATION_DISCLAIMER}</p>
          <p className="text-xs leading-relaxed text-ink-faint">
            Cutoff figures are taken from the official MHT-CET CAP {DATA.academicYear}{' '}
            documents published by the {DATA.publisher}. Dataset imported{' '}
            {DATA.importedOn}.{' '}
            <Link href="/methodology" className="font-medium text-brand hover:underline">
              How this works
            </Link>
            .
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-ink-faint">
            <span>
              &copy; {new Date().getFullYear()} {SITE_NAME}
            </span>
            {CONTACT.email && (
              <a
                href={`mailto:${CONTACT.email}`}
                className="font-medium text-brand hover:underline"
              >
                {CONTACT.email}
              </a>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
