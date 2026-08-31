'use client';

import { Button, ButtonLink } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="screen py-16">
      <h1 className="text-display-sm font-bold text-ink">Something broke on our side</h1>
      <p className="mt-2 max-w-[46ch] leading-relaxed text-ink-muted">
        Nothing you entered was lost. Try again, and if it keeps happening, tell us what
        you were doing and we will fix it.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/about" variant="secondary" size="lg">
          Contact us
        </ButtonLink>
      </div>
    </div>
  );
}
