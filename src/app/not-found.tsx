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
    </div>
  );
}
