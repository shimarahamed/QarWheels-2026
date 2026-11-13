import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { lookupCar } from '@/lib/marketplace';
import RecordNotFound from '@/components/RecordNotFound';

type FuelEntry = { id: string; date: string; litres: number; pricePerL: number; odometer: number; station: string; isFull: boolean };

const DEMO_ENTRIES: FuelEntry[] = [
  { id: 'f1', date: '2026-06-01', litres: 45.2, pricePerL: 1.65, odometer: 48250, station: 'WOQOD Al Sadd',   isFull: true },
  { id: 'f2', date: '2026-05-18', litres: 38.0, pricePerL: 1.65, odometer: 47680, station: 'Shell West Bay',   isFull: true },
  { id: 'f3', date: '2026-05-04', litres: 42.5, pricePerL: 1.60, odometer: 47040, station: 'WOQOD Lusail',     isFull: false },
];

const FUEL_GRADE = ['91 Super', '95 Premium', 'Diesel'];

export default function FuelLogScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const car = lookupCar(id);

  const [entries, setEntries] = useState<FuelEntry[]>(DEMO_ENTRIES);
  const [showAdd, setShowAdd] = useState(false);
  const [litres, setLitres] = useState('');
  const [price, setPrice] = useState('1.65');
  const [odo, setOdo] = useState('');
  const [station, setStation] = useState('');
  const [isFull, setIsFull] = useState(true);

  function addEntry() {
    const l = parseFloat(litres);
    const p = parseFloat(price);
    const o = parseInt(odo);
    if (!l || !p || !o) { Alert.alert('Fill in all fields'); return; }
    const entry: FuelEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      litres: l, pricePerL: p, odometer: o,
      station: station.trim() || 'Unknown station',
      isFull,
    };
    setEntries((prev) => [entry, ...prev]);
    setLitres(''); setOdo(''); setStation(''); setShowAdd(false);
  }

  // Stats
  const totalSpend = entries.reduce((a, e) => a + e.litres * e.pricePerL, 0);
  const totalLitres = entries.reduce((a, e) => a + e.litres, 0);
  const fullFills = entries.filter((e) => e.isFull);
  const avgPer100 = fullFills.length >= 2 ? (() => {
    const distKm = fullFills[0].odometer - fullFills[fullFills.length - 1].odometer;
    const totalL = fullFills.slice(0, -1).reduce((a, e) => a + e.litres, 0);
    return distKm > 0 ? (totalL / distKm) * 100 : 0;
  })() : 0;

  if (!car) {
    return <RecordNotFound title="Vehicle not found" message="This vehicle may have been removed from your garage." />;
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <View style={[s.navbar, { borderBottomColor: c.border }]}>
          <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            <Text style={[s.navTitle, { color: c.text }]}>Fuel log</Text>
            {car && <Text style={[s.navSub, { color: c.muted }]}>{car.name}</Text>}
          </View>
          <Pressable style={[s.addBtn, { backgroundColor: c.primary }]} onPress={() => setShowAdd((v) => !v)}>
            <Ionicons name={showAdd ? 'close' : 'add'} size={18} color="#fff" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <MotionScreen>
            {/* Stats row */}
            <View style={s.statsRow}>
              {[
                { label: 'Total spend', value: `QAR ${totalSpend.toFixed(0)}`, icon: 'wallet-outline' as const },
                { label: 'Total litres', value: `${totalLitres.toFixed(0)} L`, icon: 'water-outline' as const },
                { label: 'Avg fuel economy', value: avgPer100 > 0 ? `${avgPer100.toFixed(1)} L/100km` : '—', icon: 'speedometer-outline' as const },
              ].map((stat) => (
                <View key={stat.label} style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Ionicons name={stat.icon} size={16} color={c.primary} />
                  <Text style={[s.statValue, { color: c.text }]}>{stat.value}</Text>
                  <Text style={[s.statLabel, { color: c.muted }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Add form */}
            {showAdd && (
              <View style={[s.addForm, { backgroundColor: c.surface, borderColor: c.primary }]}>
                <Text style={[s.addTitle, { color: c.text }]}>New fill-up</Text>
                <View style={s.inputRow}>
                  <TextInput style={[s.inputHalf, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]} value={litres} onChangeText={setLitres} placeholder="Litres" placeholderTextColor={c.muted} keyboardType="decimal-pad" />
                  <TextInput style={[s.inputHalf, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]} value={price} onChangeText={setPrice} placeholder="QAR/litre" placeholderTextColor={c.muted} keyboardType="decimal-pad" />
                </View>
                <TextInput style={[s.inputFull, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]} value={odo} onChangeText={setOdo} placeholder="Odometer (km)" placeholderTextColor={c.muted} keyboardType="number-pad" />
                <TextInput style={[s.inputFull, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]} value={station} onChangeText={setStation} placeholder="Station name (optional)" placeholderTextColor={c.muted} />
                <Pressable style={s.fullToggle} onPress={() => setIsFull((v) => !v)}>
                  <View style={[s.checkbox, { borderColor: c.border, backgroundColor: isFull ? c.primary : 'transparent' }]}>
                    {isFull && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={[s.fullText, { color: c.textSecondary }]}>Full tank fill-up</Text>
                </Pressable>
                <Pressable style={[s.saveBtn, { backgroundColor: c.primary }]} onPress={addEntry}>
                  <Text style={s.saveBtnText}>Save entry</Text>
                </Pressable>
              </View>
            )}

            {/* Entry list */}
            <Text style={[s.histLabel, { color: c.muted }]}>FILL-UP HISTORY</Text>
            {entries.map((entry) => (
              <View key={entry.id} style={[s.entryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[s.entryIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="water" size={16} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.entryTop}>
                    <Text style={[s.entryStation, { color: c.text }]}>{entry.station}</Text>
                    <Text style={[s.entryCost, { color: c.primary }]}>QAR {(entry.litres * entry.pricePerL).toFixed(2)}</Text>
                  </View>
                  <Text style={[s.entryMeta, { color: c.muted }]}>
                    {entry.litres.toFixed(1)} L · QAR {entry.pricePerL.toFixed(2)}/L · {entry.odometer.toLocaleString()} km
                  </Text>
                  <Text style={[s.entryDate, { color: c.muted }]}>{entry.date}{entry.isFull ? ' · Full tank' : ''}</Text>
                </View>
              </View>
            ))}
          </MotionScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  navSub: { fontSize: 12, fontWeight: '600' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4, ...shadow.xs },
  statValue: { fontSize: 13, fontWeight: '900', textAlign: 'center' },
  statLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  addForm: { borderRadius: radius.xl, borderWidth: 1.5, padding: 14, gap: 10, ...shadow.sm },
  addTitle: { fontSize: 15, fontWeight: '900' },
  inputRow: { flexDirection: 'row', gap: 8 },
  inputHalf: { flex: 1, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 44, fontSize: 14 },
  inputFull: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 44, fontSize: 14 },
  fullToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  fullText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { height: 46, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  histLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  entryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 12, ...shadow.xs },
  entryIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  entryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryStation: { fontSize: 14, fontWeight: '800', flex: 1 },
  entryCost: { fontSize: 14, fontWeight: '900' },
  entryMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  entryDate: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});
