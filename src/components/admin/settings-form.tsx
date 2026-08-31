'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, cn } from '@/components/ui';
import type { Settings } from '@/lib/settings';

async function save(key: string, value: unknown) {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? 'Could not save that setting.');
  }
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [mode, setMode] = useState(settings.accessMode);
  const [rupees, setRupees] = useState(String(settings.pricePaise / 100));
  const [year, setYear] = useState(settings.activeYear);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: () => Promise<void>, okText: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p
          role="status"
          className={cn(
            'rounded-card px-4 py-3 text-sm',
            msg.ok ? 'bg-good-tint text-good' : 'bg-reach-tint text-reach',
          )}
        >
          {msg.text}
        </p>
      )}

      <div className="card p-5">
        <Field label="College Predictor" hint="Controls whether full results require payment.">
          <div className="grid max-w-xs grid-cols-2 gap-2">
            {(['FREE', 'PAID'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() =>
                  run(async () => {
                    await save('predictor_access_mode', m);
                    setMode(m);
                  }, `Predictor is now ${m}.`)
                }
                className={cn(
                  'rounded-card border px-4 py-3 font-medium',
                  mode === m
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-rule bg-white text-ink hover:bg-surface',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="card space-y-4 p-5">
        <Field label="Price" hint="In rupees. Stored as paise, so 49 becomes 4900." htmlFor="price">
          <div className="flex gap-2">
            <Input
              id="price"
              inputMode="numeric"
              value={rupees}
              onChange={(e) => setRupees(e.target.value.replace(/[^\d]/g, ''))}
              className="tnum max-w-[10rem]"
            />
            <Button
              variant="secondary"
              onClick={() =>
                run(
                  () => save('predictor_price_paise', Number(rupees) * 100),
                  `Price set to \u20B9${rupees}.`,
                )
              }
            >
              Save price
            </Button>
          </div>
        </Field>

        <Field
          label="Active academic year"
          hint="The dataset year the predictor queries, e.g. 2026-27."
          htmlFor="year"
        >
          <div className="flex gap-2">
            <Input
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="tnum max-w-[10rem]"
            />
            <Button
              variant="secondary"
              onClick={() =>
                run(() => save('predictor_active_year', year), `Active year set to ${year}.`)
              }
            >
              Save year
            </Button>
          </div>
        </Field>
      </div>

      <div className="card p-5">
        <h3 className="font-medium text-ink">Chance thresholds</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Percentile bands are absolute percentile points. Rank bands are fractions of
          the closing rank, so one setting works for a cutoff of 900 and one of 190,000.
        </p>
        <ThresholdEditor initial={settings.thresholds} onSave={run} />
      </div>
    </div>
  );
}

function ThresholdEditor({
  initial,
  onSave,
}: {
  initial: Settings['thresholds'];
  onSave: (fn: () => Promise<void>, ok: string) => void;
}) {
  const [t, setT] = useState(initial);
  const fields: [keyof Settings['thresholds'], string][] = [
    ['good_chance_percentile', 'Good chance at or above (percentile points)'],
    ['possible_percentile', 'Possible at or above (percentile points)'],
    ['good_chance_rank_ratio', 'Good chance at or above (rank ratio)'],
    ['possible_rank_ratio', 'Possible at or above (rank ratio)'],
  ];
  return (
    <div className="mt-4 space-y-3">
      {fields.map(([k, label]) => (
        <Field key={k} label={label} htmlFor={k}>
          <Input
            id={k}
            inputMode="decimal"
            value={String(t[k])}
            onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })}
            className="tnum max-w-[10rem]"
          />
        </Field>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onSave(async () => {
            const res = await fetch('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'predictor_thresholds', value: t }),
            });
            if (!res.ok) throw new Error('Could not save the thresholds.');
          }, 'Thresholds saved.')
        }
      >
        Save thresholds
      </Button>
    </div>
  );
}
