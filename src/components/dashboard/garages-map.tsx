'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Vendor, WithId } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Define the map center.
const center: [number, number] = [25.2854, 51.5310]; // Doha, Qatar

export function GaragesMap({ vendors }: { vendors: WithId<Vendor>[] | null }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !mapRef.current) return;

        // Dynamically import Leaflet only on the client
        const L = require('leaflet');

        // Fix for default marker icons in Next.js
        const markerIcon = new L.Icon({
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // Initialize map if it doesn't exist
        if (!mapInstance.current) {
            // Check if there's already a map initialized on this element
            // Leaflet attaches a _leaflet_id to the container
            if ((mapRef.current as any)._leaflet_id) {
                return;
            }

            mapInstance.current = L.map(mapRef.current).setView(center, 11);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance.current);

            markersLayerRef.current = L.layerGroup().addTo(mapInstance.current);
        }

        const map = mapInstance.current;
        const markersLayer = markersLayerRef.current;

        // Clear existing markers
        markersLayer.clearLayers();

        // Add new markers
        if (vendors && vendors.length > 0) {
            const validVendors = vendors.filter(v => v.latitude && v.longitude);
            const latLngs: [number, number][] = [];

            validVendors.forEach(vendor => {
                const pos: [number, number] = [vendor.latitude, vendor.longitude];
                latLngs.push(pos);

                // Manual HTML for popup content to match ShadCN styling
                const popupContent = `
                    <div class="p-1 w-64 font-sans">
                        <h4 class="font-bold text-base mb-1">${vendor.name}</h4>
                        <p class="text-sm text-gray-500 line-clamp-1 mb-2">${vendor.address}</p>
                        <div class="flex items-center gap-1 text-sm mb-3">
                            <span class="font-semibold text-amber-500">★ ${vendor.rating?.toFixed(1) || 'N/A'}</span>
                            <span class="text-gray-400">(${vendor.reviewCount || 0} reviews)</span>
                        </div>
                        <a href="/dashboard/garages/${vendor.id}" 
                           class="inline-flex items-center justify-center w-full rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-colors"
                           style="text-decoration: none;">
                            View Details
                        </a>
                    </div>
                `;

                L.marker(pos, { icon: markerIcon })
                    .bindPopup(popupContent)
                    .addTo(markersLayer);
            });

            // Recenter and zoom to fit markers
            if (latLngs.length > 0) {
                const bounds = L.latLngBounds(latLngs);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        } else if (!vendors || vendors.length === 0) {
            map.setView(center, 11);
        }

        // Cleanup function: remove map instance when component unmounts
        return () => {
            // We only remove the markers on updates, not the whole map
            // The main map removal happens in the separate unmount effect below
        };
    }, [isClient, vendors]);

    // Separate effect for absolute cleanup on unmount
    useEffect(() => {
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    return (
        <Card className="overflow-hidden relative aspect-[16/7] bg-muted border shadow-sm">
            {!isClient ? (
                <Skeleton className="h-full w-full" />
            ) : (
                <div ref={mapRef} className="h-full w-full z-0" />
            )}
        </Card>
    );
}
