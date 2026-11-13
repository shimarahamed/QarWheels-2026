import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorState from '@/components/ErrorState';
import { BranchSwitcher } from '@/components/vendor/BranchSwitcher';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import { formatMinorUnits } from '@/lib/money';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { radius, spacing, typography } from '@/lib/theme';
import { aggregateVendorBookings, INSIGHT_LIMITS, INSIGHT_PERIODS, useVendorInsights, type InsightPeriod } from '@/lib/vendor-insights';

export default function AnalyticsScreen() {
  const c = useQarColors();
  const vendorTabBottom = useVendorTabBottom();
  const [period, setPeriod] = useState<InsightPeriod>('This Week');
  const insights = useVendorInsights('analytics');
  const data = insights.status === 'ready' && insights.scope && !insights.limited
    ? aggregateVendorBookings(insights.records, insights.scope, period) : null;
  const maxBookings = Math.max(...(data?.bookingVolume.map((bucket) => bucket.count) ?? []), 1);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Analytics</Text>
        <BranchSwitcher />
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh analytics"
          disabled={insights.status === 'loading'} onPress={insights.retry} style={s.iconButton}>
          <Ionicons name="refresh" size={22} color={c.primary} />
        </Pressable>
      </View>
      <View style={s.periodRow} accessibilityRole="tablist">
        {INSIGHT_PERIODS.map((value) => (
          <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: period === value }}
            onPress={() => setPeriod(value)}
            style={[s.periodButton, { backgroundColor: period === value ? c.primary : c.surface, borderColor: c.border }]}>
            <Text style={[s.periodText, { color: period === value ? '#fff' : c.textSecondary }]}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]}
        refreshControl={<RefreshControl refreshing={insights.status === 'loading'} onRefresh={insights.retry} tintColor={c.primary} />}>
        <MotionScreen>
          {insights.status === 'loading' && <ActivityIndicator accessibilityLabel="Loading analytics" color={c.primary} />}
          {insights.status === 'error' && <ErrorState onRetry={insights.retry} />}
          {insights.status === 'blocked' && <Text style={[s.notice, { color: c.textSecondary }]}>{insights.message}</Text>}
          {insights.limited && <Text style={[s.notice, { color: c.textSecondary }]}>
            This branch has more than {INSIGHT_LIMITS.analytics} bookings. Complete analytics are unavailable on mobile; totals have not been calculated.
          </Text>}
          {data && <>
            <Text style={[s.caption, { color: c.textSecondary }]}>Booking dates to now, Qatar time. Weeks start Monday.</Text>
            {data.excludedRecords > 0 && <Text style={[s.notice, { color: c.textSecondary }]}>
              {data.excludedRecords} records with missing or invalid dates or statuses excluded. Totals may be incomplete.
            </Text>}
            {data.totalBookings === 0 ? <View style={s.empty}>
              <Ionicons name="bar-chart-outline" size={32} color={c.muted} />
              <Text style={[s.sectionTitle, { color: c.text }]}>{data.excludedRecords ? 'No usable bookings in this period' : 'No bookings in this period'}</Text>
            </View> : <>
              <View style={s.kpiRow}>
                {[
                  { label: 'Completed booking value', value: data.completedValueMinor === null ? 'Unavailable' : formatMinorUnits(data.completedValueMinor), icon: 'cash-outline' as const },
                  { label: 'Bookings', value: String(data.totalBookings), icon: 'calendar-outline' as const },
                  { label: 'Avg completed value', value: data.averageCompletedValueMinor === null ? 'N/A' : formatMinorUnits(data.averageCompletedValueMinor), icon: 'trending-up-outline' as const },
                  { label: 'Completion', value: `${data.completionRate}%`, icon: 'checkmark-circle-outline' as const },
                ].map((kpi) => <View key={kpi.label} style={[s.kpiCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Ionicons name={kpi.icon} size={20} color={c.primary} />
                  <Text style={[s.kpiValue, { color: c.text }]}>{kpi.value}</Text>
                  <Text style={[s.caption, { color: c.textSecondary }]}>{kpi.label}</Text>
                </View>)}
              </View>
              <Text style={[s.caption, { color: c.textSecondary }]}>Value is the recorded cost of completed bookings, not collected payments.</Text>
              {data.missingCosts > 0 && <Text style={[s.notice, { color: c.textSecondary }]}>
                {data.missingCosts} completed bookings have missing or invalid costs. Value totals are unavailable.
              </Text>}
              <MotionSurface delay={20}>
                <View style={[s.section, { borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Booking Volume</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={s.chart}>
                      {data.bookingVolume.map((bucket) => <View key={bucket.key} style={s.barColumn}
                        accessible accessibilityLabel={`${bucket.label}: ${bucket.count} bookings`}>
                        <Text style={[s.caption, { color: c.textSecondary }]}>{bucket.count}</Text>
                        <View style={s.barTrack}>
                          <View style={[s.bar, { height: bucket.count / maxBookings * 100, backgroundColor: c.primary }]} />
                        </View>
                        <Text style={[s.caption, { color: c.textSecondary }]}>{bucket.label}</Text>
                      </View>)}
                    </View>
                  </ScrollView>
                </View>
              </MotionSurface>
              <MotionSurface delay={40}>
                <View style={[s.section, { borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Top Services by Bookings</Text>
                  {data.topServices.map((service) => <View key={service.name} style={s.row}>
                    <Text style={[s.rowName, { color: c.text }]}>{service.name}</Text>
                    <Text style={[s.rowCount, { color: c.primary }]}>{service.count}</Text>
                  </View>)}
                </View>
              </MotionSurface>
              <MotionSurface delay={60}>
                <View style={[s.section, { borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Booking Status</Text>
                  {data.statuses.map((status) => <View key={status.name} style={s.row}>
                    <Text style={[s.rowName, { color: c.text }]}>{status.name.replace(/([a-z])([A-Z])/g, '$1 $2')}</Text>
                    <Text style={[s.rowCount, { color: c.textSecondary }]}>{status.count}</Text>
                  </View>)}
                </View>
              </MotionSurface>
            </>}
          </>}
        </MotionScreen>
      </ScrollView>
      <VendorTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: spacing.page, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  navTitle: { ...typography.h3, flexGrow: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.page, paddingVertical: 12 },
  periodButton: { flex: 1, minHeight: 44, padding: 8, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  periodText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  content: { padding: spacing.page },
  caption: { fontSize: 12, lineHeight: 18 },
  notice: { fontSize: 14, lineHeight: 22 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flexGrow: 1, flexBasis: '44%', minWidth: 120, borderRadius: radius.sm, borderWidth: 1, padding: 12, gap: 8 },
  kpiValue: { fontSize: 19, lineHeight: 26, fontWeight: '800', flexShrink: 1 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 16, gap: 14 },
  sectionTitle: { ...typography.h4 },
  chart: { flexDirection: 'row', gap: 8 },
  barColumn: { width: 48, alignItems: 'center', gap: 6 },
  barTrack: { height: 100, width: 28, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowName: { flex: 1, fontSize: 14, lineHeight: 20 },
  rowCount: { fontSize: 14, fontWeight: '700' },
});
