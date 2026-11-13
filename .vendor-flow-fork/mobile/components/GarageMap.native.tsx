import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';
import type { Garage } from '@/lib/marketplace';
import GarageList from './GarageMap.web';

type Props = {
  garages: Garage[];
  selectedId?: string;
  userLocation: LatLng | null;
  onSelect: (garage: Garage) => void;
};

const DOHA = { latitude: 25.2854, longitude: 51.531 };

export default function GarageMap({ garages, selectedId, userLocation, onSelect }: Props) {
  const mapRef = useRef<MapView>(null);
  const mapped = garages.filter(
    (garage) => Number.isFinite(garage.latitude) && Number.isFinite(garage.longitude),
  );

  useEffect(() => {
    const points: LatLng[] = mapped.map((garage) => ({
      latitude: garage.latitude!,
      longitude: garage.longitude!,
    }));
    if (userLocation) points.push(userLocation);
    if (points.length > 1) {
      mapRef.current?.fitToCoordinates(points, {
        animated: true,
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      });
    }
  }, [garages, userLocation]);

  const center = userLocation ?? (mapped[0]
    ? { latitude: mapped[0].latitude!, longitude: mapped[0].longitude! }
    : DOHA);

  if (Platform.OS === 'android' && !process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return <GarageList garages={garages} selectedId={selectedId} userLocation={userLocation} onSelect={onSelect} />;
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{ ...center, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
      showsUserLocation={Boolean(userLocation)}
      showsMyLocationButton={Boolean(userLocation)}
      accessibilityLabel="Nearby garages map"
    >
      {mapped.map((garage) => (
        <Marker
          key={garage.id}
          coordinate={{ latitude: garage.latitude!, longitude: garage.longitude! }}
          title={garage.name}
          description={`${garage.area} - ${garage.startingPrice}`}
          pinColor={garage.id === selectedId ? '#14B8A6' : undefined}
          onPress={() => onSelect(garage)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 260, borderRadius: 20 },
});
