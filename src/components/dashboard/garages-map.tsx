'use client';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState } from 'react';
import type { Vendor, WithId } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Star } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Center of Doha, Qatar
const center = {
  lat: 25.2854,
  lng: 51.5310,
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    // A neutral, modern map style to fit the theme
    styles: [
        {
            "featureType": "poi.business",
            "stylers": [ { "visibility": "off" } ]
        },
        {
            "featureType": "road",
            "elementType": "labels.icon",
            "stylers": [ { "visibility": "off" } ]
        },
        {
            "featureType": "transit",
            "stylers": [ { "visibility": "off" } ]
        }
    ]
};

export function GaragesMap({ vendors }: { vendors: WithId<Vendor>[] | null }) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    });

    const [selectedVendor, setSelectedVendor] = useState<WithId<Vendor> | null>(null);

    if (loadError) {
        return (
            <Card className="aspect-[16/7] flex items-center justify-center">
                <CardContent className="p-4 text-center text-destructive">
                    <p className="font-semibold">Error loading map.</p>
                    <p className="text-sm">Please ensure your Google Maps API key is correct and the Maps JavaScript API is enabled.</p>
                </CardContent>
            </Card>
        );
    }

    if (!isLoaded) {
        return <Skeleton className="aspect-[16/7] w-full" />;
    }

    return (
        <Card className="overflow-hidden relative aspect-[16/7] bg-muted">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={11}
                options={mapOptions}
            >
                {vendors?.map(vendor => (
                    <MarkerF
                        key={vendor.id}
                        position={{ lat: vendor.latitude, lng: vendor.longitude }}
                        onClick={() => setSelectedVendor(vendor)}
                        title={vendor.name}
                    />
                ))}

                {selectedVendor && (
                    <InfoWindowF
                        position={{ lat: selectedVendor.latitude, lng: selectedVendor.longitude }}
                        onCloseClick={() => setSelectedVendor(null)}
                        options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
                    >
                        <div className="p-1 w-64">
                            <h4 className="font-bold text-base font-headline">{selectedVendor.name}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-1">{selectedVendor.address}</p>
                            <div className="flex items-center gap-1 text-sm mt-1">
                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                <span>{selectedVendor.rating?.toFixed(1) || 'N/A'}</span>
                                <span className="text-muted-foreground">({selectedVendor.reviewCount || 0} reviews)</span>
                            </div>
                            <Button asChild size="sm" className="mt-3 w-full">
                                <Link href={`/dashboard/garages/${selectedVendor.id}`}>
                                    View Garage Details
                                </Link>
                            </Button>
                        </div>
                    </InfoWindowF>
                )}
            </GoogleMap>
        </Card>
    );
}
