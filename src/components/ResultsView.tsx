'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Sheet from './Sheet';
import RankRuler from './RankRuler';

interface Row {
  key: string; instituteId: number; institute: string; instituteType: string; state: string | null;
  programId: number; program: string; degree: string | null;
  openRank: number | null; closeRank: number; quota: string; quotaLabel: string;
  category: string; gender: 'NEUTRAL' | 'FEMALE'; pwd: boolean; year: number; round: number;
  yourRank: number; rankLabel: string; margin: number; confidence: string; confidenceLabel: string;
}

interface Payload {
  page: number; pages: number; total: number; results: Row[];
  facets: Record<string, Record<string, number>>;
  counts: { eligible: number; nearMisses: number };
  unevaluated: { reason: string; count: number; message: string; action: string }[];
  ranksUsed: string[];
  coverage: { years: number[]; rounds: number[]; selectedRounds?: number[] | 'ALL'; source: string };
}

const SORTS: [string, string][] = [
  ['BEST_FIRST', 'Most competitive first'],
  ['MARGIN_ASC', 'Closest to my rank'],
  ['MARGIN_DESC', 'Safest first'],
  ['CLOSE_RANK_DESC', 'Closing rank: high to low'],
  ['INSTITUTE_ASC', 'Institute name (A\u2013Z)'],
  ['PROGRAM_ASC', 'Programme name (A\u2013Z)'],
  ['TYPE_ASC', 'Institute type'],
];

const BADGE: Record<string, string> = {
  SAFER: 'badge-safe', MODERATE: 'badge-likely', BORDERLINE: 'badge-border', NEAR_MISS: 'badge-miss',
};

const nf = new Intl.NumberFormat('en-IN');
const CHOICE_KEY = 'jcf_choices';

