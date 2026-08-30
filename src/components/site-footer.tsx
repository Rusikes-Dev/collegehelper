import Link from 'next/link';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-rule bg-surface">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold text-ink">CollegeHelper</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
            College information and MHT-CET cutoff tools for Maharashtra students.
          </p>
        </div>
        <nav className="text-sm">
          <p className="font-medium text-ink">Explore</p>
          <ul className="mt-2 space-y-2 text-ink-muted">
            <li><Link href="/colleges" className="hover:text-brand">Colleges</Link></li>
            <li><Link href="/college-predictor" className="hover:text-brand">College Predictor</Link></li>
            <li><Link href="/restore-access" className="hover:text-brand">Restore my access</Link></li>
          </ul>
        </nav>
        <nav className="text-sm">
          <p className="font-medium text-ink">About</p>
          <ul className="mt-2 space-y-2 text-ink-muted">
            <li><Link href="/about" className="hover:text-brand">About us</Link></li>
            <li><Link href="/contact" className="hover:text-brand">Contact</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-rule">
        <div className="container-page py-5">
          <p className="text-xs leading-relaxed text-ink-muted">{AFFILIATION_DISCLAIMER}</p>
          <p className="mt-2 text-xs text-ink-faint">
            &copy; {new Date().getFullYear()} CollegeHelper.xyz
          </p>
        </div>
      </div>
    </footer>
  );
}
