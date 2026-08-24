import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelsStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { findVendorBooking } from '@/lib/vendor-data';

export default function AssignStaffScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = findVendorBooking(id);
  const staff = useQarWheelsStore((s) => s.vendorStaff);
  const vendorBookings = useQarWheelsStore((s) => s.vendorBookings);
  const assignStaff = useQarWheelsStore((s) => s.assignVendorBookingStaff);

  function handleAssign(staffId: string, staffName: string) {
    Alert.alert(
      'Assign Staff',
      `Assign ${staffName} to ${booking.customerName}'s booking?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: () => {
            assignStaff(booking.id, staffId, staffName);
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
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Assign Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Booking context */}
          <View style={[s.contextCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ gap: 2 }}>
              <Text style={[s.contextCustomer, { color: c.text }]}>{booking.customerName}</Text>
              <Text style={[s.contextService, { color: c.textSecondary }]}>{booking.service}</Text>
              <Text style={[s.contextDate, { color: c.muted }]}>{typeof booking.date === 'string' ? booking.date : ''}{booking.timeSlot ? ` · ${booking.timeSlot}` : ''}</Text>
            </View>
            {booking.staffName ? (
              <View style={[s.currentStaffBadge, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
                <Text style={[s.currentStaffText, { color: c.primary }]}>Currently: {booking.staffName}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[s.listHeading, { color: c.muted }]}>SELECT TECHNICIAN</Text>

          {staff.map((member) => {
            const activeBookings = vendorBookings.filter(
              (b) => b.staffId === member.id && b.status !== 'Completed' && b.status !== 'Cancelled',
            ).length;
            const isCurrentlyAssigned = booking.staffId === member.id;

            return (
              <Pressable
                key={member.id}
                style={[
                  s.staffCard,
                  {
                    backgroundColor: isCurrentlyAssigned ? c.primaryLight : c.surface,
                    borderColor: isCurrentlyAssigned ? c.primaryMid : c.border,
                  },
                ]}
                onPress={() => member.available ? handleAssign(member.id, member.name) : Alert.alert('Unavailable', `${member.name} is currently unavailable.`)}
              >
                <View style={[s.avatar, { backgroundColor: `${member.color}25` }]}>
                  <Text style={[s.avatarText, { color: member.color }]}>{member.avatarInitials}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.memberName, { color: c.text }]}>{member.name}</Text>
                  <Text style={[s.memberRole, { color: c.textSecondary }]}>{member.role}</Text>
                  <Text style={[s.memberSpecialty, { color: c.muted }]}>{member.specialty}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[s.availBadge, { backgroundColor: member.available ? '#22C55E20' : '#F59E0B20' }]}>
                    <View style={[s.availDot, { backgroundColor: member.available ? '#22C55E' : '#F59E0B' }]} />
                    <Text style={[s.availText, { color: member.available ? '#22C55E' : '#F59E0B' }]}>
                      {member.available ? 'Available' : 'Busy'}
                    </Text>
                  </View>
                  <Text style={[s.activeText, { color: c.muted }]}>{activeBookings} active jobs</Text>
                </View>
                {isCurrentlyAssigned && (
                  <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                )}
              </Pressable>
            );
          })}
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

  contextCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10, ...shadow.xs },
  contextCustomer: { ...typography.h4 },
  contextService: { fontSize: 13, fontWeight: '600' },
  contextDate: { fontSize: 12, fontWeight: '500' },
  currentStaffBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, alignSelf: 'flex-start' },
  currentStaffText: { fontSize: 12, fontWeight: '700' },

  listHeading: { ...typography.overline, paddingHorizontal: 2 },

  staffCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900' },
  memberName: { ...typography.h4 },
  memberRole: { fontSize: 12, fontWeight: '600' },
  memberSpecialty: { fontSize: 12, fontWeight: '500' },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 12, fontWeight: '800' },
  activeText: { fontSize: 12, fontWeight: '600' },
});