export default function ResultsView({
  mainCrl, advancedCrl, category,
}: { mainCrl: number; advancedCrl: number | null; category: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'ELIGIBLE' | 'NEAR_MISS'>('ELIGIBLE');
  const [sort, setSort] = useState('BEST_FIRST');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [quotaFilter, setQuotaFilter] = useState<string[]>([]);
  const [roundFilter, setRoundFilter] = useState<string[]>([]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [choicesOpen, setChoicesOpen] = useState(false);
  const [choices, setChoices] = useState<Row[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* Choice list survives a reload within the session. */
  useEffect(() => {
    try { const raw = sessionStorage.getItem(CHOICE_KEY); if (raw) setChoices(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(CHOICE_KEY, JSON.stringify(choices)); } catch { /* ignore */ }
  }, [choices]);

  useEffect(() => { const t = setTimeout(() => { setDebounced(query); setPage(1); }, 250); return () => clearTimeout(t); }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams({ view, sort, page: String(page), pageSize: '20' });
    if (debounced) p.set('q', debounced);
    if (typeFilter.length) p.set('instituteTypes', typeFilter.join(','));
    if (quotaFilter.length) p.set('quotas', quotaFilter.join(','));
    if (roundFilter.length) p.set('rounds', roundFilter.join(','));
    try {
      const res = await fetch(`/api/results?${p}`);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 402) { location.href = '/find'; return; }
        throw new Error(json.error ?? 'Could not load your results.');
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your results.');
    } finally {
      setLoading(false);
    }
  }, [view, sort, page, debounced, typeFilter, quotaFilter, roundFilter]);

  useEffect(() => { load(); }, [load]);

  const inList = useMemo(() => new Set(choices.map((c) => c.key)), [choices]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const addChoice = (r: Row) => {
    if (inList.has(r.key)) { setChoices((c) => c.filter((x) => x.key !== r.key)); flash('Removed from choice list'); }
    else { setChoices((c) => [...c, r]); flash('Added to choice list'); }
  };

  const move = (i: number, dir: -1 | 1) => {
    setChoices((c) => {
      const j = i + dir;
      if (j < 0 || j >= c.length) return c;
      const next = [...c];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch('/api/choice-list/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choices: choices.map((c) => ({
            instituteId: c.instituteId, programId: c.programId, quota: c.quota,
            category: c.category, gender: c.gender, pwd: c.pwd, year: c.year, round: c.round,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'The PDF could not be generated.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jee-choice-list-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'The PDF could not be generated.');
    } finally {
      setDownloading(false);
    }
  }

  const facetTypes = Object.entries(data?.facets.instituteType ?? {});
  const facetQuotas = Object.entries(data?.facets.quota ?? {});
  // Rounds are numbers, so sort them numerically rather than as strings, or
  // round 10 would sort between round 1 and round 2.
  const facetRounds = Object.entries(data?.facets.round ?? {}).sort((a, b) => Number(a[0]) - Number(b[0]));
  const activeFilters = typeFilter.length + quotaFilter.length + roundFilter.length;

  return (
    <div className="wrap has-bottom-bar" style={{ paddingBlock: '22px 0', maxWidth: 900 }}>
      {/* ---- header ---- */}
      <div>
        <h1 style={{ fontSize: 'clamp(1.35rem, 4.6vw, 1.8rem)' }}>
          {data ? `${nf.format(data.counts.eligible)} option${data.counts.eligible === 1 ? '' : 's'} within your reach` : 'Your college list'}
        </h1>
        <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--muted)' }}>
          JEE Main AIR <span className="num">{nf.format(mainCrl)}</span>
          {advancedCrl ? <> &middot; JEE Advanced AIR <span className="num">{nf.format(advancedCrl)}</span></> : null}
          {' '}&middot; {category}
        </p>
      </div>

      {/* ---- transparency ---- */}
      {data && (
        <div className="panel" style={{ marginTop: 16, fontSize: 13.5, color: 'var(--ink-2)' }}>
          Eligibility is based on previous-year closing rank data &mdash; JoSAA {data.coverage.years.join(', ')}, round{' '}
          {(data.coverage.selectedRounds === 'ALL' || !data.coverage.selectedRounds
            ? data.coverage.rounds
            : data.coverage.selectedRounds
          ).join(', ')}.
          {data.ranksUsed.length > 0 && <> Compared using your {data.ranksUsed.join(' and ')}.</>}
          {' '}Closing ranks change every year and do not guarantee admission.
        </div>
      )}

      {/* ---- unevaluated notices ---- */}
      {data?.unevaluated.map((u) => (
        <div key={u.reason} className="panel" style={{ marginTop: 12, background: 'var(--border-tint)', borderColor: 'var(--border-line)', fontSize: 14 }}>
          <strong>{nf.format(u.count)} seats are not in this list.</strong> {u.message} {u.action}
        </div>
      ))}

      {/* ---- controls ---- */}
      <div style={{ position: 'sticky', top: 60, zIndex: 20, background: 'var(--paper)', paddingBlock: 14, marginTop: 12, borderBottom: '1px solid var(--rule)' }}>
        <input
          className="input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search college or programme"
          aria-label="Search college or programme"
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
          <select
            className="chip"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            aria-label="Sort results"
            style={{ flexShrink: 0, paddingInline: 14 }}
          >
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button
            className="chip"
            aria-pressed={view === 'NEAR_MISS'}
            onClick={() => { setView(view === 'ELIGIBLE' ? 'NEAR_MISS' : 'ELIGIBLE'); setPage(1); }}
            style={{ flexShrink: 0 }}
          >
            {view === 'ELIGIBLE' ? `Just missed (${data?.counts.nearMisses ?? 0})` : 'Back to eligible'}
          </button>
        </div>
      </div>

      {/* ---- list ---- */}
      {error && (
        <div className="panel" style={{ marginTop: 20, background: 'var(--miss-tint)', borderColor: 'var(--miss)' }}>
          <p style={{ fontWeight: 600 }}>{error}</p>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={load}>Try again</button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }} aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ height: 168, borderRadius: 16 }} />)}
        </div>
      )}

      {!loading && data && data.results.length === 0 && (
        <div className="panel" style={{ marginTop: 24, textAlign: 'center', padding: 28 }}>
          <h2 style={{ fontSize: 18 }}>Nothing matches these filters</h2>
          <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14.5 }}>
            Try widening your search:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 8, fontSize: 14.5, color: 'var(--ink-2)' }}>
            <li>Clear the filters and search box</li>
            <li>Include all institute types</li>
            <li>Check the rank you entered</li>
            {data.counts.nearMisses > 0 && <li>Look at the {data.counts.nearMisses} near-miss options</li>}
          </ul>
          <button className="btn btn-secondary" style={{ marginTop: 18 }} onClick={() => { setQuery(''); setTypeFilter([]); setQuotaFilter([]); setPage(1); }}>
            Clear filters
          </button>
        </div>
      )}

      {!loading && data && data.results.length > 0 && (
        <>
          <p style={{ marginTop: 16, fontSize: 13.5, color: 'var(--muted)' }} aria-live="polite">
            Showing {nf.format((data.page - 1) * 20 + 1)}&ndash;{nf.format(Math.min(data.page * 20, data.total))} of {nf.format(data.total)}
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 12 }}>
            {data.results.map((r) => (
              <li key={r.key} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, lineHeight: 1.3 }}>{r.institute}</h3>
                    <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 3 }}>{r.program}</p>
                  </div>
                  <span className={`badge ${BADGE[r.confidence] ?? ''}`} style={{ flexShrink: 0 }}>{r.confidenceLabel}</span>
                </div>

                <div className="chips" style={{ marginTop: 10, gap: 6 }}>
                  <span className="badge">{r.instituteType}</span>
                  <span className="badge">{r.category}{r.pwd ? ' (PwD)' : ''}</span>
                  <span className="badge">{r.quota}</span>
                  {r.gender === 'FEMALE' && <span className="badge">Female-only</span>}
                  <span className="badge">{r.year} R{r.round}</span>
                </div>

                <RankRuler openRank={r.openRank} closeRank={r.closeRank} yourRank={r.yourRank} />

                <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '10px 0 0' }}>
                  {[
                    ['Opening', r.openRank === null ? 'N/A' : nf.format(r.openRank)],
                    ['Closing', nf.format(r.closeRank)],
                    [r.margin >= 0 ? 'Your buffer' : 'Short by', nf.format(Math.abs(r.margin))],
                  ].map(([k, v], i) => (
                    <div key={k}>
                      <dt style={{ fontSize: 11.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{k}</dt>
                      <dd className="num" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: i === 2 ? (r.margin >= 0 ? 'var(--safe)' : 'var(--miss)') : 'var(--ink)' }}>{v}</dd>
                    </div>
                  ))}
                </dl>

                <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
                  Compared against your {r.rankLabel} of <span className="num">{nf.format(r.yourRank)}</span>
                </p>

                <button
                  className={inList.has(r.key) ? 'btn btn-secondary btn-block' : 'btn btn-primary btn-block'}
                  style={{ marginTop: 12 }}
                  onClick={() => addChoice(r)}
                >
                  {inList.has(r.key) ? 'Added \u2713 \u2014 tap to remove' : '+ Add to choice list'}
                </button>
              </li>
            ))}
          </ul>

          {data.pages > 1 && (
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20 }} aria-label="Pagination">
              <button className="btn btn-secondary" disabled={data.page <= 1} onClick={() => { setPage(data.page - 1); scrollTo({ top: 0, behavior: 'smooth' }); }}>Previous</button>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>Page {data.page} of {data.pages}</span>
              <button className="btn btn-secondary" disabled={data.page >= data.pages} onClick={() => { setPage(data.page + 1); scrollTo({ top: 0, behavior: 'smooth' }); }}>Next</button>
            </nav>
          )}
        </>
      )}

      {/* ---- thumb-reachable action bar ----
           Filters and the choice list are the only two things anyone does
           repeatedly here, so on a phone they live within thumb reach rather
           than scrolled off the top of a long list. */}
      <div className="action-bar" style={{ marginInline: -20, marginTop: 28 }}>
        <button className="btn btn-secondary" onClick={() => setFiltersOpen(true)}>
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
        </button>
        <button className="btn btn-primary" onClick={() => setChoicesOpen(true)} disabled={choices.length === 0}>
          {choices.length === 0 ? 'Choice list' : `Choice list (${choices.length})`}
        </button>
      </div>

      {/* ---- filters sheet ---- */}
      {filtersOpen && (
        <Sheet
          title="Filters"
          onClose={() => setFiltersOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setTypeFilter([]); setQuotaFilter([]); setRoundFilter([]); setPage(1); }}>Clear all</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setFiltersOpen(false)}>Show results</button>
            </>
          }
        >
          {([
            ['Institute type', facetTypes, typeFilter, setTypeFilter],
            ['Quota', facetQuotas, quotaFilter, setQuotaFilter],
            // Only offered when the search actually spans more than one round.
            // With a single round the group would be one chip that does nothing.
            ...(facetRounds.length > 1 ? [['Counselling round', facetRounds, roundFilter, setRoundFilter] as const] : []),
          ] as const).map(
            ([title, facets, value, setValue]) => (
              <div key={title} style={{ marginBottom: 22 }}>
                <p className="label">{title}</p>
                <div className="chips">
                  {facets.map(([code, count]) => (
                    <button
                      key={code}
                      className="chip"
                      aria-pressed={value.includes(code)}
                      onClick={() => { setValue(value.includes(code) ? value.filter((v) => v !== code) : [...value, code]); setPage(1); }}
                    >
                      {title === 'Counselling round' ? `Round ${code}` : code}{' '}
                      <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </Sheet>
      )}

      {/* ---- choice list sheet ---- */}
      {choicesOpen && (
        <Sheet
          title={`Your choice list (${choices.length})`}
          onClose={() => setChoicesOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { if (confirm('Remove every choice from your list?')) setChoices([]); }}>Clear all</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={downloadPdf} disabled={downloading || choices.length === 0}>
                {downloading ? 'Preparing PDF\u2026' : 'Download PDF'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
            Put these in the order you would fill them during counselling. Your most preferred choice goes first.
          </p>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {choices.map((c, i) => (
              <li key={c.key} className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span className="num" aria-hidden style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: 'var(--brand-tint)', color: 'var(--brand-dark)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600 }}>{i + 1}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14.5 }}>{c.institute}</p>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{c.program}</p>
                  <p className="num" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                    {c.instituteType} &middot; {c.category} &middot; closing {nf.format(c.closeRank)}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button className="btn btn-ghost" style={{ minHeight: 32, padding: 4 }} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${c.institute} up`}>&#9650;</button>
                  <button className="btn btn-ghost" style={{ minHeight: 32, padding: 4 }} onClick={() => move(i, 1)} disabled={i === choices.length - 1} aria-label={`Move ${c.institute} down`}>&#9660;</button>
                  <button className="btn btn-ghost" style={{ minHeight: 32, padding: 4, color: 'var(--miss)' }} onClick={() => setChoices((x) => x.filter((y) => y.key !== c.key))} aria-label={`Remove ${c.institute}`}>&times;</button>
                </div>
              </li>
            ))}
          </ol>
        </Sheet>
      )}

      {toast && (
        <div role="status" style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', padding: '10px 18px', borderRadius: 999, fontSize: 14, zIndex: 60, boxShadow: 'var(--shadow-2)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
