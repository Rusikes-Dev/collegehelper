'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProgramPicker, { type ProgramOption } from './ProgramPicker';
import Paywall, { type SearchSummary } from './Paywall';

type Category = 'OPEN' | 'EWS' | 'OBC-NCL' | 'SC' | 'ST';
type InstituteType = 'IIT' | 'NIT' | 'IIIT' | 'GFTI';

const CATEGORIES: { code: Category; label: string }[] = [
  { code: 'OPEN', label: 'OPEN / General' },
  { code: 'EWS', label: 'GEN-EWS' },
  { code: 'OBC-NCL', label: 'OBC-NCL' },
  { code: 'SC', label: 'SC' },
  { code: 'ST', label: 'ST' },
];

interface Options {
  programs: ProgramOption[];
  instituteTypes: { code: InstituteType; label: string; full: string; available: boolean }[];
  coverage: { years: number[]; rounds: number[]; instituteCount: number; rowCount: number };
  pricePaise: number;
  paymentsEnabled: boolean;
}

const digitsOnly = (v: string) => v.replace(/[^\d]/g, '');
const groupIN = (v: string) => (v ? Number(v).toLocaleString('en-IN') : '');

export default function FindForm() {
  const router = useRouter();
  const [options, setOptions] = useState<Options | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mainCrl, setMainCrl] = useState('');
  const [advancedCrl, setAdvancedCrl] = useState('');
  const [category, setCategory] = useState<Category>('OPEN');
  const [mainCategory, setMainCategory] = useState('');
  const [advancedCategory, setAdvancedCategory] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [isPwd, setIsPwd] = useState(false);
  const [mainPwd, setMainPwd] = useState('');
  const [advancedPwd, setAdvancedPwd] = useState('');
  const [types, setTypes] = useState<InstituteType[] | 'ALL'>('ALL');
  const [programIds, setProgramIds] = useState<number[] | 'ALL'>('ALL');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<SearchSummary | null>(null);

  useEffect(() => {
    fetch('/api/options')
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); })
      .then(setOptions)
      .catch((e) => setLoadError(e.message ?? 'Could not load the form.'));
  }, []);

  const reserved = category !== 'OPEN';

  const payload = useMemo(() => ({
    mainCrl: mainCrl ? Number(mainCrl) : undefined,
    advancedCrl: advancedCrl || undefined,
    mainCategory: reserved ? mainCategory || undefined : undefined,
    advancedCategory: reserved ? advancedCategory || undefined : undefined,
    mainPwd: isPwd ? mainPwd || undefined : undefined,
    advancedPwd: isPwd ? advancedPwd || undefined : undefined,
    category, isPwd, gender, homeState: null,
    instituteTypes: types, programIds,
  }), [mainCrl, advancedCrl, mainCategory, advancedCategory, mainPwd, advancedPwd, category, isPwd, gender, types, programIds, reserved]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fields) {
          setErrors(data.fields);
          const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
          first?.focus();
          first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } else {
          setErrors({ form: data.error ?? 'Something went wrong. Please try again.' });
        }
        return;
      }

      if (data.alreadyPaid) { router.push('/results'); return; }
      setSummary(data);
    } catch {
      setErrors({ form: 'We could not reach the server. Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  }

  const toggleType = (t: InstituteType) => {
    const current = types === 'ALL' ? (options?.instituteTypes.filter((x) => x.available).map((x) => x.code) ?? []) : types;
    const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    const all = options?.instituteTypes.filter((x) => x.available).length ?? 0;
    setTypes(next.length === 0 || next.length === all ? 'ALL' : next);
  };

  const typeOn = (t: InstituteType) => types === 'ALL' || types.includes(t);

  if (loadError) {
    return (
      <div className="panel" style={{ marginTop: 24, borderLeft: '3px solid var(--miss)', background: 'var(--miss-tint)' }}>
        <h2 style={{ fontSize: 17 }}>The college data isn&rsquo;t available right now</h2>
        <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-2)' }}>{loadError}</p>
        <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={() => location.reload()}>Try again</button>
      </div>
    );
  }

  if (!options) {
    return (
      <div style={{ marginTop: 28, display: 'grid', gap: 18 }} aria-busy="true" aria-label="Loading the form">
        {[64, 64, 92, 92, 64].map((h, i) => <div key={i} className="skeleton" style={{ height: h }} />)}
      </div>
    );
  }

  const rankField = (
    id: string, label: string, value: string, set: (v: string) => void,
    { hint, optional }: { hint?: string; optional?: boolean } = {},
  ) => (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label} {optional && <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>}
      </label>
      <input
        id={id}
        className="input num"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={groupIN(value)}
        onChange={(e) => set(digitsOnly(e.target.value))}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? `${id}-err` : hint ? `${id}-hint` : undefined}
        placeholder="e.g. 82,011"
      />
      {errors[id] && <p className="error" id={`${id}-err`} role="alert"><span aria-hidden>!</span>{errors[id]}</p>}
      {!errors[id] && hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );

  return (
    <>
      <form onSubmit={onSubmit} noValidate style={{ marginTop: 28, display: 'grid', gap: 26 }}>
        {/* ---- ranks ---- */}
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 18 }}>
          <legend className="sr-only">Your ranks</legend>
          {rankField('mainCrl', 'JEE Main All India Rank', mainCrl, setMainCrl, { hint: 'Your Common Rank List (CRL) rank from your JEE Main scorecard.' })}
          {rankField('advancedCrl', 'JEE Advanced All India Rank', advancedCrl, setAdvancedCrl, {
            optional: true,
            hint: 'Enter your JEE Advanced AIR if you want IIT and IISc programmes, which use JEE Advanced ranks. Leave blank if you only sat JEE Main.',
          })}
        </fieldset>

        {/* ---- category ---- */}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ padding: 0 }}>Category</legend>
          <div className="chips" role="group" aria-label="Category">
            {CATEGORIES.map((c) => (
              <button key={c.code} type="button" className="chip" aria-pressed={category === c.code} onClick={() => setCategory(c.code)}>
                {c.label}
              </button>
            ))}
          </div>

          {reserved && (
            <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
              <div className="panel" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}>
                <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                  JoSAA publishes {category} cutoffs as <strong>category ranks</strong>, not All India Ranks. Add your category rank to include
                  those seats. Without it we&rsquo;ll still show the OPEN seats you qualify for, and tell you how many {category} seats are waiting.
                </p>
              </div>
              {rankField('mainCategory', `JEE Main ${category} rank`, mainCategory, setMainCategory, { optional: true })}
              {advancedCrl && rankField('advancedCategory', `JEE Advanced ${category} rank`, advancedCategory, setAdvancedCategory, { optional: true })}
            </div>
          )}
        </fieldset>

        {/* ---- gender & PwD ---- */}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ padding: 0 }}>Gender</legend>
          <p className="hint" style={{ marginTop: 0, marginBottom: 8 }}>Female candidates are also eligible for female-only supernumerary seats.</p>
          <div className="chips" role="group" aria-label="Gender">
            {([['MALE', 'Male'], ['FEMALE', 'Female'], ['OTHER', 'Prefer not to say']] as const).map(([v, l]) => (
              <button key={v} type="button" className="chip" aria-pressed={gender === v} onClick={() => setGender(v)}>{l}</button>
            ))}
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, minHeight: 44, cursor: 'pointer' }}>
            <input type="checkbox" checked={isPwd} onChange={(e) => setIsPwd(e.target.checked)} style={{ width: 19, height: 19, accentColor: 'var(--brand)' }} />
            <span style={{ fontSize: 15 }}>I am applying under the PwD category</span>
          </label>
          {isPwd && (
            <div style={{ marginTop: 14, display: 'grid', gap: 16 }}>
              <p className="hint" style={{ marginTop: 0 }}>PwD seats are filled from a separate PwD rank list, so they need your PwD rank rather than your AIR.</p>
              {rankField('mainPwd', 'JEE Main PwD rank', mainPwd, setMainPwd, { optional: true })}
              {advancedCrl && rankField('advancedPwd', 'JEE Advanced PwD rank', advancedPwd, setAdvancedPwd, { optional: true })}
            </div>
          )}
        </fieldset>

        {/* ---- institute type ---- */}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ padding: 0 }}>Institute type</legend>
          <div className="chips" role="group" aria-label="Institute type">
            <button type="button" className="chip" aria-pressed={types === 'ALL'} onClick={() => setTypes('ALL')}>All</button>
            {options.instituteTypes.map((t) => (
              <button
                key={t.code}
                type="button"
                className="chip"
                aria-pressed={types !== 'ALL' && typeOn(t.code)}
                onClick={() => toggleType(t.code)}
                disabled={!t.available}
                title={t.available ? t.full : `No ${t.label} data has been imported yet`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ---- programmes ---- */}
        <div className="field">
          <label className="label" htmlFor="programs">Academic programmes</label>
          <ProgramPicker options={options.programs} selected={programIds} onChange={setProgramIds} />
          <p className="hint">Pick as many as you like, or leave it on all programmes and filter later.</p>
        </div>

        {errors.form && <p className="error" role="alert"><span aria-hidden>!</span>{errors.form}</p>}

        <div className="sticky-bottom" style={{ marginInline: -20 }}>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !mainCrl}>
            {busy ? 'Checking cutoffs\u2026' : 'Find colleges'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
            Cutoffs from JoSAA {options.coverage.years.join(', ')}, round {options.coverage.rounds.join(', ')}
          </p>
        </div>
      </form>

      {summary && (
        <Paywall
          summary={summary}
          pricePaise={options.pricePaise}
          paymentsEnabled={options.paymentsEnabled}
          onClose={() => setSummary(null)}
          onUnlocked={() => router.push('/results')}
        />
      )}
    </>
  );
}
