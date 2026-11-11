import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { palette, radius, shadow, spacing, typography } from '@/lib/theme';
import { MissingRecord } from '@/components/vendor/MissingRecord';
import { bookingAmountLabel } from '@/lib/vendor-data';

const TIER_COLORS: Record<string, string> = {
  Platinum: '#E5E4E2',
  Gold: palette.gold,
  Silver: '#C0C0C0',
  Bronze: '#CD7F32',
};

export default function CustomerScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customers = useQarWheelStore((s) => s.vendorCustomers);
  const updateNotes = useQarWheelStore((s) => s.updateVendorCustomerNotes);
  const vendorBookings = useQarWheelStore((s) => s.vendorBookings);

  const customer = customers.find((cu) => cu.id === id || cu.name.replace(/\s/g, '_') === id);

  const [notes, setNotes] = useState(customer?.notes ?? '');
  if (!customer) return <MissingRecord title="Customer unavailable" />;
  const customerBookings = vendorBookings.filter((b) => b.customerName === customer.name);
  const tierColor = TIER_COLORS[customer.loyaltyTier] ?? '#C0C0C0';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Customer Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Profile card */}
          <View style={[s.profileCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[s.avatar, { backgroundColor: c.primaryLight }]}>
              <Text style={[s.avatarText, { color: c.primary }]}>
                {customer.name.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={s.nameRow}>
                <Text style={[s.customerName, { color: c.text }]}>{customer.name}</Text>
                <View style={[s.tierBadge, { backgroundColor: `${tierColor}25`, borderColor: `${tierColor}50` }]}>
                  <Text style={[s.tierText, { color: tierColor }]}>{customer.loyaltyTier}</Text>
                </View>
              </View>
              <Text style={[s.phone, { color: c.textSecondary }]}>{customer.phone}</Text>
              <Text style={[s.email, { color: c.muted }]}>{customer.email}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Total Visits', value: String(customer.totalBookings) },
              { label: 'Total Spend', value: `QAR ${customer.totalSpend}` },
              { label: 'Last Visit', value: customer.lastVisit },
            ].map((stat) => (
              <View key={stat.label} style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.statValue, { color: c.text }]}>{stat.value}</Text>
                <Text style={[s.statLabel, { color: c.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Vehicles */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Vehicles</Text>
            {customer.vehicles.map((v) => (
              <View key={v} style={[s.vehicleRow, { borderColor: c.border }]}>
                <Ionicons name="car-sport-outline" size={18} color={c.primary} />
                <Text style={[s.vehicleText, { color: c.text }]}>{v}</Text>
              </View>
            ))}
          </View>

          {/* Notes */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Private Notes</Text>
            <TextInput
              style={[s.notesInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add internal notes about this customer..."
              placeholderTextColor={c.muted}
              multiline
              numberOfLines={3}
            />
            <Pressable
              style={[s.saveBtn, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}
              onPress={() => {
                Keyboard.dismiss();
                updateNotes(customer.id, notes);
                Alert.alert('Saved', 'Notes updated.');
              }}
            >
              <Text style={[s.saveBtnText, { color: c.primary }]}>Save Notes</Text>
            </Pressable>
          </View>

          {/* Booking history */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Booking History</Text>
            {customerBookings.length === 0 ? (
              <Text style={[s.noHistory, { color: c.muted }]}>No bookings yet.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {customerBookings.map((b) => (
                  <Pressable
                    key={b.id}
                    style={[s.historyRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                    onPress={() => router.push(`/vendor/booking-detail/${b.id}` as never)}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.historyService, { color: c.text }]}>{b.service}</Text>
                      <Text style={[s.historyDate, { color: c.muted }]}>{typeof b.date === 'string' ? b.date : ''}{b.timeSlot ? ` · ${b.timeSlot}` : ''}</Text>
                    </View>
                    <Text style={[s.historyAmount, { color: c.text }]}>{bookingAmountLabel(b.totalAmount)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </MotionScreen>
      </ScrollView>
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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.sm,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerName: { ...typography.h4 },
  tierBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1,
  },
  tierText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  phone: { fontSize: 13, fontWeight: '600' },
  email: { fontSize: 12, fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 4, ...shadow.xs,
  },
  statValue: { ...typography.h4 },
  statLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  vehicleText: { fontSize: 14, fontWeight: '600' },

  notesInput: {
    borderRadius: radius.lg, borderWidth: 1, padding: 12,
    fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  saveBtn: {
    alignItems: 'center', paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1,
  },
  saveBtnText: { fontSize: 13, fontWeight: '800' },

  noHistory: { fontSize: 13, fontWeight: '500' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1, padding: 12,
  },
  historyService: { fontSize: 13, fontWeight: '700' },
  historyDate: { fontSize: 12, fontWeight: '500' },
  historyAmount: { fontSize: 14, fontWeight: '800' },
});
