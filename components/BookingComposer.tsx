import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot, query } from 'firebase/firestore';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { useAuthContext } from '@/lib/AuthContext';
import { createBooking as createFirestoreBooking, type FirestoreCar, useVendors } from '@/lib/firestoreOps';
import { firestore } from '@/lib/firebase';
import { cars } from '@/lib/marketplace';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { success, tap } from '@/lib/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

type SelectableCar = {
  id: string;
  name: string;
  meta: string;
  source: 'seed' | 'firestore';
};

type AddOn = {
  id: string;
  title: string;
  description: string;
  price: number;
  icon: IconName;
};

const addOns: AddOn[] = [
  { id: 'pickup', title: 'Pickup coordination', description: 'Garage calls before driver dispatch.', price: 25, icon: 'car-outline' },
  { id: 'wash', title: 'Exterior wash', description: 'Quick wash before return.', price: 35, icon: 'water-outline' },
  { id: 'report', title: 'Digital health report', description: 'Photos, checks, and recommendations.', price: 45, icon: 'document-text-outline' },
  { id: 'priority', title: 'Priority handling', description: 'Move this booking into the express lane.', price: 60, icon: 'flash-outline' },
];

const timeSlots = ['08:30 AM', '10:00 AM', '11:30 AM', '01:00 PM', '03:30 PM', '05:00 PM'];
const paymentMethods = ['Pay at garage', 'Card ending 4242', 'QarWheels wallet'];
const bookingSteps = ['Vehicle', 'Service', 'Schedule', 'Review'];

function route(path: string) {
  return path as never;
}

function currency(amount: number) {
  return `QAR ${amount}`;
}

function nextDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      id: date.toISOString().slice(0, 10),
      label: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString('en-QA', { weekday: 'short' }),
      day: date.toLocaleDateString('en-QA', { day: '2-digit' }),
      month: date.toLocaleDateString('en-QA', { month: 'short' }),
      iso: date.toISOString(),
    };
  });
}

function priceFromLabel(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 120;
}

function serviceIcon(serviceId: string): IconName {
  if (serviceId.includes('brake')) return 'disc-outline';
  if (serviceId.includes('ac')) return 'snow-outline';
  if (serviceId.includes('battery')) return 'battery-charging-outline';
  if (serviceId.includes('oil')) return 'water-outline';
  return 'construct-outline';
}

function paymentIcon(method: string): IconName {
  if (method.includes('Card')) return 'card-outline';
  if (method.includes('wallet')) return 'wallet-outline';
  return 'cash-outline';
}

