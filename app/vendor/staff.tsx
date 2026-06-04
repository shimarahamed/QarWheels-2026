import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelsStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useVendorTabBottom } from '@/components/VendorTabBar';

export default function StaffScreen() {
  const c = useQarColors();
  const vendorTabBottom = useVendorTabBottom();
  const router = useRouter();
  const staff = useQarWheelsStore((s) => s.vendorStaff);
  const vendorBookings = useQarWheelsStore((s) => s.vendorBookings);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const addStaff = useQarWheelsStore((s) => s.addVendorStaff);

  function handleAdd() {
    if (!name.trim() || !role.trim()) {
      Alert.alert('Missing info', 'Name and role are required.');
      return;
    }
    addStaff({
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim(),
      specialty: specialty.trim() || 'General',
      assignedBookings: 0,
      available: true,
      rating: 0,
      joinedDate: 'Jun 2026',
      avatarInitials: name.trim().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
      color: '#3B82F6',
    });
    setName(''); setRole(''); setPhone(''); setSpecialty('');
    setShowAdd(false);
    Alert.alert('Added', `${name} added to your team.`);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Staff</Text>
        <Pressable
          style={[s.addBtn, { backgroundColor: c.primary }]}
          onPress={() => setShowAdd(!showAdd)}
        >
          <Ionicons name={showAdd ? 'close' : 'add'} size={18} color="#fff" />
          <Text style={s.addBtnText}>{showAdd ? 'Cancel' : 'Add'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Add form */}
          {showAdd && (
            <View style={[s.addForm, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.formTitle, { color: c.text }]}>New Team Member</Text>
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
                    onChangeText={f.setter}
                    placeholder={f.placeholder}
                    placeholderTextColor={c.muted}
                  />
                </View>
              ))}
              <Pressable style={[s.saveBtn, { backgroundColor: c.primary }]} onPress={handleAdd}>
                <Text style={s.saveBtnText}>Add Team Member</Text>
              </Pressable>
            </View>
          )}

          {/* Staff list */}
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
                      <Text style={[s.memberRole, { color: c.textSecondary }]}>{member.role}</Text>
                      <Text style={[s.memberSpecialty, { color: c.muted }]}>{member.specialty}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[s.statusDot, { backgroundColor: member.available ? '#22C55E' : '#F59E0B' }]}>
                        <Text style={s.availText}>{member.available ? 'Available' : 'Busy'}</Text>
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
                      <Text style={[s.statChipText, { color: c.textSecondary }]}>{assigned} active</Text>
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
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { ...typography.h3 },
  addBtn: {
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
  availText: { fontSize: 10, fontWeight: '800', color: '#fff' },
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
  statChipText: { fontSize: 11, fontWeight: '600' },
  joinedText: { fontSize: 11, fontWeight: '500', marginLeft: 'auto' },
});
