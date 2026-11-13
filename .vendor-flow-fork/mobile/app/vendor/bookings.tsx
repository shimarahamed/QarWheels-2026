import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore } from '@/lib/store';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { useVendorFeedStatus } from '@/lib/vendor-feed-status';
import { BranchSwitcher } from '@/components/vendor/BranchSwitcher';
import ErrorState from '@/components/ErrorState';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { bookingAmountLabel, getStatusColor, getStatusLabel, type VendorBookingStatus } from '@/lib/vendor-data';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';

const TABS: { key: VendorBookingStatus | 'All'; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'VehicleReceived', label: 'Received' },
  { key: 'InProgress', label: 'In Progress' },
  { key: 'ReadyForPickup', label: 'Ready' },
  { key: 'Completed', label: 'Done' },
  { key: 'Cancelled', label: 'Cancelled' },
  { key: 'Declined', label: 'Declined' },
  { key: 'NoShow', label: 'Missed' },
];

export default function VendorBookings() {
  const c = useQarColors();
  const router = useRouter();
  const vendorTabBottom = useVendorTabBottom();
  const bookings = useQarWheelStore((s) => s.vendorBookings);
  const feed = useVendorFeedStatus();
  const [activeTab, setActiveTab] = useState<VendorBookingStatus | 'All'>('All');

  const filtered = activeTab === 'All' ? bookings : bookings.filter((b) => b.status === activeTab);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Bookings</Text>
        <BranchSwitcher />
        <Text style={[s.navCount, { color: c.muted }]}>{filtered.length} bookings</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {TABS.map((tab) => {
          const count = tab.key === 'All' ? bookings.length : bookings.filter((b) => b.status === tab.key).length;
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab" accessibilityLabel={`${tab.label}, ${count} bookings`} accessibilityState={{ selected: active }}
              style={[s.tab, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.tabLabel, { color: active ? '#fff' : c.muted }]}>{tab.label}</Text>
              {count > 0 && (
                <View style={[s.tabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : c.surfaceAlt }]}>
                  <Text style={[s.tabBadgeText, { color: active ? '#fff' : c.textSecondary }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList data={filtered} keyExtractor={(booking) => booking.id}
        initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}
        contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16, gap: 10 }]}
        refreshing={feed.loading && bookings.length > 0} onRefresh={feed.retry}
        ListHeaderComponent={feed.error ? <ErrorState compact onRetry={feed.retry} /> : undefined}
        ListEmptyComponent={feed.loading ? <ActivityIndicator accessibilityLabel="Loading vendor bookings" color={c.primary} />
          : feed.error ? undefined : <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={c.muted} />
            <Text style={[s.emptyTitle, { color: c.text }]}>No bookings</Text>
            <Text style={[s.emptyText, { color: c.muted }]}>No bookings in this view.</Text>
          </View>}
        renderItem={({ item: b }) => {
                const sc = getStatusColor(b.status);
                return (
                  <View
                    key={b.id}
                    style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}
                  >
                    <Pressable accessibilityRole="button" accessibilityLabel={`View booking for ${b.customerName}: ${b.service}`} onPress={() => router.push(`/vendor/booking-detail/${b.id}` as never)} style={s.cardTop}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[s.customerName, { color: c.text }]}>{b.customerName}</Text>
                        <Text style={[s.serviceName, { color: c.textSecondary }]}>{b.service}</Text>
                        <Text style={[s.vehicleText, { color: c.muted }]}>{b.vehicle} · {b.vehiclePlate}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                          <View style={[s.statusDot, { backgroundColor: sc.dot }]} />
                          <Text style={[s.statusText, { color: sc.text }]}>{getStatusLabel(b.status)}</Text>
                        </View>
                        <Text style={[s.dateText, { color: c.muted }]}>{typeof b.date === 'string' ? b.date : ''}{b.timeSlot ? ` · ${b.timeSlot}` : ''}</Text>
                      </View>
                    </Pressable>

                    <View style={[s.cardFooter, { borderTopColor: c.border }]}>
                      <Text style={[s.amount, { color: c.text }]}>{bookingAmountLabel(b.totalAmount)}</Text>
                      {b.staffName ? (
                        <View style={[s.staffChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                          <Ionicons name="person-outline" size={11} color={c.muted} />
                          <Text style={[s.staffText, { color: c.muted }]}>{b.staffName}</Text>
                        </View>
                      ) : (
                        <Pressable
                          style={[s.assignBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                          accessibilityRole="button" accessibilityLabel={`Assign staff to ${b.service}`}
                          onPress={() => router.push(`/vendor/assign-staff/${b.id}` as never)}
                        >
                          <Text style={[s.assignText, { color: c.textSecondary }]}>Assign staff</Text>
                        </Pressable>
                      )}
                      <View style={s.cardActions}>
                        <Pressable
                          style={[s.actionBtn, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}
                          accessibilityRole="button" accessibilityLabel={`Update ${b.service}`}
                          onPress={() => router.push(`/vendor/status-update/${b.id}` as never)}
                        >
                          <Text style={[s.actionBtnText, { color: c.primary }]}>Update</Text>
                        </Pressable>
                        <Pressable
                          style={[s.actionBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                          accessibilityRole="button" accessibilityLabel={`Message ${b.customerName}`}
                          onPress={() => router.push(`/vendor/chat/${b.chatId}` as never)}
                        >
                          <Ionicons name="chatbubble-outline" size={14} color={c.textSecondary} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
        }}
      />
      <VendorTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page, 
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navTitle: { ...typography.h3 },
  navCount: { fontSize: 13, fontWeight: '600' },

  tabBar: { flexGrow: 0 },
  tabBarContent: { paddingHorizontal: spacing.page, paddingVertical: 12, gap: 12 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    minHeight: 42, minWidth: 74, paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '700' },
  tabBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  tabBadgeText: { fontSize: 12, fontWeight: '800' },

  content: { padding: spacing.page },

  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyTitle: { ...typography.h4 },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.sm },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 10 },
  customerName: { ...typography.h4 },
  serviceName: { fontSize: 13, fontWeight: '500' },
  vehicleText: { fontSize: 12, fontWeight: '500' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '800' },
  dateText: { fontSize: 12, fontWeight: '600' },

  cardFooter: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  amount: { ...typography.h4, flex: 1 },
  staffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1,
  },
  staffText: { fontSize: 12, fontWeight: '600' },
  assignBtn: {
    minHeight: 44, justifyContent: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1,
  },
  assignText: { fontSize: 12, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '800' },
});
