'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { Button, Chip, Field, Input, cn } from '@/components/ui';
import type { PredictionRow, RankType } from '@/lib/predictor';
import { ResultsView } from '@/components/predictor/results-view';
import { PaymentStep } from '@/components/predictor/payment-step';

/**
 * Three questions, then the answer.
 *
 * The earlier version asked seven. Every extra screen between a student and
 * their result is a screen they can abandon, so the flow now asks only what
 * changes the outcome: the score, the category, and roughly which branches.
 * Everything else is a filter on the results page, where it can be changed
 * without starting again.
 */

type Options = {
  academicYear: string;
  accessMode: 'FREE' | 'PAID';
  pricePaise: number;
  branchGroups: { key: string; label: string; blurb: string; count: number }[];
  categories: string[];
  specials: string[];
  rounds: string[];
};

type Answers = {
  rankType: RankType;
  value: string;
  categoryGroup: string | null;
  gender: 'ANY' | 'FEMALE';
  specials: string[];
  branchGroups: string[];
  capRounds: string[];
};

const EMPTY: Answers = {
  rankType: 'PERCENTILE',
  value: '',
  categoryGroup: null,
  gender: 'ANY',
  specials: [],
  branchGroups: [],
  capRounds: [],
};

const STEPS = ['Your score', 'Your category', 'Your branches'] as const;
const RESULTS = STEPS.length;

