import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore } from '@/lib/store';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { useAuthContext } from '@/lib/AuthContext';
import { canAccess, type VendorSection } from '@/lib/permissions';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { withAlpha } from '@/lib/theme';
import { bookingAmountLabel, getStatusLabel, type VendorBooking } from '@/lib/vendor-data';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import { BranchSwitcher } from '@/components/vendor/BranchSwitcher';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { useVendorBranches } from '@/lib/vendorQueries';
import { useVendorFeedStatus } from '@/lib/vendor-feed-status';

const COLUMNS: { status: VendorBooking['status']; label: string }[] = [
  { status: 'Pending', label: 'Requests' }, { status: 'Confirmed', label: 'Confirmed' },
  { status: 'VehicleReceived', label: 'Vehicle in' }, { status: 'InProgress', label: 'In progress' },
  { status: 'ReadyForPickup', label: 'Ready for pickup' },
];
const ACTIONS: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; route: string; section: VendorSection }[] = [
  { label: 'Bookings', icon: 'calendar-outline', route: '/vendor/bookings', section: 'bookings' },
  { label: 'Calendar', icon: 'today-outline', route: '/vendor/calendar', section: 'bookings' },
  { label: 'Services', icon: 'construct-outline', route: '/vendor/services', section: 'services' },
  { label: 'Inventory', icon: 'cube-outline', route: '/vendor/inventory', section: 'inventory' },
  { label: 'Staff', icon: 'people-outline', route: '/vendor/staff', section: 'staff' },
  { label: 'Promotions', icon: 'pricetag-outline', route: '/vendor/promotions', section: 'promotions' },
];

