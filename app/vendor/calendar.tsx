import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { bookingAmountLabel, getStatusColor, getStatusLabel } from '@/lib/vendor-data';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_DATES = ['Jun 2', 'Jun 3', 'Jun 4', 'Jun 5', 'Jun 6', 'Jun 7', 'Jun 8'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export default function VendorCalendar() {
  const c = useQarColors();
  const router = useRouter();
  const vendorTabBottom = useVendorTabBottom();
  const bookings = useQarWheelStore((s) => s.vendorBookings);
  const profile = useQarWheelStore((s) => s.vendorProfile);
  const [selectedDay, setSelectedDay] = useState(0);

  const dayBookings = bookings.filter((b) => {
    if (selectedDay === 0) return b.date === 'Today';
    if (selectedDay === 1) return b.date === 'Tomorrow';
    return b.date === WEEK_DATES[selectedDay];
  });

  const slotsUsed = dayBookings.filter((b) => b.status !== 'Cancelled').length;
  const slotsTotal = profile.maxSlotsPerHour * (profile.workDays.length > 0 ? 10 : 0);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Calendar</Text>
        <View style={s.navInfo}>
          <Text style={[s.navSub, { color: c.muted }]}>{profile.openTime} – {profile.closeTime}</Text>
          <Pressable
            style={[s.blockBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            onPress={() => Alert.alert('Block Time', 'Select a time slot to mark it as unavailable.')}
            accessible accessibilityRole="button" accessibilityLabel="Block time slot"
          >
            <Ionicons name="ban-outline" size={14} color={c.textSecondary} />
            <Text style={[s.blockBtnText, { color: c.textSecondary }]}>Block</Text>
          </Pressable>
        </View>
      </View>

      {/* Week strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.weekStrip, { paddingTop: 60 }]} contentContainerStyle={s.weekStripContent}>
        {DAYS_OF_WEEK.map((day, i) => {
          const active = selectedDay === i;
          const isWorkDay = profile.workDays.includes(day);
          const dayBookingCount = bookings.filter((b) => {
            if (i === 0) return b.date === 'Today';
            if (i === 1) return b.date === 'Tomorrow';
            return b.date === WEEK_DATES[i];
          }).length;

          return (
            <Pressable
              key={day}
              style={[
                s.dayPill,
                { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border },
                !isWorkDay && { opacity: 0.4 },
              ]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[s.dayLabel, { color: active ? '#fff' : c.muted }]}>{day}</Text>
              <Text style={[s.dayDate, { color: active ? '#fff' : c.text }]}>{i === 0 ? 'Today' : WEEK_DATES[i].split(' ')[1]}</Text>
              {dayBookingCount > 0 && (
                <View style={[s.dayDot, { backgroundColor: active ? 'rgba(255,255,255,0.6)' : c.primary }]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Capacity bar */}
          <View style={[s.capacityCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.capacityHeader}>
              <Text style={[s.capacityTitle, { color: c.text }]}>
                {slotsUsed} of {profile.maxSlotsPerHour * 10} slots booked
              </Text>
              <Text style={[s.capacityPct, { color: c.muted }]}>
                {slotsTotal > 0 ? Math.round((slotsUsed / (profile.maxSlotsPerHour * 10)) * 100) : 0}%
              </Text>
            </View>
            <View style={[s.capacityBar, { backgroundColor: c.surfaceAlt }]}>
              <View
                style={[
                  s.capacityFill,
                  {
                    width: `${Math.min(100, slotsTotal > 0 ? (slotsUsed / (profile.maxSlotsPerHour * 10)) * 100 : 0)}%`,
                    backgroundColor: slotsUsed > profile.maxSlotsPerHour * 8 ? c.danger : c.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Bookings for this day */}
          {dayBookings.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="calendar-clear-outline" size={40} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>No bookings</Text>
              <Text style={[s.emptyText, { color: c.muted }]}>This day is clear.</Text>
            </View>
          ) : (
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
          )}

          {/* Hour grid overview */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Hour Overview</Text>
            <View style={{ gap: 6 }}>
              {HOURS.map((hour) => {
                const [h] = hour.split(':');
                const slotBookings = dayBookings.filter((b) => b.timeSlot.startsWith(h === '12' ? '12' : h.replace(/^0/, '')));
                const busy = slotBookings.length >= profile.maxSlotsPerHour;
                const isWork = parseInt(h) >= parseInt(profile.openTime.split(':')[0]) && parseInt(h) < parseInt(profile.closeTime.split(':')[0]);

                return (
                  <View key={hour} style={s.hourRow}>
                    <Text style={[s.hourLabel, { color: c.muted }]}>{hour}</Text>
                    <View style={[s.hourBar, { backgroundColor: c.surfaceAlt }]}>
                      {isWork ? (
                        <View
                          style={[
                            s.hourFill,
                            {
                              width: `${Math.min(100, (slotBookings.length / profile.maxSlotsPerHour) * 100)}%`,
                              backgroundColor: busy ? c.danger : c.success,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <Text style={[s.hourCount, { color: isWork ? c.textSecondary : c.border }]}>
                      {isWork ? `${slotBookings.length}/${profile.maxSlotsPerHour}` : 'Closed'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </MotionScreen>
      </ScrollView>
      <VendorTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
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
