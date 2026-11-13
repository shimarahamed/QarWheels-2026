import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore } from '@/lib/store';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { exportVendorCsv } from '@/lib/vendor-export';
import { MotionScreen } from '@/lib/motion';
import { radius, spacing, typography } from '@/lib/theme';
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
  const [view, setView] = useState<'Day' | 'Week'>('Day');
  const [exporting, setExporting] = useState(false);
  const feed = useVendorFeedStatus();
  const days = qatarWeekDays();
  const dayBookings = bookings.filter((booking) => view === 'Day'
    ? vendorBookingDayId(booking) === days[selectedDay].id
    : days.some((day) => day.id === vendorBookingDayId(booking)))
    .sort((a, b) => (a.bookingDate ?? '').localeCompare(b.bookingDate ?? ''));
  const rangeLabel = view === 'Day' ? days[selectedDay].label : `${days[0].label} - ${days[6].label}`;
  const pendingCount = dayBookings.filter((booking) => booking.status === 'Pending').length;

  async function handleExport() {
    if (feed.loading || feed.error || exporting) return;
    setExporting(true);
    try {
      await exportVendorCsv('qarwheel-request-schedule.csv', ['Booking ID', 'Preferred date (Qatar)', 'Preferred time', 'Customer', 'Service', 'Vehicle plate', 'Status'],
        dayBookings.map((booking) => [booking.id, vendorBookingDayId(booking), booking.timeSlot, booking.customerName, booking.service, booking.vehiclePlate, getStatusLabel(booking.status)]));
    } catch { Alert.alert('Schedule not exported', 'Please try exporting the schedule again.'); }
    finally { setExporting(false); }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text heading style={[s.navTitle, { color: c.text }]}>Bookings &amp; Schedule Matrix</Text>
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

      <View style={[s.viewControls, { borderBottomColor: c.border }]}>
        {(['Day', 'Week'] as const).map((mode) => <Pressable key={mode} accessibilityRole="tab" accessibilityLabel={`${mode} view`}
          accessibilityState={{ selected: view === mode }} onPress={() => setView(mode)}
          style={[s.viewButton, { backgroundColor: view === mode ? c.primary : c.surfaceAlt, borderColor: view === mode ? c.primary : c.border }]}>
          <Text style={{ color: view === mode ? '#fff' : c.text, fontWeight: '700' }}>{mode}</Text>
        </Pressable>)}
        <Pressable accessibilityRole="button" accessibilityLabel="Export visible request schedule" disabled={feed.loading || feed.error || exporting || !dayBookings.length}
          accessibilityState={{ disabled: feed.loading || feed.error || exporting || !dayBookings.length, busy: exporting }}
          onPress={() => void handleExport()} style={[s.viewButton, { backgroundColor: c.surfaceAlt, borderColor: c.border, opacity: feed.loading || feed.error || !dayBookings.length ? 0.5 : 1 }]}>
          <Ionicons name="download-outline" size={16} color={c.text} /><Text style={{ color: c.text }}>Export schedule</Text>
        </Pressable>
      </View>
      {/* Week strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.weekStrip} contentContainerStyle={s.weekStripContent}>
        {days.map((day, i) => {
          const active = view === 'Day' && selectedDay === i;
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
              ]}
              onPress={() => { setSelectedDay(i); setView('Day'); }}
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
                {feed.error ? 'Requests unavailable' : feed.loading && !dayBookings.length ? 'Loading requests' : `${dayBookings.length} ${dayBookings.length === 1 ? 'request' : 'requests'}`} · {rangeLabel}
              </Text>
              <Text style={[s.capacityPct, { color: c.muted }]}>
                {feed.error ? 'Retry below' : feed.loading ? 'Loading' : `${pendingCount} pending`}
              </Text>
            </View>
            <Text style={[s.emptyText, { color: c.textSecondary }]}>Times are preferences until confirmed by the garage.</Text>
          </View>

          <View style={s.summaryRow}>
            {[
              { label: 'Confirmed', value: dayBookings.filter((booking) => booking.status === 'Confirmed').length },
              { label: 'In progress', value: dayBookings.filter((booking) => ['VehicleReceived', 'InProgress'].includes(booking.status)).length },
              { label: 'Ready for pickup', value: dayBookings.filter((booking) => booking.status === 'ReadyForPickup').length },
            ].map((stat) => <View key={stat.label} style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text telemetry style={{ fontSize: 26, fontWeight: '700', color: c.text }}>{feed.loading || feed.error ? '--' : stat.value}</Text>
              <Text style={{ color: c.muted, fontSize: 12 }}>{stat.label}</Text>
            </View>)}
          </View>
          <Text heading style={[s.matrixTitle, { color: c.text }]}>Preferred-time Schedule</Text>
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
                    accessibilityRole="button" accessibilityLabel={`Open booking for ${b.customerName}, ${getStatusLabel(b.status)}`}
                    onPress={() => router.push(`/vendor/booking-detail/${b.id}` as never)}
                  >
                    <View style={s.timeCol}>
                      <Text telemetry style={[s.timeText, { color: c.primaryText }]}>{b.timeSlot || 'Time not set'}</Text>
                      {view === 'Week' && <Text style={{ color: c.muted, fontSize: 12 }}>{days.find((day) => day.id === vendorBookingDayId(b))?.label}</Text>}
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
  viewControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.page, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  viewButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  summaryCard: { flexGrow: 1, flexBasis: 120, borderRadius: 16, borderWidth: 1, padding: 16, gap: 6 },
  matrixTitle: { fontSize: 20, fontWeight: '700', marginVertical: 16 },
  navbar: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', flexShrink: 1 },
  navInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navSub: { fontSize: 12, fontWeight: '600' },
  blockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
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

  content: { padding: spacing.page, gap: 14, width: '100%', maxWidth: 1600, alignSelf: 'center' },

  capacityCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10 },
  capacityHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  capacityTitle: { fontSize: 13, fontWeight: '700' },
  capacityPct: { fontSize: 13, fontWeight: '800' },
  capacityBar: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  capacityFill: { height: '100%', borderRadius: radius.full },

  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyTitle: { ...typography.h4 },
  emptyText: { fontSize: 13, fontWeight: '500' },

  bookingRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, borderLeftWidth: 3, padding: 12,
  },
  timeCol: { width: 76, gap: 4 },
  timeText: { fontSize: 13, fontWeight: '800' },
  bookingName: { ...typography.h4 },
  bookingService: { fontSize: 12, fontWeight: '500' },
  bookingVehicle: { fontSize: 12, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 12, fontWeight: '800' },
  amountText: { fontSize: 13, fontWeight: '800' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { ...typography.h4 },

  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hourLabel: { width: 42, fontSize: 12, fontWeight: '700' },
  hourBar: { flex: 1, height: 10, borderRadius: radius.full, overflow: 'hidden' },
  hourFill: { height: '100%', borderRadius: radius.full },
  hourCount: { width: 36, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});
