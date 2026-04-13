import type { Metadata } from 'next';

import { DecoPlanner } from '@/components/deco-planner';

export const metadata: Metadata = {
  title: 'Deco Planner',
  description:
    'Plan decompression stops from a segment-based dive profile using Buhlmann ZHL-16C with gradient factors.',
};

export default function DecoPlannerPage() {
  return <DecoPlanner />;
}
