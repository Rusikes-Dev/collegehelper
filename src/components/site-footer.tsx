import Link from 'next/link';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';

/**
 * Deliberately plain. The footer's job is to say who is behind the site and
 * who is not, which is the question a parent asks before paying anything.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-wash">
      <div className="screen-wide py-6">
        <p className="text-xs leading-relaxed text-ink-muted">
          {AFFILIATION_DISCLAIMER}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Link href="/about" className="font-medium text-brand hover:underline">
            About and contact
          </Link>
          <Link href="/restore-access" className="font-medium text-brand hover:underline">
            Restore my access
          </Link>
          <span className="text-ink-faint">
            &copy; {new Date().getFullYear()} CollegeHelper.xyz
          </span>
        </div>
      </div>
    </footer>
  );
}