export function PredictorFlow() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<{
    unlocked: boolean;
    accessMode: 'FREE' | 'PAID';
    pricePaise: number;
    academicYear: string;
    summary: { total: number; good: number; possible: number; reach: number; colleges: number };
    results: PredictionRow[];
  } | null>(null);

  useEffect(() => {
    // no-store: the lists change the moment a dataset is published, and a
    // cached empty payload would leave the form with nothing to pick.
    fetch('/api/predictor/options', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => setError('The form could not load. Check your connection and refresh.'));
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'predictor_started', path: '/' }),
    }).catch(() => {});
  }, []);

  // The phone's back button moves back one question instead of leaving the site.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { chStep?: number } | null)?.chStep;
      setStep(typeof s === 'number' ? s : 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (next: number) => {
    setError(null);
    if (next > step) window.history.pushState({ chStep: next }, '');
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const numericValue = Number(answers.value);
  const valueValid =
    answers.value.trim() !== '' &&
    Number.isFinite(numericValue) &&
    (answers.rankType === 'PERCENTILE'
      ? numericValue > 0 && numericValue <= 100
      : Number.isInteger(numericValue) && numericValue >= 1);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/predictor/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankType: answers.rankType,
          value: numericValue,
          categoryGroup: answers.categoryGroup,
          gender: answers.gender,
          specials: answers.specials,
          branchGroups: answers.branchGroups,
          capRounds: answers.capRounds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setPayload(json);
      go(RESULTS);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!options && !error) {
    return (
      <div className="flex items-center gap-2 py-20 text-ink-muted">
        <Loader2 className="animate-spin" size={18} aria-hidden /> Loading the predictor
      </div>
    );
  }

  // --- Results, or the paywall in front of them ------------------------------
  if (step === RESULTS && payload) {
    if (!payload.unlocked) {
      return (
        <PaymentStep
          pricePaise={payload.pricePaise}
          summary={payload.summary}
          onUnlocked={submit}
        />
      );
    }
    return (
      <ResultsView
        rows={payload.results}
        summary={payload.summary}
        academicYear={payload.academicYear}
        rankType={answers.rankType}
        value={numericValue}
        onRestart={() => {
          setPayload(null);
          go(0);
        }}
      />
    );
  }

  const scoreLabel = answers.rankType === 'PERCENTILE' ? 'Percentile' : 'Merit rank';

  return (
    <div className="pb-10">
      {/* Step 1 opens with the question itself rather than a marketing block:
          the input is the fastest thing to reach and the clearest promise. */}
      {step === 0 ? (
        <div className="pb-6 pt-7">
          <h1 className="text-display-lg font-bold leading-tight text-ink">
            Where can your MHT-CET score take you?
          </h1>
          <p className="mt-3 max-w-[46ch] leading-relaxed text-ink-muted">
            Enter your percentile or merit rank. We compare it with the official CAP
            round cutoffs and show you the colleges you have a real chance at.
          </p>
        </div>
      ) : (
        <div className="pt-6">
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={16} aria-hidden /> Back
          </button>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-sm text-ink-muted">{scoreLabel}</span>
            <span className="tnum text-xl font-semibold text-ink">{answers.value}</span>
          </div>
        </div>
      )}

      <ol className="mb-6 mt-4 flex gap-1.5" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div
              className={cn('h-1 rounded-full', i <= step ? 'bg-brand' : 'bg-line')}
              aria-hidden
            />
            <span className="sr-only">
              {label} {i === step ? '(current step)' : ''}
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="mb-5 rounded-card bg-reach-tint px-4 py-3 text-sm text-reach">
          {error}
        </p>
      )}

      {/* --- Step 1: the score ------------------------------------------------ */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2">
            {(['PERCENTILE', 'MERIT_RANK'] as RankType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, rankType: t, value: '' }))}
                aria-pressed={answers.rankType === t}
                className={cn(
                  'h-13 rounded-card border text-[0.9375rem] font-semibold transition-colors',
                  answers.rankType === t
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-line bg-white text-ink-muted hover:bg-wash',
                )}
              >
                {t === 'PERCENTILE' ? 'Percentile' : 'Merit rank'}
              </button>
            ))}
          </div>

          <Field
            label={
              answers.rankType === 'PERCENTILE'
                ? 'Your MHT-CET percentile'
                : 'Your MHT-CET merit rank'
            }
            hint={
              answers.rankType === 'PERCENTILE'
                ? 'Copy it from your scorecard, decimals and all. For example 92.4318.'
                : 'Your Maharashtra state general merit number. For example 12345.'
            }
            htmlFor="value"
            error={
              answers.value && !valueValid
                ? answers.rankType === 'PERCENTILE'
                  ? 'A percentile is between 0 and 100.'
                  : 'A merit rank is a whole number, 1 or higher.'
                : null
            }
          >
            <Input
              id="value"
              // Numeric keypad on Android, without the spinner arrows.
              inputMode="decimal"
              type="text"
              autoFocus
              value={answers.value}
              placeholder={answers.rankType === 'PERCENTILE' ? '92.4318' : '12345'}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, value: e.target.value.replace(/[^\d.]/g, '') }))
              }
              className="tnum h-16 text-2xl font-semibold"
            />
          </Field>

          <Button size="lg" className="w-full" onClick={() => go(1)} disabled={!valueValid}>
            Continue <ArrowRight size={18} aria-hidden />
          </Button>

          <ul className="space-y-2.5 pt-2">
            {[
              [FileText, `Built from the official CAP cutoff PDFs for ${options!.academicYear}.`],
              [Check, 'Percentile and rank are never converted into each other.'],
              [ShieldCheck, 'Nothing is estimated. A missing figure is shown as missing.'],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof Check;
              return (
                <li key={i} className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                  <I size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* --- Step 2: category ------------------------------------------------- */}
      {step === 1 && (
        <div className="space-y-7">
          <Field
            label="Your category"
            hint="Open seats are always included alongside it. Without a category the list would mix in cutoffs you cannot claim."
          >
            <div className="flex flex-wrap gap-2">
              {options!.categories.map((c) => (
                <Chip
                  key={c}
                  active={answers.categoryGroup === c}
                  onClick={() =>
                    setAnswers((a) => ({
                      ...a,
                      categoryGroup: a.categoryGroup === c ? null : c,
                    }))
                  }
                >
                  {c}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Gender" hint="Female candidates also see the ladies-reserved seats.">
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'ANY', label: 'Male / other' },
                { v: 'FEMALE', label: 'Female' },
              ].map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, gender: g.v as 'ANY' | 'FEMALE' }))}
                  aria-pressed={answers.gender === g.v}
                  className={cn(
                    'h-13 rounded-card border text-[0.9375rem] font-medium transition-colors',
                    answers.gender === g.v
                      ? 'border-brand bg-brand-tint font-semibold text-brand'
                      : 'border-line bg-white text-ink-muted hover:bg-wash',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Field>

          {options!.specials.length > 0 && (
            <Field
              label="Special seat types"
              hint="Only tick one if you actually hold it. Ticking a type you cannot claim shows cutoffs that do not apply to you."
            >
              <div className="flex flex-wrap gap-2">
                {options!.specials.map((s) => (
                  <Chip
                    key={s}
                    active={answers.specials.includes(s)}
                    onClick={() => setAnswers((a) => ({ ...a, specials: toggle(a.specials, s) }))}
                  >
                    {s.replace(/_/g, ' ').toLowerCase()}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={() => go(2)}
            disabled={!answers.categoryGroup}
          >
            Continue <ArrowRight size={18} aria-hidden />
          </Button>
        </div>
      )}

      {/* --- Step 3: branches -------------------------------------------------- */}
      {step === 2 && (
        <div className="space-y-7">
          <Field
            label="Which branches interest you?"
            hint="Pick one or more, or skip to see every branch."
          >
            <div className="panel divide-rows overflow-hidden">
              {options!.branchGroups.map((g) => {
                const on = answers.branchGroups.includes(g.key);
                return (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, branchGroups: toggle(a.branchGroups, g.key) }))
                    }
                    className={cn(
                      'flex w-full items-start gap-3 p-4 text-left transition-colors',
                      on ? 'bg-brand-tint' : 'hover:bg-wash',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                        on ? 'border-brand bg-brand text-white' : 'border-line bg-white',
                      )}
                      aria-hidden
                    >
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span>
                      <span
                        className={cn(
                          'block text-[0.9375rem] font-semibold',
                          on ? 'text-brand' : 'text-ink',
                        )}
                      >
                        {g.label}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-muted">
                        {g.blurb}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {options!.rounds.length > 0 && (
            <Field
              label="CAP rounds"
              hint="Leave all unticked to compare against every published round."
            >
              <div className="flex flex-wrap gap-2">
                {options!.rounds.map((r) => (
                  <Chip
                    key={r}
                    active={answers.capRounds.includes(r)}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, capRounds: toggle(a.capRounds, r) }))
                    }
                  >
                    {r}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={submit}
            disabled={loading || !valueValid}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} aria-hidden /> Checking cutoffs
              </>
            ) : (
              <>Show my colleges</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
