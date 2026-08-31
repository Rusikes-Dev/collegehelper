import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import { COLLEGES, findCollege } from '@/data/colleges';
import { CutoffTable } from '@/components/college/cutoff-table';
import { Disclaimer, NotAdded } from '@/components/ui';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';

/**
 * One template for every college. Adding a college means adding a record in
 * src/data/colleges.ts; this file never changes.
 *
 * Sections with nothing in them say so. A visitor can always tell the
 * difference between a fact we checked and a gap we have not filled.
 */

export function generateStaticParams() {
  return COLLEGES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = findCollege(params.slug);
  if (!c) return { title: 'College not found' };
  return {
    title: `${c.shortName} — courses and MHT-CET cutoffs`,
    description: `Courses, official MHT-CET CAP ${c.cutoffYear} closing cutoffs and admission links for ${c.name}.`,
    alternates: { canonical: `/colleges/${c.slug}` },
    openGraph: {
      title: c.shortName,
      description: `Courses and official MHT-CET CAP cutoffs for ${c.shortName}.`,
    },
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[1.0625rem] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function CollegePage({ params }: { params: { slug: string } }) {
  const c = findCollege(params.slug);
  if (!c) notFound();

  const facts: [string, string | null][] = [
    ['Institute code', c.code],
    ['Type', c.type],
    ['Affiliation', c.affiliation],
    ['Established', c.established ? String(c.established) : null],
    ['Location', `${c.city}, ${c.district} district`],
  ];

  const links = [
    c.website && { href: c.website, label: 'Official website', icon: ExternalLink },
    c.admissionUrl && { href: c.admissionUrl, label: 'Admission page', icon: ExternalLink },
    c.mapsUrl && { href: c.mapsUrl, label: 'Open in Maps', icon: MapPin },
  ].filter(Boolean) as { href: string; label: string; icon: typeof MapPin }[];

  return (
    <div className="screen space-y-8 pb-4">
      <div className="pt-6">
        <Link
          href="/colleges"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden /> All colleges
        </Link>
        <h1 className="mt-4 text-display-sm font-bold leading-tight text-ink">{c.shortName}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{c.name}</p>
      </div>

      <div className="panel divide-rows overflow-hidden">
        {facts.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <span className="text-sm text-ink-muted">{k}</span>
            <span
              className={
                v
                  ? 'text-right text-sm font-semibold text-ink'
                  : 'text-right text-sm text-ink-faint'
              }
            >
              {v ?? 'Not added yet'}
            </span>
          </div>
        ))}
      </div>

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink hover:bg-wash"
            >
              <l.icon size={15} aria-hidden /> {l.label}
            </a>
          ))}
        </div>
      )}

      <Section title="About">
        <p className="leading-relaxed text-ink-muted">{c.about}</p>
      </Section>

      <Section title="Courses offered">
        <ul className="panel divide-rows overflow-hidden">
          {c.programs.map((p) => (
            <li key={p.code} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <span className="text-sm font-medium leading-snug text-ink">{p.name}</span>
              <span className="tnum shrink-0 text-xs text-ink-faint">{p.code}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-faint">
          Course codes are the DTE choice codes used on the CAP option form.
        </p>
      </Section>

      <Section title={`MHT-CET cutoffs ${c.cutoffYear}`}>
        <CutoffTable cutoffs={c.cutoffs} year={c.cutoffYear} />
      </Section>

      <Section title="Fees">
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
      </Section>

      <Section title="Placements">
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
      </Section>

      <Section title="Hostel">
        {c.hostel ? (
          <p className="leading-relaxed text-ink-muted">{c.hostel}</p>
        ) : (
          <NotAdded what="Hostel information for this college" />
        )}
      </Section>

      <Disclaimer>{AFFILIATION_DISCLAIMER}</Disclaimer>
    </div>
  );
}
