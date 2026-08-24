import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { garages, type Garage } from '@/lib/marketplace';

function sortGarages(list: Garage[], mode: string): Garage[] {
  const copy = [...list];
  if (mode === 'Top rated') return copy.sort((a, b) => b.rating - a.rating);
  if (mode === 'Price: Low') return copy.sort((a, b) => a.startingPriceValue - b.startingPriceValue);
  if (mode === 'Available now') return copy.sort((a, b) => (b.openNow ? 1 : 0) - (a.openNow ? 1 : 0));
  return copy.sort((a, b) => a.distanceKm - b.distanceKm); // Nearest
}

// react-native-maps is not yet installed (requires native build).
// This screen renders a visual map grid with positioned garage pins.
// Replace the MapPlaceholder component with a real MapView once EAS build is set up.

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_H = 260;

// Doha bounding box (lat/lng → pixel)
const LAT_MIN = 25.22, LAT_MAX = 25.42;
const LNG_MIN = 51.42, LNG_MAX = 51.62;

function latToY(lat: number) {
  return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H;
}
function lngToX(lng: number) {
  return ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (SCREEN_W - spacing.page * 2);
}

// Sample coords for demo garages (Doha area)
const GARAGE_COORDS: Record<string, { lat: number; lng: number }> = {
  vendor_aab_toyota:    { lat: 25.310, lng: 51.495 },
  vendor_al_mana_ford:  { lat: 25.253, lng: 51.547 },
  vendor_nissan_service:{ lat: 25.367, lng: 51.510 },
  vendor_teyseer:       { lat: 25.228, lng: 51.468 },
  vendor_qauto_vw:      { lat: 25.340, lng: 51.525 },
  garage_011:           { lat: 25.285, lng: 51.531 },
  garage_002:           { lat: 25.295, lng: 51.508 },
  garage_009:           { lat: 25.273, lng: 51.555 },
  garage_006:           { lat: 25.318, lng: 51.480 },
};

