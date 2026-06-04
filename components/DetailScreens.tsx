/**
 * QarWheels 2026 — Detail & modal screen components
 * All push/modal destination screens.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  findBooking,
  findCar,
  findCategory,
  findGarage,
  findJob,
  garages,
  popularJobs,
} from '@/lib/marketplace';
import { findVendorInvoiceByBooking } from '@/lib/vendor-data';
import { categoryColors, colors, getThemedStatusColors, radius, shadow, spacing, statusColors, typography } from '@/lib/theme';
import { useQarColors } from '@/lib/store';
import { success, tap } from '@/lib/haptics';
import { useQarWheelsStore } from '@/lib/store';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionScreen } from '@/lib/motion';
import {
  BOOKING_WORKFLOW,
  getBookingStatusDescription,
  getBookingStatusIndex,
  getBookingStatusLabel,
} from '@/lib/booking-workflow';

// ── Helpers ──────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function Icon({ name, size = 18, color = colors.primary }: {
  name: IoniconsName; size?: number; color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

function route(p: string) { return p as never; }

// ── Page wrapper ──────────────────────────────────────────────────
function Page({ title, children, rightAction }: {
  title: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <SafeAreaView style={ds.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Nav bar */}
      <View style={ds.navbar}>
        <AnimatedPressable style={ds.backBtn} onPress={() => router.back()} hitSlop={8} scaleValue={0.96}>
          <Icon name="chevron-back" size={20} color={colors.text} />
        </AnimatedPressable>
        <Text style={ds.navTitle} numberOfLines={1}>{title}</Text>
        <View style={ds.backBtn}>{rightAction ?? null}</View>
      </View>

      <ScrollView
        style={ds.screen}
        contentContainerStyle={ds.content}
        showsVerticalScrollIndicator={false}
      >
        <MotionScreen>
          {children}
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Primary action button ─────────────────────────────────────────
function PrimaryBtn({ label, onPress, icon }: {
  label: string; onPress: () => void; icon?: IoniconsName;
}) {
  return (
    <AnimatedPressable style={ds.primaryBtn} onPress={onPress} scaleValue={0.96}>
      {icon && <Icon name={icon} size={18} color="#fff" />}
      <Text style={ds.primaryBtnText}>{label}</Text>
    </AnimatedPressable>
  );
}

