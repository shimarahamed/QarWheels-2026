import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { findVendorBooking, getStatusColor, getStatusLabel } from '@/lib/vendor-data';
import { getBookingStatusDescription } from '@/lib/booking-workflow';
import { BookingActionSheet } from '@/components/vendor/BookingActionSheet';

export default function StatusUpdateScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeBooking = useQarWheelStore((state) => state.vendorBookings.find((b) => b.id === id));
  const booking = storeBooking ?? findVendorBooking(id);
  const sc = getStatusColor(booking.status);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable
          style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.back()}
          accessible accessibilityRole="button" accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Update Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Context */}
          <View style={[s.contextCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ gap: 2 }}>
              <Text style={[s.contextName, { color: c.text }]}>{booking.customerName}</Text>
              <Text style={[s.contextService, { color: c.textSecondary }]}>{booking.service}</Text>
              <Text style={[s.contextVehicle, { color: c.muted }]}>{booking.vehicle}</Text>
            </View>
          </View>

          {/* Where the booking stands now. Statuses are no longer free-pick —
              the only moves offered are the ones the server will accept. */}
          <View style={[s.currentCard, { backgroundColor: sc.bg, borderColor: `${sc.dot}30` }]}>
            <View style={s.currentRow}>
              <View style={[s.currentDot, { backgroundColor: sc.dot }]} />
              <Text style={[s.currentLabel, { color: sc.text }]}>{getStatusLabel(booking.status)}</Text>
            </View>
            <Text style={[s.currentDesc, { color: c.textSecondary }]}>
              {getBookingStatusDescription(booking.status)}
            </Text>
          </View>

          <BookingActionSheet
            booking={booking}
            showCancel
            onDone={() => router.back()}
          />
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  contextCard: {
    borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.xs,
  },
  contextName: { ...typography.h4 },
  contextService: { fontSize: 13, fontWeight: '500' },
  contextVehicle: { fontSize: 12, fontWeight: '500' },

  currentCard: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 6 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  currentDot: { width: 10, height: 10, borderRadius: 5 },
  currentLabel: { fontSize: 15, fontWeight: '900' },
  currentDesc: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
});
