import Ionicons from '@expo/vector-icons/Ionicons';
import * as Crypto from 'expo-crypto';
import ErrorState from '@/components/ErrorState';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { RemoteImage } from '@/components/RemoteImage';
import { MotionSurface, fadeEntering, motion, smoothLayout } from '@/lib/motion';
import { useAuthContext } from '@/lib/AuthContext';
import { createBooking as createFirestoreBooking, type FirestoreCar, useBranches } from '@/lib/firestoreOps';
import { firestore } from '@/lib/firebase';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { success, tap } from '@/lib/haptics';
import { garageDistanceLabel } from '@/lib/marketplace-display';

type IconName = ComponentProps<typeof Ionicons>['name'];

type SelectableCar = {
  id: string;
  name: string;
  meta: string;
  source: 'firestore';
};

type AddOn = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
};

const addOns: AddOn[] = [
  { id: 'pickup', title: 'Pickup coordination', description: 'Ask the garage to call before dispatch.', icon: 'car-outline' },
  { id: 'wash', title: 'Exterior wash', description: 'Request a wash before return.', icon: 'water-outline' },
  { id: 'report', title: 'Digital health report', description: 'Request photos and recommendations.', icon: 'document-text-outline' },
  { id: 'priority', title: 'Priority handling', description: 'Ask whether an earlier slot is available.', icon: 'flash-outline' },
];

// Slots grouped by part of day. A flat grid of six times makes the user read
// every option; three bands let them jump to the half of the day they want.
const slotBands = [
  { id: 'morning', label: 'Morning', icon: 'sunny-outline' as IconName, slots: ['08:30 AM', '10:00 AM', '11:30 AM'] },
  { id: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline' as IconName, slots: ['01:00 PM', '03:30 PM'] },
  { id: 'evening', label: 'Evening', icon: 'moon-outline' as IconName, slots: ['05:00 PM', '07:00 PM'] },
];

// Payment is modelled as an id with a separate label. Branching on the
// display string is how "QarWheel wallet" silently stopped matching a
// `=== 'Wallet'` check: the wallet was never debited and every booking was
// invoiced as paid.
type PaymentMethodId = 'garage' | 'card' | 'wallet';

const paymentMethods: { id: PaymentMethodId; label: string; icon: IconName }[] = [
  { id: 'garage', label: 'Pay at garage', icon: 'cash-outline' },
];

function paymentLabel(id: PaymentMethodId) {
  return paymentMethods.find((method) => method.id === id)?.label ?? id;
}
function route(path: string) {
  return path as never;
}

function currency(amount: number) {
  return `QAR ${amount}`;
}

function nextDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const nowInQatar = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const date = new Date(Date.UTC(nowInQatar.getUTCFullYear(), nowInQatar.getUTCMonth(), nowInQatar.getUTCDate() + index));
    return {
      id: date.toISOString().slice(0, 10),
      label: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString('en-QA', { weekday: 'short', timeZone: 'UTC' }),
      day: date.toLocaleDateString('en-QA', { day: '2-digit', timeZone: 'UTC' }),
      month: date.toLocaleDateString('en-QA', { month: 'short', timeZone: 'UTC' }),
    };
  });
}

function preferredTimeUtc(dayId: string, slot: string) {
  const [time, period] = slot.split(' ');
  const [rawHour, minute] = time.split(':').map(Number);
  const hour = (rawHour % 12) + (period === 'PM' ? 12 : 0);
  return new Date(`${dayId}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`);
}

function isFutureSlot(dayId: string, slot: string) {
  return preferredTimeUtc(dayId, slot).getTime() > Date.now() + 60 * 60 * 1000;
}

