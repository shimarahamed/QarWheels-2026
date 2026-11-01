import { StyleSheet, Text, View } from 'react-native';

type Props = {
  garage: { latitude: number; longitude: number };
  driver: { latitude: number; longitude: number } | null;
  garageName: string;
};

export default function TrackingMap({ driver, garageName }: Props) {
  return (
    <View style={styles.fallback} accessibilityLabel="Live driver tracking status">
      <Text style={styles.title}>{garageName}</Text>
      <Text style={styles.body}>
        {driver ? 'Driver location received.' : 'Waiting for a driver location update.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { height: 240, padding: 20, borderRadius: 20, backgroundColor: '#E8F8F5', justifyContent: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: '#102A2A' },
  body: { color: '#486565' },
});
