'use client';

import dynamic from 'next/dynamic';
import type { Vendor, WithId } from '@/lib/types';
import { Card } from '@/components/ui/card';

// Dynamically import the map component, but without a loading skeleton here.
// The inner component will handle its own loading/placeholder state via the `placeholder` prop.
const GaragesMapInner = dynamic(
  () =>
    import('./garages-map-inner').then((mod) => mod.GaragesMapInner),
  {
    ssr: false, // This is crucial to prevent server-side rendering of the map
  }
);

export function GaragesMap({
  vendors,
}: {
  vendors: WithId<Vendor>[] | null;
}) {
  // This Card provides the container styling (border, background, aspect ratio) for the map.
  return (
    <Card className="overflow-hidden relative aspect-[16/7] bg-muted">
      <GaragesMapInner vendors={vendors} />
    </Card>
  );
}
