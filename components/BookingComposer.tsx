import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, onSnapshot, query } from 'firebase/firestore';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionSurface, fadeEntering, motion, smoothLayout } from '@/lib/motion';
import { useAuthContext } from '@/lib/AuthContext';
import { createBooking as createFirestoreBooking, type FirestoreCar, useBranches } from '@/lib/firestoreOps';
import { firestore } from '@/lib/firebase';
import { cars } from '@/lib/marketplace';
import { useQarColors, useQarWheelStore } from '@/lib/store';
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

// Slots grouped by part of day. A flat grid of six times makes the user read
// every option; three bands let them jump to the half of the day they want.
const slotBands = [
  { id: 'morning', label: 'Morning', icon: 'sunny-outline' as IconName, slots: ['08:30 AM', '10:00 AM', '11:30 AM'] },
  { id: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline' as IconName, slots: ['01:00 PM', '03:30 PM'] },
  { id: 'evening', label: 'Evening', icon: 'moon-outline' as IconName, slots: ['05:00 PM', '07:00 PM'] },
];
const timeSlots = slotBands.flatMap((band) => band.slots);

// Payment is modelled as an id with a separate label. Branching on the
// display string is how "QarWheel wallet" silently stopped matching a
// `=== 'Wallet'` check: the wallet was never debited and every booking was
// invoiced as paid.
type PaymentMethodId = 'garage' | 'card' | 'wallet';

const paymentMethods: { id: PaymentMethodId; label: string; icon: IconName }[] = [
  { id: 'garage', label: 'Pay at garage', icon: 'cash-outline' },
  { id: 'card', label: 'Card ending 4242', icon: 'card-outline' },
  { id: 'wallet', label: 'QarWheel wallet', icon: 'wallet-outline' },
];

function paymentLabel(id: PaymentMethodId) {
  return paymentMethods.find((method) => method.id === id)?.label ?? id;
}
const bookingSteps = ['Vehicle', 'Service', 'Schedule', 'Review'];

// Maps each route that renders this composer onto its position in the flow,
// so the step indicator reflects real progress instead of a fixed value.
const stepBySegment: Record<string, number> = {
  'choose-vehicle': 0,
  'choose-date-time': 1,
  'add-ons': 1,
  'pickup-dropoff': 2,
  'booking-summary': 3,
  checkout: 3,
};

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

function paymentIcon(id: PaymentMethodId): IconName {
  return paymentMethods.find((method) => method.id === id)?.icon ?? 'cash-outline';
}

/** Which section of the form is currently open. Only one at a time. */
type PanelId = 'vehicle' | 'garage' | 'service' | 'schedule' | 'logistics' | 'extras' | 'payment' | null;

export default function BookingComposer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  // Which step of the flow this route represents (defaults to the last).
  const activeStep = useMemo(() => {
    for (const segment of segments) {
      const match = stepBySegment[segment as string];
      if (match !== undefined) return match;
    }
    return bookingSteps.length - 1;
  }, [segments]);
  const c = useQarColors();
  const { user } = useAuthContext();
  const createLocalBooking = useQarWheelStore((s) => s.createBooking);
  const walletBalance = useQarWheelStore((s) => s.walletBalance);
  const chargeWallet = useQarWheelStore((s) => s.chargeWallet);
  const addInvoice = useQarWheelStore((s) => s.addInvoice);
  const savedAddresses = useQarWheelStore((s) => s.addresses);
  const [reviewing, setReviewing] = useState(false);
  const [firestoreCars, setFirestoreCars] = useState<FirestoreCar[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const days = useMemo(() => nextDays(), []);
  const { vendors: liveGarages, jobs: liveJobs, loading: vendorsLoading } = useBranches();

  // The form opens collapsed: every choice already has a sensible default, so
  // the first thing the user sees is a short recap they can confirm, not eight
  // stacked pickers they have to scroll past.
  const [openPanel, setOpenPanel] = useState<PanelId>(null);

  function togglePanel(panel: Exclude<PanelId, null>) {
    void tap();
    setOpenPanel((current) => (current === panel ? null : panel));
  }

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
  // Prefill from the user's default saved address rather than a placeholder
  // that looked like real data.
  const [address, setAddress] = useState(() => {
    const preferred = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    return preferred ? [preferred.line, preferred.area].filter(Boolean).join(', ') : '';
  });
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<PaymentMethodId>('garage');

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
  const chosenAddOns = addOns.filter((item) => selectedAddOns.includes(item.id));
  const addOnTotal = chosenAddOns.reduce((sum, item) => sum + item.price, 0);
  const servicePrice = selectedService ? priceFromLabel(selectedService.price) : 0;
  const logisticsTotal = (pickupEnabled ? 40 : 0) + (dropoffEnabled ? 40 : 0);
  const estimatedTotal = servicePrice + addOnTotal + logisticsTotal;
  const canSubmit = Boolean(selectedCar && selectedGarage && selectedService && selectedDay && selectedTime);

  // ── Live total ──
  // The price is the one number the user is tracking while they toggle
  // options, and it lives in a bar pinned to the bottom of the screen. A short
  // pulse on change is what connects "I turned on drop-off" to "the number
  // moved" without the user having to hunt for it.
  const totalPulse = useSharedValue(1);
  const previousTotal = useRef(estimatedTotal);
  useEffect(() => {
    if (previousTotal.current !== estimatedTotal) {
      previousTotal.current = estimatedTotal;
      totalPulse.value = withSequence(
        withTiming(1.08, { duration: motion.fast / 2 }),
        withSpring(1, motion.pressOut),
      );
    }
  }, [estimatedTotal, totalPulse]);
  const totalAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: totalPulse.value }] }));

  function toggleAddOn(addOnId: string) {
    void tap();
    setSelectedAddOns((current) =>
      current.includes(addOnId) ? current.filter((item) => item !== addOnId) : [...current, addOnId],
    );
  }

  /**
   * Opens the review sheet. Nothing is written until the user confirms there —
   * a booking commits money and a garage slot, so it needs a deliberate second
   * step rather than firing straight off the primary button.
   */
  function handleReview() {
    if (!canSubmit || submitting) return;
    if (!selectedCar) {
      Alert.alert('Vehicle required', 'Choose a vehicle before confirming the booking.');
      return;
    }
    // Catch an unpayable wallet booking here, not after the slot is taken.
    if (payment === 'wallet' && walletBalance < estimatedTotal) {
      Alert.alert(
        'Not enough wallet balance',
        `This booking is QAR ${estimatedTotal.toFixed(2)} but your wallet holds QAR ${walletBalance.toFixed(2)}. Top up or pick another payment method.`,
        [
          { text: 'Change method', style: 'cancel' },
          { text: 'Top up', onPress: () => router.push('/wallet' as never) },
        ],
      );
      return;
    }

    void tap();
    setReviewing(true);
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    if (!selectedCar) {
      Alert.alert('Vehicle required', 'Choose a vehicle before confirming the booking.');
      return;
    }

    setReviewing(false);
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
      paymentMethod: paymentLabel(payment),
      addOns: chosenAddOns.map((item) => item.title),
      serviceCategory: selectedGarage?.category ?? '',
    });

    try {
      if (user && selectedCar.source === 'firestore') {
        await createFirestoreBooking(user.uid, {
          customerName: user.displayName ?? 'QarWheel Customer',
          customerEmail: user.email ?? '',
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
            `Payment: ${paymentLabel(payment)}`,
          ].filter(Boolean).join('\n'),
        });
      }

      // Record the money side so Wallet, Transactions and Invoices reflect a
      // booking that actually happened rather than static sample rows.
      // chargeWallet returns false when the balance moved between the
      // pre-flight check and here; that must not be invoiced as paid.
      let settled = true;
      if (payment === 'wallet') {
        settled = chargeWallet(
          estimatedTotal,
          `${selectedService?.title ?? 'Service'} · ${selectedGarage?.name ?? ''}`,
          localBooking.id,
        );
      }
      addInvoice({
        bookingId: localBooking.id,
        garage: selectedGarage?.name ?? '',
        service: selectedService?.title ?? 'Service',
        vehicle: selectedCar.name,
        amount: estimatedTotal,
        // Only money that actually moved counts as paid. Pay-at-garage is
        // settled in person, so it stays unpaid until the garage marks it.
        status: payment === 'card' || (payment === 'wallet' && settled) ? 'Paid' : 'Unpaid',
        method: paymentLabel(payment),
      });

      if (payment === 'wallet' && !settled) {
        Alert.alert(
          'Wallet charge failed',
          'Your booking was created, but the wallet could not be charged. Settle it from the booking or top up your wallet.',
        );
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

  const addOnSummary = chosenAddOns.length
    ? `${chosenAddOns.length} selected · ${currency(addOnTotal)}`
    : 'None';
  const logisticsSummary = pickupEnabled && dropoffEnabled
    ? `Pickup and drop-off · ${currency(logisticsTotal)}`
    : pickupEnabled
      ? `Pickup only · ${currency(logisticsTotal)}`
      : dropoffEnabled
        ? `Drop-off only · ${currency(logisticsTotal)}`
        : 'I will drive it in myself';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ──
          Title and progress live together so the rail reads as a property of
          the flow, not a decorative band floating below the chrome. */}
      <View style={[styles.header, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <View style={styles.headerRow}>
          <AnimatedPressable
            style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </AnimatedPressable>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.headerTitle, { color: c.text }]}>Book a service</Text>
            <Text style={[styles.headerStep, { color: c.textSecondary }]} numberOfLines={1}>
              Step {activeStep + 1} of {bookingSteps.length} · {bookingSteps[activeStep]}
            </Text>
          </View>
          <AnimatedPressable
            style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/add-car' as never)}
            hitSlop={8}
            accessibilityLabel="Add a vehicle"
          >
            <Ionicons name="add" size={20} color={c.primary} />
          </AnimatedPressable>
        </View>
        <ProgressRail step={activeStep} total={bookingSteps.length} c={c} />
      </View>

      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={[styles.content, { paddingBottom: 190 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ──
            One tinted card carrying what is being booked and where. Everything
            below it is a choice; this is the context. */}
        <MotionSurface style={[styles.hero, { backgroundColor: c.surface, borderColor: c.primaryMid }]}>
          <View style={[styles.heroGlow, { backgroundColor: c.primaryLight }]} pointerEvents="none" />
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: c.primary }]}>
              <Ionicons name={serviceIcon(selectedService?.id ?? '')} size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.eyebrow, { color: c.primary }]}>Service booking</Text>
              <Text style={[styles.heroTitle, { color: c.text }]} numberOfLines={2}>
                {selectedService?.title ?? 'Select a service'}
              </Text>
            </View>
          </View>

          {selectedGarage ? (
            <View style={[styles.heroGarage, { borderTopColor: c.border }]}>
              <Ionicons name="business" size={14} color={c.textSecondary} />
              <Text style={[styles.heroGarageName, { color: c.text }]} numberOfLines={1}>
                {selectedGarage.name}
              </Text>
              <View style={[styles.ratingPill, { backgroundColor: c.aiBg }]}>
                <Ionicons name="star" size={11} color={c.gold} />
                <Text style={[styles.ratingText, { color: c.gold }]}>{selectedGarage.rating}</Text>
              </View>
            </View>
          ) : null}

          {selectedGarage ? (
            <View style={styles.heroFacts}>
              <HeroFact icon="navigate-outline" value={`${selectedGarage.distanceKm} km`} label="Away" c={c} />
              <HeroFact icon="flash-outline" value={selectedGarage.responseTime} label="Response" c={c} />
              <HeroFact
                icon={selectedGarage.openNow ? 'checkmark-circle-outline' : 'time-outline'}
                value={selectedGarage.openNow ? 'Open' : 'Closed'}
                label="Right now"
                c={c}
                tone={selectedGarage.openNow ? c.success : c.warning}
              />
            </View>
          ) : null}
        </MotionSurface>

        {/* ── The form ──
            Every row states its current value and opens in place. The screen
            therefore starts as a readable recap and only grows where the user
            actually wants to change something. */}
        <MotionSurface delay={20} style={[styles.panelGroup, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Panel
            id="vehicle"
            icon="car-sport-outline"
            title="Vehicle"
            value={selectedCar?.name ?? (loadingCars ? 'Loading your garage…' : 'Select a car')}
            open={openPanel === 'vehicle'}
            onToggle={togglePanel}
            c={c}
          >
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
              <AnimatedPressable
                style={[styles.emptyAction, { backgroundColor: c.primaryLight, borderColor: c.primary }]}
                onPress={() => router.push('/add-car' as never)}
              >
                <Ionicons name="add-circle-outline" size={18} color={c.primary} />
                <Text style={[styles.emptyActionText, { color: c.primary }]}>Add your first vehicle</Text>
              </AnimatedPressable>
            ) : null}
          </Panel>

          {fromContext ? null : (
            <Panel
              id="garage"
              icon="business-outline"
              title="Garage"
              value={selectedGarage?.name ?? 'Choose a provider'}
              open={openPanel === 'garage'}
              onToggle={togglePanel}
              c={c}
            >
              {vendorsLoading ? (
                <ActivityIndicator color={c.primary} style={{ marginVertical: 8 }} />
              ) : (
                liveGarages.map((garage) => (
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
              )}
            </Panel>
          )}

          {fromContext ? null : (
            <Panel
              id="service"
              icon="construct-outline"
              title="Service"
              value={selectedService ? `${selectedService.title} · ${selectedService.price}` : 'Select the job'}
              open={openPanel === 'service'}
              onToggle={togglePanel}
              c={c}
            >
              {vendorsLoading ? (
                <ActivityIndicator color={c.primary} style={{ marginVertical: 8 }} />
              ) : (
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
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${job.title}, ${job.price}`}
                      >
                        <View style={styles.serviceTop}>
                          <Ionicons name={selected ? 'checkmark-circle' : serviceIcon(job.id)} size={20} color={selected ? c.primary : c.textSecondary} />
                          <Text style={[styles.servicePrice, { color: selected ? c.primary : c.text }]}>{job.price}</Text>
                        </View>
                        <View style={{ gap: 3 }}>
                          <Text style={[styles.serviceTitle, { color: c.text }]}>{job.title}</Text>
                          <Text style={[styles.serviceMeta, { color: c.textSecondary }]}>
                            {job.duration ?? '45 min'} · {job.warranty ?? 'Service warranty'}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )}
            </Panel>
          )}

          <Panel
            id="schedule"
            icon="calendar-outline"
            title="When"
            value={`${selectedDay.label}, ${selectedTime}`}
            open={openPanel === 'schedule'}
            onToggle={togglePanel}
            c={c}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {days.map((day) => {
                const selected = selectedDayId === day.id;
                return (
                  <AnimatedPressable
                    key={day.id}
                    style={[styles.dayCard, { backgroundColor: selected ? c.primary : c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}
                    onPress={() => { void tap(); setSelectedDayId(day.id); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${day.label} ${day.day} ${day.month}`}
                  >
                    <Text style={[styles.dayLabel, { color: selected ? 'rgba(255,255,255,0.86)' : c.textSecondary }]}>{day.label}</Text>
                    <Text style={[styles.dayNumber, { color: selected ? '#fff' : c.text }]}>{day.day}</Text>
                    <Text style={[styles.dayLabel, { color: selected ? 'rgba(255,255,255,0.78)' : c.muted }]}>{day.month}</Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {slotBands.map((band) => (
              <View key={band.id} style={styles.band}>
                <View style={styles.bandHeader}>
                  <Ionicons name={band.icon} size={14} color={c.muted} />
                  <Text style={[styles.bandLabel, { color: c.muted }]}>{band.label}</Text>
                </View>
                <View style={styles.timeGrid}>
                  {band.slots.map((slot) => {
                    const selected = selectedTime === slot;
                    return (
                      <AnimatedPressable
                        key={slot}
                        style={[styles.timeChip, { backgroundColor: selected ? c.primary : c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}
                        onPress={() => { void tap(); setSelectedTime(slot); }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${band.label} slot ${slot}`}
                      >
                        <Text style={[styles.timeText, { color: selected ? '#fff' : c.text }]}>{slot}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </Panel>

          <Panel
            id="logistics"
            icon="navigate-outline"
            title="Pickup"
            value={logisticsSummary}
            open={openPanel === 'logistics'}
            onToggle={togglePanel}
            c={c}
          >
            <ToggleRow title="Pickup from my location" description="+QAR 40 driver dispatch" value={pickupEnabled} onValueChange={setPickupEnabled} c={c} />
            {pickupEnabled ? (
              <>
                {/* Saved addresses first — typing a full address on a phone is
                    the slowest step in this flow. */}
                {savedAddresses.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addressRail}>
                    {savedAddresses.map((saved) => {
                      const full = [saved.line, saved.area].filter(Boolean).join(', ');
                      const active = address === full;
                      return (
                        <AnimatedPressable
                          key={saved.id}
                          style={[
                            styles.addressChip,
                            { backgroundColor: active ? c.primary : c.surfaceAlt, borderColor: active ? c.primary : c.border },
                          ]}
                          onPress={() => { void tap(); setAddress(full); }}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`Use ${saved.label} address`}
                        >
                          <Ionicons name="location" size={13} color={active ? '#fff' : c.textSecondary} />
                          <Text style={[styles.addressChipText, { color: active ? '#fff' : c.text }]}>{saved.label}</Text>
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                )}
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Pickup address"
                  placeholderTextColor={c.muted}
                  accessibilityLabel="Pickup address"
                  style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                />
              </>
            ) : null}
            <ToggleRow title="Drop-off after service" description="+QAR 40 return delivery" value={dropoffEnabled} onValueChange={setDropoffEnabled} c={c} />
          </Panel>

          <Panel
            id="extras"
            icon="sparkles-outline"
            title="Add-ons"
            value={addOnSummary}
            open={openPanel === 'extras'}
            onToggle={togglePanel}
            c={c}
          >
            {addOns.map((item) => (
              <OptionRow
                key={item.id}
                title={item.title}
                description={item.description}
                trailing={currency(item.price)}
                icon={item.icon}
                selected={selectedAddOns.includes(item.id)}
                onPress={() => toggleAddOn(item.id)}
                multi
                c={c}
              />
            ))}
          </Panel>

          <Panel
            id="payment"
            icon="card-outline"
            title="Payment"
            value={paymentLabel(payment)}
            open={openPanel === 'payment'}
            onToggle={togglePanel}
            last
            c={c}
          >
            <View style={styles.paymentRow}>
              {paymentMethods.map((method) => {
                const selected = payment === method.id;
                const shortfall = method.id === 'wallet' && walletBalance < estimatedTotal;
                return (
                  <AnimatedPressable
                    key={method.id}
                    style={[styles.paymentChip, { backgroundColor: selected ? c.primaryLight : c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}
                    onPress={() => { void tap(); setPayment(method.id); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={
                      shortfall
                        ? `Pay with ${method.label}. Balance QAR ${walletBalance}, not enough for this booking.`
                        : `Pay with ${method.label}`
                    }
                  >
                    <Ionicons name={method.icon} size={15} color={selected ? c.primary : c.textSecondary} />
                    <Text style={[styles.paymentText, { color: selected ? c.primary : c.text }]}>{method.label}</Text>
                    {/* Surface the shortfall on the chip, so the user is not
                        told about it only after tapping Review. */}
                    {shortfall ? <Ionicons name="alert-circle" size={14} color={c.warning} /> : null}
                  </AnimatedPressable>
                );
              })}
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Describe symptoms, noises, preferred parts, or garage instructions."
              placeholderTextColor={c.muted}
              accessibilityLabel="Notes for the garage"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[styles.textArea, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            />
          </Panel>
        </MotionSurface>

        {/* ── Ledger ──
            The bottom bar carries the total; this is where the total is
            explained. Keeping the two separate means the sticky bar can stay
            one line tall. */}
        <MotionSurface delay={40} style={[styles.ledger, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.ledgerTitle, { color: c.muted }]}>Price breakdown</Text>
          <PriceRow label={selectedService?.title ?? 'Service'} value={servicePrice} c={c} />
          {chosenAddOns.map((item) => (
            <PriceRow key={item.id} label={item.title} value={item.price} c={c} sub />
          ))}
          {pickupEnabled ? <PriceRow label="Pickup" value={40} c={c} sub /> : null}
          {dropoffEnabled ? <PriceRow label="Drop-off" value={40} c={c} sub /> : null}
          <View style={[styles.totalLine, { backgroundColor: c.border }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: c.text }]}>Estimated total</Text>
            <Text style={[styles.totalValue, { color: c.primary }]}>{currency(estimatedTotal)}</Text>
          </View>
          <Text style={[styles.ledgerNote, { color: c.muted }]}>
            The garage confirms the final price after inspection. You are not charged yet.
          </Text>
        </MotionSurface>
      </ScrollView>

      {/* ── Sticky action bar ──
          Total and the primary action stay on screen at every scroll position.
          A booking form where the user has to scroll to find out what it costs
          is a form people abandon. */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.actionTotals}>
          <Text style={[styles.actionLabel, { color: c.textSecondary }]}>Estimated total</Text>
          <Animated.Text style={[styles.actionTotal, { color: c.text }, totalAnimStyle]}>
            {currency(estimatedTotal)}
          </Animated.Text>
        </View>
        <AnimatedPressable
          style={[styles.confirmButton, { backgroundColor: canSubmit ? c.primary : c.muted, opacity: submitting ? 0.75 : 1 }]}
          onPress={handleReview}
          disabled={!canSubmit || submitting}
          scaleValue={0.97}
          accessibilityLabel={`Review booking, estimated total ${currency(estimatedTotal)}`}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Review</Text>}
          {!submitting ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
        </AnimatedPressable>
      </View>

      {/* ── Confirmation review ──
          The last chance to catch a wrong car, date or address before a slot
          is reserved and money moves. */}
      <Modal
        visible={reviewing}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!submitting) setReviewing(false); }}
      >
        <View style={styles.reviewBackdrop}>
          {/* Locked while the booking is in flight: dismissing here would
              leave the user unable to tell whether it went through. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { if (!submitting) setReviewing(false); }}
            disabled={submitting}
            accessibilityLabel="Dismiss review"
          />
          <View style={[styles.reviewSheet, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={[styles.reviewGrabber, { backgroundColor: c.border }]} />
            <Text style={[styles.reviewTitle, { color: c.text }]} accessibilityRole="header">Confirm your booking</Text>
            <Text style={[styles.reviewSubtitle, { color: c.textSecondary }]}>
              Check the details below. Nothing is booked until you confirm.
            </Text>

            <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
              <ReviewRow icon="car-sport-outline" label="Vehicle" value={selectedCar?.name ?? '—'} c={c} />
              <ReviewRow icon="construct-outline" label="Service" value={selectedService?.title ?? '—'} c={c} />
              <ReviewRow icon="business-outline" label="Garage" value={selectedGarage?.name ?? '—'} c={c} />
              <ReviewRow icon="calendar-outline" label="When" value={`${selectedDay.label}, ${selectedTime}`} c={c} />
              {chosenAddOns.length > 0 && (
                <ReviewRow
                  icon="add-circle-outline"
                  label="Add-ons"
                  value={chosenAddOns.map((a) => a.title).join(', ')}
                  c={c}
                />
              )}
              {pickupEnabled && <ReviewRow icon="location-outline" label="Pickup from" value={address} c={c} />}
              {dropoffEnabled && <ReviewRow icon="return-down-back-outline" label="Drop-off" value="After service" c={c} />}
              <ReviewRow
                icon={paymentIcon(payment)}
                label="Payment"
                value={paymentLabel(payment)}
                c={c}
                last={!notes.trim()}
              />
              {notes.trim() ? <ReviewRow icon="chatbox-outline" label="Notes" value={notes.trim()} c={c} last /> : null}

              {/* The total is itemised here too. Asking someone to confirm a
                  number they cannot check is how disputes start. */}
              <View style={[styles.reviewTotal, { backgroundColor: c.surfaceAlt, borderColor: c.primaryMid }]}>
                <PriceRow label={selectedService?.title ?? 'Service'} value={servicePrice} c={c} />
                {chosenAddOns.map((item) => (
                  <PriceRow key={item.id} label={item.title} value={item.price} c={c} sub />
                ))}
                {pickupEnabled ? <PriceRow label="Pickup" value={40} c={c} sub /> : null}
                {dropoffEnabled ? <PriceRow label="Drop-off" value={40} c={c} sub /> : null}
                <View style={[styles.totalLine, { backgroundColor: c.border }]} />
                <View style={styles.priceRow}>
                  <Text style={[styles.totalLabel, { color: c.text }]}>Estimated total</Text>
                  <Text style={[styles.reviewTotalValue, { color: c.primary }]}>{currency(estimatedTotal)}</Text>
                </View>
                <Text style={[styles.reviewTotalNote, { color: c.muted }]}>
                  {payment === 'wallet'
                    ? `Charged to your wallet now. Balance after booking: ${currency(Math.max(walletBalance - estimatedTotal, 0))}.`
                    : payment === 'garage'
                      ? 'You pay the garage directly when the work is done.'
                      : 'Final price is confirmed by the garage after inspection.'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.reviewActions}>
              <AnimatedPressable
                style={[styles.reviewBack, { borderColor: c.border, opacity: submitting ? 0.5 : 1 }]}
                onPress={() => setReviewing(false)}
                disabled={submitting}
                accessibilityLabel="Go back and edit"
              >
                <Text style={[styles.reviewBackText, { color: c.textSecondary }]} numberOfLines={1}>Edit</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.reviewConfirm, { backgroundColor: c.primary, opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityLabel={
                  submitting
                    ? 'Sending your booking request'
                    : `Confirm and send booking request, ${currency(estimatedTotal)}`
                }
              >
                {submitting
                  ? <><ActivityIndicator color="#fff" /><Text style={styles.confirmText} numberOfLines={1}>Booking…</Text></>
                  : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.confirmText} numberOfLines={1}>Confirm booking</Text></>}
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * A single filled track rather than four numbered dots. Numbered dots read as
 * decoration at this size; a track that fills reads as "how far through am I".
 */
function ProgressRail({ step, total, c }: { step: number; total: number; c: ReturnType<typeof useQarColors> }) {
  const progress = (step + 1) / total;
  return (
    <View
      style={[styles.rail, { backgroundColor: c.surfaceAlt }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
    >
      <View style={[styles.railFill, { backgroundColor: c.primary, width: `${progress * 100}%` }]} />
    </View>
  );
}

function HeroFact({ icon, value, label, c, tone }: {
  icon: IconName;
  value: string;
  label: string;
  c: ReturnType<typeof useQarColors>;
  tone?: string;
}) {
  return (
    <View style={styles.heroFact}>
      <Ionicons name={icon} size={14} color={tone ?? c.textSecondary} />
      <Text style={[styles.heroFactValue, { color: tone ?? c.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.heroFactLabel, { color: c.muted }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/**
 * A disclosure row: shows the chosen value, expands to the picker in place.
 * Collapsed, it is a summary line the user can read; expanded, it is the
 * control. That is what keeps the whole booking on one screen.
 */
function Panel({
  id,
  icon,
  title,
  value,
  open,
  onToggle,
  children,
  c,
  last,
}: {
  id: Exclude<PanelId, null>;
  icon: IconName;
  title: string;
  value: string;
  open: boolean;
  onToggle: (id: Exclude<PanelId, null>) => void;
  children: React.ReactNode;
  c: ReturnType<typeof useQarColors>;
  last?: boolean;
}) {
  return (
    <Animated.View
      layout={smoothLayout}
      style={[styles.panel, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
    >
      <AnimatedPressable
        style={styles.panelHeader}
        onPress={() => onToggle(id)}
        scaleValue={0.99}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}: ${value}. ${open ? 'Collapse' : 'Change'}`}
      >
        <View style={[styles.panelIcon, { backgroundColor: open ? c.primaryLight : c.surfaceAlt }]}>
          <Ionicons name={icon} size={17} color={open ? c.primary : c.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.panelTitle, { color: c.muted }]}>{title}</Text>
          <Text style={[styles.panelValue, { color: c.text }]} numberOfLines={1}>{value}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
      </AnimatedPressable>
      {open ? (
        <Animated.View entering={fadeEntering()} style={styles.panelBody}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function ReviewRow({ icon, label, value, c, last }: {
  icon: IconName;
  label: string;
  value: string;
  c: ReturnType<typeof useQarColors>;
  /** Drops the divider, so the list does not end on a dangling rule. */
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.reviewRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={16} color={c.muted} style={styles.reviewIcon} />
      <Text style={[styles.reviewLabel, { color: c.textSecondary }]}>{label}</Text>
      {/* This is the screen where a wrong address or a missed note costs a
          wasted garage visit, so nothing here is truncated. */}
      <Text style={[styles.reviewValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

function OptionRow({
  title,
  description,
  trailing,
  icon,
  selected,
  onPress,
  multi,
  c,
}: {
  title: string;
  description: string;
  /** Right-aligned value, e.g. a price — kept out of the title so it lines up. */
  trailing?: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  /** Checkbox semantics instead of radio, for multi-select lists. */
  multi?: boolean;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <AnimatedPressable
      style={[styles.optionRow, { backgroundColor: selected ? c.primaryLight : c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}
      onPress={() => { void tap(); onPress(); }}
      scaleValue={0.98}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={trailing ? `${title}, ${trailing}` : title}
    >
      <View style={[styles.optionIcon, { backgroundColor: selected ? c.primary : c.surface }]}>
        <Ionicons name={icon} size={18} color={selected ? '#fff' : c.textSecondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.optionTitle, { color: c.text }]}>{title}</Text>
        <Text style={[styles.optionDescription, { color: c.textSecondary }]} numberOfLines={2}>{description}</Text>
      </View>
      {trailing ? <Text style={[styles.optionTrailing, { color: selected ? c.primary : c.text }]}>{trailing}</Text> : null}
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
        accessibilityLabel={title}
        trackColor={{ false: c.border, true: c.primaryMid }}
        thumbColor={value ? c.primary : c.muted}
      />
    </View>
  );
}

function PriceRow({ label, value, c, sub }: {
  label: string;
  value: number;
  c: ReturnType<typeof useQarColors>;
  /** A component of a line above it, indented and lighter. */
  sub?: boolean;
}) {
  return (
    <View style={styles.priceRow}>
      <Text
        style={[
          sub ? styles.priceLabelSub : styles.priceLabel,
          { color: sub ? c.muted : c.textSecondary },
        ]}
        numberOfLines={1}
      >
        {sub ? `+ ${label}` : label}
      </Text>
      <Text style={[sub ? styles.priceValueSub : styles.priceValue, { color: sub ? c.textSecondary : c.text }]}>
        {currency(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.page,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitleBlock: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { ...typography.h4 },
  headerStep: { ...typography.caption },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.xs,
  },
  rail: { height: 4, borderRadius: 2, overflow: 'hidden' },
  railFill: { height: '100%', borderRadius: 2 },

  content: { padding: spacing.page, gap: 14 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    overflow: 'hidden',
    ...shadow.sm,
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    end: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroIcon: { width: 50, height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...typography.overline },
  heroTitle: { fontSize: 22, lineHeight: 27, fontWeight: '900', letterSpacing: -0.4 },
  heroGarage: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  heroGarageName: { flex: 1, ...typography.caption, fontWeight: '800' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  ratingText: { fontSize: 12, fontWeight: '900' },
  heroFacts: { flexDirection: 'row', gap: 8 },
  heroFact: { flex: 1, alignItems: 'center', gap: 3, minWidth: 0 },
  heroFactValue: { ...typography.caption, fontWeight: '900' },
  heroFactLabel: { ...typography.caption, fontSize: 12 },

  // ── Disclosure panels ─────────────────────────────────────────────────────
  panelGroup: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow.xs,
  },
  panel: { paddingHorizontal: 14 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  panelIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { ...typography.label },
  panelValue: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  panelBody: { gap: 10, paddingBottom: 16, paddingTop: 2 },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 13,
    minHeight: 68,
  },
  optionIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  optionDescription: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  optionTrailing: { ...typography.caption, fontWeight: '900', fontVariant: ['tabular-nums'] },
  emptyAction: { minHeight: 50, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  emptyActionText: { ...typography.h4 },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: { flexBasis: '47%', flexGrow: 1, minHeight: 128, borderRadius: radius.lg, borderWidth: 1, padding: 13, justifyContent: 'space-between' },
  serviceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  servicePrice: { ...typography.caption, fontWeight: '900' },
  serviceTitle: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  serviceMeta: { fontSize: 12, lineHeight: 15, fontWeight: '600' },

  dayRow: { gap: 10, paddingVertical: 2, paddingEnd: spacing.page },
  dayCard: { width: 72, minHeight: 88, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayLabel: { ...typography.caption },
  dayNumber: { fontSize: 24, lineHeight: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
  band: { gap: 8 },
  bandHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandLabel: { ...typography.label },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { flexBasis: '30%', flexGrow: 1, minHeight: 46, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  timeText: { ...typography.caption, fontWeight: '900', fontVariant: ['tabular-nums'] },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: radius.lg, borderWidth: 1, padding: 14, minHeight: 68 },
  input: { minHeight: 50, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, ...typography.body },
  textArea: { minHeight: 100, borderRadius: radius.lg, borderWidth: 1, padding: 12, ...typography.body },
  addressRail: { gap: 8, paddingVertical: 2 },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  addressChipText: { ...typography.caption, fontWeight: '800' },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  paymentText: { ...typography.caption, fontWeight: '900' },

  // ── Ledger ────────────────────────────────────────────────────────────────
  ledger: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 10, ...shadow.xs },
  ledgerTitle: { ...typography.label },
  ledgerNote: { ...typography.caption, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  priceLabel: { flex: 1, ...typography.bodySm, fontWeight: '600' },
  priceLabelSub: { flex: 1, ...typography.caption, paddingStart: 10 },
  priceValue: { ...typography.h4, fontVariant: ['tabular-nums'] },
  priceValueSub: { ...typography.caption, fontWeight: '800', fontVariant: ['tabular-nums'] },
  totalLine: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  totalLabel: { ...typography.h4 },
  totalValue: { ...typography.h2, fontVariant: ['tabular-nums'] },

  // ── Sticky action bar ─────────────────────────────────────────────────────
  actionBar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...shadow.lg,
  },
  actionTotals: { flex: 1, gap: 2, minWidth: 0 },
  actionLabel: { ...typography.caption },
  actionTotal: { fontSize: 22, lineHeight: 26, fontWeight: '900', fontVariant: ['tabular-nums'] },
  confirmButton: {
    minHeight: 54,
    minWidth: 148,
    paddingHorizontal: 22,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadow.primary,
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center' },

  // ── Confirmation review sheet ─────────────────────────────────────────────
  reviewBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  reviewSheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    paddingHorizontal: spacing.page,
    paddingTop: 10,
    gap: 6,
    maxHeight: '88%',
  },
  reviewGrabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 8 },
  reviewTitle: { ...typography.h2 },
  reviewSubtitle: { ...typography.bodySm, marginBottom: 6 },
  reviewScroll: { flexGrow: 0, flexShrink: 1 },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  // Nudged onto the baseline of the first line of text rather than the top of
  // the row box.
  reviewIcon: { marginTop: 2 },
  reviewLabel: { ...typography.bodySm, minWidth: 84, flexShrink: 0 },
  reviewValue: { ...typography.bodySm, fontWeight: '800', flex: 1, textAlign: 'right' },
  reviewTotal: {
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  reviewTotalLabel: { ...typography.caption, fontWeight: '800' },
  reviewTotalNote: { ...typography.caption, marginTop: 2 },
  reviewTotalValue: { ...typography.h2, fontVariant: ['tabular-nums'] },
  // `stretch` makes both buttons take the height of the taller one, so the
  // pair stays level when Confirm's label wraps or swaps to the spinner.
  reviewActions: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginTop: 14 },
  reviewBack: {
    flex: 1,
    height: 56,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBackText: { ...typography.h4, textAlign: 'center' },
  reviewConfirm: {
    flex: 2,
    height: 56,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the icon and label as one centred unit instead of letting the
    // label wrap to a second line and knock the row off the Edit button.
    paddingHorizontal: 12,
    gap: 8,
  },
});
