import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { bookingAmountLabel, getStatusColor, getStatusLabel } from '@/lib/vendor-data';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import ErrorState from '@/components/ErrorState';
import { useVendorFeedStatus } from '@/lib/vendor-feed-status';
import { qatarWeekDays, vendorBookingDayId } from '@/lib/vendor-calendar';

export default function VendorCalendar() {
  const c = useQarColors();
  const router = useRouter();
  const vendorTabBottom = useVendorTabBottom();
  const bookings = useQarWheelStore((s) => s.vendorBookings);
  const profile = useQarWheelStore((s) => s.vendorProfile);
  const [selectedDay, setSelectedDay] = useState(0);
  const feed = useVendorFeedStatus();
  const days = qatarWeekDays();
  const dayBookings = bookings.filter((booking) => vendorBookingDayId(booking) === days[selectedDay].id);
  const pendingCount = dayBookings.filter((booking) => booking.status === 'Pending').length;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Calendar</Text>
        <View style={s.navInfo}>
          <Text style={[s.navSub, { color: c.muted }]}>{profile.openTime} – {profile.closeTime}</Text>
          <Pressable
            style={[s.blockBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            onPress={() => router.push('/vendor/settings' as never)}
            accessible accessibilityRole="button" accessibilityLabel="Workshop hours and settings"
          >
            <Ionicons name="settings-outline" size={14} color={c.textSecondary} />
            <Text style={[s.blockBtnText, { color: c.textSecondary }]}>Hours</Text>
          </Pressable>
        </View>
      </View>

      {/* Week strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.weekStrip} contentContainerStyle={s.weekStripContent}>
        {days.map((day, i) => {
          const active = selectedDay === i;
          const isWorkDay = profile.workDays.includes(day.weekday);
          const dayBookingCount = bookings.filter((booking) => vendorBookingDayId(booking) === day.id).length;

          return (
            <Pressable
              key={day.id}
              accessibilityRole="tab"
              accessibilityLabel={`${day.label}, ${dayBookingCount} ${dayBookingCount === 1 ? 'request' : 'requests'}`}
              accessibilityState={{ selected: active }}
              style={[
                s.dayPill,
                { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border },
                !isWorkDay && { opacity: 0.4 },
              ]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[s.dayLabel, { color: active ? '#fff' : c.muted }]}>{day.weekday}</Text>
              <Text style={[s.dayDate, { color: active ? '#fff' : c.text }]}>{i === 0 ? 'Today' : day.day}</Text>
              {dayBookingCount > 0 && (
                <View style={[s.dayDot, { backgroundColor: active ? 'rgba(255,255,255,0.6)' : c.primary }]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* A request schedule does not imply bookable capacity. */}
          <View style={[s.capacityCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.capacityHeader}>
              <Text style={[s.capacityTitle, { color: c.text }]}>
                {feed.error ? 'Requests unavailable' : feed.loading && !dayBookings.length ? 'Loading requests' : `${dayBookings.length} ${dayBookings.length === 1 ? 'request' : 'requests'}`} · {days[selectedDay].label}
              </Text>
              <Text style={[s.capacityPct, { color: c.muted }]}>
                {feed.error ? 'Retry below' : `${pendingCount} pending`}
              </Text>
            </View>
            <Text style={[s.emptyText, { color: c.textSecondary }]}>Times are preferences until confirmed by the garage.</Text>
          </View>

          {/* Bookings for this day */}
          {feed.error ? <ErrorState compact onRetry={feed.retry} /> : null}
          {feed.loading && dayBookings.length === 0 ? <ActivityIndicator color={c.primary} accessibilityLabel="Loading vendor requests" /> : null}
          {!feed.loading && !feed.error && dayBookings.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="calendar-clear-outline" size={40} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>No dated requests</Text>
              <Text style={[s.emptyText, { color: c.muted }]}>Requests with a preferred time will appear here.</Text>
            </View>
          ) : dayBookings.length > 0 ? (
            <View style={{ gap: 10 }}>
              {dayBookings.map((b) => {
                const sc = getStatusColor(b.status);
                return (
                  <Pressable
                    key={b.id}
                    style={[s.bookingRow, { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: sc.dot }]}
                    onPress={() => router.push(`/vendor/booking-detail/${b.id}` as never)}
                  >
                    <View style={s.timeCol}>
                      <Text style={[s.timeText, { color: c.primary }]}>{b.timeSlot}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[s.bookingName, { color: c.text }]}>{b.customerName}</Text>
                      <Text style={[s.bookingService, { color: c.textSecondary }]}>{b.service}</Text>
                      <Text style={[s.bookingVehicle, { color: c.muted }]}>{b.vehiclePlate}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.statusText, { color: sc.text }]}>{getStatusLabel(b.status)}</Text>
                      </View>
                      <Text style={[s.amountText, { color: c.text }]}>{bookingAmountLabel(b.totalAmount)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </MotionScreen>
      </ScrollView>
      <VendorTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navTitle: { ...typography.h3 },
  navInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navSub: { fontSize: 12, fontWeight: '600' },
  blockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1,
  },
  blockBtnText: { fontSize: 12, fontWeight: '700' },

  weekStrip: { flexGrow: 0 },
  weekStripContent: { paddingHorizontal: spacing.page, paddingVertical: 12, gap: 12 },
  dayPill: {
    alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10,
    borderRadius: radius.xl, borderWidth: 1, gap: 3, minWidth: 66, minHeight: 74,
  },
  dayLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  dayDate: { fontSize: 13, fontWeight: '800' },
  dayDot: { width: 5, height: 5, borderRadius: 3 },

  content: { padding: spacing.page, gap: spacing.gap },

  capacityCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10, ...shadow.xs },
  capacityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capacityTitle: { fontSize: 13, fontWeight: '700' },
  capacityPct: { fontSize: 13, fontWeight: '800' },
  capacityBar: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  capacityFill: { height: '100%', borderRadius: radius.full },

  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyTitle: { ...typography.h4 },
  emptyText: { fontSize: 13, fontWeight: '500' },

  bookingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, borderLeftWidth: 3, padding: 12, ...shadow.xs,
  },
  timeCol: { width: 56 },
  timeText: { fontSize: 13, fontWeight: '800' },
  bookingName: { ...typography.h4 },
  bookingService: { fontSize: 12, fontWeight: '500' },
  bookingVehicle: { fontSize: 12, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 12, fontWeight: '800' },
  amountText: { fontSize: 13, fontWeight: '800' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hourLabel: { width: 42, fontSize: 12, fontWeight: '700' },
  hourBar: { flex: 1, height: 10, borderRadius: radius.full, overflow: 'hidden' },
  hourFill: { height: '100%', borderRadius: radius.full },
  hourCount: { width: 36, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});
