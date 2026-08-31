import Link from 'next/link';
import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="screen py-16">
      <h1 className="text-display-sm font-bold text-ink">This page does not exist</h1>
      <p className="mt-2 max-w-[46ch] leading-relaxed text-ink-muted">
        The link may be old, or the college may not have a page yet. The predictor still
        covers every college in the cutoff data.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink href="/" size="lg">
          Open the predictor
        </ButtonLink>
        <ButtonLink href="/colleges" variant="secondary" size="lg">
          Search colleges
        </ButtonLink>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
        <Link href="/methodology" className="font-semibold text-brand hover:underline">
          Where the cutoff data comes from
        </Link>
        <Link href="/faq" className="font-semibold text-brand hover:underline">
          Frequently asked questions
        </Link>
        <Link href="/about" className="font-semibold text-brand hover:underline">
          Contact us
        </Link>
      </div>
    </div>
  );
}
