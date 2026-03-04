'use client';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Vendor, WithId } from '@/lib/types';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import Link from 'next/link';

export function GaragesMap({ vendors }: { vendors: WithId<Vendor>[] }) {
    const mapImage = PlaceHolderImages.find(p => p.id === 'doha-map');

    // This is a simplified placeholder for a real map.
    // In a real app, you'd use a library like react-leaflet or @react-google-maps/api
    // to render an interactive map and calculate pin positions from lat/lng.
    const getPinPosition = (index: number) => {
        const positions = [
            { top: '20%', left: '30%' },
            { top: '50%', left: '50%' },
            { top: '35%', left: '65%' },
            { top: '65%', left: '25%' },
            { top: '75%', left: '70%' },
        ];
        return positions[index % positions.length];
    }
    
    return (
        <Card className="overflow-hidden relative aspect-[16/7]">
            {mapImage && (
                <Image 
                    src={mapImage.imageUrl}
                    alt="Map of Doha"
                    fill
                    className="object-cover"
                    data-ai-hint={mapImage.imageHint}
                />
            )}
            <div className="absolute inset-0 bg-black/30" />

            {vendors.slice(0, 5).map((vendor, index) => (
                <Link key={vendor.id} href={`/dashboard/garages/${vendor.id}`}>
                    <div 
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                        style={getPinPosition(index)}
                    >
                        <MapPin className="h-10 w-10 text-primary-foreground drop-shadow-lg fill-primary group-hover:scale-125 transition-transform" />
                        <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 bg-primary-foreground text-primary rounded-md text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap -translate-x-1/2 left-1/2">
                            {vendor.name}
                        </div>
                    </div>
                </Link>
            ))}
        </Card>
    );
}