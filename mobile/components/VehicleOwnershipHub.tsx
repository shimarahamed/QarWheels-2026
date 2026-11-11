import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { useAuthContext } from '@/lib/AuthContext';
import type { FirestoreCar } from '@/lib/firestoreOps';
import { useVehicleRecords } from '@/lib/useVehicleRecords';
import { recordedHealth, recordedServiceCost, vehicleDate, type VehicleServiceRecord } from '@/lib/vehicle-records';
import RecordNotFound from '@/components/RecordNotFound';
import ErrorState from '@/components/ErrorState';
import { useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { tap } from '@/lib/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type VehicleHubSection =
  | 'overview'
  | 'passport'
  | 'history'
  | 'documents'
  | 'maintenance'
  | 'tiresBattery'
  | 'insurance'
  | 'expenses'
  | 'predictive';

type HubMetric = {
  label: string;
  value: string;
  icon: IconName;
  tone: 'success' | 'warning' | 'primary' | 'ai';
};

type HubCar = {
  id: string;
  name: string;
  vin: string;
  plate: string;
  mileage: string;
  nextService: string;
  health: number | null;
};

const sectionTabs: Array<{ id: VehicleHubSection; label: string; icon: IconName }> = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'passport', label: 'Passport', icon: 'id-card-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
  { id: 'documents', label: 'Docs', icon: 'folder-open-outline' },
  { id: 'maintenance', label: 'Care', icon: 'calendar-number-outline' },
  { id: 'tiresBattery', label: 'Safety', icon: 'shield-checkmark-outline' },
  { id: 'insurance', label: 'Policy', icon: 'document-lock-outline' },
  { id: 'expenses', label: 'Cost', icon: 'pie-chart-outline' },
  { id: 'predictive', label: 'AI', icon: 'sparkles-outline' },
];

function route(path: string) {
  return path as never;
}

function toneColor(tone: HubMetric['tone'], c: ReturnType<typeof useQarColors>) {
  if (tone === 'success') return { bg: c.successBg, color: c.success };
  if (tone === 'warning') return { bg: c.warningBg, color: c.warning };
  if (tone === 'ai') return { bg: c.aiBg, color: c.ai };
  return { bg: c.primaryLight, color: c.primary };
}

function makePassportNumber(carId: string, vin: string) {
  const seed = `${carId}-${vin}-qarwheel-passport`;
  let hash = 2166136261;
  const digits: string[] = [];

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  for (let index = 0; index < 16; index += 1) {
    hash = Math.imul(hash ^ (index + 31), 1103515245) + 12345;
    digits.push(String(Math.abs(hash) % 10));
  }

  return digits.join('').replace(/(\d{4})(?=\d)/g, '$1 ');
}

function passportPayload(input: { passportNumber: string; carName: string; vin: string; plate: string; health: number | null }) {
  return [
    'QarWheel Digital Vehicle Passport',
    `Passport No: ${input.passportNumber}`,
    `Vehicle: ${input.carName}`,
    `VIN: ${input.vin}`,
    `Plate: ${input.plate}`,
    'Status: Owner-provided record; not a vehicle inspection',
    `Recorded diagnostic score: ${input.health === null ? 'Not measured' : `${input.health}/100`}`,
    'Shared copy; access cannot be revoked after sharing',
  ].join('\n');
}

function fromFirestoreCar(car: FirestoreCar): HubCar {
  return {
    id: car.id,
    name: `${car.year} ${car.make} ${car.model}`,
    vin: car.vin || 'VIN pending',
    plate: car.licensePlate || 'Plate pending',
    mileage: `${(car.currentMileage ?? 0).toLocaleString()} km`,
    nextService: car.nextServiceDate ? `Next service ${car.nextServiceDate}` : 'Service schedule not set',
    health: recordedHealth(car),
  };
}

