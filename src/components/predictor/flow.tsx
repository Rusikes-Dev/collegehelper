'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button, Field, Input, cn } from '@/components/ui';
import type { PredictionRow, RankType } from '@/lib/predictor';
import { ResultsView } from '@/components/predictor/results-view';
import { PaymentStep } from '@/components/predictor/payment-step';

/**
 * Seven short steps rather than one long form. On a phone a single page of
 * fifteen inputs is abandoned; one decision per screen is not.
 *
 * Step state is mirrored into the URL hash so the hardware back button moves
 * back one step instead of leaving the site, and so nothing entered is lost
 * when it does.
 */

type Options = {
  academicYear: string;
  accessMode: 'FREE' | 'PAID';
  pricePaise: number;
  branches: { id: string; name: string; family: string | null }[];
  cities: string[];
  categories: string[];
  specials: string[];
  rounds: string[];
};

type Answers = {
  rankType: RankType;
  value: string;
  categoryGroup: string | null;
  gender: 'ANY' | 'FEMALE';
  universityScope: string[];
  specials: string[];
  branchIds: string[];
  cities: string[];
  capRounds: string[];
};

const EMPTY: Answers = {
  rankType: 'PERCENTILE',
  value: '',
  categoryGroup: null,
  gender: 'ANY',
  universityScope: [],
  specials: [],
  branchIds: [],
  cities: [],
  capRounds: [],
};

const STEPS = ['Exam', 'Your score', 'Category', 'Preferences', 'Review'] as const;

