'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, cn } from '@/components/ui';

/** The homepage shortcut. Hands off to the full flow with the value prefilled. */
export function QuickPredictorForm() {
  const router = useRouter();
  const [type, setType] = useState<'PERCENTILE' | 'MERIT_RANK'>('PERCENTILE');
  const [value, setValue] = useState('');

  const n = Number(value);
  const valid =
    value.trim() !== '' &&
    Number.isFinite(n) &&
    (type === 'PERCENTILE' ? n >= 0 && n <= 100 : Number.isInteger(n) && n >= 1);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) router.push(`/college-predictor?type=${type}&value=${value}`);
      }}
      className="space-y-4"
    >
      <fieldset>
        <legend className="label mb-2">Search by</legend>
        <div className="grid max-w-sm grid-cols-2 gap-2">
          {(['PERCENTILE', 'MERIT_RANK'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setValue('');
              }}
              aria-pressed={type === t}
              className={cn(
                'rounded-card border px-4 py-3 text-sm font-medium',
                type === t
                  ? 'border-brand bg-brand-tint text-brand'
                  : 'border-rule bg-white text-ink hover:bg-surface',
              )}
            >
              {t === 'PERCENTILE' ? 'Percentile' : 'Merit rank'}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          inputMode="decimal"
          type="text"
          aria-label={type === 'PERCENTILE' ? 'MHT-CET percentile' : 'MHT-CET merit rank'}
          placeholder={type === 'PERCENTILE' ? 'Your percentile, e.g. 92.43' : 'Your merit rank, e.g. 12345'}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
          className="tnum sm:max-w-xs"
        />
        <Button size="lg" type="submit" disabled={!valid}>
          Check my colleges
        </Button>
      </div>
      <p className="hint">Use either one \u2014 you do not need to enter both.</p>
    </form>
  );
}
