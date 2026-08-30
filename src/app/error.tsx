'use client';

import { Button, ButtonLink } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page max-w-lg py-20">
      <h1 className="font-display text-display-lg font-semibold text-ink">
        Something went wrong
      </h1>
      <p className="mt-3 text-ink-muted">
        The page failed to load. Trying again usually fixes it \u2014 nothing you
        entered has been lost.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">Go to homepage</ButtonLink>
      </div>
    </div>
  );
}
