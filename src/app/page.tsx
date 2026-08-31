import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import { PredictorFlow } from '@/components/predictor/flow';
import { collegeIndex, districts } from '@/data/colleges';
import { RangeBar, SectionHead, Tag } from '@/components/ui';
import { CHANCE_META } from '@/lib/predictor';
import { DATA } from '@/lib/site';

export const metadata: Metadata = {
  title: 'MHT-CET college predictor',
  description:
    'Enter your MHT-CET percentile or merit rank and see which Maharashtra ' +
    'engineering colleges you have a good chance at, based on official CAP ' +
    'round cutoffs.',
  alternates: { canonical: '/' },
};

/**
 * The home tab is the predictor itself — nothing stands between arriving and
 * using it, which was right in the first version and is kept.
 *
 * What is new is everything below it. A student who has just been told where
 * they stand has a second question immediately ("what else is near that
 * number?"), and previously the page had no answer and they left. The browse
 * sections underneath are that answer.
 */
export default function HomePage() {
  const all = collegeIndex();
  const topDistricts = districts().slice(0, 12);

  // Largest by branch count: the colleges with the most ways in, which is what
  // makes them worth opening first when you are still deciding.
  const biggest = [...all].sort((a, b) => b.programCount - a.programCount).slice(0, 5);

  return (
    <div className="screen">
      {/* Evidence, not a marketing hero. These three numbers are the reason to
          trust the answer that follows. */}
      <div className="mt-5 flex items-stretch gap-px overflow-hidden rounded-panel border border-line bg-line text-center">
        {[
          { n: all.length.toLocaleString('en-IN'), l: 'colleges' },
          { n: '3', l: 'CAP rounds' },
          { n: `${Math.round(DATA.cutoffRows / 1000)}k`, l: 'official cutoffs' },
        ].map((s) => (
          <div key={s.l} className="flex-1 bg-white px-2 py-3">
            <div className="tnum text-display-sm font-bold text-ink">{s.n}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{s.l}</div>
          </div>
        ))}
      </div>

      <PredictorFlow />

      <div className="mt-14 space-y-10 border-t border-line pt-8">
        <section className="space-y-3">
          <SectionHead title="What the three answers mean" />
          <ul className="panel divide-rows overflow-hidden">
            {(['GOOD', 'POSSIBLE', 'REACH'] as const).map((k) => {
              const m = CHANCE_META[k];
              return (
                <li key={k} className="flex items-start gap-3 px-4 py-3.5">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.dot}`} aria-hidden />
                  <span>
                    <span className="block text-[0.9375rem] font-semibold text-ink">{m.label}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">
                      {m.blurb}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-3">
          <SectionHead title="Where these numbers come from" />
          <div className="panel space-y-3 p-4">
            <p className="text-sm leading-relaxed text-ink-muted">
              Every cutoff on this site was read out of the official CAP Round I, II and
              III documents published by the {DATA.publisher} for {DATA.academicYear} —{' '}
              <span className="tnum">{DATA.cutoffRows.toLocaleString('en-IN')}</span> records
              across {DATA.institutes} institutes, imported {DATA.importedOn}. Nothing is
              averaged in from elsewhere, and a percentile is never converted into a rank.
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              A prediction compares your figure against those closing cutoffs. It is
              evidence about last year, not a forecast, and it is not an admission.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-0.5 text-sm">
              <Link href="/methodology" className="font-semibold text-brand hover:underline">
                Read the full method
              </Link>
              <Link href="/faq" className="font-semibold text-brand hover:underline">
                Common questions
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHead title="Browse by district" aside={`${districts().length} districts`} />
          <div className="flex flex-wrap gap-2">
            {topDistricts.map((d) => (
              <Link
                key={d.name}
                href={`/colleges?district=${encodeURIComponent(d.name)}`}
                className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm text-ink-muted transition-colors hover:border-brand-edge hover:bg-brand-tint hover:text-brand"
              >
                <MapPin size={13} aria-hidden />
                {d.name}
                <span className="tnum text-xs text-ink-faint">{d.count}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHead title="Colleges with the most branches" />
          <ul className="panel divide-rows overflow-hidden">
            {biggest.map((c) => (
              <li key={c.code}>
                <Link
                  href={`/colleges/${c.slug}`}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-wash"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold leading-snug text-ink">
                      {c.shortName}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Tag tone="brand">{c.programCount} branches</Tag>
                      {c.district && <span className="text-xs text-ink-muted">{c.district}</span>}
                    </span>
                    {c.openLow != null && c.openHigh != null && (
                      <RangeBar
                        low={c.openLow}
                        high={c.openHigh}
                        className="mt-2 max-w-[12rem]"
                      />
                    )}
                  </span>
                  <ChevronRight size={18} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/colleges"
            className="inline-flex min-h-[2.75rem] items-center text-sm font-semibold text-brand hover:underline"
          >
            Search all {all.length.toLocaleString('en-IN')} colleges
          </Link>
        </section>
      </div>
    </div>
  );
}
