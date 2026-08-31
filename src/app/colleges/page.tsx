import type { Metadata } from 'next';
import { collegeIndex, districts } from '@/data/colleges';
import { CollegeSearch } from '@/components/college/college-search';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Search colleges',
  description:
    'Branch lists and official MHT-CET CAP closing cutoffs for every engineering ' +
    'college in the Maharashtra CAP dataset.',
  alternates: { canonical: '/colleges' },
};

export default function CollegesPage({
  searchParams,
}: {
  searchParams?: { district?: string };
}) {
  const list = collegeIndex();
  const byDistrict = districts();
  const placed = list.filter((c) => c.district).length;

  // Only honour a district that exists, so a stale link degrades to the full
  // list rather than an empty one.
  const requested = searchParams?.district;
  const district = byDistrict.some((d) => d.name === requested) ? requested! : null;

  return (
    <div className="screen">
      <PageHeader
        title="Search colleges"
        intro={`Every college in the ${
          list.length
        }-institute CAP dataset, with its branch list and official closing cutoffs.`}
      />

      <CollegeSearch colleges={list} districts={byDistrict} initialDistrict={district} />

      <p className="mt-6 rounded-card border border-line bg-wash px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-muted">
        City and district are worked out from each institute&rsquo;s registered name, which is
        the only location the cutoff documents carry. They are right for {placed} of{' '}
        {list.length} colleges and blank for the rest; nothing here is a confirmed address.
        Fees, placements and hostel details appear only on the colleges someone has checked
        against a primary source.
      </p>
    </div>
  );
}
