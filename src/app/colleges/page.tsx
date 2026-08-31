import type { Metadata } from 'next';
import { COLLEGES } from '@/data/colleges';
import { CollegeSearch } from '@/components/college/college-search';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Search colleges',
  description:
    'Course lists and official MHT-CET CAP cutoffs for Maharashtra engineering colleges.',
  alternates: { canonical: '/colleges' },
};

export default function CollegesPage() {
  // Only the fields the list needs. The cutoff rows stay on the server.
  const list = COLLEGES.map((c) => ({
    slug: c.slug,
    name: c.name,
    shortName: c.shortName,
    code: c.code,
    city: c.city,
    type: c.type,
  }));

  return (
    <div className="screen">
      <PageHeader
        title="Search colleges"
        intro="Courses, official CAP cutoffs and admission links for the colleges we have written up in full."
      />
      <CollegeSearch colleges={list} />
      <p className="mt-5 rounded-card border border-line bg-wash px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-muted">
        We are adding colleges one at a time so that every page is checked before it goes
        up. The predictor already compares your score against the cutoffs of every college
        in the CAP data, whether or not it has a page here yet.
      </p>
    </div>
  );
}