// ── Info row ──────────────────────────────────────────────────────
function InfoRow({ icon, label, value, valueColor }: {
  icon: IoniconsName; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={ds.infoRow}>
      <View style={ds.infoIcon}>
        <Icon name={icon} size={15} color={colors.muted} />
      </View>
      <Text style={ds.infoLabel}>{label}</Text>
      <Text style={[ds.infoValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ── Mini garage row ───────────────────────────────────────────────
function GarageMini({ id, name, detail }: { id: string; name: string; detail: string }) {
  const router = useRouter();
  const garage = findGarage(id);

  return (
    <AnimatedPressable style={ds.miniCard} onPress={() => router.push(route(`/garage/${id}`))} scaleValue={0.98}>
      <Image source={{ uri: garage.imageUrl }} style={ds.miniThumb} resizeMode="cover" />
      <View style={ds.miniBody}>
        <Text style={ds.miniName}>{name}</Text>
        <Text style={ds.miniDetail}>{detail}</Text>
      </View>
      <Icon name="chevron-forward" size={16} color={colors.muted} />
    </AnimatedPressable>
  );
}

// ── Action row ────────────────────────────────────────────────────
function ActionRow({ icon, label, iconBg, iconColor, onPress, dangerous, noBorderTop }: {
  icon: IoniconsName;
  label: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  dangerous?: boolean;
  noBorderTop?: boolean;
}) {
  return (
    <AnimatedPressable style={[ds.actionRow, noBorderTop && { borderTopWidth: 0 }]} onPress={() => { void tap(); onPress(); }} scaleValue={0.98}>
      <View style={[ds.actionIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={17} color={iconColor} />
      </View>
      <Text style={[ds.actionLabel, dangerous && { color: colors.danger }]}>{label}</Text>
      <Icon name="chevron-forward" size={16} color={dangerous ? colors.danger : colors.muted} />
    </AnimatedPressable>
  );
}

// ═══════════════════════════════════════════════════════════════
// GARAGE DETAIL
// ═══════════════════════════════════════════════════════════════
export function GarageDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const garage = findGarage(id);
  const isFav = useQarWheelsStore((s) => s.favoriteGarageIds.includes(garage.id));
  const toggleFav = useQarWheelsStore((s) => s.toggleFavoriteGarage);
  const handleBook = () => router.push(route(`/checkout/${garage.id}`));
  const garageServices = popularJobs.filter((job) => job.garageId === garage.id);
  const visibleServices = garageServices.length > 0 ? garageServices : popularJobs.slice(0, 3);

  return (
    <Page
      title={garage.name}
      rightAction={
        <Pressable onPress={() => { void tap(); toggleFav(garage.id); }} hitSlop={8}>
          <Icon
            name={isFav ? 'heart' : 'heart-outline'}
            size={20}
            color={isFav ? colors.danger : colors.muted}
          />
        </Pressable>
      }
    >
      {/* Hero image */}
      <View style={ds.heroWrap}>
        <Image source={{ uri: garage.imageUrl }} style={ds.heroImage} resizeMode="cover" />
        <View style={ds.heroOverlay} />
        {/* Status overlay */}
        <View style={ds.heroStatusRow}>
          <View style={ds.openBadge}>
            <View style={[ds.openDot, !garage.openNow && { backgroundColor: colors.warning }]} />
            <Text style={ds.openText}>{garage.openNow ? 'Open now' : `Next ${garage.availability}`}</Text>
          </View>
          <View style={ds.heroRatingBadge}>
            <Icon name="star" size={12} color={colors.gold} />
            <Text style={ds.heroRatingText}>{garage.rating}</Text>
          </View>
        </View>
      </View>

      {/* Summary card */}
      <View style={ds.card}>
        <Text style={ds.eyebrow}>{garage.type}</Text>
        <Text style={ds.cardTitle}>{garage.name}</Text>

        <View style={ds.factChips}>
          <View style={ds.factChip}>
            <Icon name="location" size={13} color={colors.muted} />
            <Text style={ds.factChipText}>{garage.distanceKm.toFixed(1)} km · {garage.area}</Text>
          </View>
          <View style={ds.factChip}>
            <Icon name="time-outline" size={13} color={colors.muted} />
            <Text style={ds.factChipText}>{garage.responseTime} response</Text>
          </View>
          <View style={ds.factChip}>
            <Icon name="pricetag-outline" size={13} color={colors.primary} />
            <Text style={[ds.factChipText, { color: colors.primary, fontWeight: '700' }]}>
              From {garage.startingPrice}
            </Text>
          </View>
          <View style={ds.factChip}>
            <Icon name="calendar-outline" size={13} color={colors.success} />
            <Text style={[ds.factChipText, { color: colors.success, fontWeight: '800' }]}>
              {garage.availability === 'Now' ? 'Instant booking' : `${garage.availability} slots`}
            </Text>
          </View>
        </View>

        <InfoRow icon="star" label="Rating" value={`${garage.rating} · ${garage.reviews} reviews`} valueColor={colors.gold} />
        <InfoRow icon="chatbubble-ellipses-outline" label="Reviews" value={`${garage.reviews} verified`} />
        <InfoRow icon="car-outline" label="Category" value={garage.category} />
        <InfoRow icon="shield-checkmark-outline" label="Warranty" value={garage.warranty} valueColor={colors.success} />
        <InfoRow icon="navigate-outline" label="Pickup" value={garage.pickupAvailable ? 'Pickup and drop-off available' : 'Drop-off booking'} />

        <View style={ds.tagRow}>
          {garage.tags.map((tag) => (
            <View key={tag} style={ds.tagPill}>
              <Text style={ds.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={ds.discoveryMetrics}>
        {[
          { label: 'Distance', value: `${garage.distanceKm.toFixed(1)} km`, icon: 'navigate-outline' as IoniconsName, color: colors.primary },
          { label: 'From', value: garage.startingPrice, icon: 'pricetag-outline' as IoniconsName, color: colors.primary },
          { label: 'Rating', value: `${garage.rating}/5`, icon: 'star-outline' as IoniconsName, color: colors.gold },
        ].map((metric) => (
          <View key={metric.label} style={ds.discoveryMetric}>
            <Icon name={metric.icon} size={18} color={metric.color} />
            <Text style={ds.discoveryMetricValue}>{metric.value}</Text>
            <Text style={ds.discoveryMetricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <View style={ds.garageActionCard}>
        <View style={ds.garageActionHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={ds.sectionTitle}>Book with confidence</Text>
            <Text style={ds.garageActionMeta}>{garage.responseTime} average response · {garage.warranty}</Text>
          </View>
          <View style={ds.garageActionPrice}>
            <Text style={ds.garageActionPriceLabel}>From</Text>
            <Text style={ds.garageActionPriceValue}>{garage.startingPrice}</Text>
          </View>
        </View>

        <AnimatedPressable style={ds.garagePrimaryAction} onPress={handleBook} scaleValue={0.98}>
          <View style={ds.garagePrimaryIcon}>
            <Icon name="calendar" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ds.garagePrimaryTitle}>Book service</Text>
            <Text style={ds.garagePrimarySub}>{garage.availability === 'Now' ? 'Instant slot available' : `${garage.availability} availability`}</Text>
          </View>
          <Icon name="arrow-forward" size={18} color="#fff" />
        </AnimatedPressable>

        <View style={ds.garageContactGrid}>
          <Pressable style={ds.garageContactButton} onPress={() => router.push(route(`/chat/${garage.id}`))}>
            <Icon name="chatbubble-ellipses-outline" size={17} color={colors.primary} />
            <Text style={ds.garageContactText}>Message</Text>
          </Pressable>
          <Pressable style={ds.garageContactButton} onPress={() => router.push('/map')}>
            <Icon name="navigate-outline" size={17} color={colors.primary} />
            <Text style={ds.garageContactText}>Directions</Text>
          </Pressable>
        </View>

        <View style={ds.garageUtilityGrid}>
          {[
            { label: 'Quote', icon: 'flash-outline' as IoniconsName, onPress: () => router.push('/modal' as never) },
            { label: 'Services', icon: 'construct-outline' as IoniconsName, onPress: () => router.push(route(`/garage-services/${garage.id}`)) },
            { label: 'Reviews', icon: 'star-outline' as IoniconsName, onPress: () => router.push(route(`/garage-reviews/${garage.id}`)) },
            { label: 'Photos', icon: 'images-outline' as IoniconsName, onPress: () => router.push(route(`/garage-photos/${garage.id}`)) },
            { label: isFav ? 'Saved' : 'Save', icon: isFav ? 'heart' as IoniconsName : 'heart-outline' as IoniconsName, onPress: () => { void tap(); toggleFav(garage.id); } },
          ].map((item) => (
            <Pressable key={item.label} style={ds.garageUtilityButton} onPress={item.onPress}>
              <Icon name={item.icon} size={16} color={item.label === 'Saved' ? colors.danger : colors.textSecondary} />
              <Text style={[ds.garageUtilityText, item.label === 'Saved' && { color: colors.danger }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Services preview */}
      <View style={ds.card}>
        <View style={ds.sectionHeaderRow}>
          <Text style={ds.sectionTitle}>Bookable services</Text>
          <Text style={ds.sectionMeta}>{visibleServices.length} available</Text>
        </View>
        {visibleServices.map((svc, i, arr) => (
          <Pressable key={svc.id} style={[ds.svcRow, i < arr.length - 1 && ds.svcRowBorder]} onPress={() => router.push(route(`/service/${svc.id}`))}>
            <View style={ds.svcLeft}>
              <Icon name="checkmark-circle" size={16} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={ds.svcName}>{svc.title}</Text>
                <Text style={ds.svcMeta}>{svc.duration ?? '45 min'} · {svc.availability} · {svc.warranty ?? garage.warranty}</Text>
              </View>
            </View>
            <View style={ds.svcPriceWrap}>
              <Text style={ds.svcPrice}>{svc.price}</Text>
              <Pressable style={ds.svcBookPill} onPress={() => router.push(route(`/checkout/${svc.id}`))}>
                <Text style={ds.svcBookText}>Book</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </View>

      <PrimaryBtn label="Book this garage" onPress={handleBook} icon="calendar" />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY DETAIL
// ═══════════════════════════════════════════════════════════════
export function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = findCategory(id);
  const cc = categoryColors[id] ?? categoryColors.default;
  const matching = garages.filter((g) =>
    `${g.type} ${g.category}`.toLowerCase().includes(category.label.toLowerCase()) ||
    id === 'repair' || id === 'diagnostics'
  );
  const list = matching.length ? matching : garages;

  return (
    <Page title={category.label}>
      {/* Category hero */}
      <View style={[ds.catHero, { backgroundColor: cc.bg }]}>
        <View style={[ds.catHeroIcon, { backgroundColor: '#fff' }]}>
          <Icon name="construct" size={28} color={cc.icon} />
        </View>
        <View>
          <Text style={ds.eyebrow}>Service category</Text>
          <Text style={[ds.cardTitle, { color: cc.text }]}>{category.label}</Text>
          <Text style={[ds.cardMeta, { color: cc.icon }]}>{category.count} providers in Qatar</Text>
        </View>
      </View>

      <View style={ds.card}>
        <Text style={ds.sectionTitle}>Available garages</Text>
        {list.map((g) => (
          <GarageMini key={g.id} id={g.id} name={g.name} detail={`⭐ ${g.rating} · ${g.area}`} />
        ))}
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════
// JOB / SERVICE DETAIL
// ═══════════════════════════════════════════════════════════════
export function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = findJob(id);

  return (
    <Page title="Service details">
      <View style={ds.card}>
        <View style={ds.jobHeroRow}>
          <View style={[ds.jobHeroIcon, { backgroundColor: colors.primaryLight }]}>
            <Icon name="construct" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ds.eyebrow}>Popular job</Text>
            <Text style={ds.cardTitle}>{job.title}</Text>
          </View>
        </View>
        <InfoRow icon="pricetag-outline" label="Starting from" value={job.price} valueColor={colors.primary} />
        <InfoRow icon="time-outline"    label="Earliest slot" value={job.availability} />
        <InfoRow icon="business-outline" label="Providers"   value={`${garages.length} garages available`} />
      </View>

      <View style={ds.card}>
        <Text style={ds.sectionTitle}>What's included</Text>
        {['Inspection and diagnosis', 'Genuine parts or OEM equivalent', 'Digital service record', '30-day service guarantee'].map((item) => (
          <View key={item} style={ds.includedRow}>
            <Icon name="checkmark-circle" size={16} color={colors.success} />
            <Text style={ds.includedText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={ds.card}>
        <Text style={ds.sectionTitle}>Recommended garages</Text>
        {garages.slice(0, 3).map((g) => (
          <GarageMini key={g.id} id={g.id} name={g.name} detail={`${g.startingPrice} · ${g.responseTime}`} />
        ))}
      </View>

      <PrimaryBtn label="Book this service" onPress={() => router.push(route(`/checkout/${job.id}`))} icon="calendar" />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════
// CAR DETAIL / VEHICLE PASSPORT
// ═══════════════════════════════════════════════════════════════
export function CarDetailScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const car = findCar(id);

  const hColor = car.health >= 80 ? c.success : car.health >= 60 ? c.warning : c.danger;
  const hBg    = car.health >= 80 ? c.successBg : car.health >= 60 ? c.warningBg : c.dangerBg;
  const hLabel = car.health >= 80 ? 'Great condition' : car.health >= 60 ? 'Fair condition' : 'Needs attention';

  const specs = [
    { icon: 'speedometer-outline' as IoniconsName, label: 'Mileage',      value: car.mileage },
    { icon: 'calendar-outline'    as IoniconsName, label: 'Year',         value: car.year ?? '—' },
    { icon: 'color-palette-outline' as IoniconsName, label: 'Colour',     value: car.color ?? '—' },
    { icon: 'flash-outline'       as IoniconsName, label: 'Fuel',         value: car.fuelType ?? '—' },
    { icon: 'git-merge-outline'   as IoniconsName, label: 'Transmission', value: car.transmission ?? '—' },
    { icon: 'shield-checkmark-outline' as IoniconsName, label: 'Insurance', value: car.insurance ?? '—' },
  ];

  const history = car.serviceHistory ?? [];

  return (
    <SafeAreaView style={[cds.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Navbar ── */}
      <View style={[cds.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <AnimatedPressable style={[cds.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()} scaleValue={0.96}>
          <Icon name="arrow-back" size={20} color={c.text} />
        </AnimatedPressable>
        <Text style={[cds.navTitle, { color: c.text }]} numberOfLines={1}>{car.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={cds.content} showsVerticalScrollIndicator={false} style={{ backgroundColor: c.background }}>
        <MotionScreen>

          {/* ── Identity hero ── */}
          <View style={[cds.heroCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            {/* Top row: icon + name + health badge */}
            <View style={cds.heroTop}>
              <View style={[cds.carIcon, { backgroundColor: hBg }]}>
                <Icon name="car-sport" size={30} color={hColor} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[cds.carName, { color: c.text }]}>{car.name}</Text>
                {car.plate ? (
                  <View style={[cds.plateBadge, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Text style={[cds.plateText, { color: c.textSecondary }]}>{car.plate}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[cds.healthBadge, { backgroundColor: hBg }]}>
                <Text style={[cds.healthBadgeText, { color: hColor }]}>{hLabel}</Text>
              </View>
            </View>

            {/* VIN */}
            <View style={[cds.vinRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Icon name="barcode-outline" size={14} color={c.muted} />
              <Text style={[cds.vinLabel, { color: c.muted }]}>VIN</Text>
              <Text style={[cds.vinValue, { color: c.textSecondary }]}>{car.vin}</Text>
            </View>

            {/* Health bar */}
            <View style={cds.healthSection}>
              <View style={cds.healthLabelRow}>
                <Text style={[cds.healthLabel, { color: c.muted }]}>Vehicle health</Text>
                <Text style={[cds.healthPct, { color: hColor }]}>{car.health}%</Text>
              </View>
              <View style={[cds.healthTrack, { backgroundColor: c.surfaceAlt }]}>
                <View style={[cds.healthFill, { width: `${car.health}%` as any, backgroundColor: hColor }]} />
              </View>
            </View>
          </View>

          {/* ── Specs grid ── */}
          <View style={[cds.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[cds.sectionTitle, { color: c.text }]}>Specifications</Text>
            <View style={cds.specsGrid}>
              {specs.map((s) => (
                <View key={s.label} style={[cds.specCell, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <View style={[cds.specIconWrap, { backgroundColor: c.primaryLight }]}>
                    <Icon name={s.icon} size={15} color={c.primary} />
                  </View>
                  <Text style={[cds.specValue, { color: c.text }]}>{s.value}</Text>
                  <Text style={[cds.specLabel, { color: c.muted }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Next service alert ── */}
          <View style={[cds.alertCard, { backgroundColor: c.warningBg, borderColor: c.warning + '44' }]}>
            <View style={[cds.alertIcon, { backgroundColor: c.warning + '22' }]}>
              <Icon name="time-outline" size={20} color={c.warning} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[cds.alertTitle, { color: c.text }]}>Upcoming service</Text>
              <Text style={[cds.alertSub, { color: c.muted }]}>{car.nextService}</Text>
            </View>
            <AnimatedPressable
              style={[cds.alertBtn, { backgroundColor: c.warning }]}
              onPress={() => router.push(route(`/checkout/${car.id}`))}
              scaleValue={0.95}
            >
              <Text style={cds.alertBtnText}>Book</Text>
            </AnimatedPressable>
          </View>

          {/* ── Service history ── */}
          {history.length > 0 && (
            <View style={[cds.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={cds.sectionHeaderRow}>
                <Text style={[cds.sectionTitle, { color: c.text }]}>Service history</Text>
                <Text style={[cds.sectionCount, { color: c.muted }]}>{history.length} records</Text>
              </View>
              {history.map((entry, i) => (
                <View key={entry.label + i} style={[cds.historyRow, { borderBottomColor: c.border }, i === history.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[cds.historyDot, { backgroundColor: c.success }]} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={[cds.historyLabel, { color: c.text }]}>{entry.label}</Text>
                    <Text style={[cds.historyMeta, { color: c.muted }]}>{entry.km}</Text>
                  </View>
                  <Text style={[cds.historyDate, { color: c.muted }]}>{entry.date}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Last service ── */}
          {car.lastService && (
            <View style={[cds.infoRow, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Icon name="checkmark-circle-outline" size={18} color={c.success} />
              <Text style={[cds.infoRowLabel, { color: c.muted }]}>Last serviced</Text>
              <Text style={[cds.infoRowValue, { color: c.text }]}>{car.lastService}</Text>
            </View>
          )}

          {/* ── Book CTA ── */}
          <AnimatedPressable
            style={[cds.bookCta, { backgroundColor: c.primary }]}
            onPress={() => router.push(route(`/checkout/${car.id}`))}
            scaleValue={0.97}
          >
            <View style={cds.bookCtaIcon}>
              <Icon name="calendar-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cds.bookCtaTitle}>Book maintenance</Text>
              <Text style={cds.bookCtaSub}>Schedule a service at a QarWheels garage</Text>
            </View>
            <Icon name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </AnimatedPressable>

        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKING DETAIL
// ═══════════════════════════════════════════════════════════════
export function BookingDetailScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeBooking = useQarWheelsStore((s) => s.bookings.find((b) => b.id === id));
  const vendorInvoices = useQarWheelsStore((s) => s.vendorInvoices);
  const createVendorInvoice = useQarWheelsStore((s) => s.createVendorInvoice);
  const cancelBooking = useQarWheelsStore((s) => s.cancelBooking);
  const rescheduleBooking = useQarWheelsStore((s) => s.rescheduleBooking);
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const themedStatusColors = getThemedStatusColors(themeMode);
  const booking = storeBooking ?? findBooking(id);
  const sc = themedStatusColors[booking.status] ?? themedStatusColors.Pending;
  const currentIndex = getBookingStatusIndex(booking.status);
  const canModify = booking.status !== 'Cancelled' && booking.status !== 'Completed';
  const isCancelled = booking.status === 'Cancelled';
  const isCompleted = booking.status === 'Completed';

  const invoice = (() => {
    if (!isCompleted) return undefined;
    const vbid = booking.vendorBookingId;
    if (!vbid) return undefined;
    const found = vendorInvoices.find((inv) => inv.bookingId === vbid) ?? findVendorInvoiceByBooking(vbid);
    if (found) return found;
    try { return createVendorInvoice(vbid); } catch { return undefined; }
  })();

  function handleCancel() {
    if (!canModify || !storeBooking) return;
    Alert.alert(
      'Cancel booking?',
      'This will cancel the request for both you and the garage.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () => { cancelBooking(booking.id); void success(); },
        },
      ],
    );
  }

  function handleReschedule() {
    if (!canModify || !storeBooking) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const afterTomorrow = new Date();
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    const slots = [
      { label: 'Tomorrow, 10:00 AM', date: tomorrow, time: '10:00 AM' },
      { label: 'Tomorrow, 03:30 PM', date: tomorrow, time: '03:30 PM' },
      { label: 'Next day, 11:30 AM', date: afterTomorrow, time: '11:30 AM' },
    ];
    Alert.alert(
      'Reschedule booking',
      'Choose a new slot — the garage will reconfirm availability.',
      [
        { text: slots[0].label, onPress: () => rescheduleBooking(booking.id, { date: slots[0].label, bookingDate: slots[0].date.toISOString(), timeSlot: slots[0].time }) },
        { text: slots[1].label, onPress: () => rescheduleBooking(booking.id, { date: slots[1].label, bookingDate: slots[1].date.toISOString(), timeSlot: slots[1].time }) },
        { text: slots[2].label, onPress: () => rescheduleBooking(booking.id, { date: slots[2].label, bookingDate: slots[2].date.toISOString(), timeSlot: slots[2].time }) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  return (
    <SafeAreaView style={[bds.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Navbar ── */}
      <View style={[bds.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <AnimatedPressable style={[bds.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()} scaleValue={0.96}>
          <Icon name="arrow-back" size={20} color={c.text} />
        </AnimatedPressable>
        <Text style={[bds.navTitle, { color: c.text }]}>Booking</Text>
        <AnimatedPressable style={[bds.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push('/notifications')} scaleValue={0.96}>
          <Icon name="chatbubble-ellipses-outline" size={18} color={c.text} />
        </AnimatedPressable>
      </View>

      <ScrollView contentContainerStyle={bds.content} showsVerticalScrollIndicator={false} style={{ backgroundColor: c.background }}>
        <MotionScreen>

          {/* ── Hero card ── */}
          <View style={[bds.heroCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[bds.accentBar, { backgroundColor: sc.dot }]} />
            <View style={bds.heroBody}>
              <View style={[bds.statusPill, { backgroundColor: sc.bg }]}>
                <View style={[bds.statusDot, { backgroundColor: sc.dot }]} />
                <Text style={[bds.statusLabel, { color: sc.text }]}>{getBookingStatusLabel(booking.status)}</Text>
              </View>
              <Text style={[bds.heroService, { color: c.text }]}>{booking.service}</Text>
              <Text style={[bds.heroGarage, { color: c.textSecondary }]}>{booking.garage}</Text>
              <Text style={[bds.heroStatusDesc, { color: c.muted }]}>{getBookingStatusDescription(booking.status)}</Text>
              <View style={bds.chipsRow}>
                <View style={[bds.chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Icon name="time-outline" size={13} color={c.muted} />
                  <Text style={[bds.chipText, { color: c.textSecondary }]}>{booking.date}</Text>
                </View>
                <View style={[bds.chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Icon name="car-outline" size={13} color={c.muted} />
                  <Text style={[bds.chipText, { color: c.textSecondary }]}>{booking.vehicle}</Text>
                </View>
                {booking.totalAmount ? (
                  <View style={[bds.chip, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
                    <Icon name="wallet-outline" size={13} color={c.primary} />
                    <Text style={[bds.chipText, { color: c.primary }]}>QAR {booking.totalAmount}</Text>
                  </View>
                ) : null}
                {booking.paymentMethod ? (
                  <View style={[bds.chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Icon name="card-outline" size={13} color={c.muted} />
                    <Text style={[bds.chipText, { color: c.textSecondary }]}>{booking.paymentMethod}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── Invoice CTA (completed only) ── */}
          {invoice ? (
            <AnimatedPressable
              style={[bds.invoiceCta, { backgroundColor: c.surface, borderColor: c.primaryMid }]}
              onPress={() => router.push(`/invoice/${invoice.id}` as never)}
              scaleValue={0.97}
            >
              <View style={[bds.invoiceCtaIcon, { backgroundColor: c.primaryLight }]}>
                <Icon name="document-text" size={22} color={c.primary} />
              </View>
              <View style={bds.invoiceCtaBody}>
                <Text style={[bds.invoiceCtaTitle, { color: c.text }]}>Invoice ready</Text>
                <Text style={[bds.invoiceCtaSub, { color: c.muted }]}>
                  QAR {invoice.total.toFixed(2)} · Tap to view &amp; download PDF
                </Text>
              </View>
              <View style={[bds.invoiceCtaBadge, { backgroundColor: c.primaryLight }]}>
                <Text style={[bds.invoiceCtaBadgeText, { color: c.primary }]}>{invoice.status}</Text>
              </View>
            </AnimatedPressable>
          ) : null}

          {/* ── Progress stepper ── */}
          <View style={[bds.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[bds.sectionTitle, { color: c.text }]}>Progress</Text>
            {isCancelled ? (
              <View style={bds.cancelledRow}>
                <View style={[bds.stepDot, { backgroundColor: c.danger, width: 32, height: 32 }]}>
                  <Icon name="close" size={14} color="#fff" />
                </View>
                <Text style={[bds.stepLabel, { color: c.danger, fontWeight: '800' }]}>Booking cancelled</Text>
              </View>
            ) : (
              <View style={bds.stepperWrap}>
                {BOOKING_WORKFLOW.map((step, index) => {
                  const done = currentIndex >= index;
                  const active = currentIndex === index;
                  const isLast = index === BOOKING_WORKFLOW.length - 1;
                  return (
                    <View key={step.status} style={bds.stepRow}>
                      <View style={bds.stepLeft}>
                        <View style={[
                          bds.stepDot,
                          done
                            ? { backgroundColor: c.success }
                            : { backgroundColor: c.surfaceAlt, borderWidth: 2, borderColor: c.border },
                          active && !isCompleted && { backgroundColor: c.primary, borderWidth: 0 },
                        ]}>
                          {done
                            ? <Icon name="checkmark" size={11} color="#fff" />
                            : active && !isCompleted
                              ? <View style={bds.stepActivePulse} />
                              : null}
                        </View>
                        {!isLast && (
                          <View style={[bds.stepLine, { backgroundColor: done ? c.success : c.border }]} />
                        )}
                      </View>
                      <View style={[bds.stepContent, isLast && { paddingBottom: 0 }]}>
                        <Text style={[bds.stepLabel, { color: done ? c.text : c.muted, fontWeight: done ? '800' : '500' }]}>
                          {step.customerLabel}
                        </Text>
                        {active && !isCompleted && (
                          <Text style={[bds.stepSub, { color: c.primary }]}>In progress</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Quick actions grid ── */}
          <View style={bds.actionsGrid}>
            <AnimatedPressable
              style={[bds.actionCard, { backgroundColor: c.surface, borderColor: c.border, opacity: canModify ? 1 : 0.45 }]}
              onPress={handleReschedule}
              scaleValue={0.96}
            >
              <View style={[bds.actionCardIcon, { backgroundColor: c.primaryLight }]}>
                <Icon name="calendar-outline" size={20} color={c.primary} />
              </View>
              <Text style={[bds.actionCardLabel, { color: c.text }]}>Reschedule</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[bds.actionCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => { void success(); }}
              scaleValue={0.96}
            >
              <View style={[bds.actionCardIcon, { backgroundColor: c.successBg }]}>
                <Icon name="add-circle-outline" size={20} color={c.success} />
              </View>
              <Text style={[bds.actionCardLabel, { color: c.text }]}>Calendar</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[bds.actionCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => router.push('/notifications')}
              scaleValue={0.96}
            >
              <View style={[bds.actionCardIcon, { backgroundColor: c.aiBg }]}>
                <Icon name="chatbubble-ellipses-outline" size={20} color={c.ai} />
              </View>
              <Text style={[bds.actionCardLabel, { color: c.text }]}>Message</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[bds.actionCard, { backgroundColor: c.surface, borderColor: c.border, opacity: canModify ? 1 : 0.45 }]}
              onPress={handleCancel}
              scaleValue={0.96}
            >
              <View style={[bds.actionCardIcon, { backgroundColor: c.dangerBg }]}>
                <Icon name="close-circle-outline" size={20} color={c.danger} />
              </View>
              <Text style={[bds.actionCardLabel, { color: isCancelled ? c.muted : c.danger }]}>
                {isCancelled ? 'Cancelled' : 'Cancel'}
              </Text>
            </AnimatedPressable>
          </View>

        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
export function NotificationsScreen() {
  const notifications = useQarWheelsStore((s) => s.notifications);
  const markRead      = useQarWheelsStore((s) => s.markNotificationsRead);
  const unread        = notifications.filter((n) => !n.read).length;

  return (
    <Page title="Notifications">
      {unread > 0 && (
        <PrimaryBtn
          label={`Mark all ${unread} as read`}
          onPress={() => { markRead(); void success(); }}
          icon="checkmark-done-outline"
        />
      )}

      {notifications.map((n) => (
        <View key={n.id} style={[ds.notifCard, !n.read && ds.notifUnread]}>
          <View style={[ds.notifIcon, { backgroundColor: n.read ? colors.surfaceAlt : colors.primaryLight }]}>
            <Icon
              name={n.read ? 'notifications-outline' : 'notifications'}
              size={18}
              color={n.read ? colors.muted : colors.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[ds.notifTitle, !n.read && { color: colors.primary }]}>{n.title}</Text>
            <Text style={ds.notifBody}>{n.body}</Text>
          </View>
          {!n.read && <View style={ds.unreadDot} />}
        </View>
      ))}

      {notifications.length === 0 && (
        <View style={ds.emptyState}>
          <Icon name="notifications-off-outline" size={40} color={colors.muted} />
          <Text style={ds.emptyTitle}>No notifications</Text>
          <Text style={ds.emptyDesc}>We'll let you know when something needs your attention.</Text>
        </View>
      )}
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS DETAIL
// ═══════════════════════════════════════════════════════════════
export function SettingsDetailScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const normalized  = decodeURIComponent(section ?? 'settings').replaceAll('-', ' ');
  const language    = useQarWheelsStore((s) => s.language);
  const setLanguage = useQarWheelsStore((s) => s.setLanguage);
  const favorites   = useQarWheelsStore((s) => s.favoriteGarageIds);

  return (
    <Page title={normalized.replace(/\b\w/g, (c) => c.toUpperCase())}>
      <View style={ds.card}>
        <Text style={ds.eyebrow}>Account setting</Text>
        <Text style={ds.cardTitle}>{normalized.replace(/\b\w/g, (c) => c.toUpperCase())}</Text>
        <Text style={ds.cardMeta}>
          This area is connected to your profile and will be fully wired to the production backend.
        </Text>
      </View>

      {/* Language picker */}
      {normalized.includes('language') && (
        <View style={ds.card}>
          <Text style={ds.sectionTitle}>Language</Text>
          {(['en', 'ar'] as const).map((lang) => {
            const selected = language === lang;
            return (
              <Pressable
                key={lang}
                style={[ds.langRow, selected && ds.langRowActive]}
                onPress={() => { setLanguage(lang); void success(); }}
              >
                <Text style={ds.langFlag}>{lang === 'en' ? '🇬🇧' : '🇶🇦'}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[ds.langName, selected && { color: colors.primary }]}>
                    {lang === 'en' ? 'English' : 'عربي (Arabic)'}
                  </Text>
                  <Text style={ds.langSub}>{lang === 'en' ? 'Left-to-right layout' : 'Right-to-left layout'}</Text>
                </View>
                {selected && <Icon name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Saved garages */}
      {normalized.includes('saved') && (
        <View style={ds.card}>
          <Text style={ds.sectionTitle}>Saved garages</Text>
          {favorites.length === 0 ? (
            <View style={ds.emptyState}>
              <Icon name="heart-outline" size={32} color={colors.muted} />
              <Text style={ds.emptyDesc}>No saved garages yet. Tap ♥ on any garage.</Text>
            </View>
          ) : (
            <Text style={ds.cardMeta}>{favorites.length} garage{favorites.length !== 1 ? 's' : ''} saved.</Text>
          )}
        </View>
      )}
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
// ── Car detail stylesheet ──────────────────────────────────────
const cds = StyleSheet.create({
  safe:  { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn:  { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4, flex: 1, textAlign: 'center' },
  content: { padding: spacing.page, gap: 14, paddingBottom: 48 },

  // Hero
  heroCard:  { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 14, ...shadow.sm },
  heroTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  carIcon:   { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  carName:   { fontSize: 18, fontWeight: '900', letterSpacing: -0.3, lineHeight: 22 },
  plateBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.sm, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 2,
  },
  plateText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  healthBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  healthBadgeText: { fontSize: 11, fontWeight: '900' },

  vinRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  vinLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  vinValue: { flex: 1, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  healthSection: { gap: 8 },
  healthLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  healthLabel: { fontSize: 12, fontWeight: '700' },
  healthPct:   { fontSize: 14, fontWeight: '900' },
  healthTrack: { height: 6, borderRadius: 99, overflow: 'hidden' },
  healthFill:  { height: '100%', borderRadius: 99 },

  // Specs
  section:       { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.xs },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:  { ...typography.h4 },
  sectionCount:  { fontSize: 12, fontWeight: '700' },

  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  specCell: {
    flexGrow: 1, flexShrink: 1, flexBasis: '30%',
    borderRadius: radius.lg, borderWidth: 1,
    padding: 12, gap: 6, alignItems: 'flex-start',
  },
  specIconWrap: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  specValue:   { fontSize: 13, fontWeight: '800', lineHeight: 18 },
  specLabel:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Alert card
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs,
  },
  alertIcon:    { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  alertTitle:   { fontSize: 14, fontWeight: '800' },
  alertSub:     { fontSize: 12, fontWeight: '500' },
  alertBtn:     { borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  alertBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },

  // History
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyDot:   { width: 8, height: 8, borderRadius: 4 },
  historyLabel: { fontSize: 13, fontWeight: '700' },
  historyMeta:  { fontSize: 11, fontWeight: '500' },
  historyDate:  { fontSize: 12, fontWeight: '700' },

  // Info row (single line)
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs,
  },
  infoRowLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  infoRowValue: { fontSize: 13, fontWeight: '800' },

  // Book CTA
  bookCta: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: radius.xl, padding: 16, ...shadow.primary,
  },
  bookCtaIcon:  { width: 40, height: 40, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bookCtaTitle: { fontSize: 15, fontWeight: '900', color: '#fff' },
  bookCtaSub:   { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.72)', marginTop: 1 },
});

// ── Booking detail stylesheet ──────────────────────────────────
const bds = StyleSheet.create({
  safe:    { flex: 1 },
  navbar:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn:  { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4, color: colors.text },

  content: { padding: spacing.page, gap: 14, paddingBottom: 48 },

  // Hero card
  heroCard: {
    borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.sm,
  },
  accentBar: { height: 4, width: '100%' },
  heroBody:  { padding: 18, gap: 10 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  heroService: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, lineHeight: 26 },
  heroGarage:  { fontSize: 14, fontWeight: '600' },
  heroStatusDesc: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.full, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  // Invoice CTA
  invoiceCta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1.5,
    padding: 14, ...shadow.sm,
  },
  invoiceCtaIcon:      { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  invoiceCtaBody:      { flex: 1, gap: 2 },
  invoiceCtaTitle:     { fontSize: 15, fontWeight: '900' },
  invoiceCtaSub:       { fontSize: 12, fontWeight: '500' },
  invoiceCtaBadge:     { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  invoiceCtaBadgeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },

  // Section
  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.xs },
  sectionTitle: { ...typography.h4, color: colors.text },

  // Stepper
  stepperWrap: { gap: 0 },
  stepRow:     { flexDirection: 'row', gap: 12 },
  stepLeft:    { alignItems: 'center', width: 28 },
  stepDot:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepActivePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  stepLine:    { flex: 1, width: 2, minHeight: 20, marginVertical: 2 },
  stepContent: { flex: 1, paddingBottom: 18, justifyContent: 'center' },
  stepLabel:   { fontSize: 14, color: colors.text },
  stepSub:     { fontSize: 11, fontWeight: '700', marginTop: 1 },
  cancelledRow:{ flexDirection: 'row', alignItems: 'center', gap: 12 },

  // 2×2 action grid — equal columns, gap accounted for
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard:  {
    flexGrow: 1, flexShrink: 1, flexBasis: '45%',
    borderRadius: radius.xl, borderWidth: 1,
    padding: 14, gap: 10, alignItems: 'flex-start', ...shadow.xs,
  },
  actionCardIcon:  { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionCardLabel: { fontSize: 13, fontWeight: '800' },
});

const ds = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen:   { flex: 1, backgroundColor: colors.background },
  content:  { padding: spacing.page, paddingBottom: 72, gap: 16 },

  // Nav bar
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.background,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    ...shadow.xs,
  },
  navTitle: { ...typography.h4, color: colors.text, flex: 1, textAlign: 'center' },

  // Hero image
  heroWrap:     { borderRadius: radius.xl, overflow: 'hidden', height: 220, ...shadow.md },
  heroImage:    { ...StyleSheet.absoluteFillObject },
  heroOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
  heroStatusRow: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  openBadge:    {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  openDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  openText:     { color: '#fff', fontSize: 11, fontWeight: '800' },
  heroRatingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  heroRatingText: { color: '#fff', fontSize: 11, fontWeight: '900' },

  // Cards
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing.cardPad, gap: 10,
    ...shadow.sm,
  },
  eyebrow:     { ...typography.overline, color: colors.primary },
  cardTitle:   { ...typography.h2, color: colors.text },
  cardMeta:    { ...typography.body, color: colors.muted, lineHeight: 21 },
  sectionTitle: { ...typography.h3, color: colors.text },

  // Fact chips
  factChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  factChip:   {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  factChipText: { ...typography.caption, color: colors.textSecondary },

  // Tags
  tagRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tagPill: {
    backgroundColor: colors.primaryLight, borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { color: colors.primary, fontSize: 11, fontWeight: '900' },

  // Discovery context
  discoveryMetrics: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  discoveryMetric: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  discoveryMetricValue: { ...typography.h4, color: colors.text },
  discoveryMetricLabel: { ...typography.caption, color: colors.muted },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionMeta: { ...typography.caption, color: colors.muted, fontWeight: '900' },

  // Info rows
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  infoIcon:  { width: 28, alignItems: 'center' },
  infoLabel: { ...typography.bodySm, color: colors.muted, flex: 1 },
  infoValue: { ...typography.bodySm, color: colors.text, fontWeight: '700' },

  // Action rows
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionIcon:  { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, ...typography.h4, color: colors.text },

  // Garage action panel
  garageActionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadow.sm,
  },
  garageActionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  garageActionMeta: { ...typography.caption, color: colors.muted, lineHeight: 17 },
  garageActionPrice: { alignItems: 'flex-end', gap: 2 },
  garageActionPriceLabel: { ...typography.caption, color: colors.muted, fontWeight: '900' },
  garageActionPriceValue: { ...typography.h4, color: colors.primary },
  garagePrimaryAction: {
    minHeight: 62,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    ...shadow.primary,
  },
  garagePrimaryIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  garagePrimaryTitle: { color: '#fff', ...typography.h4 },
  garagePrimarySub: { color: 'rgba(255,255,255,0.74)', ...typography.caption, marginTop: 2 },
  garageContactGrid: { flexDirection: 'row', gap: 10 },
  garageContactButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  garageContactText: { color: colors.primary, ...typography.caption, fontWeight: '900' },
  garageUtilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  garageUtilityButton: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  garageUtilityText: { ...typography.caption, color: colors.textSecondary, fontWeight: '900' },

  // Services list
  svcRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  svcRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  svcLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  svcName:      { ...typography.h4, color: colors.text },
  svcMeta:      { ...typography.caption, color: colors.muted, marginTop: 2 },
  svcPriceWrap: { alignItems: 'flex-end', gap: 5, marginLeft: 8 },
  svcPrice:     { ...typography.h4, color: colors.primary },
  svcBookPill:  { minWidth: 52, height: 28, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  svcBookText:  { color: '#fff', ...typography.caption, fontWeight: '900' },

  // Garage mini
  miniCard:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  miniThumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  miniBody:  { flex: 1, gap: 2 },
  miniName:  { ...typography.h4, color: colors.text },
  miniDetail: { ...typography.caption, color: colors.muted },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 56, borderRadius: radius.xl, backgroundColor: colors.primary, paddingHorizontal: 16, ...shadow.primary,
  },
  primaryBtnText: { color: '#fff', ...typography.h4 },

  // Status card
  statusCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, padding: spacing.cardPad, gap: 10, ...shadow.sm,
  },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '900' },

  // Timeline
  timelineRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  timelineDot:   { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineLabel: { ...typography.h4, color: colors.text },

  // Vehicle hero
  vehicleHero: {
    borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.sm,
  },
  vehicleHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon:    { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  healthBadge:    { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  healthBadgeText: { fontSize: 11, fontWeight: '900' },
  healthBarWrap:  { gap: 6 },
  healthBarRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  healthBarLabel: { ...typography.caption, color: colors.muted },
  healthBarValue: { ...typography.caption, fontWeight: '900' },
  healthTrack:    { height: 8, borderRadius: 99, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  healthFill:     { height: '100%', borderRadius: 99 },

  vehicleStats: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  vehicleStat:      { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  vehicleStatValue: { fontSize: 16, fontWeight: '900', color: colors.text },
  vehicleStatLabel: { ...typography.label, color: colors.muted },

  nextSvcRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  historyRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  historyDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  historyText:   { ...typography.bodySm, color: colors.textSecondary },

  // Category hero
  catHero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.xl, padding: 16 },
  catHeroIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', ...shadow.sm },

  // Job hero
  jobHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobHeroIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

  includedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  includedText: { ...typography.body, color: colors.textSecondary, flex: 1 },

  // Notifications
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, padding: 14, ...shadow.xs,
  },
  notifUnread: { borderColor: colors.borderFocus, backgroundColor: '#F0F7FF' },
  notifIcon:   { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  notifTitle:  { ...typography.h4, color: colors.text },
  notifBody:   { ...typography.bodySm, color: colors.muted, lineHeight: 19 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  // Shared stat divider
  statDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptyDesc:  { ...typography.body, color: colors.muted, textAlign: 'center' },

  // Language
  langRow:      {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: colors.border,
    borderRadius: radius.sm,
  },
  langRowActive: { backgroundColor: colors.primaryLight },
  langFlag:     { fontSize: 24 },
  langName:     { ...typography.h4, color: colors.text },
  langSub:      { ...typography.caption, color: colors.muted },
});
