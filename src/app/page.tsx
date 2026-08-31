import type { Metadata } from 'next';
import { PredictorFlow } from '@/components/predictor/flow';

export const metadata: Metadata = {
  title: 'MHT-CET college predictor',
  description:
    'Enter your MHT-CET percentile or merit rank and see which Maharashtra ' +
    'engineering colleges you have a good chance at, based on official CAP ' +
    'round cutoffs.',
  alternates: { canonical: '/' },
};

/** The home tab is the predictor itself. Nothing stands between arriving and using it. */
export default function HomePage() {
  return (
    <div className="screen">
      <PredictorFlow />
    </div>
  );
}
