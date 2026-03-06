'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Vendor, WithId } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Star } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// This is needed to fix an issue with Leaflet's default icon not showing up in Next.js
const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Define the map center.
const center: [number, number] = [25.2854, 51.5310]; // Center of Doha, Qatar

const RecenterAutomatically = ({vendors}: {vendors: WithId<Vendor>[] | null}) => {
    const map = useMap();
    useEffect(() => {
        if (vendors && vendors.length > 0) {
            const validVendors = vendors.filter(v => v.latitude && v.longitude);
            if (validVendors.length > 0) {
                const bounds = L.latLngBounds(validVendors.map(v => [v.latitude!, v.longitude!]));
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        } else {
            map.setView(center, 11);
        }
    }, [vendors, map]);
    return null;
}

export function GaragesMap({ vendors }: { vendors: WithId<Vendor>[] | null }) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // This effect runs only on the client, after the component has mounted.
        setIsClient(true);
    }, []);

    return (
        <Card className="overflow-hidden relative aspect-[16/7] bg-muted">
            {/* Only render the MapContainer if we are on the client */}
            {isClient ? (
                <MapContainer 
                    center={center} 
                    zoom={11} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {vendors?.map(vendor => (
                        vendor.latitude && vendor.longitude && (
                            <Marker key={vendor.id} position={[vendor.latitude, vendor.longitude]} icon={markerIcon}>
                                <Popup>
                                    <div className="p-1 w-64">
                                        <h4 className="font-bold text-base font-headline">{vendor.name}</h4>
                                        <p className="text-sm text-muted-foreground line-clamp-1">{vendor.address}</p>
                                        <div className="flex items-center gap-1 text-sm mt-1">
                                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                            <span>{vendor.rating?.toFixed(1) || 'N/A'}</span>
                                            <span className="text-muted-foreground">({vendor.reviewCount || 0} reviews)</span>
                                        </div>
                                        <Button asChild size="sm" className="mt-3 w-full">
                                            <Link href={`/dashboard/garages/${vendor.id}`}>
                                                View Garage Details
                                            </Link>
                                        </Button>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                    <RecenterAutomatically vendors={vendors} />
                </MapContainer>
            ) : (
                // Show a skeleton loader on the server and during initial client render
                <Skeleton className="h-full w-full" />
            )}
        </Card>
    );
}