export default function VehicleOwnershipHub({ initialSection = 'overview' }: { initialSection?: VehicleHubSection }) {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useQarColors();
  const { user } = useAuthContext();
  const vehicle = useVehicleRecords(user?.uid, id);
  const [section, setSection] = useState<VehicleHubSection>(initialSection);
  if (vehicle.loading) return <SafeAreaView style={{ flex: 1, justifyContent: 'center', backgroundColor: c.background }}><ActivityIndicator accessibilityLabel="Loading vehicle" color={c.primary} /></SafeAreaView>;
  if (vehicle.error) return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}><ErrorState onRetry={vehicle.retry} /></SafeAreaView>;
  if (!vehicle.car) return <RecordNotFound title="Vehicle unavailable" message="This vehicle is not in your account. Choose a vehicle from My cars." />;
  const car = fromFirestoreCar(vehicle.car);
  const healthColor = car.health === null ? c.muted : car.health >= 80 ? c.success : car.health >= 60 ? c.warning : c.danger;
  const healthLabel = car.health === null ? 'Not measured' : 'Recorded scan';
  const passportNumber = makePassportNumber(car.id, car.vin);
  const serviceCost = recordedServiceCost(vehicle.records);

  const metrics: HubMetric[] = [
    { label: 'Recorded score', value: car.health === null ? 'Not measured' : `${car.health}%`, icon: 'pulse-outline', tone: 'primary' },
    { label: 'Mileage', value: car.mileage, icon: 'speedometer-outline', tone: 'primary' },
    { label: 'Next service', value: car.nextService, icon: 'calendar-outline', tone: 'warning' },
    { label: 'Recorded service cost', value: vehicle.recordsError || vehicle.recordsLoading ? 'Unavailable' : `QAR ${serviceCost.toFixed(2)}`, icon: 'cash-outline', tone: 'ai' },
  ];

  const visibleSections: VehicleHubSection[] = (() => {
    if (section === 'passport') return ['passport', 'documents', 'insurance'];
    if (section === 'history') return ['history', 'maintenance', 'expenses'];
    if (section === 'documents') return ['documents', 'passport', 'insurance'];
    if (section === 'maintenance') return ['maintenance', 'tiresBattery', 'predictive'];
    if (section === 'tiresBattery') return ['tiresBattery', 'maintenance', 'predictive'];
    if (section === 'insurance') return ['insurance', 'documents', 'expenses'];
    if (section === 'expenses') return ['expenses', 'history', 'insurance'];
    if (section === 'predictive') return ['predictive', 'maintenance', 'tiresBattery'];
    return ['overview', 'passport', 'maintenance', 'history', 'documents', 'tiresBattery', 'insurance', 'expenses', 'predictive'];
  })();

  async function handleSharePassport() {
    const payload = passportPayload({
      passportNumber,
      carName: car.name,
      vin: car.vin,
      plate: car.plate,
      health: car.health,
    });

    try {
      await Share.share({
        title: 'QarWheel vehicle passport',
        message: payload,
      });
    } catch {
      Alert.alert('Share unavailable', 'The vehicle passport details are ready, but sharing is unavailable on this device.');
    }
  }

  function handleDownloadPassport() {
    const payload = {
      type: 'QarWheel Digital Vehicle Passport',
      passportNumber,
      vehicle: car.name,
      vin: car.vin,
      plate: car.plate,
      status: 'Owner-provided record; not a vehicle inspection',
      health: car.health,
      access: 'Shared copy; not revocable',
      exportedAt: new Date().toISOString(),
    };

    if (Platform.OS === 'web') {
      const browser = globalThis as typeof globalThis & {
        document?: {
          createElement: (tagName: 'a') => {
            href: string;
            download: string;
            click: () => void;
          };
        };
        URL?: {
          createObjectURL: (blob: Blob) => string;
          revokeObjectURL: (url: string) => void;
        };
      };

      if (browser.document && browser.URL) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = browser.URL.createObjectURL(blob);
        const link = browser.document.createElement('a');
        link.href = url;
        link.download = `qarwheel-passport-${passportNumber.replaceAll(' ', '-')}.json`;
        link.click();
        browser.URL.revokeObjectURL(url);
        return;
      }
    }

    void handleSharePassport();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Back" style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/cars')} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.navTitle, { color: c.text }]} numberOfLines={1}>Vehicle dashboard</Text>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Find a garage" style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push('/(tabs)/search')} hitSlop={8}>
          <Ionicons name="calendar-outline" size={19} color={c.primary} />
        </AnimatedPressable>
      </View>

      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MotionScreen style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.heroTop}>
            <View style={[styles.vehicleIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="car-sport" size={28} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.eyebrow, { color: c.primary }]}>Ownership hub</Text>
              <Text style={[styles.title, { color: c.text }]}>{car.name}</Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>{car.vin}</Text>
            </View>
            <View style={[styles.healthBadge, { backgroundColor: `${healthColor}22` }]}>
              <Text style={[styles.healthBadgeText, { color: healthColor }]}>{healthLabel}</Text>
            </View>
          </View>
          <View style={styles.healthBarWrap}>
            <View style={styles.healthBarRow}>
              <Text style={[styles.healthBarLabel, { color: c.textSecondary }]}>Recorded diagnostic score</Text>
              <Text style={[styles.healthBarValue, { color: healthColor }]}>{car.health === null ? 'Not measured' : `${car.health}/100`}</Text>
            </View>
            <View style={[styles.healthTrack, { backgroundColor: c.surfaceAlt }]}>
              <View style={[styles.healthFill, { width: `${car.health ?? 0}%`, backgroundColor: healthColor }]} />
            </View>
          </View>
        </MotionScreen>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {sectionTabs.map((tab) => {
            const active = section === tab.id;
            return (
              <AnimatedPressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.tabChip, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
                onPress={() => { void tap(); setSection(tab.id); }}
              >
                <Ionicons name={tab.icon} size={15} color={active ? '#fff' : c.textSecondary} />
                <Text style={[styles.tabText, { color: active ? '#fff' : c.text }]}>{tab.label}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {visibleSections.includes('overview') ? (
          <View style={styles.metricGrid}>
            {metrics.map((metric) => {
              const tone = toneColor(metric.tone, c);
              return (
                <MotionSurface key={metric.label} style={[styles.metricCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={[styles.metricIcon, { backgroundColor: tone.bg }]}>
                    <Ionicons name={metric.icon} size={18} color={tone.color} />
                  </View>
                  <Text style={[styles.metricValue, { color: c.text }]}>{metric.value}</Text>
                  <Text style={[styles.metricLabel, { color: c.textSecondary }]}>{metric.label}</Text>
                </MotionSurface>
              );
            })}
          </View>
        ) : null}

        {visibleSections.includes('passport') ? (
          <DigitalPassportCard
            carName={car.name}
            vin={car.vin}
            plate={car.plate}
            health={car.health}
            passportNumber={passportNumber}
            onShare={handleSharePassport}
            onDownload={handleDownloadPassport}
            c={c}
          />
        ) : null}
        {visibleSections.includes('maintenance') ? <MaintenanceCard nextServiceDate={vehicle.car.nextServiceDate} c={c} /> : null}
        {visibleSections.includes('history') ? <ServiceHistoryCard records={vehicle.records} loading={vehicle.recordsLoading} error={vehicle.recordsError} retry={vehicle.retry} c={c} /> : null}
        {visibleSections.includes('documents') ? <DocumentsCard c={c} /> : null}
        {visibleSections.includes('tiresBattery') ? <TiresBatteryCard car={vehicle.car} c={c} /> : null}
        {visibleSections.includes('insurance') ? <InsuranceCard c={c} /> : null}
        {visibleSections.includes('expenses') ? <ExpensesCard total={serviceCost} unavailable={vehicle.recordsError || vehicle.recordsLoading} c={c} /> : null}
        {visibleSections.includes('predictive') ? <PredictiveCard c={c} /> : null}

        <AnimatedPressable style={[styles.primaryButton, { backgroundColor: c.primary }]} onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Book service for this vehicle</Text>
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DigitalPassportCard({
  carName,
  vin,
  plate,
  health,
  passportNumber,
  onShare,
  onDownload,
  c,
}: {
  carName: string;
  vin: string;
  plate: string;
  health: number | null;
  passportNumber: string;
  onShare: () => void;
  onDownload: () => void;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <MotionSurface style={[styles.passportCard, { backgroundColor: c.dark, borderColor: c.primaryMid }]}>
      <View style={styles.passportTop}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.passportEyebrow}>QarWheel vehicle passport</Text>
          <Text style={styles.passportBrand}>QARWHEEL PASS</Text>
        </View>
        <View style={styles.verifiedPill}>
          <Ionicons name="document-text-outline" size={14} color="#fff" />
          <Text style={styles.verifiedText}>Owner record</Text>
        </View>
      </View>

      <View style={styles.cardChipRow}>
        <View style={styles.cardChip}>
          <View style={styles.chipLine} />
          <View style={styles.chipLine} />
          <View style={styles.chipLine} />
        </View>
        <View style={styles.nfcMark}>
          <View style={styles.nfcArc} />
          <View style={[styles.nfcArc, styles.nfcArcSmall]} />
        </View>
      </View>

      <Text style={styles.passportNumber}>{passportNumber}</Text>

      <View style={styles.passportBottom}>
        <View style={[styles.passportIdentity, { gap: 2 }]}>
          <Text style={styles.passportItemLabel}>Vehicle</Text>
          <Text style={styles.passportTitle} numberOfLines={1}>{carName}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={styles.passportItemLabel}>Health</Text>
          <Text style={styles.passportTitle}>{health === null ? 'Not measured' : `${health}/100`}</Text>
        </View>
      </View>

      <View style={styles.passportGrid}>
        <PassportItem label="VIN" value={vin} />
        <PassportItem label="Plate" value={plate} />
        <PassportItem label="Source" value="Owner-provided" />
        <PassportItem label="Access" value="Shared copy" />
      </View>

      <View style={styles.passportShareRow}>
        <AnimatedPressable style={styles.passportAction} onPress={onShare}>
          <Ionicons name="share-social-outline" size={16} color="#fff" />
          <Text style={styles.passportActionText}>Share</Text>
        </AnimatedPressable>
        {Platform.OS === 'web' && <AnimatedPressable style={styles.passportAction} onPress={onDownload}>
          <Ionicons name="download-outline" size={16} color="#fff" />
          <Text style={styles.passportActionText}>Download</Text>
        </AnimatedPressable>}
      </View>

      <Text style={styles.passportFine}>Not a vehicle inspection or proof of ownership. Shared copies cannot be revoked.</Text>
    </MotionSurface>
  );
}

function PassportItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.passportItem, { gap: 3 }]}>
      <Text style={styles.passportItemLabel}>{label}</Text>
      <Text style={styles.passportItemValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, subtitle, icon, c, children }: {
  title: string;
  subtitle: string;
  icon: IconName;
  c: ReturnType<typeof useQarColors>;
  children: React.ReactNode;
}) {
  return (
    <MotionSurface style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: c.primaryLight }]}>
          <Ionicons name={icon} size={19} color={c.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.sectionSubtitle, { color: c.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </MotionSurface>
  );
}

function MaintenanceCard({ nextServiceDate, c }: { nextServiceDate?: string; c: ReturnType<typeof useQarColors> }) {
  const router = useRouter();
  return (
    <SectionCard title="Maintenance schedule" subtitle="Saved service date" icon="calendar-number-outline" c={c}>
      <TimelineRow title="Next service" meta={vehicleDate(nextServiceDate)} color={c.primary} c={c} />
      <SmallButton label="Find a garage" icon="search-outline" onPress={() => router.push('/(tabs)/search')} c={c} />
    </SectionCard>
  );
}

function ServiceHistoryCard({ records, loading, error, retry, c }: { records: VehicleServiceRecord[]; loading: boolean; error: boolean; retry: () => void; c: ReturnType<typeof useQarColors> }) {
  return (
    <SectionCard title="Service history" subtitle="Latest 100 saved records" icon="time-outline" c={c}>
      {loading ? <ActivityIndicator accessibilityLabel="Loading service records" color={c.primary} /> : error ? <ErrorState compact onRetry={retry} /> : records.length === 0 ? <Text style={{ color: c.textSecondary }}>No service records yet.</Text> : records.map((record) => (
        <TimelineRow key={record.id} title={record.serviceType} meta={[vehicleDate(record.serviceDate), record.mileageAtService === null ? null : `${record.mileageAtService.toLocaleString()} km`, record.cost === null ? 'Cost not recorded' : `QAR ${record.cost.toFixed(2)}`, record.serviceDescription].filter(Boolean).join(' | ')} color={c.primary} c={c} />
      ))}
    </SectionCard>
  );
}

function DocumentsCard({ c }: { c: ReturnType<typeof useQarColors> }) {
  return (
    <SectionCard title="Documents vault" subtitle="Registration, insurance, inspection, invoices, and ownership files." icon="folder-open-outline" c={c}>
      <Text style={{ color: c.textSecondary }}>No verified documents linked to this vehicle.</Text>
    </SectionCard>
  );
}

function TiresBatteryCard({ car, c }: { car: FirestoreCar; c: ReturnType<typeof useQarColors> }) {
  const scan = recordedHealth(car) === null ? null : car.obdDiagnostics;
  const voltage = scan?.batteryVoltage;
  return (
    <SectionCard title="Tires and battery" subtitle="Safety checks for tire pressure, rotation, battery age, and heat risk." icon="shield-checkmark-outline" c={c}>
      <View style={styles.splitRow}>
        <MiniPanel title="Tires" value="Not measured" meta="No pressure reading" icon="radio-button-on-outline" c={c} />
        <MiniPanel title="Battery" value={typeof voltage === 'number' && Number.isFinite(voltage) ? `${voltage.toFixed(1)}V` : 'Not measured'} meta={scan ? `Recorded ${vehicleDate(scan.scannedAt)}` : 'No diagnostic scan'} icon="battery-charging-outline" c={c} />
      </View>
      <Text style={{ color: c.textSecondary }}>Recorded readings do not confirm that a vehicle is safe to drive.</Text>
    </SectionCard>
  );
}

function InsuranceCard({ c }: { c: ReturnType<typeof useQarColors> }) {
  return (
    <SectionCard title="Insurance and registration" subtitle="Policy, Mulkiya, inspection, renewal reminders, and stored proofs." icon="document-lock-outline" c={c}>
      <Text style={{ color: c.textSecondary }}>Policy, registration and inspection status are not verified.</Text>
    </SectionCard>
  );
}

function ExpensesCard({ total, unavailable, c }: { total: number; unavailable: boolean; c: ReturnType<typeof useQarColors> }) {
  return (
    <SectionCard title="Expenses" subtitle="Costs in the latest 100 saved service records; not proof of payment" icon="pie-chart-outline" c={c}>
      <Text style={{ color: c.text }}>{unavailable ? 'Service costs unavailable' : `Recorded service cost: QAR ${total.toFixed(2)}`}</Text>
    </SectionCard>
  );
}

function PredictiveCard({ c }: { c: ReturnType<typeof useQarColors> }) {
  const router = useRouter();
  return (
    <SectionCard title="Predictive maintenance" subtitle="AI care recommendations using mileage, weather, records, and symptoms." icon="sparkles-outline" c={c}>
      <Text style={{ color: c.textSecondary }}>No maintenance prediction has been generated for this vehicle.</Text>
      <SmallButton label="Find a garage" icon="search-outline" onPress={() => router.push('/(tabs)/search')} c={c} />
    </SectionCard>
  );
}

function TimelineRow({ title, meta, color, c }: { title: string; meta: string; color: string; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineDot, { backgroundColor: color }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{title}</Text>
        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>{meta}</Text>
      </View>
    </View>
  );
}

function DocRow({ title, status, icon, c }: { title: string; status: string; icon: IconName; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={[styles.docRow, { borderColor: c.border }]}>
      <View style={[styles.docIcon, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name={icon} size={17} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{title}</Text>
        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>{status}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.muted} />
    </View>
  );
}

function MiniPanel({ title, value, meta, icon, c }: { title: string; value: string; meta: string; icon: IconName; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={[styles.miniPanel, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      <Ionicons name={icon} size={18} color={c.primary} />
      <Text style={[styles.miniValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.miniTitle, { color: c.textSecondary }]}>{title}</Text>
      <Text style={[styles.miniMeta, { color: c.muted }]}>{meta}</Text>
    </View>
  );
}

function ExpenseBar({ label, value, amount, color, c }: { label: string; value: number; amount: string; color: string; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={styles.expenseRow}>
      <View style={styles.expenseTop}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{label}</Text>
        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>{amount}</Text>
      </View>
      <View style={[styles.expenseTrack, { backgroundColor: c.surfaceAlt }]}>
        <View style={[styles.expenseFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function SmallButton({ label, icon, onPress, c }: { label: string; icon: IconName; onPress: () => void; c: ReturnType<typeof useQarColors> }) {
  return (
    <AnimatedPressable style={[styles.smallButton, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]} onPress={() => { void tap(); onPress(); }}>
      <Ionicons name={icon} size={16} color={c.primary} />
      <Text style={[styles.smallButtonText, { color: c.primary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  navbar: {
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
  content: { padding: spacing.page, paddingBottom: 64, gap: 16 },
  hero: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 16, ...shadow.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: { width: 54, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...typography.overline },
  title: { ...typography.h2 },
  subtitle: { ...typography.bodySm },
  healthBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  healthBadgeText: { ...typography.caption, fontWeight: '900' },
  healthBarWrap: { gap: 7 },
  healthBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  healthBarLabel: { ...typography.caption },
  healthBarValue: { ...typography.caption, fontWeight: '900' },
  healthTrack: { height: 9, borderRadius: radius.full, overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: radius.full },
  tabRow: { gap: 10, paddingEnd: spacing.page },
  tabChip: { minHeight: 40, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  tabText: { ...typography.caption, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { flexBasis: '48%', flexGrow: 1, minHeight: 136, borderRadius: radius.xl, borderWidth: 1, padding: 16, justifyContent: 'space-between', ...shadow.xs },
  metricIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  metricValue: { ...typography.h3 },
  metricLabel: { ...typography.caption },
  passportCard: { position: 'relative', overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 16, ...shadow.md },
  passportGlow: { position: 'absolute', right: -56, top: -64, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(227,30,36,0.32)' },
  passportTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  passportEyebrow: { color: 'rgba(255,255,255,0.58)', ...typography.overline },
  passportBrand: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.8, lineHeight: 24 },
  passportTitle: { color: '#fff', ...typography.h2 },
  cardChipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardChip: { width: 48, height: 36, borderRadius: 10, backgroundColor: '#D4AF37', paddingVertical: 7, paddingHorizontal: 8, justifyContent: 'space-between' },
  chipLine: { height: 3, borderRadius: 2, backgroundColor: 'rgba(17,22,29,0.45)' },
  nfcMark: { width: 42, height: 34, alignItems: 'center', justifyContent: 'center' },
  nfcArc: { width: 32, height: 22, borderRightWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 16 },
  nfcArcSmall: { position: 'absolute', width: 20, height: 14, borderRightWidth: 2, borderRadius: 10 },
  passportNumber: { color: '#fff', fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: 1.6 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6 },
  verifiedText: { color: '#fff', ...typography.caption, fontWeight: '900' },
  passportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  passportItem: { width: '48%', borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)', padding: 12 },
  passportItemLabel: { color: 'rgba(255,255,255,0.52)', ...typography.caption },
  passportItemValue: { color: '#fff', ...typography.h4 },
  passportBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  passportIdentity: { flex: 1, minWidth: 0 },
  passportShareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qrBox: { width: 58, height: 58, borderRadius: radius.md, backgroundColor: '#fff', flexDirection: 'row', flexWrap: 'wrap', padding: 9, gap: 5 },
  qrDot: { width: 14, height: 14, borderRadius: 3, backgroundColor: '#11161D' },
  passportAction: { flex: 1, minHeight: 44, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  passportActionText: { color: '#fff', ...typography.caption, fontWeight: '900' },
  passportFine: { color: 'rgba(255,255,255,0.58)', ...typography.caption },
  sectionCard: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 14, ...shadow.xs },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...typography.h3 },
  sectionSubtitle: { ...typography.bodySm },
  timelineRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: radius.full, marginTop: 6 },
  rowTitle: { ...typography.h4 },
  rowMeta: { ...typography.bodySm },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: radius.lg, padding: 14, minHeight: 68 },
  docIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  splitRow: { flexDirection: 'row', gap: 10 },
  miniPanel: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: 12, gap: 4 },
  miniValue: { ...typography.h3 },
  miniTitle: { ...typography.caption, fontWeight: '900' },
  miniMeta: { ...typography.caption },
  expenseBars: { gap: 12 },
  expenseRow: { gap: 7 },
  expenseTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  expenseTrack: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  expenseFill: { height: '100%', borderRadius: radius.full },
  smallButton: { minHeight: 48, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  smallButtonText: { ...typography.h4 },
  primaryButton: { minHeight: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...shadow.primary },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
