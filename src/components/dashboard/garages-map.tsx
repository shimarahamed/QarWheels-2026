'use client';

import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from '../ui/skeleton';
import type { Vendor, WithId } from '@/lib/types';

// A bounding box to roughly map our mock coordinates to the image
const BBOX = {
    minLng: 51.45,
    maxLng: 51.58,
    minLat: 25.15,
    maxLat: 25.35,
}

export function GaragesMap({ vendors, isLoading }: { vendors: WithId<Vendor>[] | null, isLoading: boolean }) {
    const mapImage = PlaceHolderImages.find(img => img.id === 'doha-map');

    const getPosition = (lat: number, lng: number) => {
        const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * 100;
        const y = ((BBOX.maxLat - lat) / (BBOX.maxLat - BBOX.minLat)) * 100;
        return { top: `${y}%`, left: `${x}%` };
    }

    if (isLoading) {
        return <Skeleton className="w-full h-[400px] lg:h-full rounded-2xl" />;
    }

    return (
        <div className="relative w-full h-[400px] lg:h-full rounded-2xl overflow-hidden border bg-muted">
            {mapImage && (
                 <Image 
                    src={mapImage.imageUrl}
                    alt="Map of Garages in Doha"
                    fill
                    className="object-cover opacity-50"
                    data-ai-hint={mapImage.imageHint}
                 />
            )}
            <TooltipProvider>
                {vendors?.map(vendor => {
                    if (!vendor.latitude || !vendor.longitude) return null;
                    const position = getPosition(vendor.latitude, vendor.longitude);
                    return (
                        <Tooltip key={vendor.id}>
                            <TooltipTrigger asChild>
                                <div 
                                    className="absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
                                    style={{ top: position.top, left: position.left, transition: 'top 0.3s, left 0.3s' }}
                                >
                                    <MapPin className="h-10 w-10 text-primary fill-primary/20 drop-shadow-lg cursor-pointer" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-semibold">{vendor.name}</p>
                                <p className="text-sm text-muted-foreground">{vendor.address}</p>
                            </TooltipContent>
                        </Tooltip>
                    )
                })}
            </TooltipProvider>
        </div>
    )
}