function priceFromLabel(value: string) {
  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
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
type PanelId = 'vehicle' | 'garage' | 'service' | 'schedule' | 'logistics' | 'extras' | 'notes' | null;

export default function BookingComposer() {
  const router = useRouter();
  const { id, issue } = useLocalSearchParams<{ id: string; issue?: string }>();
  const insets = useSafeAreaInsets();
  const c = useQarColors();
  const { user } = useAuthContext();
  const userId = user?.uid;
  const createLocalBooking = useQarWheelStore((s) => s.createBooking);
  const savedAddresses = useQarWheelStore((s) => s.addresses);
  const [reviewing, setReviewing] = useState(false);
  const [firestoreCars, setFirestoreCars] = useState<FirestoreCar[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [carsError, setCarsError] = useState(false);
  const [carsRetry, setCarsRetry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const days = useMemo(() => nextDays(), []);
  const { vendors: liveGarages, jobs: liveJobs, loading: vendorsLoading, error: vendorsError, refresh: refreshVendors } = useBranches({ includeServices: true });

  // Choices start collapsed so the user can scan the request; service and
  // preferred time remain explicitly unselected until the customer chooses.
  const [openPanel, setOpenPanel] = useState<PanelId>(null);

  function togglePanel(panel: Exclude<PanelId, null>) {
    void tap();
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  const [selectedGarageId, setSelectedGarageId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedCarId, setSelectedCarId] = useState(id ?? '');
  // True when id resolved to a specific garage or job — hides the full pickers
  const [fromContext, setFromContext] = useState(false);

  // Only a garage or service deep link selects a workshop. A vehicle entry
  // point must not silently send the request to the first listed workshop.
  useEffect(() => {
    if (vendorsLoading || liveGarages.length === 0 || !id) return;
    if (!selectedGarageId) {
      const garageFromId = liveGarages.find((g) => g.id === id);
      const jobFromId = liveJobs.find((j) => j.id === id);
      const garageFromJob = jobFromId ? liveGarages.find((g) => g.id === jobFromId.garageId) : undefined;
      const matchedGarage = garageFromId ?? garageFromJob;
      if (matchedGarage) {
        setSelectedGarageId(matchedGarage.id);
        setFromContext(true);
      }
    }
    const jobFromId = id ? liveJobs.find((j) => j.id === id) : undefined;
    if (jobFromId && !selectedServiceId) setSelectedServiceId(jobFromId.id);
  }, [id, liveGarages, liveJobs, vendorsLoading, selectedGarageId, selectedServiceId]);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [pickupEnabled, setPickupEnabled] = useState(id === 'emergency');
  const [dropoffEnabled, setDropoffEnabled] = useState(false);
  // Prefill from the user's default saved address rather than a placeholder
  // that looked like real data.
  const [address, setAddress] = useState(() => {
    const preferred = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    return preferred ? [preferred.line, preferred.area].filter(Boolean).join(', ') : '';
  });
  const [notes, setNotes] = useState(typeof issue === 'string' ? issue : '');
  const payment: PaymentMethodId = 'garage';

  useEffect(() => {
    setFirestoreCars([]);
    setCarsError(false);
    if (!userId) {
      setLoadingCars(false);
      return;
    }

    setLoadingCars(true);
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        setCarsError(true);
        setLoadingCars(false);
      }
    }, 15_000);
    const q = query(collection(firestore, 'users', userId, 'cars'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        settled = true;
        clearTimeout(timeout);
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreCar, 'id'>) }));
        setFirestoreCars(docs);
        setCarsError(false);
        setLoadingCars(false);
        setSelectedCarId((current) => docs.some((car) => car.id === current)
          ? current : docs.find((car) => car.id === id)?.id ?? docs[0]?.id ?? '');
      },
      () => {
        settled = true;
        clearTimeout(timeout);
        setCarsError(true);
        setLoadingCars(false);
      },
    );
    return () => { settled = true; clearTimeout(timeout); unsubscribe(); };
  }, [carsRetry, id, userId]);

  const selectableCars: SelectableCar[] = firestoreCars.map((car) => ({
        id: car.id,
        name: `${car.year} ${car.make} ${car.model}`,
        meta: `${car.licensePlate || 'No plate'} · ${car.currentMileage?.toLocaleString?.() ?? car.currentMileage ?? 0} km`,
        source: 'firestore',
      }));

  const selectedGarage = liveGarages.find((g) => g.id === selectedGarageId);
  const garageJobs = liveJobs.filter((job) => job.garageId === selectedGarage?.id);
  const selectedService = garageJobs.find((job) => job.id === selectedServiceId);
  const selectedCar = selectableCars.find((car) => car.id === selectedCarId) ?? selectableCars[0];
  const selectedDay = days.find((day) => day.id === selectedDayId);
  const chosenAddOns = addOns.filter((item) => selectedAddOns.includes(item.id));
  const servicePrice = selectedService ? priceFromLabel(selectedService.price) : null;
  const listedPrice = servicePrice ?? 0;
  const priceLabel = !selectedService ? 'Select service' : servicePrice === null ? 'Quote required' : currency(servicePrice);
  const canSubmit = Boolean(!vendorsLoading && !vendorsError && !loadingCars && !carsError && selectedCar && selectedGarage && selectedService && selectedDay && selectedTime && isFutureSlot(selectedDayId, selectedTime) && (!pickupEnabled || address.trim()));
  const primaryLabel = vendorsLoading || loadingCars ? 'Loading details'
    : vendorsError || carsError ? 'Retry loading'
      : !selectedGarage ? 'Choose garage'
        : !selectedService ? 'Choose service'
        : !selectedDay || !selectedTime || !isFutureSlot(selectedDayId, selectedTime) ? 'Choose preferred time'
          : !selectedCar ? 'Choose vehicle'
            : pickupEnabled && !address.trim() ? 'Add pickup address' : 'Review request';
  const submissionInFlight = useRef(false);
  const requestIdentity = useRef<{ signature: string; key: string } | null>(null);

  // Pulse only when the selected service changes the listed price.
  const totalPulse = useSharedValue(1);
  const previousTotal = useRef(listedPrice);
  useEffect(() => {
    if (previousTotal.current !== listedPrice) {
      previousTotal.current = listedPrice;
      totalPulse.value = withSequence(
        withTiming(1.08, { duration: motion.fast / 2 }),
        withSpring(1, motion.pressOut),
      );
    }
  }, [listedPrice, totalPulse]);
  const totalAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: totalPulse.value }] }));

  function toggleAddOn(addOnId: string) {
    void tap();
    setSelectedAddOns((current) =>
      current.includes(addOnId) ? current.filter((item) => item !== addOnId) : [...current, addOnId],
    );
  }

  /**
   * Opens the review sheet. Nothing is written until the user confirms there;
   * the request does not reserve a slot or collect payment.
   */
  function handleReview() {
    if (!canSubmit || submitting) return;
    if (!selectedCar) {
      Alert.alert('Vehicle required', 'Choose a vehicle before confirming the booking.');
      return;
    }
    void tap();
    setReviewing(true);
  }

  function handlePrimary() {
    if (submitting || vendorsLoading || loadingCars) return;
    if (vendorsError) { void refreshVendors(); return; }
    if (carsError) { setCarsRetry((value) => value + 1); return; }
    if (!selectedGarage) { setOpenPanel('garage'); return; }
    if (!selectedService) { setOpenPanel('service'); return; }
    if (!selectedDay || !selectedTime || !isFutureSlot(selectedDayId, selectedTime)) { setOpenPanel('schedule'); return; }
    if (!selectedCar) { setOpenPanel('vehicle'); return; }
    if (pickupEnabled && !address.trim()) { setOpenPanel('logistics'); return; }
    handleReview();
  }

  async function handleSubmit() {
    if (!canSubmit || submitting || submissionInFlight.current || !selectedDay || !selectedTime || !isFutureSlot(selectedDayId, selectedTime)) return;
    if (!selectedCar) {
      Alert.alert('Vehicle required', 'Choose a vehicle before confirming the booking.');
      return;
    }

    submissionInFlight.current = true;
    setReviewing(false);
    setSubmitting(true);
    const bookingDate = preferredTimeUtc(selectedDay.id, selectedTime);

    const bookingDetails = {
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
      status: 'Pending' as const,
      totalAmount: 0,
      pickupEnabled,
      dropoffEnabled,
      address: pickupEnabled ? address : undefined,
      notes: notes.trim(),
      paymentMethod: paymentLabel(payment),
      addOns: chosenAddOns.map((item) => item.title),
      serviceCategory: selectedGarage?.category ?? '',
    };

    let remoteId: string;
    try {
      if (!user || selectedCar.source !== 'firestore' || !selectedGarage || !selectedService) {
        throw new Error('Sign in, save your vehicle, and choose an available garage before booking.');
      }
      const request = {
        branchId: selectedGarage.id,
        carId: selectedCar.id,
        serviceId: selectedService.sourceServiceId ?? selectedService.id,
        bookingDate: bookingDate.toISOString(),
        timeSlot: selectedTime,
        notes: [
          notes.trim(),
          pickupEnabled ? `Pickup: ${address}` : '',
          dropoffEnabled ? 'Drop-off after service requested' : '',
          selectedAddOns.length ? `Add-ons: ${selectedAddOns.join(', ')}` : '',
          `Payment: ${paymentLabel(payment)}`,
        ].filter(Boolean).join('\n'),
      };
      if (request.notes.length > 500) throw new Error('Shorten the notes or requested extras before sending.');
      const signature = JSON.stringify(request);
      if (requestIdentity.current?.signature !== signature) {
        requestIdentity.current = { signature, key: Crypto.randomUUID() };
      }
      const remote = await createFirestoreBooking(user.uid, { ...request, idempotencyKey: requestIdentity.current.key });
      remoteId = remote.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking could not be created.';
      Alert.alert('Booking not sent', `${message}\n\nPlease retry. The garage has not received this request.`);
      return;
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
    try {
      createLocalBooking({ ...bookingDetails, id: remoteId });
    } catch {
      console.warn('[booking] local cache update failed');
    }
    void success();
    try {
      router.replace(route(`/booking/${remoteId}`));
    } catch {
      Alert.alert('Request sent', 'Your booking request was received. Open Bookings to view it.');
    }
  }

  const addOnSummary = chosenAddOns.length
    ? `${chosenAddOns.length} requested`
    : 'None';
  const logisticsSummary = pickupEnabled && dropoffEnabled
    ? 'Pickup and drop-off requested'
    : pickupEnabled
      ? 'Pickup requested'
      : dropoffEnabled
        ? 'Drop-off requested'
        : 'I will drive it in myself';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Booking context and navigation. */}
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
            <Text style={[styles.headerStep, { color: c.textSecondary }]}>Request a preferred time</Text>
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
      </View>

      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={[styles.content, { paddingBottom: 190 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {vendorsError && <ErrorState compact onRetry={() => void refreshVendors()} />}
        {/* The selected workshop stays visible above the request fields. */}
        <MotionSurface style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.heroPhoto}>
            <RemoteImage uri={selectedGarage?.imageUrl} style={styles.heroPhotoImage} fallbackIcon="business-outline" accessibilityLabel={selectedGarage ? `${selectedGarage.name} workshop` : 'Selected garage'} />
            <View style={styles.heroPhotoCaption}>
              <Text style={styles.heroPhotoLabel}>WORKSHOP</Text>
              <Text style={styles.heroPhotoName} numberOfLines={2}>{selectedGarage?.name ?? 'Choose a garage'}</Text>
              {selectedGarage?.verified ? <View style={styles.heroVerified}><Ionicons name="shield-checkmark" size={14} color="#fff" /><Text style={styles.heroVerifiedText}>Verified partner</Text></View> : null}
            </View>
          </View>
          <View style={styles.heroContext}>
            <Ionicons name="location-outline" size={15} color={c.textSecondary} />
            <Text style={[styles.heroContextText, { color: c.textSecondary }]} numberOfLines={1}>
              {selectedGarage ? `${selectedGarage.area} · ${garageDistanceLabel(selectedGarage.distanceKm)}` : 'Choose a garage'}
            </Text>
          </View>
        </MotionSurface>

        <View style={styles.formHeading}>
          <Text style={[styles.formHeadingTitle, { color: c.text }]}>Your request</Text>
          <Text style={[styles.formHeadingNote, { color: c.textSecondary }]}>Choose a service and preferred time. The garage confirms both before any payment.</Text>
        </View>

        {/* ── The form ──
            Every row states its current value and opens in place. The screen
            therefore starts as a readable recap and only grows where the user
            actually wants to change something. */}
        <MotionSurface delay={20} style={styles.panelGroup}>
          <Panel
            id="vehicle"
            icon="car-sport-outline"
            title="Vehicle"
            value={selectedCar?.name ?? (loadingCars ? 'Loading your garage…' : carsError ? 'Unable to load vehicles' : 'Select a car')}
            open={openPanel === 'vehicle'}
            onToggle={togglePanel}
            c={c}
          >
            {carsError ? <ErrorState compact onRetry={() => setCarsRetry((value) => value + 1)} /> : null}
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
            {!loadingCars && !carsError && selectableCars.length === 0 ? (
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
                    description={[garage.area, garage.rating > 0 ? `${garage.rating} rating` : '', garage.responseTime].filter(Boolean).join(' · ')}
                    icon="business-outline"
                    selected={selectedGarageId === garage.id}
                    onPress={() => { setSelectedGarageId(garage.id); setSelectedServiceId(''); }}
                    c={c}
                  />
                ))
              )}
            </Panel>
          )}

          <Panel
              id="service"
              icon="construct-outline"
              title="Service"
              value={selectedService ? `${selectedService.title} · ${selectedService.price}` : 'Choose a service'}
              open={openPanel === 'service'}
              onToggle={togglePanel}
              c={c}
            >
              {vendorsLoading ? (
                <ActivityIndicator color={c.primary} style={{ marginVertical: 8 }} />
              ) : (
                <View style={styles.serviceGrid}>
                  {!selectedGarage ? <Text style={{ color: c.textSecondary }}>Choose a garage to see its services.</Text> : null}
                  {selectedGarage && garageJobs.length === 0 ? <Text style={{ color: c.textSecondary }}>No services are available for this garage.</Text> : null}
                  {garageJobs.map((job) => {
                    const selected = selectedService?.id === job.id;
                    return (
                      <AnimatedPressable
                        key={job.id}
                        style={[
                          styles.serviceCard,
                          { backgroundColor: selected ? c.primaryLight : c.surfaceAlt, borderColor: selected ? c.primary : c.border },
                        ]}
                        onPress={() => { void tap(); setSelectedServiceId(job.id); setOpenPanel('schedule'); }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${job.title}, ${job.price}`}
                      >
                        <Ionicons name={selected ? 'checkmark-circle' : serviceIcon(job.id)} size={20} color={selected ? c.primary : c.textSecondary} />
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={[styles.serviceTitle, { color: c.text }]}>{job.title}</Text>
                          <Text style={[styles.serviceMeta, { color: c.textSecondary }]}>
                            {[job.duration, job.warranty].filter(Boolean).join(' · ') || 'Details confirmed by garage'}
                          </Text>
                        </View>
                        <Text style={[styles.servicePrice, { color: selected ? c.primary : c.text }]}>{job.price}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )}
            </Panel>

          <Panel
            id="schedule"
            icon="calendar-outline"
            title="Preferred time"
            value={selectedDay && selectedTime ? `${selectedDay.label}, ${selectedTime}` : 'Choose a day and time'}
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
                    onPress={() => { void tap(); setSelectedDayId(day.id); if (selectedTime && !isFutureSlot(day.id, selectedTime)) setSelectedTime(''); }}
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

            <Text style={[styles.scheduleHint, { color: c.textSecondary }]}>Times are preferences, not confirmed availability. Select a day first.</Text>

            {slotBands.map((band) => (
              <View key={band.id} style={styles.band}>
                <View style={styles.bandHeader}>
                  <Ionicons name={band.icon} size={14} color={c.muted} />
                  <Text style={[styles.bandLabel, { color: c.muted }]}>{band.label}</Text>
                </View>
                <View style={styles.timeGrid}>
                  {band.slots.map((slot) => {
                    const selected = selectedTime === slot;
                    const unavailable = !selectedDayId || !isFutureSlot(selectedDayId, slot);
                    return (
                      <AnimatedPressable
                        key={slot}
                        style={[styles.timeChip, { backgroundColor: selected ? c.primary : c.surfaceAlt, borderColor: selected ? c.primary : c.border, opacity: unavailable ? 0.45 : 1 }]}
                        onPress={() => { void tap(); setSelectedTime(slot); if (selectedDayId) setOpenPanel(null); }}
                        disabled={unavailable}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: unavailable }}
                        accessibilityLabel={`${band.label} preferred time ${slot}`}
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
            <ToggleRow title="Pickup from my location" description="Garage confirms availability and price" value={pickupEnabled} onValueChange={setPickupEnabled} c={c} />
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
            <ToggleRow title="Drop-off after service" description="Garage confirms availability and price" value={dropoffEnabled} onValueChange={setDropoffEnabled} c={c} />
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
                trailing="Request"
                icon={item.icon}
                selected={selectedAddOns.includes(item.id)}
                onPress={() => toggleAddOn(item.id)}
                multi
                c={c}
              />
            ))}
          </Panel>

          <Panel
            id="notes"
            icon="chatbox-outline"
            title="Notes for garage"
            value={notes.trim() ? 'Added' : 'Optional'}
            open={openPanel === 'notes'}
            onToggle={togglePanel}
            c={c}
          >
            <TextInput
              value={notes}
              onChangeText={setNotes}
              maxLength={300}
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
          <Text style={[styles.ledgerTitle, { color: c.muted }]}>Price information</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: c.text }]}>Listed service price</Text>
            <Text style={[styles.totalValue, { color: c.primary }]} numberOfLines={2}>{priceLabel}</Text>
          </View>
          <Text style={[styles.ledgerNote, { color: c.muted }]}>
            Pay at the garage after the time, extras, transport, and final price are confirmed. No charge is made now.
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
          <Text style={[styles.actionLabel, { color: c.textSecondary }]}>Listed service price</Text>
          <Animated.Text style={[styles.actionTotal, { color: c.text }, totalAnimStyle]} numberOfLines={2}>
            {priceLabel}
          </Animated.Text>
        </View>
        <AnimatedPressable
          style={[styles.confirmButton, { backgroundColor: vendorsLoading || loadingCars ? c.muted : c.primary, opacity: submitting ? 0.75 : 1 }]}
          onPress={handlePrimary}
          disabled={vendorsLoading || loadingCars || submitting}
          scaleValue={0.97}
          accessibilityLabel={`${primaryLabel}, ${priceLabel}`}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>{primaryLabel}</Text>}
          {!submitting ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
        </AnimatedPressable>
      </View>

      {/* ── Confirmation review ──
          The last chance to catch a wrong car, date or address before the
          request is sent. The garage confirms time and price later. */}
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
            <Text style={[styles.reviewTitle, { color: c.text }]} accessibilityRole="header">Review booking request</Text>
            <Text style={[styles.reviewSubtitle, { color: c.textSecondary }]}>
              Check the details below. The garage will confirm your preferred time and final price.
            </Text>

            <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
              <ReviewRow icon="car-sport-outline" label="Vehicle" value={selectedCar?.name ?? '—'} c={c} />
              <ReviewRow icon="construct-outline" label="Service" value={selectedService?.title ?? '—'} c={c} />
              <ReviewRow icon="business-outline" label="Garage" value={selectedGarage?.name ?? '—'} c={c} />
              <ReviewRow icon="calendar-outline" label="Preferred time" value={`${selectedDay?.label ?? ''}, ${selectedTime}`} c={c} />
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

              {/* This is a listed price, never a confirmed invoice. */}
              <View style={[styles.reviewTotal, { backgroundColor: c.surfaceAlt, borderColor: c.primaryMid }]}>
                <View style={styles.priceRow}>
                  <Text style={[styles.totalLabel, { color: c.text }]}>Listed service price</Text>
                  <Text style={[styles.reviewTotalValue, { color: c.primary }]} numberOfLines={2}>{priceLabel}</Text>
                </View>
                <Text style={[styles.reviewTotalNote, { color: c.muted }]}>
                  Pay the garage after they confirm the work and final amount. Requested extras and transport may change the price.
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
                    : `Send booking request, ${priceLabel}`
                }
              >
                {submitting
                  ? <><ActivityIndicator color="#fff" /><Text style={styles.confirmText} numberOfLines={1}>Booking…</Text></>
                  : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.confirmText} numberOfLines={1}>Send request</Text></>}
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
}: {
  id: Exclude<PanelId, null>;
  icon: IconName;
  title: string;
  value: string;
  open: boolean;
  onToggle: (id: Exclude<PanelId, null>) => void;
  children: React.ReactNode;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <Animated.View
      layout={smoothLayout}
      style={[styles.panel, { backgroundColor: c.surface, borderColor: c.border }]}
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

  content: { padding: spacing.page, gap: 14 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    borderRadius: radius.xs,
    borderWidth: 1,
    gap: 0,
    overflow: 'hidden',
  },
  heroPhoto: { height: 124, justifyContent: 'flex-end', backgroundColor: '#11161D' },
  heroPhotoImage: { ...StyleSheet.absoluteFill },
  heroPhotoCaption: { padding: 12, gap: 3, backgroundColor: 'rgba(8,10,13,0.88)' },
  heroPhotoLabel: { color: '#F7C948', ...typography.overline },
  heroPhotoName: { color: '#fff', ...typography.h3 },
  heroVerified: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroVerifiedText: { color: '#fff', ...typography.caption },
  heroContext: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14 },
  heroContextText: { ...typography.bodySm, flex: 1 },

  // ── Disclosure panels ─────────────────────────────────────────────────────
  formHeading: { gap: 4, marginTop: 8 },
  formHeadingTitle: { ...typography.h3 },
  formHeadingNote: { ...typography.bodySm },
  panelGroup: { gap: 8 },
  panel: { paddingHorizontal: 14, borderRadius: radius.xs, borderWidth: 1, overflow: 'hidden' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  panelIcon: { width: 38, height: 38, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
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

  serviceGrid: { gap: 8 },
  serviceCard: { minHeight: 68, borderRadius: radius.xs, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  servicePrice: { ...typography.caption, fontWeight: '900' },
  serviceTitle: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  serviceMeta: { fontSize: 12, lineHeight: 15, fontWeight: '600' },

  dayRow: { gap: 10, paddingVertical: 2, paddingEnd: spacing.page },
  scheduleHint: { ...typography.caption },
  dayCard: { width: 72, minHeight: 88, borderRadius: radius.xs, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayLabel: { ...typography.caption },
  dayNumber: { fontSize: 24, lineHeight: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
  band: { gap: 8 },
  bandHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandLabel: { ...typography.label },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { flexBasis: '30%', flexGrow: 1, minHeight: 46, borderRadius: radius.xs, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
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

  // ── Ledger ────────────────────────────────────────────────────────────────
  ledger: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 10, ...shadow.xs },
  ledgerTitle: { ...typography.label },
  ledgerNote: { ...typography.caption, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  totalLabel: { ...typography.h4, flex: 1 },
  totalValue: { ...typography.h2, flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },

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
  actionTotal: { fontSize: 18, lineHeight: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  confirmButton: {
    minHeight: 54,
    minWidth: 148,
    paddingHorizontal: 22,
    borderRadius: radius.xs,
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
  reviewTotalValue: { ...typography.h2, flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
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
