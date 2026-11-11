import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useVendorTabBottom } from '@/components/VendorTabBar';
import { useAuthContext } from '@/lib/AuthContext';
import { canAccess } from '@/lib/permissions';

export default function StaffScreen() {
  const c = useQarColors();
  const { role: vendorRole, claimsLoading } = useAuthContext();
  const canRead = !claimsLoading && !!vendorRole && vendorRole !== 'customer' && vendorRole !== 'master_admin' && canAccess(vendorRole, 'staff');
  const canWrite = canRead && canAccess(vendorRole, 'staff', 'write');
  const vendorTabBottom = useVendorTabBottom();
  const staff = useQarWheelStore((s) => s.vendorStaff);
  const vendorBookings = useQarWheelStore((s) => s.vendorBookings);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const addStaff = useQarWheelStore((s) => s.addVendorStaff);

  function handleAdd() {
    if (!canWrite) return;
    if (submitted.current) return;
    if (!name.trim() || !role.trim()) {
      setError('Name and role are required.');
      return;
    }
    const normalizedPhone = phone.replace(/[\s()-]/g, '');
    if (phone.trim() && !/^\+?\d{7,15}$/.test(normalizedPhone)) {
      setError('Enter a valid phone number, or leave it blank.'); return;
    }
    submitted.current = true;
    try {
      addStaff({
        name: name.trim(),
        role: role.trim(),
        phone: normalizedPhone,
        specialty: specialty.trim() || 'General',
        assignedBookings: 0,
        available: true,
        rating: 0,
        joinedDate: new Date().toLocaleDateString('en-QA', { month: 'short', year: 'numeric' }),
        avatarInitials: name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        color: '#3B82F6',
      });
      setName(''); setRole(''); setPhone(''); setSpecialty('');
      setShowAdd(false);
      setError('');
    } catch { submitted.current = false; setError('Draft was not added. Your entries are still here; please try again.'); }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Staff</Text>
        {canWrite && <Pressable
          style={[s.addBtn, { backgroundColor: c.primary }]}
          accessibilityRole="button" accessibilityLabel={showAdd ? 'Cancel staff draft' : 'Add staff draft'} accessibilityState={{ expanded: showAdd }}
          onPress={() => { submitted.current = false; setError(''); setShowAdd(!showAdd); }}
        >
          <Ionicons name={showAdd ? 'close' : 'add'} size={18} color="#fff" />
          <Text style={s.addBtnText}>{showAdd ? 'Cancel' : 'Add'}</Text>
        </Pressable>}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {!canRead ? <Text accessibilityRole="alert" style={{ color: c.muted }}>{claimsLoading ? 'Checking staff access...' : 'Staff is unavailable for your role.'}</Text> : <>
          <Text style={{ color: c.muted, marginBottom: 12 }}>Device-local staff drafts. No invitation is sent, no account or access is created, and roles are not server permissions.</Text>
          {/* Add form */}
          {showAdd && canWrite && (
            <View style={[s.addForm, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.formTitle, { color: c.text }]}>New Team Member Draft</Text>
              {[
                { label: 'Full name *', value: name, setter: setName, placeholder: 'e.g. Ali Hassan' },
                { label: 'Role *', value: role, setter: setRole, placeholder: 'e.g. Senior Mechanic' },
                { label: 'Phone', value: phone, setter: setPhone, placeholder: '+974 5500 0000' },
                { label: 'Specialty', value: specialty, setter: setSpecialty, placeholder: 'e.g. AC Systems' },
              ].map((f) => (
                <View key={f.label} style={{ gap: 4 }}>
                  <Text style={[s.fieldLabel, { color: c.textSecondary }]}>{f.label}</Text>
                  <TextInput
                    style={[s.fieldInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                    value={f.value}
                    accessibilityLabel={f.label}
                    maxLength={f.label === 'Phone' ? 30 : 200}
                    keyboardType={f.label === 'Phone' ? 'phone-pad' : 'default'}
                    onChangeText={f.setter}
                    placeholder={f.placeholder}
                    placeholderTextColor={c.muted}
                  />
                </View>
              ))}
              {!!error && <Text accessibilityRole="alert" style={{ color: c.danger }}>{error}</Text>}
              <Pressable accessibilityRole="button" style={[s.saveBtn, { backgroundColor: c.primary }]} onPress={handleAdd}>
                <Text style={s.saveBtnText}>Add Team Member Draft</Text>
              </Pressable>
            </View>
          )}

          {/* Staff list */}
          {staff.length === 0 && <Text style={{ color: c.muted }}>No staff drafts</Text>}
          <View style={{ gap: 10 }}>
            {staff.map((member) => {
              const assigned = vendorBookings.filter((b) => b.staffId === member.id && b.status !== 'Completed' && b.status !== 'Cancelled').length;
              return (
                <View key={member.id} style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={s.cardTop}>
                    <View style={[s.avatar, { backgroundColor: `${member.color}25` }]}>
                      <Text style={[s.avatarText, { color: member.color }]}>{member.avatarInitials}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.memberName, { color: c.text }]}>{member.name}</Text>
                      <Text style={[s.memberRole, { color: c.textSecondary }]}>{member.role} (draft)</Text>
                      <Text style={[s.memberSpecialty, { color: c.muted }]}>{member.specialty}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[s.statusDot, { backgroundColor: member.available ? '#22C55E' : '#F59E0B' }]}>
                        <Text style={s.availText}>{member.available ? 'Draft: available' : 'Draft: busy'}</Text>
                      </View>
                      <View style={s.ratingRow}>
                        {member.rating > 0 ? (
                          <>
                            <Ionicons name="star" size={11} color="#D4AF37" />
                            <Text style={[s.ratingText, { color: c.text }]}>{member.rating}</Text>
                          </>
                        ) : (
                          <Text style={[s.ratingText, { color: c.muted }]}>Unrated</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={[s.cardFooter, { borderTopColor: c.border }]}>
                    <View style={[s.statChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                      <Ionicons name="calendar-outline" size={12} color={c.muted} />
                      <Text style={[s.statChipText, { color: c.textSecondary }]}>{assigned} local active</Text>
                    </View>
                    <View style={[s.statChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                      <Ionicons name="call-outline" size={12} color={c.muted} />
                      <Text style={[s.statChipText, { color: c.textSecondary }]}>{member.phone || 'No phone'}</Text>
                    </View>
                    <Text style={[s.joinedText, { color: c.muted }]}>Since {member.joinedDate}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          </>}
        </MotionScreen>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page, 
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navTitle: { ...typography.h3 },
  addBtn: {
    minHeight: 44,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  content: { padding: spacing.page, gap: spacing.gap },

  addForm: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.sm },
  formTitle: { ...typography.h4 },
  fieldLabel: { fontSize: 12, fontWeight: '700' },
  fieldInput: {
    borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 44,
    fontSize: 14,
  },
  saveBtn: { height: 46, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },

  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900' },
  memberName: { ...typography.h4 },
  memberRole: { fontSize: 13, fontWeight: '600' },
  memberSpecialty: { fontSize: 12, fontWeight: '500' },
  statusDot: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  availText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '800' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1,
  },
  statChipText: { fontSize: 12, fontWeight: '600' },
  joinedText: { fontSize: 12, fontWeight: '500', marginStart: 'auto' },
});
