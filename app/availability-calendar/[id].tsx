import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

// ─── Slot generation ─────────────────────────────────────────────────────────

function generateDays(count = 14) {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

const SLOT_HOURS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

// Deterministically mark a few slots as unavailable (simulates real data).
// In production this would come from a Firestore `slots/{garageId}/{date}` doc.
function getUnavailableSlots(date: Date, garageId: string): Set<string> {
  const seed = date.getDate() + date.getMonth() + garageId.charCodeAt(0);
  const blocked = new Set<string>();
  if (seed % 3 === 0) blocked.add('09:00');
  if (seed % 4 === 1) blocked.add('10:00');
  if (seed % 5 === 2) { blocked.add('14:00'); blocked.add('15:00'); }
  if (seed % 7 === 3) blocked.add('17:00');
  return blocked;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(date: Date) {
  return `${DAY_LABELS[date.getDay()]}, ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

export default function AvailabilityCalendarScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id: garageId } = useLocalSearchParams<{ id: string }>();
  const vendorProfile = useQarWheelsStore((s) => s.vendorProfile);

  const days = useMemo(() => generateDays(14), []);
  const today = days[0];

  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const unavailable = useMemo(
    () => getUnavailableSlots(selectedDay, garageId ?? 'g1'),
    [selectedDay, garageId],
  );

  function handleConfirm() {
    if (!selectedSlot) {
      Alert.alert('Select a time', 'Please tap a time slot to continue.');
      return;
    }
    const dateStr = selectedDay.toISOString();
    const displayDate = `${formatDate(selectedDay)}, ${selectedSlot}`;
    // Pass selected date + slot back to the booking composer
    router.back();
    // In a full booking flow, router.push with params would continue the journey.
    // Here we pop back with the selection encoded in the route.
    Alert.alert(
      'Slot selected',
      `${displayDate}\n\nReturn to complete your booking.`,
      [{ text: 'OK' }],
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text style={[s.navTitle, { color: c.text }]}>Pick a time slot</Text>
          <Text style={[s.navSub, { color: c.muted }]} numberOfLines={1}>
            {vendorProfile.businessName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Date strip */}
          <View style={[s.calCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.calHeader}>
              <Ionicons name="calendar-outline" size={16} color={c.primary} />
              <Text style={[s.calTitle, { color: c.text }]}>
                {MONTH_LABELS[selectedDay.getMonth()]} {selectedDay.getFullYear()}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.dayStrip}
            >
              {days.map((day, i) => {
                const isSelected = day.getTime() === selectedDay.getTime();
                const isToday = i === 0;
                const isWeekend = day.getDay() === 5 || day.getDay() === 6; // Fri/Sat
                return (
                  <Pressable
                    key={day.toISOString()}
                    style={[
                      s.dayChip,
                      {
                        backgroundColor: isSelected ? c.primary : c.surfaceAlt,
                        borderColor: isSelected ? c.primary : c.border,
                        opacity: isWeekend ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (isWeekend) return;
                      setSelectedDay(day);
                      setSelectedSlot(null);
                    }}
                  >
                    <Text style={[s.dayName, { color: isSelected ? 'rgba(255,255,255,0.75)' : c.muted }]}>
                      {DAY_LABELS[day.getDay()]}
                    </Text>
                    <Text style={[s.dayNum, { color: isSelected ? '#fff' : c.text }]}>
                      {day.getDate()}
                    </Text>
                    {isToday && (
                      <View style={[s.todayDot, { backgroundColor: isSelected ? '#fff' : c.primary }]} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Time slots */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.slotHeader}>
              <Text style={[s.sectionTitle, { color: c.text }]}>
                {formatDate(selectedDay)}
              </Text>
              <View style={[s.legendRow]}>
                <View style={[s.legendDot, { backgroundColor: c.primary }]} />
                <Text style={[s.legendText, { color: c.muted }]}>Available</Text>
                <View style={[s.legendDot, { backgroundColor: c.border }]} />
                <Text style={[s.legendText, { color: c.muted }]}>Taken</Text>
              </View>
            </View>

            <View style={s.slotsGrid}>
              {SLOT_HOURS.map((slot) => {
                const taken = unavailable.has(slot);
                const selected = selectedSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    disabled={taken}
                    style={[
                      s.slotChip,
                      {
                        backgroundColor: selected
                          ? c.primary
                          : taken
                            ? c.surfaceAlt
                            : c.surface,
                        borderColor: selected ? c.primary : taken ? c.border : c.border,
                        opacity: taken ? 0.45 : 1,
                      },
                    ]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={[s.slotText, { color: selected ? '#fff' : taken ? c.muted : c.text }]}>
                      {slot}
                    </Text>
                    {taken && (
                      <Text style={[s.slotTakenLabel, { color: c.muted }]}>Taken</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Operating hours note */}
          <View style={[s.noteCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={14} color={c.muted} />
            <Text style={[s.noteText, { color: c.muted }]}>
              Open {vendorProfile.openTime} – {vendorProfile.closeTime} ·{' '}
              {vendorProfile.workDays.join(', ')} · Slots are {vendorProfile.slotDurationMin} min each
            </Text>
          </View>

          {/* Confirm button */}
          <Pressable
            style={[s.confirmBtn, {
              backgroundColor: selectedSlot ? c.primary : c.surfaceAlt,
            }]}
            onPress={handleConfirm}
            disabled={!selectedSlot}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={selectedSlot ? '#fff' : c.muted} />
            <Text style={[s.confirmBtnText, { color: selectedSlot ? '#fff' : c.muted }]}>
              {selectedSlot
                ? `Confirm ${formatDate(selectedDay)} at ${selectedSlot}`
                : 'Select a time slot'}
            </Text>
          </Pressable>
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },
  navSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  calCard: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.sm },
  calHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calTitle: { ...typography.h4 },

  dayStrip: { gap: 8, paddingVertical: 4 },
  dayChip: {
    width: 52, borderRadius: radius.lg, borderWidth: 1,
    paddingVertical: 10, alignItems: 'center', gap: 4,
  },
  dayName: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dayNum: { fontSize: 17, fontWeight: '900' },
  todayDot: { width: 5, height: 5, borderRadius: 2.5 },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 16, ...shadow.xs },
  slotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.h4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600' },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    width: '30%', borderRadius: radius.lg, borderWidth: 1,
    paddingVertical: 12, alignItems: 'center', gap: 2, ...shadow.xs,
  },
  slotText: { fontSize: 15, fontWeight: '800' },
  slotTakenLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: radius.lg, borderWidth: 1, padding: 12,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17 },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '900' },
});