function JobTile({ booking, update = false }: { booking: VendorBooking; update?: boolean }) {
  const c = useQarColors();
  const router = useRouter();
  return <View style={[s.job, { backgroundColor: c.background, borderColor: c.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View booking ${booking.customerName}`}
      onPress={() => router.push(`/vendor/booking-detail/${booking.id}` as never)} style={s.jobContent}>
      <Text heading style={[s.jobCustomer, { color: c.text }]}>{booking.customerName}</Text>
      <Text style={[s.body, { color: c.textSecondary }]}>{booking.service}</Text>
      <Text style={[s.caption, { color: c.textSecondary }]}>{booking.vehicle || 'Vehicle details unavailable'} {booking.vehiclePlate}</Text>
      <Text style={[s.caption, { color: c.textSecondary }]}>{booking.date} · {booking.timeSlot}</Text>
      <Text telemetry style={[s.caption, { color: booking.status === 'ReadyForPickup' ? c.gold : c.primaryText }]}>{getStatusLabel(booking.status)}</Text>
      <View style={[s.jobFooter, { borderColor: c.border }]}>
        <Text style={[s.caption, { color: c.textSecondary }]}>{booking.staffName || 'Unassigned'}</Text>
        <Text style={[s.caption, { color: c.text, fontWeight: '700' }]}>{booking.status === 'Completed' && (!Number.isFinite(booking.totalAmount) || booking.totalAmount <= 0) ? 'Amount unavailable' : bookingAmountLabel(booking.totalAmount)}</Text>
      </View>
    </Pressable>
    {update && <Pressable accessibilityRole="button" accessibilityLabel={`Update booking for ${booking.customerName}`}
      onPress={() => router.push(`/vendor/status-update/${booking.id}` as never)} style={[s.update, { borderColor: c.border }]}>
      <Text style={[s.caption, { color: c.primaryText, fontWeight: '700' }]}>Update · {getStatusLabel(booking.status)}</Text>
    </Pressable>}
  </View>;
}

export default function VendorDashboard() {
  const c = useQarColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const Screen = reducedMotion ? View : MotionScreen;
  const Surface = reducedMotion ? View : MotionSurface;
  const { role } = useAuthContext();
  const bottom = useVendorTabBottom();
  const profile = useQarWheelStore((state) => state.vendorProfile);
  const bookings = useQarWheelStore((state) => state.vendorBookings);
  const { activeBranch } = useVendorBranches();
  const feed = useVendorFeedStatus();
  const [selectedStatus, setSelectedStatus] = useState<VendorBooking['status']>('Pending');
  const wide = width >= 1100;
  const phone = width < 768;
  const unavailable = feed.loading || feed.error || role === 'customer' || role === 'master_admin' || !canAccess(role, 'bookings');
  const completed = bookings.filter((booking) => booking.status === 'Completed');
  const completedValue = completed.some((booking) => !Number.isFinite(booking.totalAmount) || booking.totalAmount <= 0)
    ? 'Unavailable' : `QAR ${completed.reduce((sum, booking) => sum + booking.totalAmount, 0).toLocaleString()}`;
  const customers = bookings.some((booking) => !booking.customerId) ? 'Unavailable' : String(new Set(bookings.map((booking) => booking.customerId)).size);
  const reviews = typeof activeBranch?.reviewCount === 'number' && Number.isFinite(activeBranch.reviewCount) && activeBranch.reviewCount >= 0 ? String(activeBranch.reviewCount) : 'Unavailable';
  const todayBookings = bookings.filter((booking) => booking.date === 'Today' && !['Cancelled', 'Declined', 'NoShow'].includes(booking.status));
  const pending = bookings.filter((booking) => booking.status === 'Pending').length;
  const inFlight = bookings.filter((booking) => COLUMNS.some((column) => column.status === booking.status));
  const metrics: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; hint: string }[] = [
    { label: 'Completed booking value', value: completedValue, icon: 'cash-outline', color: c.success, hint: 'Recorded costs, not collected payments' },
    { label: 'Completed Jobs', value: String(completed.length), icon: 'construct-outline', color: c.primary, hint: 'Live booking data' },
    { label: 'Customers', value: customers, icon: 'people-outline', color: c.ai, hint: 'Distinct customer accounts' },
    { label: 'Reviews', value: reviews, icon: 'star-outline', color: c.warning, hint: 'Selected branch' },
  ];
  const permitted = (section: VendorSection) => role !== 'customer' && role !== 'master_admin' && canAccess(role, section);
  const countLabel = (value: number) => unavailable ? feed.error ? 'unavailable' : 'loading' : String(value);

  return <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottom + 16 }]}>
      <Screen style={[s.content, { padding: phone ? 12 : 24 }]}>
        <View style={s.topbar}>
          <View style={s.grow}>
            <Text heading style={[s.workspaceName, { color: c.text }]}>{activeBranch?.name || profile.businessName || 'Vendor workspace'}</Text>
            <BranchSwitcher />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/vendor/settings' as never)} style={[s.iconButton, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Ionicons name="settings-outline" size={21} color={c.textSecondary} />
          </Pressable>
        </View>
        <View style={[s.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[s.accent, { backgroundColor: c.primary }]} />
          <View style={[s.heroInner, wide && s.row]}>
            <View style={[s.grow, { gap: 14 }]}>
              <Text telemetry style={[s.eyebrow, { color: c.primaryText }]}>WORKSHOP COMMAND PORTAL</Text>
              <Text heading accessibilityRole="header" style={[s.title, { color: c.text, fontSize: phone ? 26 : 34, lineHeight: phone ? 34 : 40 }]}>{profile.businessName || 'Your workshop'}</Text>
              <Text style={[s.body, { color: c.textSecondary }]}>Jobs, people and parts. One connected workspace for {activeBranch?.name || 'your selected branch'}.</Text>
              <View style={s.buttons}>
                {permitted('bookings') && <Pressable accessibilityRole="button" onPress={() => router.push('/vendor/bookings' as never)} style={[s.button, { backgroundColor: c.primary }]}>
                  <Ionicons name="calendar-outline" size={18} color="#fff" /><Text style={s.buttonLabel}>Manage Bookings</Text>
                </Pressable>}
                {permitted('services') && <Pressable accessibilityRole="button" onPress={() => router.push('/vendor/services' as never)} style={[s.button, { borderWidth: 1, borderColor: c.border }]}>
                  <Ionicons name="construct-outline" size={18} color={c.text} /><Text style={[s.buttonLabel, { color: c.text }]}>Update Services</Text>
                </Pressable>}
              </View>
            </View>
            <View style={[s.pills, wide ? { width: 210 } : { flexDirection: 'row', flexWrap: 'wrap' }]}>
              {!phone && <View style={[s.pill, !wide && { flex: 1 }, { borderColor: c.border, backgroundColor: c.background }]}>
                <Text style={[s.eyebrow, { color: c.textSecondary }]}>APPROVAL</Text>
                <Text heading style={[s.pillValue, { color: activeBranch?.status === 'Approved' ? c.success : c.warning }]}>{activeBranch?.status || 'Unavailable'}</Text>
              </View>}
              <View style={[s.pill, !wide && { flex: 1 }, { borderColor: c.border, backgroundColor: c.background }]}>
                <Text style={[s.eyebrow, { color: c.textSecondary }]}>OPEN JOBS</Text><Text heading style={[s.pillValue, { color: c.primary }]}>{unavailable ? '--' : inFlight.length}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Pending: ${countLabel(pending)}. Open new requests`} disabled={!permitted('bookings')} onPress={() => router.push('/vendor/requests' as never)} style={s.textButton}><Text style={[s.caption, { color: c.primaryText }]}>{unavailable ? 'Updating requests' : `${pending} pending requests`}</Text></Pressable>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Today: ${countLabel(todayBookings.length)}. Open bookings`} disabled={!permitted('bookings')} onPress={() => router.push('/vendor/bookings' as never)} style={[s.pill, !wide && { flex: 1 }, { borderColor: c.border, backgroundColor: c.background }]}>
                <Text style={[s.eyebrow, { color: c.textSecondary }]}>TODAY</Text><Text heading style={[s.pillValue, { color: c.text }]}>{unavailable ? '--' : todayBookings.length}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={s.metrics}>
          {metrics.map((metric) => <View key={metric.label} style={[s.metric, { flexBasis: wide ? '22%' : '45%', backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.metricTop}><Text style={[s.eyebrow, s.grow, { color: c.textSecondary }]}>{metric.label}</Text><View style={[s.metricIcon, { backgroundColor: withAlpha(metric.color, 0.12) }]}><Ionicons name={metric.icon} size={19} color={metric.color} /></View></View>
            <Text telemetry style={[s.value, { color: c.text }]}>{unavailable ? '--' : metric.value}</Text>
            <Text style={[s.caption, { color: c.textSecondary }]}>{metric.hint}</Text>
          </View>)}
        </View>

        <Surface>
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.sectionHeader}><View style={s.grow}><Text heading accessibilityRole="header" style={[s.sectionTitle, { color: c.text }]}>Interactive workstation matrix</Text><Text style={[s.caption, { color: c.textSecondary }]}>Actual job stages and assignments. Tap a card to open its work order.</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/vendor/bookings' as never)} style={s.textButton}><Text style={[s.caption, { color: c.primaryText, fontWeight: '700' }]}>All bookings</Text></Pressable></View>
            {feed.loading ? <ActivityIndicator color={c.primary} accessibilityLabel="Loading shop floor" /> : feed.error ? <Text style={[s.body, { color: c.textSecondary }]}>Jobs could not be loaded. Retry above.</Text> : inFlight.length === 0 ? <View style={s.empty}><Ionicons name="time-outline" size={30} color={c.textSecondary} /><Text style={[s.body, { color: c.textSecondary }]}>No jobs in flight</Text></View> : <>
              {phone && <ScrollView horizontal contentContainerStyle={s.statusTabs} showsHorizontalScrollIndicator={false}>
                {COLUMNS.map((column) => <Pressable key={column.status} accessibilityRole="tab" accessibilityLabel={`${column.label} jobs`} accessibilityState={{ selected: selectedStatus === column.status }} onPress={() => setSelectedStatus(column.status)} style={[s.statusTab, { backgroundColor: selectedStatus === column.status ? c.primary : c.background, borderColor: c.border }]}><Text style={[s.caption, { color: selectedStatus === column.status ? '#fff' : c.text }]}>{column.label} ? {bookings.filter((booking) => booking.status === column.status).length}</Text></Pressable>)}
              </ScrollView>}
              <View style={s.board}>
                {!phone ? inFlight.slice(0, 6).map((booking) => <View key={booking.id} style={{ flexBasis: '45%', flexGrow: 1, minWidth: 0 }}><JobTile booking={booking} /></View>) : COLUMNS.filter((column) => column.status === selectedStatus).map((column) => {
                  const jobs = bookings.filter((booking) => booking.status === column.status);
                  return <View key={column.status} style={[s.column, { flexBasis: phone ? '100%' : width >= 1350 ? '17%' : '45%', borderColor: c.border, backgroundColor: withAlpha(c.primary, 0.035) }]}>
                    <View style={s.sectionHeader}><Text heading style={[s.caption, { color: c.text, fontWeight: '700' }]}>{column.label}</Text><Text style={[s.caption, { color: c.textSecondary }]}>{jobs.length}</Text></View>
                    {jobs.length === 0 ? <Text style={[s.caption, { color: c.textSecondary }]}>Nothing here</Text> : jobs.slice(0, 5).map((booking) => <JobTile key={booking.id} booking={booking} />)}
                    {jobs.length > 5 && <Text style={[s.caption, { color: c.textSecondary }]}>Showing 5 of {jobs.length}. Open All bookings for the full list.</Text>}
                  </View>;
                })}
              </View>
            </>}
          </View>
        </Surface>

        <View style={[s.support, wide && s.row]}>
          <View style={[s.section, s.grow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.sectionHeader}><Text heading style={[s.sectionTitle, { color: c.text }]}>Today's Bookings</Text><Pressable accessibilityRole="button" accessibilityLabel="View all bookings" onPress={() => router.push('/vendor/bookings' as never)} style={s.textButton}><Text style={[s.caption, { color: c.primaryText }]}>See all</Text></Pressable></View>
            {feed.loading && todayBookings.length === 0 ? <ActivityIndicator color={c.primary} accessibilityLabel="Loading today's bookings" /> : feed.error && todayBookings.length === 0 ? <Text style={[s.body, { color: c.textSecondary }]}>Bookings could not be loaded. Retry above.</Text> : todayBookings.length === 0 ? <View style={s.empty}><Ionicons name="calendar-outline" size={30} color={c.textSecondary} /><Text style={[s.body, { color: c.textSecondary }]}>No bookings today</Text></View> : todayBookings.slice(0, 5).map((booking) => <JobTile key={booking.id} booking={booking} update />)}
          </View>
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }, wide && { width: 280 }]}>
            <Text heading style={[s.sectionTitle, { color: c.text }]}>Workspace</Text>
            {ACTIONS.filter((action) => permitted(action.section)).map((action) => <Pressable key={action.label} accessibilityRole="button" onPress={() => router.push(action.route as never)} style={[s.action, { borderColor: c.border }]}><Ionicons name={action.icon} size={19} color={c.primary} /><Text style={[s.body, s.grow, { color: c.text }]}>{action.label}</Text></Pressable>)}
            {permitted('analytics') && <Pressable accessibilityRole="button" onPress={() => router.push('/vendor/analytics' as never)} style={[s.action, { backgroundColor: c.aiBg, borderColor: c.border }]}><Ionicons name="bar-chart-outline" size={19} color={c.ai} /><Text style={[s.body, { color: c.text }]}>Business analytics</Text></Pressable>}
          </View>
        </View>
      </Screen>
    </ScrollView>
    <VendorTabBar />
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, minWidth: 0 }, scroll: { flexGrow: 1 }, content: { width: '100%', maxWidth: 1500, alignSelf: 'center', gap: 16 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12 }, grow: { flex: 1, minWidth: 0 }, row: { flexDirection: 'row', alignItems: 'stretch' },
  workspaceName: { fontSize: 18, fontWeight: '600', marginBottom: 6 }, iconButton: { width: 44, height: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hero: { borderWidth: 1, borderRadius: 12, overflow: 'hidden',  }, accent: { height: 3 }, heroInner: { padding: 20, gap: 24 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }, title: { fontWeight: '700', lineHeight: 42 },
  body: { fontSize: 14, lineHeight: 22 }, caption: { fontSize: 12, lineHeight: 18 }, buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, button: { minHeight: 44, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, buttonLabel: { fontSize: 13, fontWeight: '600', color: '#fff' },
  pills: { gap: 10 }, pill: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }, pillValue: { fontSize: 21, fontWeight: '600' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flexGrow: 1, minWidth: 120, borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 }, metricTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, metricIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, value: { fontSize: 23, fontWeight: '700' },
  section: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 14,  }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, sectionTitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' }, textButton: { minHeight: 44, justifyContent: 'center' }, empty: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  statusTabs: { gap: 8 }, statusTab: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderRadius: 10 }, board: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, column: { flexGrow: 1, minWidth: 0, borderWidth: 1, borderRadius: 12, padding: 10, gap: 10 },
  job: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' }, jobContent: { padding: 12, gap: 6, minHeight: 44 }, jobCustomer: { fontSize: 14, fontWeight: '600' }, jobFooter: { borderTopWidth: 1, marginTop: 4, paddingTop: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }, update: { minHeight: 44, borderTopWidth: 1, padding: 10, justifyContent: 'center', alignItems: 'center' },
  support: { gap: 16 }, action: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
