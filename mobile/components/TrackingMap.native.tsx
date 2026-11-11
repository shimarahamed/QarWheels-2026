import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';
import TrackingStatus from './TrackingMap.web';

type Props = { garage: LatLng; driver: LatLng | null; garageName: string };

export default function TrackingMap({ garage, driver, garageName }: Props) {
  const ref = useRef<MapView>(null);
  useEffect(() => {
    if (driver) {
      ref.current?.fitToCoordinates([garage, driver], {
        animated: true,
        edgePadding: { top: 56, right: 56, bottom: 56, left: 56 },
      });
    }
  }, [driver, garage]);

  if (Platform.OS === 'android' && !process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return <TrackingStatus garage={garage} driver={driver} garageName={garageName} />;
  }

  return (
    <MapView
      ref={ref}
      style={styles.map}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{ ...garage, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      accessibilityLabel="Live driver tracking map"
    >
      <Marker coordinate={garage} title={garageName} />
      {driver && <Marker coordinate={driver} title="Driver" pinColor="#14B8A6" />}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { width: '100%', height: 240 } });
