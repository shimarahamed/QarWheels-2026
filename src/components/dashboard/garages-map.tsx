'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Vendor, WithId } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Star } from 'lucide-react';
import React, { useEffect } from 'react';
import { type LatLngExpression } from 'leaflet'; // Import only the type

// Define the map center using the imported type.
// This is safe for server components because type imports are erased at compile time.
const center: LatLngExpression = [25.2854, 51.5310]; // Center of Doha, Qatar

export function GaragesMap({ vendors }: { vendors: WithId<Vendor>[] | null }) {
    
    useEffect(() => {
        // This effect runs only on the client, ensuring that the `window` object is available.
        // We dynamically import the Leaflet library here to prevent it from being bundled on the server.
        (async () => {
            const L = (await import('leaflet')).default;
            
            // This is a well-known workaround for a common issue where Leaflet's default icon
            // paths are not resolved correctly by modern bundlers like Webpack or Turbopack.
            // By deleting the internal `_getIconUrl` method and then merging our own options,
            // we force Leaflet to use the provided full URLs for the marker icons.
            // @ts-ignore
            delete L.Icon.Default.prototype._getIconUrl;

            L.Icon.Default.mergeOptions({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
            });
        })();
    }, []);


    return (
        <Card className="overflow-hidden relative aspect-[16/7] bg-muted">
            <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {vendors?.map(vendor => (
                    // The Marker component from react-leaflet will now correctly use the default icon
                    // thanks to the fix applied in the useEffect hook.
                    <Marker key={vendor.id} position={[vendor.latitude, vendor.longitude]}>
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
                ))}
            </MapContainer>
        </Card>
    );
}