const SORT_OPTIONS = ['Nearest', 'Top rated', 'Price: Low', 'Available now'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

function MapPlaceholder({ selected, onSelect }: { selected: Garage | null; onSelect: (g: Garage) => void }) {
  const c = useQarColors();
  const garageList = garages.filter((g) => g.id in GARAGE_COORDS);

  return (
    <View style={[mapS.container, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      {/* Grid lines */}
      {[...Array(5)].map((_, i) => (
        <View key={`h${i}`} style={[mapS.gridH, { top: (MAP_H / 5) * i, borderBottomColor: c.border }]} />
      ))}
      {[...Array(5)].map((_, i) => (
        <View key={`v${i}`} style={[mapS.gridV, { left: ((SCREEN_W - spacing.page * 2) / 5) * i, borderRightColor: c.border }]} />
      ))}

      {/* User location */}
      <View style={[mapS.userPin, { top: latToY(25.285), left: lngToX(51.531) }]}>
        <View style={[mapS.userRing, { borderColor: c.primary }]} />
        <View style={[mapS.userDot, { backgroundColor: c.primary }]} />
      </View>

      {/* Garage pins */}
      {garageList.map((g) => {
        const coords = GARAGE_COORDS[g.id];
        const isSelected = selected?.id === g.id;
        return (
          <Pressable
            key={g.id}
            style={[mapS.garagePin, {
              top: latToY(coords.lat) - 16,
              left: lngToX(coords.lng) - 20,
              backgroundColor: isSelected ? c.primary : c.surface,
              borderColor: isSelected ? c.primary : c.border,
              ...shadow.sm,
            }]}
            onPress={() => onSelect(g)}
          >
            <Text style={[mapS.pinText, { color: isSelected ? '#fff' : c.primary }]}>{g.startingPrice}</Text>
          </Pressable>
        );
      })}

      {/* Map notice */}
      <View style={[mapS.notice, { backgroundColor: `${c.primary}14` }]}>
        <Ionicons name="map-outline" size={11} color={c.primary} />
        <Text style={[mapS.noticeText, { color: c.primary }]}>Full map requires native build (react-native-maps)</Text>
      </View>
    </View>
  );
}

const mapS = StyleSheet.create({
  container: { width: '100%', height: MAP_H, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  gridH: { position: 'absolute', left: 0, right: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  gridV: { position: 'absolute', top: 0, bottom: 0, borderRightWidth: StyleSheet.hairlineWidth },
  userPin: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  userRing: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 2, opacity: 0.4 },
  userDot: { width: 10, height: 10, borderRadius: 5 },
  garagePin: { position: 'absolute', borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  pinText: { fontSize: 12, fontWeight: '900' },
  notice: { position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 5 },
  noticeText: { fontSize: 12, fontWeight: '700' },
});

export default function MapScreen() {
  const c = useQarColors();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('Nearest');
  const [selected, setSelected] = useState<Garage | null>(null);

  const filtered = useMemo(() => {
    const sorted = sortGarages(garages, sort);
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((g) => g.name.toLowerCase().includes(q) || g.area.toLowerCase().includes(q) || g.type.toLowerCase().includes(q));
  }, [search, sort]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={[s.searchBox, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={15} color={c.muted} />
          <TextInput
            style={[s.searchInput, { color: c.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search garages or area…"
            placeholderTextColor={c.muted}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={c.muted} />
            </Pressable>
          )}
        </View>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push('/search' as never)}>
          <Ionicons name="options-outline" size={20} color={c.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Visual map */}
          <MapPlaceholder selected={selected} onSelect={setSelected} />

          {/* Sort strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortStrip}>
            {SORT_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[s.sortChip, {
                  backgroundColor: sort === opt ? c.primary : c.surfaceAlt,
                  borderColor: sort === opt ? c.primary : c.border,
                }]}
                onPress={() => setSort(opt)}
              >
                <Text style={[s.sortText, { color: sort === opt ? '#fff' : c.textSecondary }]}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Selected garage card */}
          {selected && (
            <Pressable
              style={[s.selectedCard, { backgroundColor: c.surface, borderColor: c.primary }]}
              onPress={() => router.push(`/garage/${selected.id}` as never)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.selName, { color: c.text }]}>{selected.name}</Text>
                <Text style={[s.selMeta, { color: c.muted }]}>{selected.type} · {selected.area} · {selected.distanceKm.toFixed(1)} km</Text>
                <View style={s.selChips}>
                  <View style={[s.chip, { backgroundColor: c.surfaceAlt }]}>
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text style={[s.chipText, { color: c.textSecondary }]}>{selected.rating}</Text>
                  </View>
                  <View style={[s.chip, { backgroundColor: selected.openNow ? c.successBg : c.surfaceAlt }]}>
                    <Text style={[s.chipText, { color: selected.openNow ? c.success : c.muted }]}>{selected.openNow ? 'Open' : 'Closed'}</Text>
                  </View>
                  <View style={[s.chip, { backgroundColor: c.primaryLight }]}>
                    <Text style={[s.chipText, { color: c.primary, fontWeight: '800' }]}>{selected.startingPrice}</Text>
                  </View>
                </View>
              </View>
              <Pressable
                style={[s.bookNow, { backgroundColor: c.primary }]}
                onPress={() => router.push(`/checkout/${selected.id}` as never)}
              >
                <Text style={s.bookNowText}>Book</Text>
              </Pressable>
            </Pressable>
          )}

          {/* Count */}
          <Text style={[s.countLabel, { color: c.muted }]}>{filtered.length} garages nearby</Text>

          {/* List */}
          {filtered.map((g) => (
            <Pressable
              key={g.id}
              style={[s.listRow, { backgroundColor: c.surface, borderColor: selected?.id === g.id ? c.primary : c.border }]}
              onPress={() => setSelected(g)}
            >
              <View style={[s.listDot, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="car" size={14} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.listName, { color: c.text }]}>{g.name}</Text>
                <Text style={[s.listMeta, { color: c.muted }]}>{g.area} · {g.distanceKm.toFixed(1)} km · {g.startingPrice}</Text>
              </View>
              <View style={s.listRight}>
                <View style={[s.chip, { backgroundColor: c.surfaceAlt }]}>
                  <Ionicons name="star" size={9} color="#F59E0B" />
                  <Text style={[s.chipText, { color: c.textSecondary }]}>{g.rating}</Text>
                </View>
                {g.openNow && (
                  <View style={[s.chip, { backgroundColor: c.successBg }]}>
                    <Text style={[s.chipText, { color: c.success }]}>Open</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          ))}
        </MotionScreen>
      </ScrollView>
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
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: 13 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  sortStrip: { gap: 8, paddingBottom: 2 },
  sortChip: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  sortText: { fontSize: 12, fontWeight: '800' },
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1.5, padding: 12, ...shadow.sm },
  selName: { fontSize: 15, fontWeight: '800' },
  selMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  selChips: { flexDirection: 'row', gap: 6, marginTop: 6 },
  bookNow: { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 8 },
  bookNowText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  countLabel: { fontSize: 12, fontWeight: '700' },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 12, ...shadow.xs,
  },
  listDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  listName: { fontSize: 14, fontWeight: '800' },
  listMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  listRight: { flexDirection: 'row', gap: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  chipText: { fontSize: 12, fontWeight: '700' },
  navTitle: { ...typography.h4 },
});
