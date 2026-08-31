import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ExternalLink, MapPin } from 'lucide-react';
import {
  openRange,
  collegeIndex,
  findCollege,
  groupedCutoffs,
  relatedColleges,
  seatLabelsFor,
  type College,
} from '@/data/colleges';
import { CutoffTable } from '@/components/college/cutoff-table';
import { Breadcrumbs, Disclaimer, NotAdded, RangeBar, SectionHead, Stat, Tag } from '@/components/ui';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { isAutonomous, minorityNote, typeGroup } from '@/lib/college-type';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';

/**
 * One template for every college in the CAP dataset.
 *
 * The facts come from the official cutoff documents by way of the generated
 * records, so all 386 colleges get a real page rather than the handful someone
 * has had time to type up. Anything a document cannot supply — fees, placement
 * figures, hostel arrangements — appears only when a human has checked it, and
 * says so plainly when they have not. A visitor can always tell a fact we
 * verified from a gap we have not filled.
 */

export function generateStaticParams() {
  return collegeIndex().map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = findCollege(params.slug);
  if (!c) return { title: 'College not found' };

  const where = [c.city, c.district].filter(Boolean)[0];
  return {
    title: `${c.shortName} — branches and MHT-CET cutoffs`,
    description:
      `Branch list and official MHT-CET CAP ${c.cutoffYear ?? ''} closing cutoffs for ` +
      `${c.name}${where ? `, ${where}` : ''}. Institute code ${c.code}.`,
    alternates: { canonical: `/colleges/${c.slug}` },
    openGraph: {
      title: c.shortName,
      description: `Branches and official MHT-CET CAP cutoffs for ${c.shortName}.`,
    },
  };
}

/** A factual summary assembled from the record when nobody has written one. */
function derivedAbout(c: College): string {
  const where = [c.city, c.district].filter(Boolean);
  const place = where.length === 2 && where[0] === where[1] ? where[0] : where.join(', ');
  const bits: string[] = [];

  bits.push(
    `${c.shortName} is${c.type ? ` a ${c.type.toLowerCase()}` : ' an'} engineering institute` +
      `${place ? ` in ${place}` : ''}, listed in the MHT-CET CAP documents under institute code ${c.code}.`,
  );
  if (c.programs.length) {
    bits.push(
      `It offers ${c.programs.length} ${
        c.programs.length === 1 ? 'branch' : 'branches'
      } through the CAP process.`,
    );
  }
  if (c.university) bits.push(`Its home university is ${c.university}.`);
  return bits.join(' ');
}

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'branches', label: 'Branches' },
  { id: 'cutoffs', label: 'Cutoffs' },
  { id: 'fees', label: 'Fees' },
  { id: 'placements', label: 'Placements' },
];

