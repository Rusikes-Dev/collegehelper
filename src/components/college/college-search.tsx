'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { EmptyState, inputClass } from '@/components/ui';

export type CollegeListItem = {
  slug: string;
  name: string;
  shortName: string;
  code: string;
  city: string;
  type: string;
};

/**
 * Filtering happens in the browser over a list we already sent. With a handful
 * of written-up colleges that is instant and works on a bad connection; if the
 * list ever runs into the hundreds, move it back to a server query.
 */
export function CollegeSearch({ colleges }: { colleges: CollegeListItem[] }) {
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return colleges;
    return colleges.filter((c) =>
      [c.name, c.shortName, c.city, c.code, c.type].join(' ').toLowerCase().includes(needle),
    );
  }, [q, colleges]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          className={`${inputClass} pl-11`}
          placeholder="College name, city or code"
          aria-label="Search colleges by name, city or institute code"
        />
      </div>

      {results.length === 0 ? (
        <EmptyState
          title={`Nothing here matches "${q.trim()}"`}
          body="This tab only holds the colleges we have written up in full. Try the predictor instead — it searches the cutoffs of every college in the CAP data."
        />
      ) : (
        <ul className="panel divide-rows overflow-hidden">
          {results.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/colleges/${c.slug}`}
                className="flex items-center gap-3 p-4 hover:bg-wash"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-semibold leading-snug text-ink">
                    {c.shortName}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-muted">{c.name}</span>
                  <span className="mt-1 block text-xs text-ink-faint">
                    <span className="tnum">{c.code}</span> &middot; {c.city} &middot; {c.type}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
