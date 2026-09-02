'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Branch, WithId } from '@/lib/types';
import { Card } from '@/components/ui/card';

const DOHA: [number, number] = [25.2854, 51.531];

export function GaragesMap({ vendors }: { vendors: WithId<Branch>[] | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store the Leaflet map and markers layer across renders
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  // ── Init map once on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    import('leaflet').then((L) => {
      // Guard against StrictMode double-fire
      if (mapRef.current || !containerRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true }).setView(DOHA, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = layer;

      // Trigger marker render with whatever vendors are already in state
      renderMarkers(L, map, layer, vendors);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only runs once

  // ── Update markers when vendors change ─────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    import('leaflet').then((L) => {
      renderMarkers(L, mapRef.current, layerRef.current, vendors);
    });
  }, [vendors]);

  return (
    <Card className="overflow-hidden relative aspect-[16/7] bg-muted border shadow-sm">
      <div ref={containerRef} className="h-full w-full z-0" />
    </Card>
  );
}

function renderMarkers(L: any, map: any, layer: any, vendors: WithId<Branch>[] | null) {
  layer.clearLayers();

  const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const valid = (vendors ?? []).filter((v) => v.latitude && v.longitude);
  if (valid.length === 0) {
    map.setView(DOHA, 11);
    return;
  }

  const latLngs: [number, number][] = [];
  valid.forEach((vendor) => {
    const pos: [number, number] = [vendor.latitude, vendor.longitude];
    latLngs.push(pos);

    const popup = `
      <div style="font-family:sans-serif;width:220px;padding:4px">
        <p style="font-weight:700;font-size:14px;margin:0 0 4px">${esc(vendor.name)}</p>
        <p style="font-size:12px;color:#6b7280;margin:0 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(vendor.address)}</p>
        <p style="font-size:12px;margin:0 0 10px">
          <span style="color:#f59e0b;font-weight:600">★ ${vendor.rating?.toFixed(1) ?? 'N/A'}</span>
          <span style="color:#9ca3af"> (${vendor.reviewCount ?? 0} reviews)</span>
        </p>
        <div style="display:flex;gap:8px">
          <a href="/dashboard/garages/${vendor.id}"
             style="flex:1;display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-weight:600;color:#111;text-decoration:none;background:#fff">
            Details
          </a>
          <a href="/dashboard/garages/${vendor.id}#services"
             style="flex:1;display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;color:#fff;text-decoration:none;background:#000">
            Book Now
          </a>
        </div>
      </div>`;

    L.marker(pos, { icon }).bindPopup(popup, { maxWidth: 240 }).addTo(layer);
  });

  map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 14 });
}

/** Minimal HTML escape to prevent XSS in popup strings */
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