export default function CollegePage({ params }: { params: { slug: string } }) {
  const c = findCollege(params.slug);
  if (!c) notFound();

  const rounds = groupedCutoffs(c);
  const seatLabels = seatLabelsFor(c);
  const open = openRange(c);
  const related = relatedColleges(c, 5);
  const minority = minorityNote(c.type);

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Colleges', path: '/colleges' },
    ...(c.district
      ? [{ name: c.district, path: `/colleges?district=${encodeURIComponent(c.district)}` }]
      : []),
    { name: c.shortName, path: `/colleges/${c.slug}` },
  ];

  const where = [c.city, c.district].filter(Boolean);
  const place = where.length === 2 && where[0] === where[1] ? where[0] : where.join(', ');

  const links = [
    c.website && { href: c.website, label: 'Official website', icon: ExternalLink },
    c.admissionUrl && { href: c.admissionUrl, label: 'Admissions', icon: ExternalLink },
    c.mapsUrl && { href: c.mapsUrl, label: 'Open in Maps', icon: MapPin },
  ].filter(Boolean) as { href: string; label: string; icon: typeof MapPin }[];

  return (
    <div className="screen pb-6">
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} />
      <div className="pt-1">
        <Link
          href="/colleges"
          className="inline-flex min-h-[2.25rem] items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand"
        >
          <ArrowLeft size={16} aria-hidden /> All colleges
        </Link>
      </div>

      {/* Hero. The name leads; everything qualifying it sits underneath. */}
      <header className="mt-2">
        <h1 className="text-display-lg font-bold leading-tight text-ink">{c.shortName}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.name}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tag>{c.code}</Tag>
          {typeGroup(c.type) && <Tag tone="brand">{typeGroup(c.type)}</Tag>}
          {isAutonomous(c.type) && <Tag tone="brand">Autonomous</Tag>}
          {minority && <Tag>Minority · {minority}</Tag>}
        </div>

        {place && (
          <p className="mt-3 inline-flex flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
            <MapPin size={15} aria-hidden />
            {place}
            {/* Only a script-derived location carries the caveat. A checked
                one does not, or the note would be worth nothing. */}
            {!c.hasNotes && <span className="text-ink-faint">(read off the institute name)</span>}
          </p>
        )}
      </header>

      {/* The numbers a student wants before anything else. The cutoff is given
          as a range: this college's easiest branch and its hardest can sit
          thirty points apart, and either figure alone would mislead. */}
      <div className="mt-5 rounded-panel border border-brand-edge bg-brand-tint p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat value={c.programs.length} caption="Branches" tone="brand" />
          <Stat value={rounds.length} caption="CAP rounds" tone="brand" />
          <Stat
            value={open ? `${open.low.toFixed(1)}\u2013${open.high.toFixed(1)}` : '\u2014'}
            caption="Open-category percentile"
            tone="brand"
          />
        </div>
        {open && <RangeBar low={open.low} high={open.high} className="mt-3.5 bg-white" />}
        {open && (
          <p className="mt-2 text-xs leading-relaxed text-brand">
            Its easiest branch closed at {open.low.toFixed(2)}, its most competitive at{' '}
            {open.high.toFixed(2)}.
          </p>
        )}
      </div>

      {links.length > 0 && (
        <div className="rail rail-bleed mt-4 pb-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[2.75rem] shrink-0 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-brand-edge hover:bg-brand-tint hover:text-brand"
            >
              <l.icon size={15} aria-hidden /> {l.label}
            </a>
          ))}
        </div>
      )}

      {/* Sticky jump bar. These pages run long; this is how you get back out. */}
      <nav
        aria-label="Sections of this page"
        className="sticky top-14 z-30 -mx-4 mt-6 border-y border-line bg-white/95 px-4 py-2 backdrop-blur"
      >
        <div className="rail">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-brand-tint hover:text-brand"
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mt-7 space-y-9">
        <section className="space-y-3">
          <SectionHead id="about" title="About" />
          <p className="leading-relaxed text-ink-muted">{c.about ?? derivedAbout(c)}</p>
          {!c.about && (
            <p className="text-xs text-ink-faint">
              Assembled from the official CAP record. Nobody has written this college up by
              hand yet.
            </p>
          )}

          <dl className="panel divide-rows mt-2 overflow-hidden">
            {(
              [
                ['Institute code', c.code],
                ['Status', c.type],
                ['Home university', c.university ?? c.affiliation],
                ['Established', c.established ? String(c.established) : null],
                ['Location', place || null],
              ] as [string, string | null][]
            ).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="shrink-0 text-sm text-ink-muted">{k}</dt>
                <dd
                  className={
                    v
                      ? 'text-right text-sm font-semibold text-ink'
                      : 'text-right text-sm text-ink-faint'
                  }
                >
                  {v ?? 'Not added yet'}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-3">
          <SectionHead
            id="branches"
            title="Branches"
            aside={`${c.programs.length} in the CAP list`}
          />
          <ul className="panel divide-rows overflow-hidden">
            {c.programs.map((p) => (
              <li key={p.code} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <span className="text-sm font-medium leading-snug text-ink">{p.name}</span>
                <span className="tnum shrink-0 text-xs text-ink-faint">{p.code}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-faint">
            These are the DTE choice codes you enter on the CAP option form.
          </p>
        </section>

        <section className="space-y-3">
          <SectionHead id="cutoffs" title="Closing cutoffs" aside={c.cutoffYear ?? undefined} />
          <CutoffTable rounds={rounds} year={c.cutoffYear} seatLabels={seatLabels} />
          <p className="text-xs leading-relaxed text-ink-faint">
            Each figure is the rank and percentile of the last candidate admitted to that
            course under that seat type in that CAP round — not a qualifying mark set
            in advance.{' '}
            <Link href="/methodology" className="font-medium text-brand hover:underline">
              How these numbers were collected
            </Link>
            .
          </p>
          <div className="panel flex flex-col items-start gap-2 p-4">
            <p className="text-sm leading-relaxed text-ink-muted">
              Want to know whether your own percentile clears these cutoffs, here and at
              every other college in the CAP list?
            </p>
            <Link href="/" className="text-sm font-semibold text-brand hover:underline">
              Check with the MHT-CET predictor
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHead id="fees" title="Fees" />
          {c.fees ? (
            <ul className="panel divide-rows overflow-hidden">
              {c.fees.map((f) => (
                <li key={f.label} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <span className="text-sm text-ink-muted">{f.label}</span>
                  <span className="tnum text-sm font-semibold text-ink">{f.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <NotAdded what="The fee structure for this college" />
          )}
        </section>

        <section className="space-y-3">
          <SectionHead id="placements" title="Placements" />
          {c.placement ? (
            <ul className="panel divide-rows overflow-hidden">
              {c.placement.map((p) => (
                <li key={p.label} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <span className="text-sm text-ink-muted">{p.label}</span>
                  <span className="tnum text-sm font-semibold text-ink">{p.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <NotAdded what="Placement figures for this college" />
          )}
        </section>

        <section className="space-y-3">
          <SectionHead title="Hostel" />
          {c.hostel ? (
            <p className="leading-relaxed text-ink-muted">{c.hostel}</p>
          ) : (
            <NotAdded what="Hostel information for this college" />
          )}
        </section>

        {related.length > 0 && (
          <section className="space-y-3">
            <SectionHead
              title="Similar colleges"
              aside={c.district ? `near ${c.district}` : 'by cutoff'}
            />
            <ul className="panel divide-rows overflow-hidden">
              {related.map((r) => (
                <li key={r.code}>
                  <Link
                    href={`/colleges/${r.slug}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-wash"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] font-semibold leading-snug text-ink">
                        {r.shortName}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                        {r.district && <span>{r.district}</span>}
                        {r.openLow != null && r.openHigh != null && (
                          <>
                            <span className="h-3 w-px bg-line" aria-hidden />
                            <span className="tnum">
                              open {r.openLow.toFixed(2)}&ndash;{r.openHigh.toFixed(2)}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Disclaimer>{AFFILIATION_DISCLAIMER}</Disclaimer>
      </div>
    </div>
  );
}
