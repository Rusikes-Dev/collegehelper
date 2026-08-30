import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PredictorFlow } from '@/components/predictor/flow';
import { Disclaimer } from '@/components/ui';
import { getSettings, formatPrice } from '@/lib/settings';
import { PREDICTION_DISCLAIMER } from '@/lib/predictor';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: `MHT-CET College Predictor ${s.activeYear}`,
    description:
      `Enter your MHT-CET percentile or merit rank and see which Maharashtra ` +
      `engineering colleges match, based on official CAP Round I, II and III ` +
      `cutoff data for ${s.activeYear}.`,
    alternates: { canonical: '/college-predictor' },
    openGraph: {
      title: 'MHT-CET College Predictor',
      description:
        'Find colleges by percentile or merit rank using official CAP round cutoff data.',
    },
  };
}

export default async function PredictorPage() {
  const settings = await getSettings();
  return (
    <div className="container-page max-w-3xl py-10">
      <header className="mb-8">
        <h1 className="font-display text-display-lg font-semibold text-ink">
          MHT-CET College Predictor
        </h1>
        <p className="mt-2 text-ink-muted">
          Answer a few questions and see which colleges match your score.
          {settings.accessMode === 'PAID' && (
            <> Full results cost {formatPrice(settings.pricePaise)}.</>
          )}
        </p>
      </header>

      <Suspense fallback={<p className="text-ink-muted">Loading\u2026</p>}>
        <PredictorFlow />
      </Suspense>

      <div className="mt-10">
        <Disclaimer>{PREDICTION_DISCLAIMER}</Disclaimer>
      </div>
    </div>
  );
}