export function PredictorFlow() {
  const router = useRouter();
  const params = useSearchParams();
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
    // no-store: the option lists change when a dataset is published, and a
    // cached empty payload would leave the form with nothing to pick.
    fetch('/api/predictor/options', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => setError('We could not load the form. Please refresh the page.'));
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'predictor_started', path: '/college-predictor' }),
    }).catch(() => {});
  }, []);

  // A percentile prefilled from the homepage box lands straight on step 2.
  useEffect(() => {
    const v = params.get('value');
    const t = params.get('type');
    if (v) {
      setAnswers((a) => ({
        ...a,
        value: v,
        rankType: t === 'MERIT_RANK' ? 'MERIT_RANK' : 'PERCENTILE',
      }));
      setStep(2);
    }
  }, [params]);

  // Browser back moves between steps rather than off the site.
  useEffect(() => {
    const onPop = () => setStep((s) => Math.max(0, s - 1));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (next: number) => {
    setError(null);
    if (next > step) window.history.pushState({ step: next }, '');
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const numericValue = Number(answers.value);
  const valueValid =
    answers.value.trim() !== '' &&
    Number.isFinite(numericValue) &&
    (answers.rankType === 'PERCENTILE'
      ? numericValue >= 0 && numericValue <= 100
      : Number.isInteger(numericValue) && numericValue >= 1);

  const branchesByFamily = useMemo(() => {
    const map = new Map<string, Options['branches']>();
    (options?.branches ?? []).forEach((b) => {
      const key = b.family ?? 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [options]);

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
          universityScope: answers.universityScope,
          specials: answers.specials,
          branchIds: answers.branchIds,
          cities: answers.cities,
          capRounds: answers.capRounds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setPayload(json);
      go(5);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!options && !error) {
    return (
      <div className="flex items-center gap-2 py-16 text-ink-muted">
        <Loader2 className="animate-spin" size={18} /> Loading the predictor\u2026
      </div>
    );
  }

  // --- Results / payment ----------------------------------------------------
  if (step === 5 && payload) {
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
          go(1);
        }}
      />
    );
  }

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div>
      <ol className="mb-6 flex gap-1.5" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div
              className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand' : 'bg-rule')}
              aria-hidden
            />
            <span className="sr-only">
              {label} {i === step ? '(current step)' : ''}
            </span>
          </li>
        ))}
      </ol>
      <p className="mb-1 text-sm text-ink-muted">
        Step {step + 1} of {STEPS.length}
      </p>
      <h2 className="mb-5 font-display text-display-sm font-semibold text-ink">
        {STEPS[step]}
      </h2>

      {error && (
        <p role="alert" className="mb-4 rounded-card bg-reach-tint px-4 py-3 text-sm text-reach">
          {error}
        </p>
      )}

      {/* Step 1 — exam and year */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="card p-5">
            <p className="font-medium text-ink">MHT-CET</p>
            <p className="mt-1 text-sm text-ink-muted">
              Engineering and Technology, {options!.academicYear} admissions.
            </p>
          </div>
          {options!.rounds.length > 0 && (
            <Field
              label="CAP rounds to include"
              hint="Leave all unticked to see every published round."
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
          <Button size="lg" className="w-full sm:w-auto" onClick={() => go(1)}>
            Continue <ArrowRight size={18} />
          </Button>
        </div>
      )}

      {/* Step 2 — percentile or rank */}
      {step === 1 && (
        <div className="space-y-5">
          <Field label="Search by">
            <div className="grid grid-cols-2 gap-2">
              {(['PERCENTILE', 'MERIT_RANK'] as RankType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, rankType: t, value: '' }))}
                  className={cn(
                    'rounded-card border px-4 py-3 text-sm font-medium transition-colors',
                    answers.rankType === t
                      ? 'border-brand bg-brand-tint text-brand'
                      : 'border-rule bg-white text-ink hover:bg-surface',
                  )}
                  aria-pressed={answers.rankType === t}
                >
                  {t === 'PERCENTILE' ? 'Percentile' : 'Merit rank'}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label={
              answers.rankType === 'PERCENTILE'
                ? 'Enter your MHT-CET percentile'
                : 'Enter your MHT-CET merit rank'
            }
            hint={
              answers.rankType === 'PERCENTILE'
                ? 'For example 92.43. Enter it exactly as on your scorecard.'
                : 'For example 12345. Your Maharashtra state general merit number.'
            }
            htmlFor="value"
            error={
              answers.value && !valueValid
                ? answers.rankType === 'PERCENTILE'
                  ? 'Percentile must be between 0 and 100.'
                  : 'Merit rank must be a whole number of 1 or more.'
                : null
            }
          >
            <Input
              id="value"
              // Numeric keypad on Android without the spinner arrows.
              inputMode="decimal"
              type="text"
              autoFocus
              value={answers.value}
              placeholder={answers.rankType === 'PERCENTILE' ? '92.43' : '12345'}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, value: e.target.value.replace(/[^\d.]/g, '') }))
              }
              className="tnum text-lg"
            />
          </Field>

          <StepNav onBack={() => go(0)} onNext={() => go(2)} nextDisabled={!valueValid} />
        </div>
      )}

      {/* Step 3 — category and gender */}
      {step === 2 && (
        <div className="space-y-5">
          <Field
            label="Your category"
            hint="Required. Open seats are always included alongside your category. Without this, results would mix in cutoffs for categories you cannot claim."
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

          <Field label="Gender" hint="Female candidates also see ladies-reserved seats.">
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'ANY', label: 'Male / other' },
                { v: 'FEMALE', label: 'Female' },
              ].map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, gender: g.v as 'ANY' | 'FEMALE' }))}
                  className={cn(
                    'rounded-card border px-4 py-3 text-sm font-medium',
                    answers.gender === g.v
                      ? 'border-brand bg-brand-tint text-brand'
                      : 'border-rule bg-white text-ink hover:bg-surface',
                  )}
                  aria-pressed={answers.gender === g.v}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Field>

          {options!.specials.length > 0 && (
            <Field
              label="Special seat types that apply to you"
              hint="Leave blank unless you hold one of these. Ticking a type you cannot claim will show cutoffs that do not apply to you."
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

          <StepNav
            onBack={() => go(1)}
            onNext={() => go(3)}
            nextDisabled={!answers.categoryGroup}
          />
        </div>
      )}

      {/* Step 4 — branch and city preferences */}
      {step === 3 && (
        <div className="space-y-5">
          <Field
            label="Preferred branches"
            hint="Pick as many as you like, or none to see everything."
          >
            <div className="space-y-4">
              {branchesByFamily.length === 0 && (
                <p className="text-sm text-ink-muted">
                  No branches are available to filter on yet. Continue to see
                  results across all branches.
                </p>
              )}
              {branchesByFamily.map(([family, list]) => (
                <div key={family}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {family}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((b) => (
                      <Chip
                        key={b.id}
                        active={answers.branchIds.includes(b.id)}
                        onClick={() =>
                          setAnswers((a) => ({ ...a, branchIds: toggle(a.branchIds, b.id) }))
                        }
                      >
                        {b.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>

          {options!.cities.length > 0 && (
            <Field label="Preferred cities" hint="Leave blank to search all of Maharashtra.">
              <div className="flex flex-wrap gap-2">
                {options!.cities.map((c) => (
                  <Chip
                    key={c}
                    active={answers.cities.includes(c)}
                    onClick={() => setAnswers((a) => ({ ...a, cities: toggle(a.cities, c) }))}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          <StepNav onBack={() => go(2)} onNext={() => go(4)} />
        </div>
      )}

      {/* Step 5 — review */}
      {step === 4 && (
        <div className="space-y-5">
          <dl className="card divide-y divide-rule">
            {[
              ['Exam', `MHT-CET ${options!.academicYear}`],
              [
                answers.rankType === 'PERCENTILE' ? 'Percentile' : 'Merit rank',
                answers.value || '\u2014',
              ],
              ['Category', answers.categoryGroup ?? 'All categories'],
              ['Gender', answers.gender === 'FEMALE' ? 'Female' : 'Male / other'],
              [
                'Branches',
                answers.branchIds.length ? `${answers.branchIds.length} selected` : 'All branches',
              ],
              ['Cities', answers.cities.length ? answers.cities.join(', ') : 'All cities'],
              ['CAP rounds', answers.capRounds.length ? answers.capRounds.join(', ') : 'All rounds'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => go(3)}>
              <ArrowLeft size={18} /> Back
            </Button>
            <Button size="lg" className="flex-1" onClick={submit} disabled={loading || !valueValid}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Finding colleges
                </>
              ) : (
                <>Show my colleges</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3.5 py-2 text-sm transition-colors',
        active
          ? 'border-brand bg-brand-tint font-medium text-brand'
          : 'border-rule bg-white text-ink-muted hover:bg-surface',
      )}
    >
      {children}
    </button>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <Button variant="secondary" size="lg" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </Button>
      <Button size="lg" className="flex-1" onClick={onNext} disabled={nextDisabled}>
        Continue <ArrowRight size={18} />
      </Button>
    </div>
  );
}
