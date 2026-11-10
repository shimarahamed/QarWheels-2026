import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore, useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import { BookingActionSheet } from '@/components/vendor/BookingActionSheet';
import { bookingAmountLabel, type VendorBooking } from '@/lib/vendor-data';
import { useVendorFeedStatus } from '@/lib/vendor-feed-status';
import ErrorState from '@/components/ErrorState';

// No expiresAt is reliably populated yet, so "soonest expiring" is approximated
// by oldest-request-first: the longer a customer has been waiting on an answer,
// the closer that request is to timing out.
function requestAge(b: VendorBooking): number {
  const created = Date.parse(b.createdAt);
  if (!Number.isNaN(created)) return created;
  const date = Date.parse(b.date);
  if (!Number.isNaN(date)) return date;
  return Number.MAX_SAFE_INTEGER;
}

export default function VendorRequests() {
  const c = useQarColors();
  const router = useRouter();
  const vendorTabBottom = useVendorTabBottom();
  const bookings = useQarWheelStore((s) => s.vendorBookings);
  const feed = useVendorFeedStatus();

  const pending = useMemo(
    () => bookings.filter((b) => b.status === 'Pending').sort((a, b) => requestAge(a) - requestAge(b)),
    [bookings],
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Pressable
          style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.back()}
          accessible accessibilityRole="button" accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[s.navTitle, { color: c.text }]}>New Requests</Text>
          <Text accessibilityLiveRegion="polite" style={[s.navSub, { color: c.muted }]}>
            {feed.loading ? 'Updating requests...' : feed.error ? 'Requests unavailable' : pending.length === 0
              ? 'Nothing waiting on you'
              : `${pending.length} awaiting your response`}
          </Text>
        </View>
      </View>

      <FlatList
        data={pending}
        keyExtractor={(booking) => booking.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshing={feed.loading && bookings.length > 0}
        onRefresh={feed.retry}
        ListHeaderComponent={feed.error ? <ErrorState compact onRetry={feed.retry} /> : undefined}
        ListEmptyComponent={feed.loading ? (
          <ActivityIndicator accessibilityLabel="Loading new requests" color={c.primary} />
        ) : feed.error ? undefined : (
          <View style={s.emptyState}>
            <Ionicons name="checkmark-done-outline" size={40} color={c.muted} />
            <Text style={[s.emptyTitle, { color: c.text }]}>All caught up</Text>
            <Text style={[s.emptyText, { color: c.muted }]}>
              New booking requests will appear here as soon as customers send them.
            </Text>
          </View>
        )}
        renderItem={({ item: b }) => (
                <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Pressable
                    style={s.cardTop}
                    onPress={() => router.push(`/vendor/booking-detail/${b.id}` as never)}
                    accessible accessibilityRole="button"
                    accessibilityLabel={`Open booking for ${b.customerName}`}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[s.customerName, { color: c.text }]}>{b.customerName}</Text>
                      <Text style={[s.serviceName, { color: c.textSecondary }]}>{b.service}</Text>
                      <Text style={[s.vehicleText, { color: c.muted }]}>
                        {b.vehicle}{b.vehiclePlate ? ` · ${b.vehiclePlate}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[s.newBadge, { backgroundColor: `${c.warning}22` }]}>
                        <Ionicons name="time-outline" size={11} color={c.warning} />
                        <Text style={[s.newBadgeText, { color: c.warning }]}>New</Text>
                      </View>
                      <Text style={[s.dateText, { color: c.muted }]}>
                        {b.date}{b.timeSlot ? ` · ${b.timeSlot}` : ''}
                      </Text>
                      <Text style={[s.amount, { color: c.text }]}>{bookingAmountLabel(b.totalAmount)}</Text>
                    </View>
                  </Pressable>

                  <View style={[s.cardActions, { borderTopColor: c.border }]}>
                    <BookingActionSheet booking={b} compact />
                  </View>
                </View>
        )}
      />
      <VendorTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.page,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h3 },
  navSub: { fontSize: 12, fontWeight: '600' },

  content: { padding: spacing.page, gap: 10 },

  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyTitle: { ...typography.h4 },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.sm },
  cardTop: { flexDirection: 'row', padding: 14, gap: 10 },
  customerName: { ...typography.h4 },
  serviceName: { fontSize: 13, fontWeight: '500' },
  vehicleText: { fontSize: 12, fontWeight: '500' },
  newBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  newBadgeText: { fontSize: 12, fontWeight: '800' },
  dateText: { fontSize: 12, fontWeight: '600' },
  amount: { fontSize: 14, fontWeight: '800' },

  cardActions: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
