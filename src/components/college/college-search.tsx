'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { EmptyState, RangeBar, Tag, cn, inputClass } from '@/components/ui';
import { TYPE_GROUPS, type TypeGroup, isAutonomous, typeGroup } from '@/lib/college-type';

export type CollegeListItem = {
  code: string;
  slug: string;
  name: string;
  shortName: string;
  city: string | null;
  district: string | null;
  type: string | null;
  programCount: number;
  openLow: number | null;
  openHigh: number | null;
};

const PAGE = 24;

/**
 * Sorting is a browsing tool, not a preference to be remembered. The default
 * puts the most competitive colleges first because that is the order students
 * already hold in their heads, and the alternatives cover the two other ways
 * anyone actually looks: by name when hunting for one they know, and by size
 * when they want somewhere with options.
 */
const SORTS = {
  selective: { label: 'Most selective', fn: (a: CollegeListItem, b: CollegeListItem) => (b.openHigh ?? -1) - (a.openHigh ?? -1) },
  open: { label: 'Easiest entry', fn: (a: CollegeListItem, b: CollegeListItem) => (a.openLow ?? 999) - (b.openLow ?? 999) },
  name: { label: 'A\u2013Z', fn: (a: CollegeListItem, b: CollegeListItem) => a.shortName.localeCompare(b.shortName) },
  branches: { label: 'Most branches', fn: (a: CollegeListItem, b: CollegeListItem) => b.programCount - a.programCount },
} as const;

type SortKey = keyof typeof SORTS;

/**
 * Search across every college in the CAP data.
 *
 * Filtering happens in the browser over a list already sent with the page:
 * 386 rows compress to under 20 KB, and once it has arrived every keystroke is
 * instant with no further requests — which is the difference between usable
 * and unusable on a slow connection in the middle of the admission season.
 *
 * Results are capped and extended on demand rather than paginated. A student
 * comparing colleges is scanning, not navigating, and page numbers would lose
 * their place every time they tapped one.
 */
export function CollegeSearch({
  colleges,
  districts,
  initialDistrict = null,
}: {
  colleges: CollegeListItem[];
  districts: { name: string; count: number }[];
  /** Set from ?district= so the browse links on the home tab land pre-filtered. */
  initialDistrict?: string | null;
}) {
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState<string | null>(initialDistrict);
  const [types, setTypes] = useState<TypeGroup[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const [sort, setSort] = useState<SortKey>('selective');
  const [filtersOpen, setFiltersOpen] = useState(Boolean(initialDistrict));

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = colleges.filter((c) => {
      if (district && c.district !== district) return false;
      if (types.length && !types.includes(typeGroup(c.type) as TypeGroup)) return false;
      if (!needle) return true;
      return [c.name, c.shortName, c.city, c.district, c.code]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    return [...filtered].sort(SORTS[sort].fn);
  }, [q, district, types, colleges, sort]);

  const shown = results.slice(0, limit);
  const activeFilters = (district ? 1 : 0) + types.length;

  const reset = () => {
    setDistrict(null);
    setTypes([]);
    setLimit(PAGE);
  };

  const toggleType = (t: TypeGroup) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    setLimit(PAGE);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            type="search"
            className={`${inputClass} pl-11`}
            placeholder="College, city or institute code"
            aria-label="Search colleges by name, city or institute code"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className={cn(
            'relative flex h-[3.125rem] w-[3.125rem] shrink-0 items-center justify-center rounded-card border transition-colors',
            activeFilters
              ? 'border-brand bg-brand text-white'
              : 'border-line bg-white text-ink-muted hover:border-brand-edge hover:bg-brand-tint',
          )}
        >
          <SlidersHorizontal size={18} aria-hidden />
          <span className="sr-only">Filters</span>
          {activeFilters > 0 && (
            <span className="tnum absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[0.625rem] font-semibold text-white">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && (
        <div className="panel space-y-4 p-4">
          <div>
            <p className="label mb-2">Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPE_GROUPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={types.includes(t)}
                  className={cn(
                    'min-h-[2.5rem] rounded-full border px-3.5 text-sm transition-colors',
                    types.includes(t)
                      ? 'border-brand bg-brand font-semibold text-white'
                      : 'border-line bg-white text-ink-muted hover:border-brand-edge hover:bg-brand-tint',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label mb-2">District</p>
            <div className="rail pb-1">
              {districts.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => {
                    setDistrict(district === d.name ? null : d.name);
                    setLimit(PAGE);
                  }}
                  aria-pressed={district === d.name}
                  className={cn(
                    'flex min-h-[2.5rem] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors',
                    district === d.name
                      ? 'border-brand bg-brand font-semibold text-white'
                      : 'border-line bg-white text-ink-muted hover:border-brand-edge hover:bg-brand-tint',
                  )}
                >
                  {d.name}
                  <span
                    className={cn(
                      'tnum text-xs',
                      district === d.name ? 'text-white/70' : 'text-ink-faint',
                    )}
                  >
                    {d.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand"
            >
              <X size={15} aria-hidden /> Clear filters
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="tnum shrink-0 text-[0.8125rem] text-ink-muted">
          {results.length.toLocaleString('en-IN')}{' '}
          {results.length === 1 ? 'college' : 'colleges'}
          {district ? ` in ${district}` : ''}
        </p>
        <label className="flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
          <span className="sr-only">Sort colleges by</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setLimit(PAGE);
            }}
            className="rounded-chip border border-line bg-white py-1.5 pl-2 pr-1 text-[0.8125rem] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-ring"
          >
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORTS[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title={q.trim() ? `Nothing matches "${q.trim()}"` : 'Nothing matches those filters'}
          body="Try the institute code from your CAP option form, or clear the filters and search by city instead."
        />
      ) : (
        <>
          <ul className="panel divide-rows overflow-hidden">
            {shown.map((c) => {
              const place = [c.city, c.district].filter(Boolean);
              const where =
                place.length === 2 && place[0] === place[1] ? place[0] : place.join(', ');
              return (
                <li key={c.code}>
                  <Link
                    href={`/colleges/${c.slug}`}
                    className="flex items-start gap-3 p-4 transition-colors hover:bg-wash"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] font-semibold leading-snug text-ink">
                        {c.shortName}
                      </span>

                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {where && (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                            <MapPin size={12} aria-hidden />
                            {where}
                          </span>
                        )}
                        <Tag>{c.code}</Tag>
                        {isAutonomous(c.type) && <Tag tone="brand">Autonomous</Tag>}
                      </span>

                      <span className="mt-2 flex items-center gap-2">
                        <span className="tnum text-xs text-ink-faint">
                          {c.programCount} {c.programCount === 1 ? 'branch' : 'branches'}
                        </span>
                        {c.openLow != null && c.openHigh != null && (
                          <>
                            <span className="h-3 w-px bg-line" aria-hidden />
                            <span className="tnum text-xs text-ink-muted">
                              open {c.openLow.toFixed(2)}&ndash;{c.openHigh.toFixed(2)}
                            </span>
                          </>
                        )}
                      </span>

                      {c.openLow != null && c.openHigh != null && (
                        <RangeBar
                          low={c.openLow}
                          high={c.openHigh}
                          className="mt-1.5 max-w-[13rem]"
                        />
                      )}
                    </span>
                    <ChevronRight size={18} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>

          {results.length > shown.length && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE * 2)}
              className="flex min-h-[2.75rem] w-full items-center justify-center rounded-card border border-line bg-white text-sm font-semibold text-brand hover:bg-brand-tint"
            >
              Show more ({(results.length - shown.length).toLocaleString('en-IN')} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}
