import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import { signOutCompletely } from '@/lib/session';
import { useVendorProfileWriter } from '@/lib/firestoreOps';
import { useAuthContext } from '@/lib/AuthContext';
import { useVendorBranches } from '@/lib/vendorQueries';
import { canAccess, canPerform, isBusinessWideRole } from '@/lib/permissions';

const WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// The mobile profile keeps one open/close pair plus a list of working days,
// while Branch.workingHours is a per-day map. Expand the flat form into the
// stored schema so web and mobile read the same shape.
const DAY_KEYS: Record<string, string> = {
  Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat',
};

function toWorkingHours(workDays: string[], openTime: string, closeTime: string) {
  return Object.fromEntries(
    Object.entries(DAY_KEYS).map(([label, key]) => [
      key,
      { isOpen: workDays.includes(label), openTime, closeTime },
    ]),
  );
}

export default function VendorSettingsScreen() {
  const activeBranchId = useQarWheelStore((s) => s.activeBranchId);
  const { user } = useAuthContext();
  return <BranchSettings key={`${user?.uid}:${activeBranchId}`} />;
}

function BranchSettings() {
  const c = useQarColors();
  const router = useRouter();
  const vendorTabBottom = useVendorTabBottom();
  const profile = useQarWheelStore((s) => s.vendorProfile);
  const updateProfile = useQarWheelStore((s) => s.updateVendorProfile);
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const setThemeMode = useQarWheelStore((s) => s.setThemeMode);
  const setVendorAuthenticated = useQarWheelStore((s) => s.setVendorAuthenticated);
  // Writes are scoped to the signed-in vendor's own business/branch, resolved
  // from their claims — the screen never names a target document id.
  const { saveBranch, branchId } = useVendorProfileWriter();
  const { user, role, businessId, claimsLoading } = useAuthContext();
  const branches = useVendorBranches();
  const canWrite = !!user && !claimsLoading && role !== 'customer' && role !== 'master_admin'
    && isBusinessWideRole(role) && !branches.loading && !branches.error
    && !!branchId && branches.activeBranch?.id === branchId && branches.activeBranch.businessId === businessId;
  const [pending, setPending] = useState<'hours' | 'vacation' | 'logout' | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState<'hours' | 'vacation' | null>(null);
  const vacationMode = branches.activeBranch?.vacationMode === true;

  const [openTime, setOpenTime] = useState(profile.openTime);
  const [closeTime, setCloseTime] = useState(profile.closeTime);
  const [workDays, setWorkDays] = useState(profile.workDays);

  function toggleDay(day: string) {
    setWorkDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  async function saveBranchConfirmed(data: Parameters<typeof saveBranch>[0]) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        saveBranch(data),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Confirmation timed out')), 20000); }),
      ]);
    } finally { clearTimeout(timer); }
  }

  async function handleSaveHours() {
    if (busy.current) return;
    if (!canWrite) { setError('An owner, admin or manager must select an available branch to save hours.'); return; }
    const open = openTime.trim();
    const close = closeTime.trim();
    if (![open, close].every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || close <= open) {
      setError('Use 24-hour HH:MM times, with closing later than opening. Overnight hours are not supported here.'); return;
    }
    if (!workDays.length) { setError('Select at least one working day. Use vacation mode to pause bookings.'); return; }
    busy.current = true; setPending('hours'); setError(''); setRetryAction(null);
    try {
      await saveBranchConfirmed({ workingHours: toWorkingHours(workDays, open, close) });
      if (!mounted.current) return;
      updateProfile({ openTime: open, closeTime: close, workDays });
      Alert.alert('Hours saved', `Working hours were saved for ${branches.activeBranch?.name}.`);
    } catch (err) {
      if (!mounted.current) return;
      setError((err as { code?: string })?.code === 'permission-denied'
        ? 'You do not have permission to change this branch. Ask your business owner to check your access.'
        : 'Hours were not confirmed saved. The request may still sync. Your entries are still here; retry the same values when connected.');
      setRetryAction('hours');
    } finally { busy.current = false; if (mounted.current) setPending(null); }
  }

  async function saveVacation(value: boolean) {
    if (busy.current || !canWrite) return;
    busy.current = true; setPending('vacation'); setError(''); setRetryAction(null);
    try {
      await saveBranchConfirmed({ vacationMode: value });
      if (!mounted.current) return;
      updateProfile({ vacationMode: value });
    } catch (err) {
      if (!mounted.current) return;
      setError((err as { code?: string })?.code === 'permission-denied'
        ? 'You do not have permission to change vacation mode. Ask your business owner to check your access.'
        : 'Vacation mode was not confirmed changed. The request may still sync; retry the same setting when connected.');
      setRetryAction('vacation');
    } finally { busy.current = false; if (mounted.current) setPending(null); }
  }

  function handleVacationToggle() {
    if (busy.current || !canWrite) return;
    Alert.alert(
      vacationMode ? 'Disable Vacation Mode' : 'Enable Vacation Mode',
      vacationMode
        ? `Resume accepting bookings at ${branches.activeBranch?.name}?`
        : `Pause new bookings at ${branches.activeBranch?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: () => { if (mounted.current) void saveVacation(!vacationMode); },
        },
      ],
    );
  }

  function handleLogout() {
    async function logoutAndGoToSplash() {
      if (busy.current || !mounted.current) return;
      busy.current = true; setPending('logout'); setError('');
      try {
        // Clears the persisted store too, so vendor and customer data does
        // not survive into the next session on this device.
        await signOutCompletely();
        setVendorAuthenticated(false);
        router.replace('/(auth)/splash' as never);
      } catch { if (mounted.current) setError('Sign-out could not be completed. Please retry Logout.'); }
      finally { busy.current = false; if (mounted.current) setPending(null); }
    }

    Alert.alert('Logout', 'Sign out of the vendor app?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          void logoutAndGoToSplash();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Settings</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          <Text style={{ color: c.muted, marginBottom: 12 }}>Branch: {branches.activeBranch?.name ?? 'Not selected'}. Initial values are device drafts, not refreshed server settings.</Text>
          {!canWrite && <Text accessibilityRole="alert" style={{ color: c.muted, marginBottom: 12 }}>
            {branches.loading || claimsLoading ? 'Checking branch access...' : 'Branch changes require owner, admin or manager access and an available branch.'}
          </Text>}
          {branches.error && <Pressable accessibilityRole="button" style={s.retryBtn} onPress={branches.retry}>
            <Text style={{ color: c.primary }}>Retry branch access</Text>
          </Pressable>}
          {!!error && <Text accessibilityRole="alert" style={{ color: c.danger, marginBottom: 12 }}>{error}</Text>}
          {!!retryAction && <Pressable accessibilityRole="button" disabled={!!pending || !canWrite}
            accessibilityState={{ disabled: !!pending || !canWrite }} style={s.retryBtn}
            onPress={() => retryAction === 'hours' ? void handleSaveHours() : handleVacationToggle()}>
            <Text style={{ color: c.primary }}>Retry {retryAction === 'hours' ? 'hours' : 'vacation mode'}</Text>
          </Pressable>}
          {/* Business profile */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Business Profile</Text>
            <View style={s.profileRow}>
              <View style={[s.profileAvatar, { backgroundColor: c.primaryLight }]}>
                <Text style={[s.profileInitials, { color: c.primary }]}>
                  {profile.businessName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.businessName, { color: c.text }]}>{profile.businessName}</Text>
                <Text style={[s.ownerName, { color: c.textSecondary }]}>{profile.ownerName}</Text>
                <View style={s.verifiedRow}>
                  {profile.verified && (
                    <View style={[s.verifiedBadge, { backgroundColor: '#22C55E20' }]}>
                      <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                      <Text style={[s.verifiedText, { color: '#22C55E' }]}>Device verification flag</Text>
                    </View>
                  )}
                  <Text style={[s.kycStatus, { color: c.muted }]}>Device KYC: {profile.kyc.status}</Text>
                </View>
              </View>
              {role !== 'customer' && role !== 'master_admin' && canPerform(role, 'business.submitKyc') && <Pressable
                style={[s.editBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                onPress={() => router.push('/vendor/kyc' as never)}
                accessible accessibilityRole="button" accessibilityLabel="Open business verification"
              >
                <Ionicons name="create-outline" size={16} color={c.textSecondary} />
              </Pressable>}
            </View>
          </View>

          {/* Vacation mode */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.switchRow}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={[s.switchTitle, { color: c.text }]}>Vacation Mode</Text>
                <Text style={[s.switchSub, { color: c.muted }]}>
                  {pending === 'vacation' ? 'Waiting for server confirmation...' : 'Current branch setting'}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Vacation Mode" disabled={!!pending || !canWrite}
                accessibilityState={{ disabled: !!pending || !canWrite, busy: pending === 'vacation' }}
                value={vacationMode}
                onValueChange={handleVacationToggle}
                trackColor={{ true: c.warning, false: c.surfaceAlt }}
                thumbColor="#fff"
              />
            </View>
            {vacationMode && (
              <View style={[s.vacationAlert, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
                <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                <Text style={[s.vacationAlertText, { color: '#F59E0B' }]}>
                  Vacation mode is ON for this branch.
                </Text>
              </View>
          )}
          </View>

          {/* Appearance */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Appearance</Text>
            <View style={s.switchRow}>
              <View style={[s.settingIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name={themeMode === 'light' ? 'sunny' : 'moon'} size={18} color={c.primary} />
              </View>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={[s.switchTitle, { color: c.text }]}>Light Theme</Text>
                <Text style={[s.switchSub, { color: c.muted }]}>
                  Switch the vendor app between light and dark appearance
                </Text>
              </View>
              <Switch
                accessibilityLabel="Light Theme"
                value={themeMode === 'light'}
                onValueChange={(enabled) => setThemeMode(enabled ? 'light' : 'dark')}
                trackColor={{ true: c.primary, false: c.surfaceAlt }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Working hours */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Working Hours</Text>
            <View style={s.hoursRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[s.fieldLabel, { color: c.muted }]}>Open</Text>
                <TextInput
                  accessibilityLabel="Opening time" editable={!pending && canWrite} maxLength={5}
                  style={[s.timeInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                  value={openTime}
                  onChangeText={setOpenTime}
                  placeholder="08:00"
                  placeholderTextColor={c.muted}
                />
              </View>
              <Text style={[s.timeSep, { color: c.muted }]}>–</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[s.fieldLabel, { color: c.muted }]}>Close</Text>
                <TextInput
                  accessibilityLabel="Closing time" editable={!pending && canWrite} maxLength={5}
                  style={[s.timeInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                  value={closeTime}
                  onChangeText={setCloseTime}
                  placeholder="20:00"
                  placeholderTextColor={c.muted}
                />
              </View>
            </View>
            <Text style={[s.fieldLabel, { color: c.muted }]}>Work Days</Text>
            <View style={s.daysRow}>
              {WORK_DAYS.map((day) => {
                const active = workDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="checkbox" accessibilityLabel={day} accessibilityState={{ checked: active, disabled: !!pending || !canWrite }}
                    disabled={!!pending || !canWrite}
                    style={[s.dayBtn, { backgroundColor: active ? c.primary : c.surfaceAlt, borderColor: active ? c.primary : c.border }]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[s.dayBtnText, { color: active ? '#fff' : c.muted }]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Notifications */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Notifications</Text>
            <Text style={{ color: c.muted }}>Device-local preferences only. These do not change push delivery or system notification permission.</Text>
            {[
              { key: 'newBooking' as const, label: 'New Booking', icon: 'calendar-outline' as const },
              { key: 'bookingReminder' as const, label: 'Booking Reminder', icon: 'time-outline' as const },
              { key: 'paymentReceived' as const, label: 'Payment Received', icon: 'cash-outline' as const },
              { key: 'reviewReceived' as const, label: 'Review Received', icon: 'star-outline' as const },
            ].map((notif) => (
              <View key={notif.key} style={[s.notifRow, { borderColor: c.border }]}>
                <Ionicons name={notif.icon} size={18} color={c.textSecondary} />
                <Text style={[s.notifLabel, { color: c.text }]}>{notif.label}</Text>
                <Switch
                  accessibilityLabel={notif.label}
                  value={profile.notifications[notif.key]}
                  onValueChange={(val) => {
                    try { updateProfile({ notifications: { ...profile.notifications, [notif.key]: val } }); }
                    catch { setError('Notification draft was not changed. Please try again.'); }
                  }}
                  trackColor={{ true: c.primary, false: c.surfaceAlt }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          {/* Navigation shortcuts */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>More</Text>
            {[
              { label: 'KYC & Verification', icon: 'shield-checkmark-outline' as const, route: '/vendor/kyc', allowed: role !== 'customer' && role !== 'master_admin' && canPerform(role, 'business.submitKyc') },
              { label: 'Payouts & Banking', icon: 'card-outline' as const, route: '/vendor/payouts', allowed: role !== 'customer' && role !== 'master_admin' && canAccess(role, 'payouts') },
              { label: 'Promotions', icon: 'pricetag-outline' as const, route: '/vendor/promotions', allowed: role !== 'customer' && role !== 'master_admin' && canAccess(role, 'promotions') },
            ].filter((item) => item.allowed).map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button" accessibilityLabel={item.label}
                style={[s.menuRow, { borderColor: c.border }]}
                onPress={() => router.push(item.route as never)}
              >
                <View style={[s.menuIcon, { backgroundColor: c.surfaceAlt }]}>
                  <Ionicons name={item.icon} size={18} color={c.textSecondary} />
                </View>
                <Text style={[s.menuLabel, { color: c.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={c.muted} />
              </Pressable>
            ))}
          </View>

          {/* Save */}
          <Pressable
            accessibilityRole="button" disabled={!!pending || !canWrite}
            accessibilityState={{ disabled: !!pending || !canWrite, busy: pending === 'hours' }}
            style={[s.saveBtn, { backgroundColor: c.primary }]}
            onPress={() => void handleSaveHours()}
          >
            <Text style={s.saveBtnText}>{pending === 'hours' ? 'Saving hours...' : 'Save Working Hours'}</Text>
          </Pressable>

          <Pressable
            style={[s.logoutBtn, { backgroundColor: c.dangerBg, borderColor: c.danger }]}
            onPress={handleLogout}
            disabled={!!pending} accessibilityState={{ disabled: !!pending, busy: pending === 'logout' }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Logout from vendor app"
          >
            <Ionicons name="log-out-outline" size={18} color={c.danger} />
            <Text style={[s.logoutText, { color: c.danger }]}>Logout</Text>
          </Pressable>
        </MotionScreen>
      </ScrollView>
      </KeyboardAvoidingView>
      <VendorTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    paddingHorizontal: spacing.page, 
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navTitle: { ...typography.h3 },

  content: { padding: spacing.page, gap: spacing.gap },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { fontSize: 18, fontWeight: '900' },
  businessName: { ...typography.h4 },
  ownerName: { fontSize: 13, fontWeight: '600' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
  },
  verifiedText: { fontSize: 12, fontWeight: '800' },
  kycStatus: { fontSize: 12, fontWeight: '600' },
  editBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  retryBtn: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  switchTitle: { fontSize: 14, fontWeight: '700' },
  switchSub: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  vacationAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.lg, borderWidth: 1, padding: 10,
  },
  vacationAlertText: { fontSize: 12, fontWeight: '700', flex: 1 },

  hoursRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700' },
  timeInput: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 44, fontSize: 15, fontWeight: '700' },
  timeSep: { fontSize: 18, fontWeight: '300', paddingBottom: 10 },
  daysRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  dayBtn: { minHeight: 44, minWidth: 48, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayBtnText: { fontSize: 12, fontWeight: '700' },

  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifLabel: { flex: 1, fontSize: 14, fontWeight: '600' },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600' },

  saveBtn: { height: 52, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', ...shadow.primary },
  saveBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  logoutBtn: {
    minHeight: 52,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '900' },
});
