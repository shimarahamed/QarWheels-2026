import { StyleSheet, Text, View } from 'react-native';
import type { Garage } from '@/lib/marketplace';

type Props = {
  garages: Garage[];
  selectedId?: string;
  userLocation: { latitude: number; longitude: number } | null;
  onSelect: (garage: Garage) => void;
};

export default function GarageMap({ garages, onSelect }: Props) {
  const mapped = garages.filter(
    (garage) => Number.isFinite(garage.latitude) && Number.isFinite(garage.longitude),
  );
  return (
    <View style={styles.fallback} accessibilityLabel="Nearby garages list">
      <Text style={styles.title}>Garage locations</Text>
      {mapped.slice(0, 5).map((garage) => (
        <Text key={garage.id} style={styles.link} onPress={() => onSelect(garage)}>
          {garage.name} - {garage.area}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { height: 260, borderRadius: 20, padding: 20, backgroundColor: '#E8F8F5', justifyContent: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: '700', color: '#102A2A' },
  link: { color: '#087F73', fontWeight: '600' },
});
