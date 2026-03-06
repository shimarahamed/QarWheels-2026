'use client';

import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export function GaragesMap({ vendors }: { vendors: any }) {
    return (
        <Card className="overflow-hidden relative aspect-[16/7] bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                <h3 className="text-lg font-semibold">Map View Temporarily Unavailable</h3>
                <p>Please use the list below to find garages.</p>
            </div>
        </Card>
    );
}
