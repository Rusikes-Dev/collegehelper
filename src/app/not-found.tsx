import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="container-page max-w-lg py-20">
      <h1 className="font-display text-display-lg font-semibold text-ink">Page not found</h1>
      <p className="mt-3 text-ink-muted">
        That page does not exist, or the college has not been published yet.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/colleges">Browse colleges</ButtonLink>
        <ButtonLink href="/college-predictor" variant="secondary">
          Open the predictor
        </ButtonLink>
      </div>
    </div>
  );
}
