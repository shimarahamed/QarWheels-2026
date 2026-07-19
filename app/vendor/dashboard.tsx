import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import { useQarWheelsStore, useQarColors } from '@/lib/store';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { getStatusColor, getStatusLabel } from '@/lib/vendor-data';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import { saveVendorProfile, useVendorFirestoreBookings } from '@/lib/firestoreOps';

export default function VendorDashboard() {
  const c = useQarColors();
  const router = useRouter();
  const vendorTabBottom = useVendorTabBottom();
  const profile = useQarWheelsStore((s) => s.vendorProfile);
  const bookings = useQarWheelsStore((s) => s.vendorBookings);

  const uid = getAuth().currentUser?.uid ?? null;

  // Sync live bookings from Firestore into the vendor dashboard
  useVendorFirestoreBookings(uid);

  // Publish this vendor's profile to Firestore so they appear in the customer marketplace
  useEffect(() => {
    if (!uid) return;
    void saveVendorProfile(uid, {
      businessName: profile.businessName,
      ownerName: profile.ownerName,
      email: profile.email,
      phone: profile.phone,
      category: profile.category,
      area: profile.area,
      city: profile.city,
      rating: profile.rating,
      totalReviews: profile.totalReviews,
      verified: profile.verified,
      openNow: !profile.vacationMode,
      vacationMode: profile.vacationMode,
      openTime: profile.openTime,
      closeTime: profile.closeTime,
      workDays: profile.workDays,
      startingPrice: 'QAR 100+',
      startingPriceValue: 100,
      responseTime: '15 min',
      pickupAvailable: true,
      warranty: '7-day warranty',
      tags: profile.verified ? ['Verified'] : [],
    });
  }, [uid, profile.businessName, profile.vacationMode, profile.verified]);

  const todayBookings = bookings.filter((b) => b.date === 'Today');
  const pending = bookings.filter((b) => b.status === 'Pending').length;
  const inProgress = bookings.filter((b) => b.status === 'InProgress').length;
  const readyPickup = bookings.filter((b) => b.status === 'ReadyForPickup').length;
  const todayRevenue = bookings
    .filter((b) => b.date === 'Today' && b.status !== 'Cancelled')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const metrics = [
    { label: "Today's Revenue", value: `QAR ${todayRevenue}`, icon: 'cash-outline' as const, color: c.success },
    { label: 'Pending', value: String(pending), icon: 'time-outline' as const, color: c.warning },
    { label: 'In Progress', value: String(inProgress), icon: 'construct-outline' as const, color: c.primary },
    { label: 'Ready Pickup', value: String(readyPickup), icon: 'checkmark-circle-outline' as const, color: c.ai },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <View style={s.navLeft}>
          <View style={[s.vendorBadge, { backgroundColor: c.primaryLight }]}>
            <Text style={[s.vendorBadgeText, { color: c.primary }]}>VENDOR</Text>
          </View>
          <View style={{ gap: 1 }}>
            <Text style={[s.navTitle, { color: c.text }]}>{profile.businessName}</Text>
            <Text style={[s.navSub, { color: c.muted }]}>
              {profile.vacationMode ? '🌴 Vacation mode on' : 'Open · Accepting bookings'}
            </Text>
          </View>
        </View>
        <View style={s.navActions}>
          <Pressable
            style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/vendor/reviews' as never)}
            accessible accessibilityRole="button" accessibilityLabel="Reviews"
          >
            <Ionicons name="star-outline" size={18} color={c.ai} />
          </Pressable>
          <Pressable
            style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/vendor/settings' as never)}
            accessible accessibilityRole="button" accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={18} color={c.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16, paddingTop: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <MotionScreen style={s.dashboardStack}>
          {/* Metrics */}
          <View style={s.metricsRow}>
            {metrics.map((m) => (
              <View key={m.label} style={[s.metricCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[s.metricIcon, { backgroundColor: `${m.color}20` }]}>
                  <Ionicons name={m.icon} size={18} color={m.color} />
                </View>
                <Text style={[s.metricValue, { color: c.text }]}>{m.value}</Text>
                <Text style={[s.metricLabel, { color: c.muted }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick actions */}
          <MotionSurface delay={60}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Quick Actions</Text>
              <View style={s.quickRow}>
                {[
                  { label: 'Bookings', icon: 'calendar-outline' as const, route: '/vendor/bookings' },
                  { label: 'Inventory', icon: 'cube-outline' as const, route: '/vendor/inventory' },
                  { label: 'Staff', icon: 'people-outline' as const, route: '/vendor/staff' },
                  { label: 'Offers', icon: 'pricetag-outline' as const, route: '/vendor/promotions' },
                ].map((a) => (
                  <Pressable
                    key={a.label}
                    style={[s.quickBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                    onPress={() => router.push(a.route as never)}
                  >
                    <Ionicons name={a.icon} size={22} color={c.primary} />
                    <Text style={[s.quickBtnLabel, { color: c.textSecondary }]}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </MotionSurface>

          {/* Today's bookings */}
          <MotionSurface delay={120}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: c.text }]}>Today's Bookings</Text>
                <Pressable onPress={() => router.push('/vendor/bookings' as never)}>
                  <Text style={[s.sectionLink, { color: c.primary }]}>See all</Text>
                </Pressable>
              </View>
              {todayBookings.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="calendar-outline" size={32} color={c.muted} />
                  <Text style={[s.emptyText, { color: c.muted }]}>No bookings today</Text>
                </View>
              ) : (
                <View style={s.bookingList}>
                  {todayBookings.map((b) => {
                    const sc = getStatusColor(b.status);
                    return (
                      <Pressable
                        key={b.id}
                        style={[s.bookingCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                        onPress={() => router.push(`/vendor/booking-detail/${b.id}` as never)}
                      >
                        <View style={s.bookingTop}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[s.bookingCustomer, { color: c.text }]}>{b.customerName}</Text>
                            <Text style={[s.bookingService, { color: c.textSecondary }]}>{b.service}</Text>
                            <Text style={[s.bookingVehicle, { color: c.muted }]}>
                              {b.vehicle} · {b.vehiclePlate}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                              <View style={[s.statusDot, { backgroundColor: sc.dot }]} />
                              <Text style={[s.statusText, { color: sc.text }]}>{getStatusLabel(b.status)}</Text>
                            </View>
                            <Text style={[s.bookingTime, { color: c.muted }]}>{b.timeSlot}</Text>
                          </View>
                        </View>
                        <View style={[s.bookingFooter, { borderTopColor: c.border }]}>
                          <Text style={[s.bookingAmount, { color: c.text }]}>QAR {b.totalAmount}</Text>
                          {b.staffName ? (
                            <Text style={[s.bookingStaff, { color: c.muted }]}>{b.staffName}</Text>
                          ) : null}
                          <Pressable
                            style={[s.bookingAction, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}
                            onPress={() => router.push(`/vendor/status-update/${b.id}` as never)}
                          >
                            <Text style={[s.bookingActionText, { color: c.primary }]}>Update</Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </MotionSurface>

          {/* Live feed */}
          <MotionSurface delay={180}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Recent Activity</Text>
              <View style={{ gap: 12 }}>
                {[
                  { icon: 'checkmark-circle' as const, text: 'Laila Hassan paid invoice — QAR 221.50', time: '2 min ago', color: '#22C55E' },
                  { icon: 'calendar' as const, text: 'New booking: Omar Khalifa · AC check at 2 PM', time: '18 min ago', color: '#3B82F6' },
                  { icon: 'star' as const, text: 'Mohammed Al-Kuwari left a 5★ review', time: '1h ago', color: '#D4AF37' },
                  { icon: 'chatbubble' as const, text: 'Ahmed Al-Rashid sent a message', time: '2h ago', color: c.primary },
                ].map((item) => (
                  <View key={item.text} style={s.feedRow}>
                    <View style={[s.feedIcon, { backgroundColor: `${item.color}20` }]}>
                      <Ionicons name={item.icon} size={16} color={item.color} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.feedText, { color: c.text }]}>{item.text}</Text>
                      <Text style={[s.feedTime, { color: c.muted }]}>{item.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </MotionSurface>

          {/* This week */}
          <MotionSurface delay={240}>
            <Pressable
              style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => router.push('/vendor/analytics' as never)}
            >
              <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: c.text }]}>This Week</Text>
                <Ionicons name="chevron-forward" size={16} color={c.muted} />
              </View>
              <View style={s.perfRow}>
                {[
                  { label: 'Revenue', value: 'QAR 1,640', up: true },
                  { label: 'Bookings', value: '11', up: true },
                  { label: 'Avg Order', value: 'QAR 149', up: false },
                  { label: 'Rating', value: `${profile.rating}★`, up: true },
                ].map((p) => (
                  <View key={p.label} style={[s.perfCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Text style={[s.perfValue, { color: c.text }]}>{p.value}</Text>
                    <Text style={[s.perfLabel, { color: c.muted }]}>{p.label}</Text>
                    <Ionicons
                      name={p.up ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={p.up ? c.success : c.warning}
                    />
                  </View>
                ))}
              </View>
            </Pressable>
          </MotionSurface>
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
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  navTitle: { ...typography.h4 },
  navSub: { fontSize: 11, fontWeight: '600' },
  vendorBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  vendorBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  navActions: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },

  content: { padding: spacing.page },
  dashboardStack: { gap: 18 },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 6, ...shadow.xs,
  },
  metricIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  metricValue: { ...typography.h4 },
  metricLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 16, ...shadow.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.h4 },
  sectionLink: { fontSize: 13, fontWeight: '700' },

  quickRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  quickBtn: {
    flex: 1, minWidth: '45%', minHeight: 88, borderRadius: radius.lg, borderWidth: 1, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  quickBtnLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  emptyText: { fontSize: 13, fontWeight: '600' },
  bookingList: { gap: 12 },
  bookingCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  bookingTop: { flexDirection: 'row', padding: 14, gap: 12 },
  bookingCustomer: { ...typography.h4 },
  bookingService: { fontSize: 13, fontWeight: '500' },
  bookingVehicle: { fontSize: 12, fontWeight: '500' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },
  bookingTime: { fontSize: 11, fontWeight: '600' },
  bookingFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  bookingAmount: { ...typography.h4, flex: 1 },
  bookingStaff: { fontSize: 11, fontWeight: '600' },
  bookingAction: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1,
  },
  bookingActionText: { fontSize: 11, fontWeight: '800' },

  feedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  feedIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  feedText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  feedTime: { fontSize: 11, fontWeight: '600' },

  perfRow: { flexDirection: 'row', gap: 8 },
  perfCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1,
    padding: 10, alignItems: 'center', gap: 3,
  },
  perfValue: { ...typography.h4 },
  perfLabel: { fontSize: 10, fontWeight: '600' },
});
