import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/lib/AuthContext';
import { MissingRecord } from '@/components/vendor/MissingRecord';
import { MotionScreen } from '@/lib/motion';
import { isBusinessWideRole, ROLE_LABELS } from '@/lib/permissions';
import { useQarWheelStore } from '@/lib/store';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { assignBookingStaff, fetchStaffRoster, type StaffRosterEntry } from '@/lib/vendorOps';
import { useVendorBranches } from '@/lib/vendorQueries';

export default function AssignStaffScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useQarWheelStore((s) => s.vendorBookings.find((item) => item.id === id));
  const assignStaff = useQarWheelStore((s) => s.assignVendorBookingStaff);
  const { businessId } = useAuthContext();
  const branches = useVendorBranches();
  const branchId = booking?.branchId;
  const terminal = !!booking && ['Completed', 'Cancelled', 'Declined', 'NoShow'].includes(booking.status);
  const inBranch = !branches.loading && !branches.error && !!branchId && !!businessId && branches.activeBranch?.id === branchId
    && branches.activeBranch.businessId === businessId;
  const scope = `${businessId}:${branchId}`;
  const [roster, setRoster] = useState<{ scope: string; entries: StaffRosterEntry[]; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!booking || terminal || !inBranch || !businessId) return;
    let active = true;
    fetchStaffRoster(businessId).then(
      (entries) => { if (active) setRoster({ scope, entries, error: null }); },
      (error) => { if (active) setRoster({ scope, entries: [], error: error instanceof Error ? error.message : 'Could not load the team.' }); },
    );
    return () => { active = false; };
  }, [booking, terminal, businessId, inBranch, scope, attempt]);

  if (!booking) return <MissingRecord title="Booking unavailable" />;
  const eligible = inBranch && roster?.scope === scope && !roster.error
    ? roster.entries.filter((member) => member.status === 'Active'
      && (isBusinessWideRole(member.role) || member.branchIds.includes(branchId!))) : [];

  function handleAssign(member: StaffRosterEntry | null) {
    if (saving || terminal || !inBranch || !booking) return;
    Alert.alert(
      member ? 'Assign Staff' : 'Unassign Staff',
      member ? `Assign ${member.displayName} to ${booking.customerName}'s booking?`
        : `Remove the staff assignment from ${booking.customerName}'s booking?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: member ? 'Assign' : 'Unassign',
          onPress: async () => {
            if (saving) return;
            setSaving(true);
            try {
              const result = await assignBookingStaff(booking.id, member?.id ?? null);
              assignStaff(booking.id, result.assignedStaffId ?? '', result.assignedStaffName ?? '');
              router.back();
            } catch (error) {
              Alert.alert('Assignment failed', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Assign Staff</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          <View style={[s.contextCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ gap: 2 }}>
              <Text style={[s.contextCustomer, { color: c.text }]}>{booking.customerName}</Text>
              <Text style={[s.contextService, { color: c.textSecondary }]}>{booking.service}</Text>
              <Text style={[s.contextDate, { color: c.muted }]}>{booking.date}{booking.timeSlot ? ` - ${booking.timeSlot}` : ''}</Text>
            </View>
            {booking.staffName ? (
              <View style={[s.currentStaffBadge, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
                <Text style={[s.currentStaffText, { color: c.primary }]}>Currently: {booking.staffName}</Text>
              </View>
            ) : null}
          </View>
          {terminal ? <Text accessibilityRole="alert" style={{ color: c.textSecondary }}>This booking can no longer be assigned.</Text> : null}
          {!terminal && branches.loading ? <ActivityIndicator accessibilityLabel="Loading branch" color={c.primary} /> : null}
          {!terminal && branches.error ? (
            <>
              <Text accessibilityRole="alert" style={{ color: c.textSecondary }}>Could not load the current branch.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Retry loading branch" onPress={branches.retry}>
                <Text style={{ color: c.primary }}>Retry</Text>
              </Pressable>
            </>
          ) : null}
          {!terminal && !branches.loading && !branches.error && !inBranch ? (
            <>
              <Text style={{ color: c.textSecondary }}>This booking is not in the current branch.</Text>
              {branches.branches.some((branch) => branch.id === branchId && branch.businessId === businessId) ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Switch to booking branch" onPress={() => branches.setActiveBranch(branchId!)}>
                  <Text style={{ color: c.primary }}>Switch to booking branch</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
          {!terminal && inBranch ? <Text style={[s.listHeading, { color: c.muted }]}>SELECT TECHNICIAN</Text> : null}
          {!terminal && inBranch && roster?.scope !== scope ? <ActivityIndicator accessibilityLabel="Loading staff roster" color={c.primary} /> : null}
          {!terminal && inBranch && roster?.scope === scope && roster.error ? (
            <>
              <Text accessibilityRole="alert" style={{ color: c.textSecondary }}>{roster.error}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Retry loading staff" onPress={() => { setRoster(null); setAttempt((value) => value + 1); }}>
                <Text style={{ color: c.primary }}>Retry</Text>
              </Pressable>
            </>
          ) : null}
          {!terminal && inBranch && roster?.scope === scope && !roster.error && eligible.length === 0 ? (
            <Text style={{ color: c.textSecondary }}>No active staff are available in this branch.</Text>
          ) : null}
          {!terminal && inBranch && roster?.scope === scope && !roster.error && booking.staffId ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Unassign staff" disabled={saving} style={[s.staffCard, { backgroundColor: c.surface, borderColor: c.border, opacity: saving ? 0.5 : 1 }]} onPress={() => handleAssign(null)}>
              <Ionicons name="person-remove-outline" size={20} color={c.text} />
              <Text style={[s.memberName, { color: c.text }]}>Unassign staff</Text>
            </Pressable>
          ) : null}
          {!terminal && eligible.map((member) => {
            const selected = booking.staffId === member.id;
            return (
              <Pressable key={member.id} accessibilityRole="button" accessibilityLabel={`Assign ${member.displayName}`}
                accessibilityState={{ selected, disabled: saving || selected }} disabled={saving || selected}
                style={[s.staffCard, { backgroundColor: selected ? c.primaryLight : c.surface, borderColor: selected ? c.primaryMid : c.border, opacity: saving ? 0.5 : 1 }]}
                onPress={() => handleAssign(member)}>
                <View style={[s.avatar, { backgroundColor: c.primaryLight }]}>
                  <Text style={[s.avatarText, { color: c.primary }]}>{member.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.memberName, { color: c.text }]}>{member.displayName}</Text>
                  <Text style={[s.memberRole, { color: c.textSecondary }]}>{ROLE_LABELS[member.role]}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={c.primary} /> : null}
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
  navbar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, ...shadow.sm },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  contextCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10, ...shadow.xs },
  contextCustomer: { ...typography.h4 },
  contextService: { fontSize: 13, fontWeight: '600' },
  contextDate: { fontSize: 12, fontWeight: '500' },
  currentStaffBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, alignSelf: 'flex-start' },
  currentStaffText: { fontSize: 12, fontWeight: '700' },
  listHeading: { ...typography.overline, paddingHorizontal: 2 },
  staffCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900' },
  memberName: { ...typography.h4 },
  memberRole: { fontSize: 12, fontWeight: '600' },
});
