/**
 * QarWheel 2026 — Detail & modal screen components
 * All push/modal destination screens.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  lookupBooking,
  lookupCar,
  lookupCategory,
} from '@/lib/marketplace';
import { useBranches, useGarage, useBranchServices, cancelBooking as cancelRemoteBooking } from '@/lib/firestoreOps';
import RecordNotFound from '@/components/RecordNotFound';
import { findVendorInvoiceByBooking } from '@/lib/vendor-data';
import { categoryColors, colors, getThemedStatusColors, radius, shadow, spacing, statusColors, typography } from '@/lib/theme';
import { useQarColors } from '@/lib/store';
import { success, tap } from '@/lib/haptics';
import { useTranslation } from '@/lib/i18n';
import { promptRestartForRTL } from '@/lib/i18n/restart';
import { useQarWheelStore } from '@/lib/store';
import AnimatedPressable from '@/components/AnimatedPressable';
import { RemoteImage } from '@/components/RemoteImage';
import { MotionScreen } from '@/lib/motion';
import { garageDistanceLabel } from '@/lib/marketplace-display';
import {
  BOOKING_WORKFLOW,
  getBookingStatusDescription,
  getBookingStatusIndex,
  getBookingStatusLabel,
  actorAllowedTransitions,
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
  const c = useQarColors();
  const router = useRouter();
  return (
    <SafeAreaView style={[ds.safeArea, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Nav bar */}
      <View style={[ds.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <AnimatedPressable style={[ds.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()} hitSlop={8} scaleValue={0.96}>
          <Icon name="chevron-back" size={20} color={c.text} />
        </AnimatedPressable>
        <Text style={[ds.navTitle, { color: c.text }]} numberOfLines={1}>{title}</Text>
        <View style={[ds.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}>{rightAction ?? null}</View>
      </View>

      <ScrollView
        style={[ds.screen, { backgroundColor: c.background }]}
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
  const c = useQarColors();
  return (
    <AnimatedPressable style={[ds.primaryBtn, { backgroundColor: c.primary }]} onPress={onPress} scaleValue={0.96}>
      {icon && <Icon name={icon} size={18} color="#fff" />}
      <Text style={ds.primaryBtnText}>{label}</Text>
    </AnimatedPressable>
  );
}

// ── Info row ──────────────────────────────────────────────────────
function InfoRow({ icon, label, value, valueColor }: {
  icon: IoniconsName; label: string; value: string; valueColor?: string;
}) {
  const c = useQarColors();
  return (
    <View style={ds.infoRow}>
      <View style={ds.infoIcon}>
        <Icon name={icon} size={15} color={c.muted} />
      </View>
      <Text style={[ds.infoLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[ds.infoValue, { color: c.text }, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ── Mini garage row ───────────────────────────────────────────────
function GarageMini({ id, name, detail }: { id: string; name: string; detail: string }) {
  const c = useQarColors();
  const router = useRouter();
  // Only the thumbnail comes from the record; the name and detail are passed
  // in. An unknown id therefore degrades to a plain tile rather than showing
  // another garage's photo next to this garage's name.
  const { garage } = useGarage(id);

  return (
    <AnimatedPressable style={[ds.miniCard, { borderTopColor: c.border }]} onPress={() => router.push(route(`/garage/${id}`))} scaleValue={0.98}>
      {garage ? (
        <Image source={{ uri: garage.imageUrl }} style={[ds.miniThumb, { backgroundColor: c.surfaceAlt }]} resizeMode="cover" />
      ) : (
        <View style={[ds.miniThumb, { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
          <Icon name="business-outline" size={18} color={c.muted} />
        </View>
      )}
      <View style={ds.miniBody}>
        <Text style={[ds.miniName, { color: c.text }]}>{name}</Text>
        <Text style={[ds.miniDetail, { color: c.muted }]}>{detail}</Text>
      </View>
      <Icon name="chevron-forward" size={16} color={c.muted} />
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
  const c = useQarColors();
  return (
    <AnimatedPressable style={[ds.actionRow, { borderTopColor: c.border }, noBorderTop && { borderTopWidth: 0 }]} onPress={() => { void tap(); onPress(); }} scaleValue={0.98}>
      <View style={[ds.actionIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={17} color={iconColor} />
      </View>
      <Text style={[ds.actionLabel, { color: dangerous ? c.danger : c.text }]}>{label}</Text>
      <Icon name="chevron-forward" size={16} color={dangerous ? c.danger : c.muted} />
    </AnimatedPressable>
  );
}

// ═══════════════════════════════════════════════════════════════
// GARAGE DETAIL
// ═══════════════════════════════════════════════════════════════
export function GarageDetailScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { garage, loading: garageLoading } = useGarage(id);
  const { services: garageServices } = useBranchServices(id ?? '');
  // Hooks must run before the guard below, so read favourites defensively.
  const isFav = useQarWheelStore((s) => (garage ? s.favoriteGarageIds.includes(garage.id) : false));
  const toggleFav = useQarWheelStore((s) => s.toggleFavoriteGarage);

  if (!garage && garageLoading) return null;
  if (!garage) {
    return (
      <RecordNotFound
        title="Garage not found"
        message="This garage may no longer be listed on QarWheel."
      />
    );
  }

  const handleBook = () => router.push(route(`/checkout/${garage.id}`));
  const visibleServices = garageServices;

  return (
    <Page
      title={garage.name}
      rightAction={
        <Pressable onPress={() => { void tap(); toggleFav(garage.id); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={isFav ? `Remove ${garage.name} from saved` : `Save ${garage.name}`} accessibilityState={{ selected: isFav }}>
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
        <RemoteImage uri={garage.imageUrl} style={ds.heroImage} fallbackIcon="business-outline" accessibilityLabel={`${garage.name} workshop`} />
        {/* Status overlay */}
        <View style={ds.heroStatusRow}>
          <View style={ds.openBadge}>
            <View style={[ds.openDot, !garage.openNow && { backgroundColor: c.warning }]} />
            <Text style={ds.openText}>{garage.openNow === null ? 'Hours unavailable' : garage.openNow ? 'Open now' : 'Closed now'}</Text>
          </View>
          {garage.verified ? <View style={ds.heroVerified}><Icon name="shield-checkmark" size={14} color="#fff" /><Text style={ds.heroVerifiedText}>Verified partner</Text></View> : <View />}
        </View>
        <View style={ds.heroIdentity}>
          <Text style={ds.heroName}>{garage.name}</Text>
          <View style={ds.heroMeta}>
            {garage.rating > 0 ? <><Icon name="star" size={15} color="#F7C948" /><Text style={ds.heroMetaText}>{garage.rating} ({garage.reviews})</Text></> : null}
            <Icon name="location-outline" size={15} color="#fff" />
            <Text style={ds.heroMetaText}>{garage.area} · {garageDistanceLabel(garage.distanceKm)}</Text>
          </View>
        </View>
      </View>

      <View style={ds.garageSummary}>
        <Text style={[ds.eyebrow, { color: c.primary }]}>{garage.type}</Text>

        <View style={ds.factChips}>
          <View style={[ds.factChip, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="location" size={13} color={c.muted} />
            <Text style={[ds.factChipText, { color: c.textSecondary }]}>{garageDistanceLabel(garage.distanceKm)} · {garage.area}</Text>
          </View>
          <View style={[ds.factChip, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="time-outline" size={13} color={c.muted} />
            <Text style={[ds.factChipText, { color: c.textSecondary }]}>{garage.responseTime === 'Response time unavailable' ? garage.responseTime : `${garage.responseTime} response`}</Text>
          </View>
          <View style={[ds.factChip, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="pricetag-outline" size={13} color={c.primary} />
            <Text style={[ds.factChipText, { color: c.primary, fontWeight: '700' }]}>
              {garage.startingPriceValue > 0 ? `From ${garage.startingPrice}` : garage.startingPrice}
            </Text>
          </View>
          <View style={[ds.factChip, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="calendar-outline" size={13} color={c.success} />
            <Text style={[ds.factChipText, { color: c.success, fontWeight: '800' }]}>
              Time confirmed after request
            </Text>
          </View>
        </View>

        <InfoRow icon="car-outline" label="Category" value={garage.category} />
        <InfoRow icon="shield-checkmark-outline" label="Warranty" value={garage.warranty} valueColor={c.success} />
        <InfoRow icon="navigate-outline" label="Pickup" value={garage.pickupAvailable ? 'Pickup and drop-off available' : 'Drop-off booking'} />

        <View style={ds.tagRow}>
          {garage.tags.map((tag) => (
            <View key={tag} style={[ds.tagPill, { backgroundColor: c.primaryLight }]}>
              <Text style={[ds.tagText, { color: c.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick actions */}
      <View style={[ds.garageActionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={ds.garageActionHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[ds.sectionTitle, { color: c.text }]}>Request a service</Text>
            <Text style={[ds.garageActionMeta, { color: c.muted }]}>{garage.responseTime === 'Response time unavailable' ? garage.responseTime : `${garage.responseTime} average response`}{garage.warranty ? ` · ${garage.warranty}` : ''}</Text>
          </View>
          <View style={ds.garageActionPrice}>
            <Text style={[ds.garageActionPriceLabel, { color: c.muted }]}>{garage.startingPriceValue > 0 ? 'Listed from' : 'Price'}</Text>
            <Text style={[ds.garageActionPriceValue, { color: c.primary }]}>{garage.startingPrice}</Text>
          </View>
        </View>

        <AnimatedPressable style={[ds.garagePrimaryAction, { backgroundColor: c.primary }]} onPress={handleBook} scaleValue={0.98} accessibilityRole="button" accessibilityLabel={`Choose service and preferred time at ${garage.name}`}>
          <View style={ds.garagePrimaryIcon}>
            <Icon name="calendar" size={18} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ds.garagePrimaryTitle}>Choose service and time</Text>
            <Text style={ds.garagePrimarySub}>The garage confirms your request</Text>
          </View>
          <Icon name="arrow-forward" size={18} color="#fff" />
        </AnimatedPressable>

        <View style={ds.garageContactGrid}>
          <Pressable style={[ds.garageContactButton, { borderColor: c.primaryMid, backgroundColor: c.primaryLight }]} onPress={() => router.push(route(`/chat/${garage.id}`))} accessibilityRole="button" accessibilityLabel={`Message ${garage.name}`}>
            <Icon name="chatbubble-ellipses-outline" size={17} color={c.primary} />
            <Text style={[ds.garageContactText, { color: c.primary }]}>Message</Text>
          </Pressable>
          <Pressable style={[ds.garageContactButton, { borderColor: c.primaryMid, backgroundColor: c.primaryLight }]} onPress={() => router.push('/map')} accessibilityRole="button" accessibilityLabel={`See ${garage.name} on map`}>
            <Icon name="navigate-outline" size={17} color={c.primary} />
            <Text style={[ds.garageContactText, { color: c.primary }]}>Directions</Text>
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
            <Pressable key={item.label} style={[ds.garageUtilityButton, { borderColor: c.border, backgroundColor: c.surfaceAlt }]} onPress={item.onPress}>
              <Icon name={item.icon} size={16} color={item.label === 'Saved' ? c.danger : c.textSecondary} />
              <Text style={[ds.garageUtilityText, { color: c.textSecondary }, item.label === 'Saved' && { color: c.danger }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Services preview */}
      <View style={ds.garageServices}>
        <View style={ds.sectionHeaderRow}>
          <Text style={[ds.sectionTitle, { color: c.text }]}>Bookable services</Text>
          <Text style={[ds.sectionMeta, { color: c.muted }]}>{visibleServices.length} listed</Text>
        </View>
        {visibleServices.length === 0 ? <Text style={[ds.cardMeta, { color: c.textSecondary }]}>No services listed yet. Message the garage to ask about your repair.</Text> : null}
        {visibleServices.map((svc, i, arr) => (
          <View key={svc.id} style={[ds.svcRow, i < arr.length - 1 && [ds.svcRowBorder, { borderBottomColor: c.border }]]}>
            <Pressable style={ds.svcLeft} onPress={() => router.push(route(`/service/${svc.id}`))}
              accessibilityRole="button" accessibilityLabel={`View ${svc.title} details`}>
              <Icon name="checkmark-circle" size={16} color={c.success} />
              <View style={{ flex: 1 }}>
                <Text style={[ds.svcName, { color: c.text }]}>{svc.title}</Text>
                <Text style={[ds.svcMeta, { color: c.muted }]}>{[svc.duration, svc.availability, svc.warranty ?? garage.warranty].filter(Boolean).join(' · ')}</Text>
              </View>
            </Pressable>
            <View style={ds.svcPriceWrap}>
              <Text style={[ds.svcPrice, { color: c.primary }]}>{svc.price}</Text>
              <Pressable style={[ds.svcBookPill, { backgroundColor: c.primary }]} onPress={() => router.push(route(`/checkout/${svc.id}`))}
                accessibilityRole="button" accessibilityLabel={`Book ${svc.title}`}>
                <Text style={ds.svcBookText}>Book</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY DETAIL
// ═══════════════════════════════════════════════════════════════
export function CategoryDetailScreen() {
  const c = useQarColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = lookupCategory(id);
  const { vendors } = useBranches();

  if (!category) {
    return (
      <RecordNotFound
        title="Category not found"
        message="This service category is no longer available."
      />
    );
  }

  const cc = categoryColors[id] ?? categoryColors.default;
  const matching = vendors.filter((g) =>
    `${g.type} ${g.category}`.toLowerCase().includes(category.label.toLowerCase()) ||
    id === 'repair' || id === 'diagnostics'
  );
  const list = matching.length ? matching : vendors;

  return (
    <Page title={category.label}>
      {/* Category hero */}
      <View style={[ds.catHero, { backgroundColor: cc.bg }]}>
        <View style={[ds.catHeroIcon, { backgroundColor: '#fff' }]}>
          <Icon name="construct" size={28} color={cc.icon} />
        </View>
        <View>
          <Text style={[ds.eyebrow, { color: c.primary }]}>Service category</Text>
          <Text style={[ds.cardTitle, { color: cc.text }]}>{category.label}</Text>
          <Text style={[ds.cardMeta, { color: cc.icon }]}>{category.count} providers in Qatar</Text>
        </View>
      </View>

      <View style={[ds.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[ds.sectionTitle, { color: c.text }]}>Available garages</Text>
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
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vendors, jobs, loading } = useBranches({ includeServices: true });
  const job = jobs.find((j) => j.id === id);

  if (!job) {
    if (loading) return null;
    return (
      <RecordNotFound
        title="Service not found"
        message="This service is no longer offered."
      />
    );
  }

  return (
    <Page title="Service details">
      <View style={[ds.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={ds.jobHeroRow}>
          <View style={[ds.jobHeroIcon, { backgroundColor: c.primaryLight }]}>
            <Icon name="construct" size={24} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ds.eyebrow, { color: c.primary }]}>Popular job</Text>
            <Text style={[ds.cardTitle, { color: c.text }]}>{job.title}</Text>
          </View>
        </View>
        <InfoRow icon="pricetag-outline" label="Starting from" value={job.price} valueColor={c.primary} />
        <InfoRow icon="time-outline"    label="Earliest slot" value={job.availability} />
        <InfoRow icon="business-outline" label="Providers"   value={`${vendors.length} garages available`} />
      </View>

      <View style={[ds.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[ds.sectionTitle, { color: c.text }]}>What's included</Text>
        {['Inspection and diagnosis', 'Genuine parts or OEM equivalent', 'Digital service record', '30-day service guarantee'].map((item) => (
          <View key={item} style={ds.includedRow}>
            <Icon name="checkmark-circle" size={16} color={c.success} />
            <Text style={[ds.includedText, { color: c.textSecondary }]}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={[ds.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[ds.sectionTitle, { color: c.text }]}>Recommended garages</Text>
        {vendors.slice(0, 3).map((g) => (
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
  const car = lookupCar(id);

  // No hooks below this point, so an early return is safe. Previously
  // `findCar` fell back to the first seed vehicle, showing someone else's car
  // under a deleted id.
  if (!car) {
    return (
      <RecordNotFound
        title="Vehicle not found"
        message="This vehicle may have been removed from your garage."
      />
    );
  }

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
    <SafeAreaView style={[cds.safe, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Navbar ──
          Sits in normal flow rather than floating: an absolutely-positioned bar
          inside SafeAreaView overlapped the first card, and the compensating
          paddingTop was on `style` (the scroll viewport) instead of
          `contentContainerStyle`, so it never offset the content. */}
      <View style={[cds.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <AnimatedPressable
          style={[cds.navBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.back()}
          scaleValue={0.96}
          accessibilityLabel="Go back"
        >
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
            {/* No Book button here — the sticky bar below owns that action, and
                two competing CTAs made the top of the screen feel crowded. */}
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

        </MotionScreen>
      </ScrollView>

      {/* ── Sticky action bar ──
          Booking is the reason people open this screen, so the CTA stays
          reachable at the thumb rather than sitting in the header (where it
          competed with Back) or at the end of a long scroll. */}
      <View style={[cds.actionBar, { backgroundColor: c.background, borderTopColor: c.border }]}>
        <AnimatedPressable
          style={[cds.bookCta, { backgroundColor: c.primary }]}
          onPress={() => router.push(route(`/checkout/${car.id}`))}
          scaleValue={0.97}
          accessibilityLabel={`Book maintenance for ${car.name}`}
        >
          <View style={cds.bookCtaIcon}>
            <Icon name="calendar-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cds.bookCtaTitle}>Book maintenance</Text>
            <Text style={cds.bookCtaSub}>Schedule a service at a QarWheel garage</Text>
          </View>
          <Icon name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </AnimatedPressable>
      </View>
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
  const storeBooking = useQarWheelStore((s) => s.bookings.find((b) => b.id === id));
  const vendorInvoices = useQarWheelStore((s) => s.vendorInvoices);
  const createVendorInvoice = useQarWheelStore((s) => s.createVendorInvoice);
  const cancelBooking = useQarWheelStore((s) => s.cancelBooking);
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const themedStatusColors = getThemedStatusColors(themeMode);
  // Prefer the user's own booking; the seed lookup is strict so a stale link
  // cannot render somebody else's appointment under this id.
  const booking = storeBooking ?? lookupBooking(id);

  if (!booking) {
    return (
      <RecordNotFound
        title="Booking not found"
        message="This booking may have been cancelled or removed."
      />
    );
  }

  const sc = themedStatusColors[booking.status] ?? themedStatusColors.Pending;
  const currentIndex = getBookingStatusIndex(booking.status);
  const canModify = actorAllowedTransitions('customer', booking.status).includes('Cancelled');
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
          onPress: async () => {
            try {
              await cancelRemoteBooking(storeBooking.id);
              cancelBooking(storeBooking.id);
              void success();
            } catch {
              Alert.alert('Cancellation failed', 'Your booking has not been cancelled. Please retry.');
            }
          },
        },
      ],
    );
  }

  function handleReschedule() {
    if (!canModify || !storeBooking) return;
    Alert.alert('Reschedule with the garage', 'Contact the garage to agree on a new time. Your current booking remains unchanged.');
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
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Message garage" style={[bds.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push(booking.garageId ? route(`/chat/${booking.garageId}`) : '/messages')} scaleValue={0.96}>
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
              <Text style={[bds.heroService, { color: c.text }]}>{booking.service || 'Service'}</Text>
              <Text style={[bds.heroGarage, { color: c.textSecondary }]}>{booking.garage || 'Garage'}</Text>
              <Text style={[bds.heroStatusDesc, { color: c.muted }]}>{getBookingStatusDescription(booking.status)}</Text>
              <View style={bds.chipsRow}>
                <View style={[bds.chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Icon name="time-outline" size={13} color={c.muted} />
                  <Text style={[bds.chipText, { color: c.textSecondary }]}>{typeof booking.date === 'string' ? booking.date : ''}</Text>
                </View>
                <View style={[bds.chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Icon name="car-outline" size={13} color={c.muted} />
                  <Text style={[bds.chipText, { color: c.textSecondary }]}>{booking.vehicle || '—'}</Text>
                </View>
                {booking.totalAmount ? (
                  <View style={[bds.chip, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
                    <Icon name="wallet-outline" size={13} color={c.primary} />
                    <Text style={[bds.chipText, { color: c.primary }]}>QAR {String(booking.totalAmount)}</Text>
                  </View>
                ) : null}
                {booking.paymentMethod ? (
                  <View style={[bds.chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Icon name="card-outline" size={13} color={c.muted} />
                    <Text style={[bds.chipText, { color: c.textSecondary }]}>{String(booking.paymentMethod)}</Text>
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
              disabled={!canModify}
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
  const c = useQarColors();
  const notifications = useQarWheelStore((s) => s.notifications);
  const markRead      = useQarWheelStore((s) => s.markNotificationsRead);
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
        <View key={n.id} style={[ds.notifCard, { backgroundColor: c.surface, borderColor: c.border }, !n.read && { borderColor: c.primaryMid, backgroundColor: c.primaryLight }]}>
          <View style={[ds.notifIcon, { backgroundColor: n.read ? c.surfaceAlt : c.primaryLight }]}>
            <Icon
              name={n.read ? 'notifications-outline' : 'notifications'}
              size={18}
              color={n.read ? c.muted : c.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[ds.notifTitle, { color: c.text }, !n.read && { color: c.primary }]}>{n.title}</Text>
            <Text style={[ds.notifBody, { color: c.muted }]}>{n.body}</Text>
          </View>
          {!n.read && <View style={[ds.unreadDot, { backgroundColor: c.primary }]} />}
        </View>
      ))}

      {notifications.length === 0 && (
        <View style={ds.emptyState}>
          <Icon name="notifications-off-outline" size={40} color={c.muted} />
          <Text style={[ds.emptyTitle, { color: c.textSecondary }]}>No notifications</Text>
          <Text style={[ds.emptyDesc, { color: c.muted }]}>We'll let you know when something needs your attention.</Text>
        </View>
      )}
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS DETAIL
// ═══════════════════════════════════════════════════════════════
export function SettingsDetailScreen() {
  const c = useQarColors();
  const { section } = useLocalSearchParams<{ section: string }>();
  const normalized  = decodeURIComponent(section ?? 'settings').replaceAll('-', ' ');
  const { language, changeLanguage } = useTranslation();
  const favorites   = useQarWheelStore((s) => s.favoriteGarageIds);

  return (
    <Page title={normalized.replace(/\b\w/g, (ch) => ch.toUpperCase())}>
      <View style={[ds.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[ds.eyebrow, { color: c.primary }]}>Account setting</Text>
        <Text style={[ds.cardTitle, { color: c.text }]}>{normalized.replace(/\b\w/g, (ch) => ch.toUpperCase())}</Text>
        <Text style={[ds.cardMeta, { color: c.muted }]}>
          This area is connected to your profile and will be fully wired to the production backend.
        </Text>
      </View>

      {/* Language picker */}
      {normalized.includes('language') && (
        <View style={[ds.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[ds.sectionTitle, { color: c.text }]}>Language</Text>
          {(['en', 'ar'] as const).map((lang) => {
            const selected = language === lang;
            return (
              <Pressable
                key={lang}
                style={[ds.langRow, { borderTopColor: c.border }, selected && { backgroundColor: c.primaryLight }]}
                onPress={() => {
                  const needsRestart = changeLanguage(lang);
                  void success();
                  if (needsRestart) void promptRestartForRTL();
                }}
              >
                <Text style={ds.langFlag}>{lang === 'en' ? '🇬🇧' : '🇶🇦'}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[ds.langName, { color: c.text }, selected && { color: c.primary }]}>
                    {lang === 'en' ? 'English' : 'عربي (Arabic)'}
                  </Text>
                  <Text style={[ds.langSub, { color: c.muted }]}>{lang === 'en' ? 'Left-to-right layout' : 'Right-to-left layout'}</Text>
                </View>
                {selected && <Icon name="checkmark-circle" size={20} color={c.primary} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Saved garages */}
      {normalized.includes('saved') && (
        <View style={[ds.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[ds.sectionTitle, { color: c.text }]}>Saved garages</Text>
          {favorites.length === 0 ? (
            <View style={ds.emptyState}>
              <Icon name="heart-outline" size={32} color={c.muted} />
              <Text style={[ds.emptyDesc, { color: c.muted }]}>No saved garages yet. Tap ♥ on any garage.</Text>
            </View>
          ) : (
            <Text style={[ds.cardMeta, { color: c.muted }]}>{favorites.length} garage{favorites.length !== 1 ? 's' : ''} saved.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn:  { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4, flex: 1, textAlign: 'center' },
  // Bottom padding clears the sticky action bar so the last card is readable.
  content: { padding: spacing.page, gap: 14, paddingBottom: 24 },
  actionBar: {
    paddingHorizontal: spacing.page,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

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
  healthBadgeText: { fontSize: 12, fontWeight: '900' },

  vinRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  vinLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  specLabel:   { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

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
  historyMeta:  { fontSize: 12, fontWeight: '500' },
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
  statusLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
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
  invoiceCtaBadgeText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },

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
  stepSub:     { fontSize: 12, fontWeight: '700', marginTop: 1 },
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
  heroWrap:     { borderRadius: radius.xs, overflow: 'hidden', height: 268, justifyContent: 'flex-end', backgroundColor: colors.surfaceAlt },
  heroImage:    { ...StyleSheet.absoluteFill },
  heroOverlay:  { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.32)' },
  heroStatusRow: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  heroVerified: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(8,10,13,0.84)', borderRadius: radius.xs, paddingHorizontal: 10, paddingVertical: 7 },
  heroVerifiedText: { color: '#fff', ...typography.caption, fontWeight: '800' },
  heroIdentity: { padding: 16, gap: 7, backgroundColor: 'rgba(8,10,13,0.88)' },
  heroName: { color: '#fff', ...typography.h2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  heroMetaText: { color: '#fff', ...typography.caption, marginEnd: 8 },
  openBadge:    {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  openDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  openText:     { color: '#fff', fontSize: 12, fontWeight: '800' },
  heroRatingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  heroRatingText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  // Cards
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing.cardPad, gap: 10,
    ...shadow.sm,
  },
  garageSummary: { gap: 8, paddingVertical: 8 },
  garageServices: { gap: 8, paddingVertical: 8 },
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
  tagText: { color: colors.primary, fontSize: 12, fontWeight: '900' },

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
  svcLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minHeight: 44 },
  svcName:      { ...typography.h4, color: colors.text },
  svcMeta:      { ...typography.caption, color: colors.muted, marginTop: 2 },
  svcPriceWrap: { alignItems: 'flex-end', gap: 5, marginStart: 8 },
  svcPrice:     { ...typography.h4, color: colors.primary },
  svcBookPill:  { minWidth: 52, minHeight: 44, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
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
  healthBadgeText: { fontSize: 12, fontWeight: '900' },
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
