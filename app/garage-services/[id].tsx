import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { findGarage, popularJobs } from '@/lib/marketplace';

const CATEGORIES = ['All', 'Oil & Fluids', 'AC & Cooling', 'Brakes', 'Battery', 'Tyres', 'Diagnostics', 'Body'];

const TYPE_COLORS: Record<string, string> = {
  'Oil & Fluids': '#F59E0B',
  'AC & Cooling': '#3B82F6',
  'Brakes':       '#EF4444',
  'Battery':      '#8B5CF6',
  'Tyres':        '#6B7280',
  'Diagnostics':  '#10B981',
  'Body':         '#F97316',
};

export default function GarageServicesScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const garage = (() => { try { return findGarage(id); } catch { return null; } })();

  // Use popularJobs as the service catalogue — filter to garage if available, else show all
  const garageJobs = popularJobs.filter((j) => !j.garageId || j.garageId === id);
  const jobs = garageJobs.length > 0 ? garageJobs : popularJobs;

  const filtered = jobs.filter((job) => {
    const matchSearch = !search || job.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || job.categoryId === activeCategory.toLowerCase().replace(/ & /g, '-').replace(/\s/g, '-');
    return matchSearch && matchCat;
  });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text style={[s.navTitle, { color: c.text }]} numberOfLines={1}>{garage?.name ?? 'Services'}</Text>
          <Text style={[s.navSub, { color: c.muted }]}>{jobs.length} services available</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={[s.searchBox, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={16} color={c.muted} />
          <TextInput
            style={[s.searchInput, { color: c.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search services…"
            placeholderTextColor={c.muted}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.catStrip, { borderBottomColor: c.border }]}
        style={{ backgroundColor: c.surface }}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[s.catChip, {
              backgroundColor: activeCategory === cat ? c.primary : c.surfaceAlt,
              borderColor: activeCategory === cat ? c.primary : c.border,
            }]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[s.catText, { color: activeCategory === cat ? '#fff' : c.textSecondary }]}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="search-outline" size={36} color={c.muted} />
              <Text style={[s.emptyText, { color: c.muted }]}>No services match your search.</Text>
            </View>
          ) : (
            filtered.map((job) => {
              const catColor = TYPE_COLORS[activeCategory] ?? c.primary;
              return (
                <Pressable
                  key={job.id}
                  style={[s.serviceCard, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => router.push(`/checkout/${job.id}` as never)}
                >
                  <View style={s.serviceLeft}>
                    <View style={[s.serviceIcon, { backgroundColor: `${catColor}18` }]}>
                      <Ionicons name="construct-outline" size={20} color={catColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.serviceTitle, { color: c.text }]}>{job.title}</Text>
                      <View style={s.serviceMeta}>
                        {job.duration && (
                          <View style={s.metaChip}>
                            <Ionicons name="time-outline" size={11} color={c.muted} />
                            <Text style={[s.metaText, { color: c.muted }]}>{job.duration}</Text>
                          </View>
                        )}
                        <View style={s.metaChip}>
                          <Ionicons name="calendar-outline" size={11} color={c.muted} />
                          <Text style={[s.metaText, { color: c.muted }]}>{job.availability}</Text>
                        </View>
                        {job.warranty && (
                          <View style={s.metaChip}>
                            <Ionicons name="shield-checkmark-outline" size={11} color={c.success} />
                            <Text style={[s.metaText, { color: c.success }]}>{job.warranty}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={s.serviceRight}>
                    <Text style={[s.servicePrice, { color: c.primary }]}>{job.price}</Text>
                    <View style={[s.bookPill, { backgroundColor: c.primary }]}>
                      <Text style={s.bookPillText}>Book</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  navSub: { fontSize: 11, fontWeight: '600' },
  searchWrap: { paddingHorizontal: spacing.page, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14 },
  catStrip: { paddingHorizontal: spacing.page, paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  catChip: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  catText: { fontSize: 12, fontWeight: '800' },
  content: { padding: spacing.page, gap: 10, paddingBottom: 40 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs,
  },
  serviceLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  serviceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  serviceMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontWeight: '600' },
  serviceRight: { alignItems: 'flex-end', gap: 8 },
  servicePrice: { fontSize: 15, fontWeight: '900' },
  bookPill: { borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  bookPillText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
