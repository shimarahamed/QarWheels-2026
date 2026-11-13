import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useBranches } from '@/lib/firestoreOps';
import { tap } from '@/lib/haptics';
import { garageDistanceLabel } from '@/lib/marketplace-display';
import { RemoteImage } from '@/components/RemoteImage';

export default function FavoritesScreen() {
  const c = useQarColors();
  const router = useRouter();
  const favoriteIds = useQarWheelStore((s) => s.favoriteGarageIds);
  const toggleFav = useQarWheelStore((s) => s.toggleFavoriteGarage);
  const { vendors, loading, error, refresh } = useBranches();

  const savedGarages = vendors.filter((g) => favoriteIds.includes(g.id));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/search')}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Saved garages</Text>
        <View style={[s.countBadge, { backgroundColor: c.primaryLight }]}>
          <Text style={[s.countText, { color: c.primary }]}>{savedGarages.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {loading ? (
            <ActivityIndicator accessibilityLabel="Loading saved garages" color={c.primary} />
          ) : error ? (
            <View style={s.empty}>
              <Text accessibilityRole="alert" style={[s.emptyTitle, { color: c.text }]}>Could not load saved garages</Text>
              <Pressable accessibilityRole="button" style={[s.browseBtn, { backgroundColor: c.primary }]} onPress={() => void refresh()}>
                <Text style={s.browseBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : savedGarages.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="heart-outline" size={40} color={c.muted} />
              </View>
              <Text style={[s.emptyTitle, { color: c.text }]}>{favoriteIds.length ? 'Saved garages unavailable' : 'No saved garages'}</Text>
              <Text style={[s.emptySub, { color: c.muted }]}>
                {favoriteIds.length ? 'Your saved garages are not currently listed.' : 'Tap the heart on any garage to save it here for quick access.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={[s.browseBtn, { backgroundColor: c.primary }]}
                onPress={() => router.replace('/(tabs)/search')}
              >
                <Text style={s.browseBtnText}>Browse garages</Text>
              </Pressable>
            </View>
          ) : (
            savedGarages.map((garage) => (
              <View
                key={garage.id}
                style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}
              >
                <Pressable accessibilityRole="button" accessibilityLabel={`View ${garage.name}`} onPress={() => router.push(`/garage/${garage.id}` as never)}>
                <RemoteImage uri={garage.imageUrl} style={s.thumb} fallbackIcon="business-outline" accessibilityLabel={`${garage.name} workshop`} />
                </Pressable>
                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Details for ${garage.name}`} style={{ flex: 1 }} onPress={() => router.push(`/garage/${garage.id}` as never)}>
                      <Text style={[s.garageName, { color: c.text }]}>{garage.name}</Text>
                      <Text style={[s.garageType, { color: c.muted }]}>{garage.type} · {garage.area}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${garage.name} from saved garages`}
                      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                      hitSlop={10}
                      onPress={() => { void tap(); toggleFav(garage.id); }}
                    >
                      <Ionicons name="heart" size={20} color={c.danger} />
                    </Pressable>
                  </View>

                  <View style={s.chips}>
                    <View style={[s.chip, { backgroundColor: c.surfaceAlt }]}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={[s.chipText, { color: c.textSecondary }]}>{garage.rating}</Text>
                    </View>
                    <View style={[s.chip, { backgroundColor: c.surfaceAlt }]}>
                      <Ionicons name="location-outline" size={11} color={c.muted} />
                      <Text style={[s.chipText, { color: c.textSecondary }]}>{garageDistanceLabel(garage.distanceKm)}</Text>
                    </View>
                    <View style={[s.chip, { backgroundColor: garage.openNow ? c.successBg : c.surfaceAlt }]}>
                      <View style={[s.dot, { backgroundColor: garage.openNow ? c.success : c.muted }]} />
                      <Text style={[s.chipText, { color: garage.openNow ? c.success : c.muted }]}>
                        {garage.openNow === null ? 'Hours unavailable' : garage.openNow ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                    <View style={[s.chip, { backgroundColor: c.primaryLight }]}>
                      <Text style={[s.chipText, { color: c.primary, fontWeight: '800' }]}>{garage.startingPrice}</Text>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Book ${garage.name}`}
                    style={[s.bookBtn, { backgroundColor: c.primary }]}
                    onPress={() => router.push(`/checkout/${garage.id}` as never)}
                  >
                    <Text style={s.bookBtnText}>Book now</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  countBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontSize: 13, fontWeight: '900' },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  empty: { alignItems: 'center', gap: 14, paddingTop: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...typography.h3 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  browseBtn: { borderRadius: radius.xl, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  browseBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.sm },
  thumb: { width: '100%', height: 140 },
  cardBody: { padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  garageName: { fontSize: 16, fontWeight: '900' },
  garageType: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bookBtn: { height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
