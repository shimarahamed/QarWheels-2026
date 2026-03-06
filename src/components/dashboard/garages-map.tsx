'use client';

import dynamic from 'next/dynamic';
import type { Vendor, WithId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

// This component is a wrapper that dynamically imports the actual map component.
// 1. It prevents the map code (which needs a `window` object) from running on the server.
// 2. It shows a loading skeleton while the heavy map component loads.
const GaragesMapInner = dynamic(
  () =>
    import('./garages-map-inner').then((mod) => mod.GaragesMapInner),
  {
    ssr: false, // Ensure this component only runs on the client
    loading: () => <Skeleton className="h-full w-full" />,
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
