import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelsStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import {
  findVendorBooking,
  getStatusColor,
  getStatusLabel,
  STATUS_FLOW,
  type VendorBookingStatus,
} from '@/lib/vendor-data';
import { getBookingStatusDescription } from '@/lib/booking-workflow';


export default function StatusUpdateScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeBooking = useQarWheelsStore((state) => state.vendorBookings.find((b) => b.id === id));
  const booking = storeBooking ?? findVendorBooking(id);
  const updateStatus = useQarWheelsStore((s) => s.updateVendorBookingStatus);

  const currentIndex = STATUS_FLOW.indexOf(booking.status);

  function handleSelect(status: VendorBookingStatus) {
    if (status === booking.status) {
      router.back();
      return;
    }
    Alert.alert(
      'Update Status',
      `Move booking to "${getStatusLabel(status)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            updateStatus(booking.id, status);
            router.back();
          },
        },
      ],
    );
  }

  function handleCancel() {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => {
            updateStatus(booking.id, 'Cancelled');
            router.back();
          },
        },
      ],
    );
  }

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

          {/* Status flow */}
          <View style={{ gap: 10 }}>
            {STATUS_FLOW.map((status, index) => {
              const sc = getStatusColor(status);
              const isCurrent = booking.status === status;
              const isPast = currentIndex > index;
              const isFuture = currentIndex < index;

              return (
                <Pressable
                  key={status}
                  style={[
                    s.statusOption,
                    { backgroundColor: isCurrent ? `${sc.dot}15` : c.surface, borderColor: isCurrent ? sc.dot : c.border },
                  ]}
                  onPress={() => handleSelect(status)}
                >
                  <View style={s.statusLeft}>
                    <View
                      style={[
                        s.statusCircle,
                        {
                          backgroundColor: isCurrent ? sc.dot : isPast ? `${sc.dot}30` : c.surfaceAlt,
                          borderColor: isCurrent ? sc.dot : isPast ? `${sc.dot}50` : c.border,
                        },
                      ]}
                    >
                      {isPast ? (
                        <Ionicons name="checkmark" size={14} color={sc.dot} />
                      ) : isCurrent ? (
                        <View style={[s.statusInnerDot, { backgroundColor: '#fff' }]} />
                      ) : (
                        <Text style={[s.statusNumber, { color: c.muted }]}>{index + 1}</Text>
                      )}
                    </View>
                    {index < STATUS_FLOW.length - 1 && (
                      <View style={[s.stepLine, { backgroundColor: isPast ? sc.dot : c.border }]} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={s.statusNameRow}>
                      <Text style={[s.statusName, { color: isCurrent ? sc.text : c.text, fontWeight: isCurrent ? '900' : '700' }]}>
                        {getStatusLabel(status)}
                      </Text>
                      {isCurrent && (
                        <View style={[s.currentBadge, { backgroundColor: `${sc.dot}25` }]}>
                          <Text style={[s.currentBadgeText, { color: sc.text }]}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.statusDesc, { color: c.muted }]}>{getBookingStatusDescription(status)}</Text>
                  </View>
                  {isFuture && (
                    <Ionicons name="chevron-forward" size={16} color={c.muted} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Cancel */}
          {booking.status !== 'Completed' && booking.status !== 'Cancelled' && (
            <Pressable
              style={[s.cancelBtn, { borderColor: c.danger }]}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle-outline" size={16} color={c.danger} />
              <Text style={[s.cancelBtnText, { color: c.danger }]}>Cancel Booking</Text>
            </Pressable>
          )}
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

  statusOption: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs,
  },
  statusLeft: { alignItems: 'center', gap: 0 },
  statusCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  statusInnerDot: { width: 10, height: 10, borderRadius: 5 },
  statusNumber: { fontSize: 12, fontWeight: '800' },
  stepLine: { width: 2, height: 16, marginVertical: 2, borderRadius: 1 },
  statusNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusName: { fontSize: 14, lineHeight: 20 },
  currentBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  currentBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  statusDesc: { fontSize: 12, fontWeight: '500', lineHeight: 17 },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: radius.xl, borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '800' },
});
