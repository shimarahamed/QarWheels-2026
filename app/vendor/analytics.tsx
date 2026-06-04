import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { getAnalyticsForPeriod } from '@/lib/vendor-data';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
const PERIODS = ['This Week', 'This Month', 'This Year'] as const;

export default function AnalyticsScreen() {
  const c = useQarColors();
  const vendorTabBottom = useVendorTabBottom();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('This Week');
  const data = getAnalyticsForPeriod(period);

  const maxRevenue = Math.max(...data.dailyRevenue.map((d) => d.revenue), 1);
  const maxBookings = Math.max(...data.peakHours.map((h) => h.bookings), 1);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Analytics</Text>
      </View>

      {/* Period selector */}
      <View style={s.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            style={[s.periodBtn, { backgroundColor: period === p ? c.primary : c.surface, borderColor: period === p ? c.primary : c.border }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[s.periodText, { color: period === p ? '#fff' : c.muted }]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* KPI row */}
          <View style={s.kpiRow}>
            {[
              { label: 'Revenue', value: `QAR ${data.totalRevenue.toLocaleString()}`, icon: 'cash-outline' as const, color: c.success },
              { label: 'Bookings', value: String(data.totalBookings), icon: 'calendar-outline' as const, color: c.primary },
              { label: 'Avg Order', value: `QAR ${data.avgOrderValue}`, icon: 'trending-up-outline' as const, color: c.ai },
              { label: 'Completion', value: `${data.completionRate}%`, icon: 'checkmark-circle-outline' as const, color: '#22C55E' },
            ].map((kpi) => (
              <View key={kpi.label} style={[s.kpiCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[s.kpiIcon, { backgroundColor: `${kpi.color}20` }]}>
                  <Ionicons name={kpi.icon} size={16} color={kpi.color} />
                </View>
                <Text style={[s.kpiValue, { color: c.text }]}>{kpi.value}</Text>
                <Text style={[s.kpiLabel, { color: c.muted }]}>{kpi.label}</Text>
              </View>
            ))}
          </View>

          {/* Revenue chart */}
          <MotionSurface delay={60}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Revenue — {period}</Text>
              {data.totalRevenue === 0 ? (
                <View style={s.chartEmpty}>
                  <Ionicons name="bar-chart-outline" size={32} color={c.muted} />
                  <Text style={[s.chartEmptyText, { color: c.muted }]}>No revenue data for this period</Text>
                </View>
              ) : (
                <View style={s.chartArea}>
                  {data.dailyRevenue.map((day) => {
                    const barH = Math.max(4, (day.revenue / maxRevenue) * 120);
                    return (
                      <View key={day.day} style={s.barCol}>
                        <Text style={[s.barValue, { color: c.muted }]}>
                          {day.revenue > 0 ? `${Math.round(day.revenue / 1000 * 10) / 10}k` : ''}
                        </Text>
                        <View style={s.barWrap}>
                          <View
                            style={[
                              s.bar,
                              {
                                height: barH,
                                backgroundColor: day.revenue > 0 ? c.primary : c.surfaceAlt,
                                borderRadius: radius.xs,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[s.barDay, { color: c.muted }]}>{day.day}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </MotionSurface>

          {/* Top services */}
          <MotionSurface delay={120}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Top Services</Text>
              {data.topServices.map((svc, i) => {
                const pct = (svc.revenue / data.totalRevenue) * 100;
                return (
                  <View key={svc.name} style={{ gap: 6 }}>
                    <View style={s.svcRow}>
                      <Text style={[s.svcRank, { color: c.muted }]}>#{i + 1}</Text>
                      <Text style={[s.svcName, { color: c.text }]}>{svc.name}</Text>
                      <Text style={[s.svcCount, { color: c.textSecondary }]}>{svc.count}x</Text>
                      <Text style={[s.svcRevenue, { color: c.primary }]}>QAR {svc.revenue}</Text>
                    </View>
                    <View style={[s.svcBar, { backgroundColor: c.surfaceAlt }]}>
                      <View style={[s.svcFill, { width: `${pct}%`, backgroundColor: c.primary }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </MotionSurface>

          {/* Peak hours */}
          <MotionSurface delay={180}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Peak Hours</Text>
              {data.totalBookings === 0 ? (
                <View style={s.chartEmpty}>
                  <Ionicons name="time-outline" size={32} color={c.muted} />
                  <Text style={[s.chartEmptyText, { color: c.muted }]}>No bookings in this period</Text>
                </View>
              ) : (
                <View style={s.peakChart}>
                  {data.peakHours.map((h) => {
                    const barH = Math.max(4, (h.bookings / maxBookings) * 80);
                    return (
                      <View key={h.hour} style={s.peakCol}>
                        <Text style={[s.peakValue, { color: c.muted }]}>{h.bookings}</Text>
                        <View style={s.barWrap}>
                          <View
                            style={[s.bar, { height: barH, backgroundColor: h.bookings >= maxBookings - 1 ? c.primary : c.primaryLight, borderRadius: radius.xs }]}
                          />
                        </View>
                        <Text style={[s.peakHour, { color: c.muted }]}>{h.hour}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </MotionSurface>

          {/* Funnel */}
          <MotionSurface delay={240}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Conversion Funnel</Text>
              {data.funnelSteps.map((step, i) => {
                const pct = i === 0 ? 100 : (step.count / data.funnelSteps[0].count) * 100;
                return (
                  <View key={step.step} style={{ gap: 6 }}>
                    <View style={s.funnelRow}>
                      <Text style={[s.funnelStep, { color: c.textSecondary }]}>{step.step}</Text>
                      <Text style={[s.funnelCount, { color: c.text }]}>{step.count}</Text>
                      <Text style={[s.funnelPct, { color: c.muted }]}>{Math.round(pct)}%</Text>
                    </View>
                    <View style={[s.funnelBar, { backgroundColor: c.surfaceAlt, width: `${pct}%` }]}>
                      <View style={[s.funnelFill, { backgroundColor: c.primary }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </MotionSurface>

          {/* Repeat rate */}
          <MotionSurface delay={300}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={s.repeatRow}>
                <View style={{ gap: 3 }}>
                  <Text style={[s.repeatTitle, { color: c.text }]}>Repeat Customer Rate</Text>
                  <Text style={[s.repeatSub, { color: c.muted }]}>Customers who booked more than once</Text>
                </View>
                <Text style={[s.repeatValue, { color: c.success }]}>{data.repeatRate}%</Text>
              </View>
              <View style={[s.repeatBar, { backgroundColor: c.surfaceAlt }]}>
                <View style={[s.repeatFill, { width: `${data.repeatRate}%`, backgroundColor: c.success }]} />
              </View>
            </View>
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
    paddingHorizontal: spacing.page, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { ...typography.h3 },

  periodRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: spacing.page, paddingVertical: 12,
  },
  periodBtn: { flex: 1, minHeight: 42, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  periodText: { fontSize: 12, fontWeight: '700' },

  content: { padding: spacing.page, gap: spacing.gap },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flex: 1, minWidth: '44%', maxWidth: '50%', borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 5, ...shadow.xs,
  },
  kpiIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { ...typography.h4 },
  kpiLabel: { fontSize: 10, fontWeight: '700' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.sm },
  sectionTitle: { ...typography.h4 },

  chartEmpty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  chartEmptyText: { fontSize: 13, fontWeight: '600' },

  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 160 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, fontWeight: '700' },
  barWrap: { flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '75%' },
  barDay: { fontSize: 9, fontWeight: '700' },

  svcRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  svcRank: { fontSize: 11, fontWeight: '700', width: 20 },
  svcName: { flex: 1, fontSize: 13, fontWeight: '700' },
  svcCount: { fontSize: 11, fontWeight: '600' },
  svcRevenue: { fontSize: 12, fontWeight: '800', width: 60, textAlign: 'right' },
  svcBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  svcFill: { height: '100%', borderRadius: 3 },

  peakChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120 },
  peakCol: { flex: 1, alignItems: 'center', gap: 3 },
  peakValue: { fontSize: 9, fontWeight: '700' },
  peakHour: { fontSize: 8, fontWeight: '700' },

  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  funnelStep: { flex: 1, fontSize: 13, fontWeight: '600' },
  funnelCount: { fontSize: 13, fontWeight: '800' },
  funnelPct: { fontSize: 11, fontWeight: '600', width: 36, textAlign: 'right' },
  funnelBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  funnelFill: { height: '100%', width: '100%' },

  repeatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  repeatTitle: { fontSize: 14, fontWeight: '800' },
  repeatSub: { fontSize: 12, fontWeight: '500' },
  repeatValue: { fontSize: 28, fontWeight: '900' },
  repeatBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  repeatFill: { height: '100%', borderRadius: 4 },
});