export default function BookingComposer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useQarColors();
  const { user } = useAuthContext();
  const createLocalBooking = useQarWheelsStore((s) => s.createBooking);
  const [firestoreCars, setFirestoreCars] = useState<FirestoreCar[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const days = useMemo(() => nextDays(), []);
  const { vendors: liveGarages, jobs: liveJobs, loading: vendorsLoading } = useVendors();

  const initialCarId = useMemo(() => {
    if (id && cars.some((car) => car.id === id)) return id;
    return cars[0]?.id ?? '';
  }, [id]);

  const [selectedGarageId, setSelectedGarageId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedCarId, setSelectedCarId] = useState(initialCarId);
  // True when id resolved to a specific garage or job — hides the full pickers
  const [fromContext, setFromContext] = useState(false);

  // Once vendors load, seed initial selection based on route param
  useEffect(() => {
    if (vendorsLoading || liveGarages.length === 0) return;
    if (!selectedGarageId) {
      const garageFromId = id ? liveGarages.find((g) => g.id === id) : undefined;
      const jobFromId = id ? liveJobs.find((j) => j.id === id) : undefined;
      const garageFromJob = jobFromId ? liveGarages.find((g) => g.id === jobFromId.garageId) : undefined;
      setSelectedGarageId((garageFromId ?? garageFromJob ?? liveGarages[0]).id);
      if (garageFromId || jobFromId) setFromContext(true);
    }
    if (!selectedServiceId) {
      const jobFromId = id ? liveJobs.find((j) => j.id === id) : undefined;
      setSelectedServiceId((jobFromId ?? liveJobs[0])?.id ?? '');
    }
  }, [id, liveGarages, liveJobs, vendorsLoading, selectedGarageId, selectedServiceId]);
  const [selectedDayId, setSelectedDayId] = useState(days[1]?.id ?? days[0].id);
  const [selectedTime, setSelectedTime] = useState(timeSlots[1]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(['report']);
  const [pickupEnabled, setPickupEnabled] = useState(id === 'emergency');
  const [dropoffEnabled, setDropoffEnabled] = useState(true);
  const [address, setAddress] = useState('West Bay, Doha');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState(paymentMethods[0]);

  useEffect(() => {
    if (!user) {
      setLoadingCars(false);
      return;
    }

    const q = query(collection(firestore, 'users', user.uid, 'cars'));
    return onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreCar, 'id'>) }));
        setFirestoreCars(docs);
        setLoadingCars(false);
        if (docs[0] && selectedCarId === initialCarId) {
          setSelectedCarId(docs[0].id);
        }
      },
      () => setLoadingCars(false),
    );
  }, [initialCarId, selectedCarId, user]);

  const selectableCars: SelectableCar[] = firestoreCars.length
    ? firestoreCars.map((car) => ({
        id: car.id,
        name: `${car.year} ${car.make} ${car.model}`,
        meta: `${car.licensePlate || 'No plate'} · ${car.currentMileage?.toLocaleString?.() ?? car.currentMileage ?? 0} km`,
        source: 'firestore',
      }))
    : cars.map((car) => ({
        id: car.id,
        name: car.name,
        meta: `${car.mileage} · ${car.nextService}`,
        source: 'seed',
      }));

  const selectedGarage = liveGarages.find((g) => g.id === selectedGarageId) ?? liveGarages[0];
  const selectedService = liveJobs.find((j) => j.id === selectedServiceId) ?? liveJobs[0];
  const selectedCar = selectableCars.find((car) => car.id === selectedCarId) ?? selectableCars[0];
  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0];
  const addOnTotal = addOns.filter((item) => selectedAddOns.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
  const servicePrice = selectedService ? priceFromLabel(selectedService.price) : 0;
  const logisticsTotal = (pickupEnabled ? 40 : 0) + (dropoffEnabled ? 40 : 0);
  const estimatedTotal = servicePrice + addOnTotal + logisticsTotal;
  const canSubmit = Boolean(selectedCar && selectedGarage && selectedService && selectedDay && selectedTime);

  function toggleAddOn(addOnId: string) {
    setSelectedAddOns((current) =>
      current.includes(addOnId) ? current.filter((item) => item !== addOnId) : [...current, addOnId],
    );
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    if (!selectedCar) {
      Alert.alert('Vehicle required', 'Choose a vehicle before confirming the booking.');
      return;
    }

    setSubmitting(true);
    const bookingDate = new Date(selectedDay.iso);
    const [time, period] = selectedTime.split(' ');
    const [rawHour, rawMinute] = time.split(':').map(Number);
    const hour = period === 'PM' && rawHour !== 12 ? rawHour + 12 : rawHour;
    bookingDate.setHours(hour, rawMinute, 0, 0);

    const localBooking = createLocalBooking({
      garage: selectedGarage?.name ?? '',
      garageId: selectedGarage?.id ?? '',
      service: selectedService?.title ?? '',
      serviceId: selectedService?.id ?? '',
      vehicle: selectedCar.name,
      vehicleId: selectedCar.id,
      vehiclePlate: selectedCar.meta.split(' · ')[0],
      date: `${selectedDay.label}, ${selectedTime}`,
      bookingDate: bookingDate.toISOString(),
      timeSlot: selectedTime,
      status: 'Pending',
      totalAmount: estimatedTotal,
      pickupEnabled,
      dropoffEnabled,
      address: pickupEnabled ? address : undefined,
      notes: notes.trim(),
      paymentMethod: payment,
      addOns: addOns.filter((item) => selectedAddOns.includes(item.id)).map((item) => item.title),
      serviceCategory: selectedGarage?.category ?? '',
    });

    try {
      if (user && selectedCar.source === 'firestore') {
        await createFirestoreBooking(user.uid, {
          vendorId: selectedGarage?.id ?? '',
          vendorName: selectedGarage?.name ?? '',
          carId: selectedCar.id,
          carName: selectedCar.name,
          serviceName: selectedService?.title ?? '',
          bookingDate: bookingDate.toISOString(),
          cost: estimatedTotal,
          notes: [
            notes.trim(),
            pickupEnabled ? `Pickup: ${address}` : '',
            dropoffEnabled ? 'Drop-off after service requested' : '',
            selectedAddOns.length ? `Add-ons: ${selectedAddOns.join(', ')}` : '',
            `Payment: ${payment}`,
          ].filter(Boolean).join('\n'),
        });
      }

      void success();
      router.replace(route(`/booking/${localBooking.id}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking could not be created.';
      Alert.alert('Booking saved locally', `${message}\n\nYour local booking summary is still available.`);
      router.replace(route(`/booking/${localBooking.id}`));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <AnimatedPressable style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.navTitle, { color: c.text }]}>Book service</Text>
        <AnimatedPressable style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push('/add-car' as never)} hitSlop={8}>
          <Ionicons name="add" size={20} color={c.primary} />
        </AnimatedPressable>
      </View>

      <ScrollView
        style={{ backgroundColor: c.background, paddingTop: 60 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <MotionScreen style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name={serviceIcon(selectedService?.id ?? '')} size={25} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={[styles.eyebrow, { color: c.primary }]}>Service booking</Text>
              <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{selectedService?.title ?? 'Select a service'}</Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]} numberOfLines={2}>
                {selectedGarage?.name ?? '…'} · {selectedGarage?.responseTime ?? ''} response · {selectedGarage?.warranty ?? ''}
              </Text>
            </View>
          </View>
          <View style={styles.stepRow}>
            {bookingSteps.map((step, index) => (
              <View key={step} style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: index < 3 ? c.primary : c.surfaceAlt, borderColor: index < 3 ? c.primary : c.border }]}>
                  <Text style={[styles.stepNumber, { color: index < 3 ? '#fff' : c.muted }]}>{index + 1}</Text>
                </View>
                <Text style={[styles.stepLabel, { color: c.textSecondary }]} numberOfLines={1}>{step}</Text>
              </View>
            ))}
          </View>
        </MotionScreen>

        <MotionSurface delay={60} style={[styles.summary, { backgroundColor: c.surface, borderColor: c.border }]}>
          <SummaryItem label="When" value={`${selectedDay.label}, ${selectedTime}`} c={c} icon="time-outline" />
          <SummaryItem label="Vehicle" value={selectedCar?.name ?? 'Select car'} c={c} icon="car-sport-outline" />
          <SummaryItem label="Estimate" value={currency(estimatedTotal)} c={c} icon="wallet-outline" highlight />
        </MotionSurface>

        {selectedGarage && (
          <MotionSurface delay={90} style={[styles.routeCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.routeIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="business-outline" size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.routeTitle, { color: c.text }]} numberOfLines={1}>{selectedGarage.name}</Text>
              <Text style={[styles.routeMeta, { color: c.textSecondary }]} numberOfLines={1}>
                {selectedGarage.area} · {selectedGarage.distanceKm} km · {selectedGarage.openNow ? 'Open now' : 'Closed'}
              </Text>
            </View>
            <View style={[styles.ratingPill, { backgroundColor: c.aiBg }]}>
              <Ionicons name="star" size={12} color={c.gold} />
              <Text style={[styles.ratingText, { color: c.gold }]}>{selectedGarage.rating}</Text>
            </View>
          </MotionSurface>
        )}

        {fromContext && selectedService && (
          <MotionSurface delay={105} style={[styles.routeCard, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
            <View style={[styles.routeIcon, { backgroundColor: c.primary }]}>
              <Ionicons name={serviceIcon(selectedService.id)} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.routeTitle, { color: c.text }]} numberOfLines={1}>{selectedService.title}</Text>
              <Text style={[styles.routeMeta, { color: c.textSecondary }]} numberOfLines={1}>
                {selectedService.duration ?? '45 min'} · {selectedService.warranty ?? 'Service warranty'}
              </Text>
            </View>
            <View style={[styles.ratingPill, { backgroundColor: c.primaryLight }]}>
              <Text style={[styles.ratingText, { color: c.primary }]}>{selectedService.price}</Text>
            </View>
          </MotionSurface>
        )}

        <Section title="Vehicle" subtitle={loadingCars ? 'Loading your garage...' : 'Choose the car that needs service'} icon="car-sport-outline" c={c}>
          {selectableCars.map((car) => (
            <OptionRow
              key={car.id}
              title={car.name}
              description={car.meta}
              icon="car-sport-outline"
              selected={selectedCarId === car.id}
              onPress={() => setSelectedCarId(car.id)}
              c={c}
            />
          ))}
          {!loadingCars && selectableCars.length === 0 ? (
            <AnimatedPressable style={[styles.emptyAction, { backgroundColor: c.primaryLight, borderColor: c.primary }]} onPress={() => router.push('/add-car' as never)}>
              <Ionicons name="add-circle-outline" size={18} color={c.primary} />
              <Text style={[styles.emptyActionText, { color: c.primary }]}>Add your first vehicle</Text>
            </AnimatedPressable>
          ) : null}
        </Section>

        {fromContext ? null : (
          <Section title="Garage" subtitle="Pick the provider for this booking" icon="business-outline" c={c}>
            {vendorsLoading
              ? <ActivityIndicator color={c.primary} style={{ marginVertical: 8 }} />
              : liveGarages.map((garage) => (
                  <OptionRow
                    key={garage.id}
                    title={garage.name}
                    description={`${garage.area} · ${garage.rating} rating · ${garage.responseTime} response`}
                    icon="business-outline"
                    selected={selectedGarageId === garage.id}
                    onPress={() => setSelectedGarageId(garage.id)}
                    c={c}
                  />
                ))
            }
          </Section>
        )}

        {fromContext ? null : (
          <Section title="Service type" subtitle="Select the main job" icon="construct-outline" c={c}>
            {vendorsLoading
              ? <ActivityIndicator color={c.primary} style={{ marginVertical: 8 }} />
              : (
                <View style={styles.serviceGrid}>
                  {liveJobs.map((job) => {
                    const selected = selectedServiceId === job.id;
                    return (
                      <AnimatedPressable
                        key={job.id}
                        style={[
                          styles.serviceCard,
                          { backgroundColor: selected ? c.primaryLight : c.surfaceAlt, borderColor: selected ? c.primary : c.border },
                        ]}
                        onPress={() => { void tap(); setSelectedServiceId(job.id); }}
                      >
                        <View style={styles.serviceTop}>
                          <Ionicons name={selected ? 'checkmark-circle' : serviceIcon(job.id)} size={20} color={selected ? c.primary : c.textSecondary} />
                          <Text style={[styles.servicePrice, { color: selected ? c.primary : c.text }]}>{job.price}</Text>
                        </View>
                        <View style={{ gap: 3 }}>
                          <Text style={[styles.serviceTitle, { color: c.text }]}>{job.title}</Text>
                          <Text style={[styles.serviceMeta, { color: c.textSecondary }]}>{job.duration ?? '45 min'} · {job.warranty ?? 'Service warranty'}</Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )
            }
          </Section>
        )}

        <Section title="Date and time" subtitle="Choose an available service slot" icon="calendar-outline" c={c}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
            {days.map((day) => {
              const selected = selectedDayId === day.id;
              return (
                <AnimatedPressable
                  key={day.id}
                  style={[styles.dayCard, { backgroundColor: selected ? c.primary : c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}
                  onPress={() => { void tap(); setSelectedDayId(day.id); }}
                >
                  <Text style={[styles.dayLabel, { color: selected ? '#fff' : c.textSecondary }]}>{day.label}</Text>
                  <Text style={[styles.dayNumber, { color: selected ? '#fff' : c.text }]}>{day.day}</Text>
                  <Text style={[styles.dayLabel, { color: selected ? 'rgba(255,255,255,0.78)' : c.muted }]}>{day.month}</Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
          <View style={styles.timeGrid}>
            {timeSlots.map((slot) => {
              const selected = selectedTime === slot;
              return (
                <AnimatedPressable
                  key={slot}
                  style={[styles.timeChip, { backgroundColor: selected ? c.primaryLight : c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}
                  onPress={() => { void tap(); setSelectedTime(slot); }}
                >
                  <Text style={[styles.timeText, { color: selected ? c.primary : c.text }]}>{slot}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </Section>

        <Section title="Pickup and drop-off" subtitle="Keep it optional, clear, and priced" icon="navigate-outline" c={c}>
          <ToggleRow title="Pickup from my location" description="+QAR 40 driver dispatch" value={pickupEnabled} onValueChange={setPickupEnabled} c={c} />
          {pickupEnabled ? (
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Pickup address"
              placeholderTextColor={c.muted}
              style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            />
          ) : null}
          <ToggleRow title="Drop-off after service" description="+QAR 40 return delivery" value={dropoffEnabled} onValueChange={setDropoffEnabled} c={c} />
        </Section>

        <Section title="Add-ons" subtitle="Enhance the booking without adding extra pages" icon="sparkles-outline" c={c}>
          {addOns.map((item) => {
            const selected = selectedAddOns.includes(item.id);
            return (
              <OptionRow
                key={item.id}
                title={`${item.title} · ${currency(item.price)}`}
                description={item.description}
                icon={item.icon}
                selected={selected}
                onPress={() => toggleAddOn(item.id)}
                c={c}
              />
            );
          })}
        </Section>

        <Section title="Notes and payment" subtitle="Capture context before confirmation" icon="card-outline" c={c}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe symptoms, noises, preferred parts, or garage instructions."
            placeholderTextColor={c.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.textArea, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
          />
          <View style={styles.paymentRow}>
            {paymentMethods.map((method) => {
              const selected = payment === method;
              return (
                <AnimatedPressable
                  key={method}
                  style={[styles.paymentChip, { backgroundColor: selected ? c.primaryLight : c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}
                  onPress={() => { void tap(); setPayment(method); }}
                >
                  <Ionicons name={paymentIcon(method)} size={15} color={selected ? c.primary : c.textSecondary} />
                  <Text style={[styles.paymentText, { color: selected ? c.primary : c.text }]}>{method}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </Section>

        <MotionSurface delay={120} style={[styles.totalCard, { backgroundColor: c.surface, borderColor: c.primaryMid }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Booking summary</Text>
          <PriceRow label={selectedService?.title ?? 'Service'} value={servicePrice} c={c} />
          <PriceRow label="Add-ons" value={addOnTotal} c={c} />
          <PriceRow label="Pickup / drop-off" value={logisticsTotal} c={c} />
          <View style={[styles.totalLine, { backgroundColor: c.border }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: c.text }]}>Estimated total</Text>
            <Text style={[styles.totalValue, { color: c.primary }]}>{currency(estimatedTotal)}</Text>
          </View>
        </MotionSurface>

        <AnimatedPressable
          style={[styles.confirmButton, { backgroundColor: canSubmit ? c.primary : c.muted, opacity: submitting ? 0.75 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          scaleValue={0.97}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Confirm booking request</Text>}
          {!submitting ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({ label, value, c, icon, highlight }: { label: string; value: string; c: ReturnType<typeof useQarColors>; icon: IconName; highlight?: boolean }) {
  return (
    <View style={styles.summaryItem}>
      <View style={[styles.summaryIcon, { backgroundColor: highlight ? c.primaryLight : c.surfaceAlt }]}>
        <Ionicons name={icon} size={15} color={highlight ? c.primary : c.textSecondary} />
      </View>
      <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: highlight ? c.primary : c.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Section({ title, subtitle, icon, children, c }: { title: string; subtitle: string; icon: IconName; children: React.ReactNode; c: ReturnType<typeof useQarColors> }) {
  return (
    <MotionSurface style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <Ionicons name={icon} size={18} color={c.primary} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.sectionSubtitle, { color: c.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </MotionSurface>
  );
}

function OptionRow({
  title,
  description,
  icon,
  selected,
  onPress,
  c,
}: {
  title: string;
  description: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <AnimatedPressable
      style={[styles.optionRow, { backgroundColor: selected ? c.primaryLight : c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}
      onPress={() => { void tap(); onPress(); }}
      scaleValue={0.98}
    >
      <View style={[styles.optionIcon, { backgroundColor: selected ? c.primary : c.surface }]}>
        <Ionicons name={icon} size={18} color={selected ? '#fff' : c.textSecondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.optionTitle, { color: c.text }]}>{title}</Text>
        <Text style={[styles.optionDescription, { color: c.textSecondary }]} numberOfLines={2}>{description}</Text>
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? c.primary : c.muted} />
    </AnimatedPressable>
  );
}

function ToggleRow({ title, description, value, onValueChange, c }: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <View style={[styles.toggleRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.optionTitle, { color: c.text }]}>{title}</Text>
        <Text style={[styles.optionDescription, { color: c.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(next) => { void tap(); onValueChange(next); }}
        trackColor={{ false: c.border, true: c.primaryMid }}
        thumbColor={value ? c.primary : c.muted}
      />
    </View>
  );
}

function PriceRow({ label, value, c }: { label: string; value: number; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.priceValue, { color: c.text }]}>{currency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.page,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.xs,
  },
  navTitle: { flex: 1, textAlign: 'center', ...typography.h4 },
  content: { padding: spacing.page, paddingBottom: 76, gap: 14 },
  hero: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    ...shadow.sm,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroIcon: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...typography.overline },
  title: { fontSize: 21, lineHeight: 26, fontWeight: '900' },
  subtitle: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  stepItem: { flex: 1, alignItems: 'center', gap: 6, minWidth: 0 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 11, fontWeight: '900' },
  stepLabel: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    ...shadow.xs,
  },
  summaryItem: { flex: 1, gap: 4, minWidth: 0, alignItems: 'center' },
  summaryIcon: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { ...typography.caption },
  summaryValue: { fontSize: 12, lineHeight: 15, fontWeight: '900', textAlign: 'center' },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 14,
    ...shadow.xs,
  },
  routeIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  routeTitle: { ...typography.h4 },
  routeMeta: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.full },
  ratingText: { fontSize: 12, fontWeight: '900' },
  section: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    ...shadow.xs,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  sectionIcon: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 17, lineHeight: 21, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 13,
    minHeight: 72,
  },
  optionIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  optionDescription: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  emptyAction: { minHeight: 50, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  emptyActionText: { ...typography.h4 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: { flexBasis: '48%', flexGrow: 1, minHeight: 132, borderRadius: radius.lg, borderWidth: 1, padding: 13, justifyContent: 'space-between' },
  serviceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  servicePrice: { ...typography.caption, fontWeight: '900' },
  serviceTitle: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  serviceMeta: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  dayRow: { gap: 10, paddingRight: spacing.page },
  dayCard: { width: 74, minHeight: 90, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayLabel: { ...typography.caption },
  dayNumber: { fontSize: 24, lineHeight: 28, fontWeight: '900' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { flexBasis: '31%', flexGrow: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeText: { ...typography.caption, fontWeight: '900' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: radius.lg, borderWidth: 1, padding: 14, minHeight: 70 },
  input: { minHeight: 50, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, ...typography.body },
  textArea: { minHeight: 112, borderRadius: radius.lg, borderWidth: 1, padding: 12, ...typography.body },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  paymentText: { ...typography.caption, fontWeight: '900' },
  totalCard: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 12, ...shadow.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  priceLabel: { flex: 1, ...typography.bodySm },
  priceValue: { ...typography.h4 },
  totalLine: { height: StyleSheet.hairlineWidth },
  totalLabel: { ...typography.h4 },
  totalValue: { ...typography.h2 },
  confirmButton: {
    minHeight: 58,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadow.primary,
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
