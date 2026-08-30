import type { Metadata } from 'next';
import { Disclaimer } from '@/components/ui';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';

export const metadata: Metadata = {
  title: 'About CollegeHelper',
  description:
    'CollegeHelper is an independent platform providing Maharashtra engineering college information and an MHT-CET college predictor.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="font-display text-display-lg font-semibold text-ink">About CollegeHelper</h1>
      <div className="mt-5 space-y-4 leading-relaxed text-ink-muted">
        <p>
          CollegeHelper helps Maharashtra students work out where their MHT-CET score
          could take them. The official CAP cutoff documents run to several thousand
          pages across three rounds; this site turns them into something you can
          actually search.
        </p>
        <p>
          Cutoffs are imported directly from the published CAP round documents. Every
          figure on this site traces back to a specific year, round, seat type and
          college in those documents, and each row says which. Where we do not have
          verified information \u2014 fees, placements, campus details \u2014 we leave it
          blank rather than filling it with an estimate.
        </p>
        <p>
          The predictor compares your percentile against published closing percentiles,
          or your merit rank against published closing ranks. It never converts one
          into the other, because that conversion would be a guess presented as data.
        </p>
      </div>
      <div className="mt-8">
        <Disclaimer>{AFFILIATION_DISCLAIMER}</Disclaimer>
      </div>
    </div>
  );
}
