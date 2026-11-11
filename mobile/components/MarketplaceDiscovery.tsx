/**
 * QarWheel 2026 marketplace discovery.
 * Shared service, search, category, compare, map, offer, and saved screens.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '@/components/AnimatedPressable';
import { RemoteImage } from '@/components/RemoteImage';
import ErrorState from '@/components/ErrorState';
import RecordNotFound from '@/components/RecordNotFound';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import {
  serviceCategories,
  type Garage,
  type PopularJob,
} from '@/lib/marketplace';
import { useBranches } from '@/lib/firestoreOps';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { tap } from '@/lib/haptics';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { garageDistanceLabel, knownFirst } from '@/lib/marketplace-display';

type IconName = ComponentProps<typeof Ionicons>['name'];
type SortKey = 'Best match' | 'Nearest' | 'Top rated' | 'Lowest price' | 'Fastest';
type FilterKey = 'Open now' | 'Instant booking' | 'Pickup' | 'Warranty' | 'Today';

const sortOptions: SortKey[] = ['Best match', 'Nearest', 'Top rated', 'Lowest price', 'Fastest'];
const filterOptions: FilterKey[] = ['Open now', 'Pickup', 'Warranty'];
const quickTerms = ['AC service', 'Oil change', 'Battery', 'Brakes', 'Diagnostics', 'Pickup'];

function route(path: string) {
  return path as never;
}

function Icon({ name, size = 18, color }: { name: IconName; size?: number; color: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function categoryIcon(id?: string): IconName {
  if (id === 'battery') return 'battery-charging-outline';
  if (id === 'inspection') return 'shield-checkmark-outline';
  if (id === 'diagnostics') return 'analytics-outline';
  if (id === 'wash') return 'water-outline';
  if (id === 'parts') return 'cube-outline';
  return 'construct-outline';
}

function parseQueryMatch(value: string, queryText: string) {
  const haystack = value.toLowerCase();
  const terms = queryText.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((term) => haystack.includes(term));
}

function useDebounced<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function filterGarages(list: Garage[], activeFilters: FilterKey[]) {
  return list.filter((garage) => {
    if (activeFilters.includes('Open now') && !garage.openNow) return false;
    if (activeFilters.includes('Instant booking') && !garage.tags.includes('Instant booking')) return false;
    if (activeFilters.includes('Pickup') && !garage.pickupAvailable) return false;
    if (activeFilters.includes('Warranty') && !garage.warranty) return false;
    if (activeFilters.includes('Today') && !['Now', 'Today'].includes(garage.availability)) return false;
    return true;
  });
}

function sortGarages(list: Garage[], sort: SortKey) {
  const copy = [...list];
  if (sort === 'Nearest') return copy.sort((a, b) => knownFirst(a.distanceKm) - knownFirst(b.distanceKm));
  if (sort === 'Top rated') return copy.sort((a, b) => b.rating - a.rating);
  if (sort === 'Lowest price') return copy.sort((a, b) => knownFirst(a.startingPriceValue) - knownFirst(b.startingPriceValue));
  if (sort === 'Fastest') return copy.sort((a, b) => knownFirst(Number.parseInt(a.responseTime, 10)) - knownFirst(Number.parseInt(b.responseTime, 10)));
  return copy.sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating - a.rating);
}

function filterServices(list: PopularJob[], activeFilters: FilterKey[], garagesById: Map<string, Garage>) {
  return list.filter((service) => {
    const garage = service.garageId ? garagesById.get(service.garageId) : undefined;
    // Garage-derived filters cannot be satisfied by a service with no
    // resolvable garage — excluding it beats matching against a stand-in.
    if (activeFilters.includes('Open now') && !garage?.openNow) return false;
    if (activeFilters.includes('Instant booking') && !garage?.tags.includes('Instant booking')) return false;
    if (activeFilters.includes('Pickup') && !garage?.pickupAvailable) return false;
    if (activeFilters.includes('Warranty') && !service.warranty) return false;
    if (activeFilters.includes('Today') && service.availability !== 'Today') return false;
    return true;
  });
}

function sortServices(list: PopularJob[], sort: SortKey, garagesById: Map<string, Garage>) {
  const copy = [...list];
  const garageFor = (service: PopularJob) => service.garageId ? garagesById.get(service.garageId) : undefined;
  if (sort === 'Nearest') return copy.sort((a, b) => knownFirst(a.distanceKm ?? garageFor(a)?.distanceKm ?? 0) - knownFirst(b.distanceKm ?? garageFor(b)?.distanceKm ?? 0));
  if (sort === 'Top rated') return copy.sort((a, b) => (b.rating ?? garageFor(b)?.rating ?? 0) - (a.rating ?? garageFor(a)?.rating ?? 0));
  if (sort === 'Lowest price') return copy.sort((a, b) => knownFirst(a.priceValue) - knownFirst(b.priceValue));
  if (sort === 'Fastest') return copy.sort((a, b) => knownFirst(Number.parseInt(a.duration ?? '', 10)) - knownFirst(Number.parseInt(b.duration ?? '', 10)));
  return copy.sort((a, b) => (a.availability === 'Today' ? -1 : 1) - (b.availability === 'Today' ? -1 : 1));
}

function Frame({ title, subtitle, children, root = false }: { title: string; subtitle?: string; children: React.ReactNode; root?: boolean }) {
  const router = useRouter();
  const c = useQarColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.nav, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        {root ? (
          <View style={s.navBtnPlaceholder} />
        ) : (
          <AnimatedPressable
            style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-back" size={20} color={c.text} />
          </AnimatedPressable>
        )}
        <View style={s.navTitleWrap} accessibilityRole="header">
          <Text style={[s.navTitle, { color: c.text }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[s.navSub, { color: c.muted }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={s.navBtnPlaceholder} />
      </View>
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MotionScreen style={s.screenStack}>{children}</MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

function SearchInput({ value, onChangeText, onSubmit, onClear, autoFocus, catalog = false, placeholder = 'Search services, garages, areas...' }: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
  catalog?: boolean;
  placeholder?: string;
}) {
  const c = useQarColors();
  const hasValue = value.length > 0;

  return (
    <View style={[s.search, catalog && s.catalogSearch, { backgroundColor: c.surface, borderColor: hasValue ? c.primary : c.border }]}>
      <Icon name="search-outline" size={18} color={hasValue ? c.primary : c.muted} />
      <TextInput
        style={[s.searchInput, { color: c.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        autoCorrect={false}
        // iOS zooms the page when a focused input is under 16px.
        accessibilityLabel="Search"
        clearButtonMode="never"
      />
      {hasValue && onClear ? (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon name="close-circle" size={17} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const c = useQarColors();
  return (
    <View style={s.sectionHead}>
      <Text style={[s.sectionTitle, { color: c.text }]}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={[s.sectionAction, { color: c.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Pill({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: IconName }) {
  const c = useQarColors();
  return (
    <AnimatedPressable
      style={[s.pill, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
      onPress={() => { void tap(); onPress(); }}
      scaleValue={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
    >
      {icon ? <Icon name={icon} size={14} color={active ? '#fff' : c.textSecondary} /> : null}
      <Text style={[s.pillText, { color: active ? '#fff' : c.textSecondary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

function DiscoveryControls({
  sort,
  setSort,
  filters,
  toggleFilter,
}: {
  sort: SortKey;
  setSort: (sort: SortKey) => void;
  filters: FilterKey[];
  toggleFilter: (filter: FilterKey) => void;
}) {
  return (
    <MotionSurface style={s.controls}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        {sortOptions.map((item) => (
          <Pill key={item} label={item} active={sort === item} icon={item === 'Nearest' ? 'navigate-outline' : item === 'Lowest price' ? 'cash-outline' : 'swap-vertical-outline'} onPress={() => setSort(item)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        {filterOptions.map((item) => (
          <Pill key={item} label={item} active={filters.includes(item)} icon={item === 'Open now' ? 'time-outline' : item === 'Pickup' ? 'car-outline' : 'checkmark-circle-outline'} onPress={() => toggleFilter(item)} />
        ))}
      </ScrollView>
    </MotionSurface>
  );
}

function GarageCard({ garage, compare }: { garage: Garage; compare?: boolean }) {
  const router = useRouter();
  const c = useQarColors();
  const isFav = useQarWheelStore((state) => state.favoriteGarageIds.includes(garage.id));
  const toggleFav = useQarWheelStore((state) => state.toggleFavoriteGarage);

  // Two rows rather than three columns: details on top, price and CTA on a
  // dedicated footer. The old layout squeezed price, availability and a Book
  // chip into a 76px column, so long prices truncated and the button was
  // below a comfortable tap target.
  return (
    <View
      style={[s.garageCard, { backgroundColor: c.surface, borderColor: isFav ? c.primary : c.border }]}
    >
      <AnimatedPressable style={s.garageTop}
        onPress={() => { void tap(); router.push(route(`/garage/${garage.id}`)); }}
        scaleValue={0.985} accessibilityRole="button"
        accessibilityLabel={`View ${garage.name}, ${garage.rating} stars, ${garageDistanceLabel(garage.distanceKm)}, ${garage.startingPrice}`}>
        <RemoteImage uri={garage.imageUrl} style={s.garageImage} fallbackIcon="business-outline" accessibilityLabel={garage.name} />
        <View style={s.rowBody}>
          <View style={s.titleLine}>
            <Text style={[s.rowTitle, { color: c.text }]} numberOfLines={1}>{garage.name}</Text>
          </View>

          <View style={s.factRow}>
            <Fact icon="star" text={`${garage.rating}`} color="#F59E0B" />
            <Text style={[s.dot, { color: c.muted }]}>·</Text>
            <Text style={[s.rowMeta, { color: c.textSecondary }]} numberOfLines={1}>
              {garage.area} · {garageDistanceLabel(garage.distanceKm)}
            </Text>
          </View>

          <View style={s.tagRow}>
            <Badge label={garage.openNow === null ? 'Hours unavailable' : garage.openNow ? 'Open now' : 'Closed now'} tone={garage.openNow ? 'success' : 'muted'} />
            {garage.verified ? <Badge label="Verified" tone="primary" /> : null}
            {garage.pickupAvailable ? <Badge label="Pickup" tone="ai" /> : null}
          </View>
        </View>
      </AnimatedPressable>
      <Pressable style={s.garageFavorite}
        onPress={() => { void tap(); toggleFav(garage.id); }}
        accessibilityRole="button"
        accessibilityLabel={isFav ? `Remove ${garage.name} from saved` : `Save ${garage.name}`}
        accessibilityState={{ selected: isFav }}>
        <Icon name={isFav ? 'heart' : 'heart-outline'} size={19} color={isFav ? c.danger : c.muted} />
      </Pressable>

      <View style={[s.garageFooter, { borderTopColor: c.border }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.priceValue, { color: c.text }]} numberOfLines={1}>
            {garage.startingPrice}
          </Text>
          <Text style={[s.priceMeta, { color: c.muted }]} numberOfLines={1}>
            {[garage.responseTime, compare ? garage.warranty : garage.availability].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <AnimatedPressable
          style={[s.bookNow, { backgroundColor: c.primary }]}
          onPress={() => { void tap(); router.push(route(`/checkout/${garage.id}`)); }}
          scaleValue={0.96}
          accessibilityLabel={`Book ${garage.name}`}
        >
          <Text style={s.bookNowText}>Request</Text>
          <Icon name="arrow-forward" size={14} color="#fff" />
        </AnimatedPressable>
      </View>
    </View>
  );
}

function FeaturedGarageCard({ garage }: { garage: Garage }) {
  const router = useRouter();
  const c = useQarColors();
  const saved = useQarWheelStore((state) => state.favoriteGarageIds.includes(garage.id));
  const toggleFavorite = useQarWheelStore((state) => state.toggleFavoriteGarage);

  return (
    <View style={[s.featuredCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable onPress={() => router.push(route(`/garage/${garage.id}`))} accessibilityRole="button" accessibilityLabel={`View ${garage.name}`}>
        <View style={s.featuredPhoto}>
          <RemoteImage uri={garage.imageUrl} style={s.featuredImage} fallbackIcon="business-outline" accessibilityLabel={`${garage.name} workshop`} />
          {garage.verified ? <View style={s.featuredVerified}><Icon name="shield-checkmark" size={14} color="#fff" /><Text style={s.featuredVerifiedText}>Verified partner</Text></View> : null}
          <View style={s.featuredIdentity}>
            <Text style={s.featuredName}>{garage.name}</Text>
            <Text style={s.featuredLocation}>{garage.area} · {garageDistanceLabel(garage.distanceKm)}</Text>
          </View>
        </View>
      </Pressable>
      <View style={s.featuredBody}>
        <View style={s.featuredFacts}>
          {garage.rating > 0 ? <View style={s.featuredFact}><Icon name="star" size={15} color={c.gold} /><Text style={[s.featuredFactText, { color: c.text }]}>{garage.rating} ({garage.reviews})</Text></View> : null}
          <View style={s.featuredFact}><Icon name="time-outline" size={15} color={c.textSecondary} /><Text style={[s.featuredFactText, { color: c.textSecondary }]}>{garage.openNow === null ? 'Hours unavailable' : garage.openNow ? 'Open now' : 'Closed now'}</Text></View>
        </View>
        <View style={[s.featuredPriceRow, { backgroundColor: c.surfaceAlt }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.featuredPriceLabel, { color: c.muted }]}>LISTED PRICE</Text>
            <Text style={[s.featuredPrice, { color: c.text }]} numberOfLines={2}>{garage.startingPriceValue > 0 ? `From ${garage.startingPrice}` : garage.startingPrice}</Text>
          </View>
          <Pressable style={s.featuredSave} onPress={() => toggleFavorite(garage.id)} accessibilityRole="button" accessibilityLabel={saved ? `Remove ${garage.name} from saved` : `Save ${garage.name}`} accessibilityState={{ selected: saved }}>
            <Icon name={saved ? 'heart' : 'heart-outline'} size={21} color={saved ? c.danger : c.textSecondary} />
          </Pressable>
        </View>
        <Pressable style={[s.featuredBook, { backgroundColor: c.primary }]} onPress={() => router.push(route(`/checkout/${garage.id}`))} accessibilityRole="button" accessibilityLabel={`Request a booking at ${garage.name}`}>
          <Icon name="calendar-outline" size={18} color="#fff" />
          <Text style={s.featuredBookText}>Request a booking</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ServiceCard({ service, garage }: { service: PopularJob; garage?: Garage }) {
  const router = useRouter();
  const c = useQarColors();

  return (
    <View style={[s.serviceCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <AnimatedPressable
        style={s.servicePrimary}
        onPress={() => { void tap(); router.push(route(`/service/${service.id}`)); }}
        scaleValue={0.985}
        accessibilityRole="button"
        accessibilityLabel={`View ${service.title} details`}
      >
        <View style={[s.serviceIcon, { backgroundColor: c.primaryLight }]}>
          <Icon name={categoryIcon(service.categoryId)} size={22} color={c.primary} />
        </View>
        <View style={s.rowBody}>
          <View style={s.titleLine}>
            <Text style={[s.rowTitle, { color: c.text }]} numberOfLines={1}>{service.title}</Text>
            <Text style={[s.price, { color: c.primary }]}>{service.price}</Text>
          </View>
          {garage ? (
            <Text style={[s.rowMeta, { color: c.textSecondary }]} numberOfLines={1}>{garage.name} · {garage.area}</Text>
          ) : null}
          <View style={s.factRow}>
            {service.rating ?? garage?.rating ? (
              <Fact icon="star" text={`${service.rating ?? garage?.rating}`} color="#F59E0B" />
            ) : null}
            {service.duration ? <Fact icon="time-outline" text={service.duration} color={c.muted} /> : null}
            {service.distanceKm ?? garage?.distanceKm ? (
              <Fact icon="navigate-outline" text={`${service.distanceKm ?? garage?.distanceKm} km`} color={c.muted} />
            ) : null}
          </View>
          <View style={s.tagRow}>
            <Badge label={service.availability} tone={service.availability === 'Today' ? 'success' : 'warning'} />
            {service.warranty ?? garage?.warranty ? (
              <Badge label={(service.warranty ?? garage?.warranty) as string} tone="primary" />
            ) : null}
            {garage?.pickupAvailable ? <Badge label="Pickup" tone="ai" /> : null}
          </View>
        </View>
      </AnimatedPressable>
      <Pressable style={[s.bookButton, { backgroundColor: c.primary }]} onPress={() => router.push(route(`/checkout/${service.id}`))}
        accessibilityRole="button" accessibilityLabel={`Book ${service.title}`}>
        <Text style={s.bookButtonText}>Request</Text>
      </Pressable>
    </View>
  );
}

function Fact({ icon, text, color }: { icon: IconName; text: string; color: string }) {
  const c = useQarColors();
  return (
    <View style={s.factItem}>
      <Icon name={icon} size={12} color={color} />
      <Text style={[s.factText, { color: c.textSecondary }]}>{text}</Text>
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'success' | 'warning' | 'primary' | 'ai' | 'muted' }) {
  const c = useQarColors();
  const color = tone === 'success' ? c.success : tone === 'warning' ? c.warning : tone === 'ai' ? c.ai : tone === 'primary' ? c.primary : c.muted;
  const bg = tone === 'success' ? c.successBg : tone === 'warning' ? c.warningBg : tone === 'ai' ? c.aiBg : tone === 'primary' ? c.primaryLight : c.surfaceAlt;

  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function EmptyState() {
  const c = useQarColors();
  const router = useRouter();
  return (
    <View style={[s.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Icon name="search-outline" size={40} color={c.muted} />
      <Text style={[s.emptyTitle, { color: c.text }]}>No matches found</Text>
      <Text style={[s.emptyBody, { color: c.muted }]}>Try a different service, remove filters, or browse all garages nearby.</Text>
      <Pressable style={[s.emptyBtn, { backgroundColor: c.primary }]} onPress={() => router.push('/services' as never)}>
        <Text style={s.emptyBtnText}>Browse services</Text>
      </Pressable>
    </View>
  );
}

function DiscoveryResults({
  services,
  garageList,
  garagesById,
  showServices = true,
  showGarages = true,
}: {
  services: PopularJob[];
  garageList: Garage[];
  garagesById: Map<string, Garage>;
  showServices?: boolean;
  showGarages?: boolean;
}) {
  const router = useRouter();
  const c = useQarColors();
  const [visibleServices, setVisibleServices] = useState(12);
  const [visibleGarages, setVisibleGarages] = useState(12);
  const hasAny = (showServices && services.length > 0) || (showGarages && garageList.length > 0);

  if (!hasAny) return <EmptyState />;

  return (
    <>
      {showServices ? (
        <>
          <Section title={`Services (${services.length})`} action="View all" onPress={() => router.push('/services' as never)} />
          {services.slice(0, visibleServices).map((service) => (
            <ServiceCard key={service.id} service={service} garage={service.garageId ? garagesById.get(service.garageId) : undefined} />
          ))}
          {services.length > visibleServices ? <Pressable style={s.moreButton} onPress={() => setVisibleServices((count) => count + 12)} accessibilityRole="button" accessibilityLabel="Show more services"><Text style={[s.moreText, { color: c.primary }]}>Show more services</Text></Pressable> : null}
        </>
      ) : null}
      {showGarages ? (
        <>
          <Section title={`Garages (${garageList.length})`} action="Map" onPress={() => router.push('/map' as never)} />
          {garageList.slice(0, visibleGarages).map((garage) => <GarageCard key={garage.id} garage={garage} />)}
          {garageList.length > visibleGarages ? <Pressable style={s.moreButton} onPress={() => setVisibleGarages((count) => count + 12)} accessibilityRole="button" accessibilityLabel="Show more garages"><Text style={[s.moreText, { color: c.primary }]}>Show more garages</Text></Pressable> : null}
        </>
      ) : null}
    </>
  );
}

/**
 * Live marketplace data (Firestore `branches` + `branch_services`) plus the
 * search/sort/filter pipeline that previously ran over the static seed
 * arrays in lib/marketplace.ts. `vendors`/`jobs` come from useBranches() so
 * every screen using this hook sees the same real-time list.
 */
function useDiscovery(queryText = '', categoryId?: string) {
  const [sort, setSort] = useState<SortKey>('Best match');
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const normalized = useDebounced(queryText.trim().toLowerCase());
  const { vendors, jobs, loading, error, refresh } = useBranches({ includeServices: true });

  const garagesById = useMemo(() => new Map(vendors.map((g) => [g.id, g] as const)), [vendors]);

  const toggleFilter = (filter: FilterKey) => {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  };

  const services = useMemo(() => {
    let list = jobs;
    if (categoryId) list = list.filter((job) => job.categoryId === categoryId);
    if (normalized) {
      list = list.filter((job) => {
        const garage = job.garageId ? garagesById.get(job.garageId) : undefined;
        return parseQueryMatch(`${job.title} ${job.availability} ${job.warranty} ${garage?.name ?? ''} ${garage?.area ?? ''}`, normalized);
      });
    }
    return sortServices(filterServices(list, filters, garagesById), sort, garagesById);
  }, [jobs, garagesById, categoryId, filters, normalized, sort]);

  const garageList = useMemo(() => {
    let list = vendors;
    if (categoryId) {
      const category = serviceCategories.find((item) => item.id === categoryId);
      list = list.filter((garage) => {
        const serviceMatch = jobs.some((job) => job.categoryId === categoryId && job.garageId === garage.id);
        const textMatch = category ? parseQueryMatch(`${garage.type} ${garage.category} ${garage.tags.join(' ')}`, category.label) : false;
        return serviceMatch || textMatch;
      });
    }
    if (normalized) {
      list = list.filter((garage) => parseQueryMatch(`${garage.name} ${garage.type} ${garage.category} ${garage.area} ${garage.tags.join(' ')}`, normalized));
    }
    return sortGarages(filterGarages(list, filters), sort);
  }, [vendors, jobs, categoryId, filters, normalized, sort]);

  return { sort, setSort, filters, toggleFilter, services, garageList, garagesById, loading, error, refresh };
}

/**
 * Search behaves as two distinct screens sharing one input:
 *
 *  • Idle (no query) — category chips, map entry, and live workshops.
 *  • Searching — results only, with sort/filter controls and a result count.
 *
 * Previously both states rendered at once, so tapping the home search bar
 * dropped you into a wall of shortcut tiles, sort rails, filter rails and
 * unfiltered results with no indication anything was searchable.
 */
export function SearchSuggestionsScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { term: initialTerm } = useLocalSearchParams<{ term?: string }>();
  const [term, setTerm] = useState(typeof initialTerm === 'string' ? initialTerm : '');
  useEffect(() => {
    setTerm(typeof initialTerm === 'string' ? initialTerm : '');
  }, [initialTerm]);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [visibleGarages, setVisibleGarages] = useState(4);
  const discovery = useDiscovery(term, categoryId);

  const searching = term.trim().length > 0;
  const resultCount = discovery.services.length + discovery.garageList.length;
  const featured = discovery.garageList.find((garage) => garage.verified) ?? discovery.garageList[0];
  const nearby = discovery.garageList.filter((garage) => garage.id !== featured?.id);

  return (
    <Frame title="Garages" subtitle="Find a workshop for your car" root>
      <SearchInput
        value={term}
        onChangeText={setTerm}
        onClear={() => setTerm('')}
      />

      {discovery.error ? <ErrorState compact onRetry={() => void discovery.refresh()} /> : null}
      {discovery.loading && discovery.garageList.length === 0 ? <ActivityIndicator color={c.primary} accessibilityLabel="Loading garages" /> : null}

      {searching ? (
        <>
          {/* Controls belong with results, not above an empty browse state. */}
          <DiscoveryControls {...discovery} />

          <View style={s.resultHead}>
            <Text style={[s.resultCount, { color: c.textSecondary }]}>
              {resultCount === 0
                ? discovery.loading ? 'Searching workshops' : discovery.error ? 'Unable to load results' : 'No matches'
                : `${resultCount} ${resultCount === 1 ? 'result' : 'results'} for "${term.trim()}"`}
            </Text>
            {resultCount > 0 && (
              <Pressable onPress={() => setTerm('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                <Text style={[s.sectionAction, { color: c.primary }]}>Clear</Text>
              </Pressable>
            )}
          </View>

          {(discovery.loading || discovery.error) && resultCount === 0 ? null : resultCount === 0 ? (
            <View style={[s.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Icon name="search-outline" size={34} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>Nothing matched "{term.trim()}"</Text>
              <Text style={[s.emptyBody, { color: c.textSecondary }]}>
                Try a broader term or select a category above.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                {quickTerms.slice(0, 5).map((item) => (
                  <Pill key={item} label={item} onPress={() => setTerm(item)} />
                ))}
              </ScrollView>
            </View>
          ) : (
            <DiscoveryResults services={discovery.services} garageList={discovery.garageList} garagesById={discovery.garagesById} />
          )}
        </>
      ) : (
        <>
          {/* ── Browse state ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
            <Pill label="All" active={!categoryId} onPress={() => setCategoryId(undefined)} />
            {serviceCategories.map((category) => <Pill key={category.id} label={category.label} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />)}
          </ScrollView>

          <Pressable style={[s.mapStrip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]} onPress={() => router.push('/map' as never)} accessibilityRole="button" accessibilityLabel="Explore garages on map">
            <View style={[s.mapIcon, { backgroundColor: c.primaryLight }]}><Icon name="map-outline" size={22} color={c.primary} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.mapTitle, { color: c.text }]}>Explore on map</Text>
              <Text style={[s.mapMeta, { color: c.textSecondary }]}>{discovery.loading ? 'Loading workshops' : `${discovery.garageList.length} ${discovery.garageList.length === 1 ? 'workshop' : 'workshops'} in this view`}</Text>
            </View>
            <Icon name="arrow-forward" size={18} color={c.primary} />
          </Pressable>

          {!discovery.loading && !discovery.error && !featured ? <EmptyState /> : null}
          {featured ? <>
            <Section title="Featured workshop" />
            <FeaturedGarageCard garage={featured} />
            {nearby.length > 0 ? <>
              <Section title="More workshops" />
              {nearby.slice(0, visibleGarages).map((garage) => <GarageCard key={garage.id} garage={garage} />)}
              {nearby.length > visibleGarages ? <Pressable style={s.moreButton} onPress={() => setVisibleGarages((count) => count + 10)} accessibilityRole="button"><Text style={[s.moreText, { color: c.primary }]}>Show more workshops</Text></Pressable> : null}
            </> : null}
          </> : null}

          <View style={s.browseLinks}>
            <Pressable onPress={() => router.push('/saved' as never)} accessibilityRole="button" accessibilityLabel="Saved garages" style={s.browseLink}>
              <Icon name="heart-outline" size={17} color={c.textSecondary} />
              <Text style={[s.browseLinkText, { color: c.textSecondary }]}>Saved</Text>
              <Icon name="chevron-forward" size={15} color={c.muted} />
            </Pressable>
            <Pressable onPress={() => router.push('/compare' as never)} accessibilityRole="button" accessibilityLabel="Compare garages" style={s.browseLink}>
              <Icon name="git-compare-outline" size={17} color={c.textSecondary} />
              <Text style={[s.browseLinkText, { color: c.textSecondary }]}>Compare</Text>
              <Icon name="chevron-forward" size={15} color={c.muted} />
            </Pressable>
          </View>
        </>
      )}
    </Frame>
  );
}

function CatalogServiceRow({ service, garage }: { service: PopularJob; garage?: Garage }) {
  const router = useRouter();
  const c = useQarColors();
  return (
    <View style={[s.catalogCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable style={s.catalogDetails} accessibilityRole="button" accessibilityLabel={`View ${service.title} details`} onPress={() => router.push(route(`/service/${service.id}`))}>
        <RemoteImage uri={garage?.imageUrl} style={s.catalogThumb} fallbackIcon={categoryIcon(service.categoryId)} accessibilityLabel={garage ? `${garage.name} workshop` : service.title} />
        <View style={s.catalogCopy}>
          <Text style={[s.catalogName, { color: c.text }]} numberOfLines={2}>{service.title}</Text>
          <Text style={[s.catalogMeta, { color: c.textSecondary }]} numberOfLines={2}>{garage ? [garage.name, garage.area].filter(Boolean).join(' - ') : 'Workshop details unavailable'}</Text>
          <View style={s.catalogFacts}>
            {service.duration ? <Fact icon="time-outline" text={service.duration} color={c.muted} /> : null}
            {garage && garage.reviews > 0 && garage.rating > 0 ? <Fact icon="star" text={`${garage.rating.toFixed(1)} (${garage.reviews})`} color={c.gold} /> : null}
            {garage && garage.distanceKm > 0 ? <Fact icon="navigate-outline" text={garageDistanceLabel(garage.distanceKm)} color={c.muted} /> : null}
          </View>
        </View>
        <Icon name="chevron-forward" size={18} color={c.muted} />
      </Pressable>
      <View style={s.catalogTags}>
        {[service.availability, service.warranty, garage?.pickupAvailable ? 'Pickup' : undefined].filter(Boolean).map((label) => (
          <View key={label} style={[s.catalogTag, { backgroundColor: c.surfaceAlt }]}>
            <Text style={[s.catalogTagText, { color: label === 'Today' ? c.success : c.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={[s.catalogFooter, { borderTopColor: c.border }]}>
        <View style={s.catalogPriceBlock}>
          <Text style={[s.catalogEyebrow, { color: c.textSecondary }]}>{service.priceValue > 0 ? 'LISTED PRICE' : 'QUOTE REQUIRED'}</Text>
          <Text style={[s.catalogPrice, { color: c.text }]}>{service.price}</Text>
        </View>
        <Pressable style={[s.catalogRequest, { backgroundColor: c.primary }]} accessibilityRole="button" accessibilityLabel={`Book ${service.title}`} onPress={() => router.push(route(`/checkout/${service.id}`))}>
          <Icon name="calendar-outline" size={17} color="#fff" />
          <Text style={s.catalogRequestText}>Request</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CatalogWorkshopRow({ garage }: { garage: Garage }) {
  const router = useRouter();
  const c = useQarColors();
  const saved = useQarWheelStore((state) => state.favoriteGarageIds.includes(garage.id));
  const toggleFavorite = useQarWheelStore((state) => state.toggleFavoriteGarage);
  return (
    <View style={[s.catalogCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={s.catalogWorkshopTop}>
        <Pressable style={s.catalogDetails} accessibilityRole="button" accessibilityLabel={`View ${garage.name}`} onPress={() => router.push(route(`/garage/${garage.id}`))}>
          <RemoteImage uri={garage.imageUrl} style={s.catalogThumb} fallbackIcon="business-outline" accessibilityLabel={`${garage.name} workshop`} />
          <View style={s.catalogCopy}>
            <Text style={[s.catalogName, { color: c.text }]} numberOfLines={2}>{garage.name}</Text>
            <Text style={[s.catalogMeta, { color: c.textSecondary }]} numberOfLines={1}>{[garage.area, garage.city].filter(Boolean).join(', ') || 'Location not listed'}</Text>
            <View style={s.catalogFacts}>
              {garage.reviews > 0 && garage.rating > 0 ? <Fact icon="star" text={`${garage.rating.toFixed(1)} (${garage.reviews})`} color={c.gold} /> : null}
              {garage.distanceKm > 0 ? <Fact icon="navigate-outline" text={garageDistanceLabel(garage.distanceKm)} color={c.muted} /> : null}
            </View>
          </View>
        </Pressable>
        <Pressable style={s.catalogSave} accessibilityRole="button" accessibilityLabel={saved ? `Remove ${garage.name} from saved` : `Save ${garage.name}`} accessibilityState={{ selected: saved }} onPress={() => toggleFavorite(garage.id)}>
          <Icon name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? c.danger : c.textSecondary} />
        </Pressable>
      </View>
      <View style={[s.catalogFooter, { borderTopColor: c.border }]}>
        <View style={s.catalogPriceBlock}>
          <Text style={[s.catalogEyebrow, { color: c.textSecondary }]}>{garage.openNow === null ? 'HOURS UNAVAILABLE' : garage.openNow ? 'OPEN NOW' : 'CLOSED NOW'}</Text>
          <Text style={[s.catalogPrice, { color: c.text }]}>{garage.startingPrice}</Text>
        </View>
        <Pressable style={[s.catalogRequest, { backgroundColor: c.primary }]} accessibilityRole="button" accessibilityLabel={`Book ${garage.name}`} onPress={() => router.push(route(`/checkout/${garage.id}`))}>
          <Icon name="calendar-outline" size={17} color="#fff" />
          <Text style={s.catalogRequestText}>Request</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ServiceListingsScreen() {
  const router = useRouter();
  const c = useQarColors();
  const darkMode = useQarWheelStore((state) => state.themeMode === 'dark');
  const actionTextColor = darkMode ? '#FFB4AB' : c.primaryDark;
  const [term, setTerm] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleServices, setVisibleServices] = useState(8);
  const [visibleGarages, setVisibleGarages] = useState(5);
  const discovery = useDiscovery(term, categoryId);
  const hasSelection = Boolean(term.trim() || categoryId || discovery.filters.length);
  const serviceCountLabel = discovery.loading && !discovery.services.length
    ? 'Loading services'
    : discovery.error && !discovery.services.length
      ? 'Services unavailable'
      : `${discovery.services.length} ${discovery.services.length === 1 ? 'service' : 'services'}`;
  const noServices = !discovery.loading && !discovery.error && discovery.services.length === 0;
  const noWorkshops = !discovery.loading && !discovery.error && discovery.garageList.length === 0;
  const clearSelection = () => {
    setTerm('');
    setCategoryId(undefined);
    discovery.filters.forEach(discovery.toggleFilter);
  };

  useEffect(() => {
    setVisibleServices(8);
    setVisibleGarages(5);
  }, [term, categoryId, discovery.sort, discovery.filters]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.catalogHeader, { borderBottomColor: c.border }]}>
        <Pressable
          style={[s.catalogHeaderButton, { backgroundColor: c.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as never)}
        >
          <Icon name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <View style={s.catalogHeaderTitle} accessibilityRole="header">
          <Image source={require('../assets/images/adaptive-icon.png')} style={s.catalogBrandMark} accessibilityLabel="QarWheel" />
          <View>
            <Text style={[s.catalogBrand, { color: c.text }]}>QarWheel</Text>
            <Text style={[s.catalogHeaderSub, { color: actionTextColor }]}>SERVICES</Text>
          </View>
        </View>
        <Pressable
          style={[s.catalogHeaderButton, { backgroundColor: c.surface }]}
          accessibilityRole="button"
          accessibilityLabel="View workshops on map"
          onPress={() => router.push('/map' as never)}
        >
          <Icon name="map-outline" size={20} color={c.text} />
        </Pressable>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.catalogContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <MotionScreen style={s.catalogStack}>
          <SearchInput value={term} onChangeText={setTerm} onClear={() => setTerm('')} catalog placeholder="Search services or workshops" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catalogRail}>
            <Pill label="All" active={!categoryId} onPress={() => setCategoryId(undefined)} />
            {serviceCategories.map((category) => (
              <Pill key={category.id} label={category.label} active={categoryId === category.id}
                icon={categoryIcon(category.id)} onPress={() => setCategoryId(category.id)} />
            ))}
          </ScrollView>
          <View style={s.catalogToolbar}>
            <Text style={[s.catalogCount, { color: c.textSecondary }]}>{serviceCountLabel}</Text>
            <Pressable
              style={[s.catalogTool, { borderColor: c.border, backgroundColor: c.surface }]}
              accessibilityRole="button"
              accessibilityLabel={`Sort: ${discovery.sort}`}
              accessibilityState={{ expanded: sortOpen }}
              onPress={() => { setSortOpen(!sortOpen); setFiltersOpen(false); }}
            >
              <Icon name="swap-vertical-outline" size={16} color={c.textSecondary} />
              <Text style={[s.catalogToolText, { color: c.text }]} numberOfLines={1}>{discovery.sort}</Text>
              <Icon name="chevron-down" size={14} color={c.muted} />
            </Pressable>
            <Pressable
              style={[s.catalogFilterButton, { borderColor: discovery.filters.length ? c.primary : c.border, backgroundColor: c.surface }]}
              accessibilityRole="button"
              accessibilityLabel={discovery.filters.length ? `Filters, ${discovery.filters.length} active` : 'Filters'}
              accessibilityState={{ expanded: filtersOpen }}
              onPress={() => { setFiltersOpen(!filtersOpen); setSortOpen(false); }}
            >
              <Icon name="options-outline" size={20} color={discovery.filters.length ? c.primary : c.text} />
            </Pressable>
          </View>
          {sortOpen ? (
            <View style={[s.catalogMenu, { backgroundColor: c.surface, borderColor: c.border }]}>
              {sortOptions.map((option) => (
                <Pressable key={option} style={s.catalogMenuItem} accessibilityRole="button"
                  accessibilityState={{ selected: discovery.sort === option }}
                  onPress={() => { discovery.setSort(option); setSortOpen(false); }}>
                  <Text style={[s.catalogMenuText, { color: c.text }]}>{option}</Text>
                  {discovery.sort === option ? <Icon name="checkmark" size={18} color={c.primary} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          {filtersOpen ? (
            <View style={[s.catalogMenu, { backgroundColor: c.surface, borderColor: c.border }]}>
              {filterOptions.map((option) => (
                <Pressable key={option} style={s.catalogMenuItem} accessibilityRole="checkbox"
                  accessibilityLabel={option} accessibilityState={{ checked: discovery.filters.includes(option) }}
                  onPress={() => discovery.toggleFilter(option)}>
                  <Text style={[s.catalogMenuText, { color: c.text }]}>{option}</Text>
                  <Icon name={discovery.filters.includes(option) ? 'checkbox' : 'square-outline'} size={20}
                    color={discovery.filters.includes(option) ? c.primary : c.muted} />
                </Pressable>
              ))}
            </View>
          ) : null}

          <Section title="Available services" />
          {discovery.error ? <ErrorState compact onRetry={() => void discovery.refresh()} /> : null}
          {discovery.loading && discovery.services.length === 0 ? <ActivityIndicator accessibilityLabel="Loading services" color={c.primary} style={s.catalogLoading} /> : null}
          {noServices ? (
            <View style={[s.catalogEmpty, { borderColor: c.border }]}>
              <Icon name="construct-outline" size={28} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>{hasSelection ? 'No matching services' : 'No services listed yet'}</Text>
              <Text style={[s.emptyBody, { color: c.textSecondary }]}>
                {hasSelection ? 'Try another term or clear the selected filters.' : 'Workshops have not published services here yet.'}
              </Text>
              {hasSelection ? (
                <Pressable style={s.catalogClear} accessibilityRole="button" accessibilityLabel="Clear search and filters" onPress={clearSelection}>
                  <Text style={[s.sectionAction, { color: actionTextColor }]}>Clear search and filters</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {discovery.services.slice(0, visibleServices).map((service) => (
            <CatalogServiceRow key={service.id} service={service}
              garage={service.garageId ? discovery.garagesById.get(service.garageId) : undefined} />
          ))}
          {discovery.services.length > visibleServices ? (
            <Pressable style={s.moreButton} accessibilityRole="button" accessibilityLabel="Show more services" onPress={() => setVisibleServices((count) => count + 8)}>
              <Text style={[s.moreText, { color: actionTextColor }]}>Show more services</Text>
            </Pressable>
          ) : null}

          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Workshops</Text>
            <Pressable style={s.catalogMapLink} accessibilityRole="button" accessibilityLabel="View workshops on map" onPress={() => router.push('/map' as never)}>
              <Text style={[s.sectionAction, { color: actionTextColor }]}>View map</Text>
            </Pressable>
          </View>
          {noWorkshops ? <Text style={[s.catalogNoWorkshops, { color: c.textSecondary }]}>No workshops match this view.</Text> : null}
          {discovery.garageList.slice(0, visibleGarages).map((garage) => (
            <CatalogWorkshopRow key={garage.id} garage={garage} />
          ))}
          {discovery.garageList.length > visibleGarages ? (
            <Pressable style={s.moreButton} accessibilityRole="button" accessibilityLabel="Show more workshops" onPress={() => setVisibleGarages((count) => count + 5)}>
              <Text style={[s.moreText, { color: actionTextColor }]}>Show more workshops</Text>
            </Pressable>
          ) : null}
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

export function CategoryGaragesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = serviceCategories.find((item) => item.id === id) ?? serviceCategories[0];
  const discovery = useDiscovery('', category.id);

  return (
    <Frame title={category.label} subtitle="Category services and garages">
      <DiscoveryControls {...discovery} />
      <DiscoveryResults services={discovery.services} garageList={discovery.garageList} garagesById={discovery.garagesById} />
    </Frame>
  );
}

export function ServiceDetailScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const targetId = Array.isArray(id) ? id[0] : (id ?? '');
  const { vendors, jobs, loading } = useBranches({ includeServices: true });
  const service = jobs.find((job) => job.id === targetId);

  if (!service) {
    if (loading) return null;
    return (
      <RecordNotFound
        title="Service not found"
        message="This service is no longer offered on QarWheel."
      />
    );
  }

  const garage = service.garageId ? vendors.find((g) => g.id === service.garageId) : undefined;
  const alternatives = sortGarages(
    vendors.filter((item) => item.id !== garage?.id),
    'Top rated',
  ).slice(0, 3);

  return (
    <Frame title="Service details" subtitle={service.title}>
      <View style={[s.detailCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={s.detailTop}>
          <View style={[s.detailIcon, { backgroundColor: c.primaryLight }]}>
            <Icon name={categoryIcon(service.categoryId)} size={28} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.detailKicker, { color: c.primary }]}>Available {service.availability}</Text>
            <Text style={[s.detailTitle, { color: c.text }]}>{service.title}</Text>
            <Text style={[s.detailBody, { color: c.textSecondary }]}>Includes garage context, warranty, ETA, price range, and booking eligibility before checkout.</Text>
          </View>
        </View>
        <View style={s.metricRow}>
          <Metric label="Price" value={service.price} c={c} />
          <Metric label="Duration" value={service.duration ?? '45 min'} c={c} />
          <Metric label="Warranty" value={service.warranty ?? garage?.warranty ?? '—'} c={c} />
        </View>
        {garage ? (
          <View style={s.tagRow}>
            <Badge label={garageDistanceLabel(garage.distanceKm)} tone="primary" />
            <Badge label={`${garage.rating} rating`} tone="warning" />
            <Badge label={garage.pickupAvailable ? 'Pickup available' : 'Drop-off'} tone="ai" />
          </View>
        ) : null}
      </View>

      {garage ? (
        <>
          <Section title="Best garage for this service" />
          <GarageCard garage={garage} compare />
        </>
      ) : null}
      <Section title="Other matching garages" />
      {alternatives.map((item) => <GarageCard key={item.id} garage={item} />)}
      <Pressable style={[s.primaryBtn, { backgroundColor: c.primary, ...shadow.primary }]} onPress={() => router.push(route(`/checkout/${service.id}`))}>
        <Text style={s.primaryText}>Request service</Text>
      </Pressable>
    </Frame>
  );
}

function Metric({ label, value, c }: { label: string; value: string; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={[s.metric, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      <Text style={[s.metricLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[s.metricValue, { color: c.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function MapNearbyScreen() {
  const { vendors } = useBranches();
  return (
    <Frame title="Nearby garages" subtitle="Distance, rating, and availability">
      {sortGarages(vendors, 'Nearest').map((garage) => <GarageCard key={garage.id} garage={garage} />)}
    </Frame>
  );
}

export function FiltersSortingScreen() {
  const discovery = useDiscovery('');
  return (
    <Frame title="Explore" subtitle="Sort and filter live results">
      <DiscoveryControls {...discovery} />
      <DiscoveryResults services={discovery.services} garageList={discovery.garageList} garagesById={discovery.garagesById} />
    </Frame>
  );
}

export function CompareGaragesScreen() {
  const { vendors } = useBranches();
  return (
    <Frame title="Compare garages" subtitle="Price, distance, rating, warranty">
      {sortGarages(vendors, 'Top rated').slice(0, 3).map((garage) => <GarageCard key={garage.id} garage={garage} compare />)}
    </Frame>
  );
}

export function SavedItemsScreen() {
  const favoriteIds = useQarWheelStore((state) => state.favoriteGarageIds);
  const { vendors } = useBranches();
  const savedGarages = vendors.filter((garage) => favoriteIds.includes(garage.id));
  const list = savedGarages.length > 0 ? savedGarages : vendors.slice(0, 2);

  return (
    <Frame title="Saved" subtitle="Garages, services, and offers">
      <Section title={savedGarages.length > 0 ? 'Saved garages' : 'Suggested garages'} />
      {list.map((garage) => <GarageCard key={garage.id} garage={garage} />)}
      <Section title="Saved offers" />
      <PromotionalOffersList limit={2} />
    </Frame>
  );
}

export function PromotionalOffersScreen() {
  return (
    <Frame title="Offers" subtitle="Discounts with service context">
      <PromotionalOffersList />
    </Frame>
  );
}

// No `branch_promotions` collection is read anywhere in the app yet — there
// is no live source for time-limited discounts. Rather than show fabricated
// offers, this renders an honest "nothing live" state until a real
// promotions pipeline exists (Promotion type already reserved in
// src/lib/types.ts for that future work).
function PromotionalOffersList({ limit }: { limit?: number }) {
  const c = useQarColors();
  void limit;
  return (
    <View style={[s.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Icon name="pricetag-outline" size={32} color={c.muted} />
      <Text style={[s.emptyTitle, { color: c.text }]}>No live offers right now</Text>
      <Text style={[s.emptyBody, { color: c.muted }]}>Check back soon — garages post limited-time discounts here.</Text>
    </View>
  );
}

export function NoResultsScreen() {
  return (
    <Frame title="No results" subtitle="Try another search">
      <EmptyState />
    </Frame>
  );
}

export function MarketplaceHomeShortcuts() {
  const router = useRouter();
  const c = useQarColors();
  const shortcuts = [
    { icon: 'construct-outline' as IconName, label: 'Services', href: '/services' },
    { icon: 'pricetag-outline' as IconName, label: 'Offers', href: '/offers' },
    { icon: 'map-outline' as IconName, label: 'Nearby map', href: '/map' },
    { icon: 'git-compare-outline' as IconName, label: 'Compare', href: '/compare' },
  ];
  return (
    <View style={s.quickGrid}>
      {shortcuts.map((item) => (
        <AnimatedPressable key={item.label} style={[s.quickCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push(item.href as never)}>
          <Icon name={item.icon} size={22} color={c.primary} />
          <Text style={[s.quickTitle, { color: c.text }]}>{item.label}</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  navBtnPlaceholder: { width: 40, height: 40 },
  navTitleWrap: { flex: 1, alignItems: 'center', minWidth: 0, gap: 2 },
  navTitle: { ...typography.h4 },
  navSub: { ...typography.caption },
  content: { padding: spacing.page, paddingBottom: 128 },
  screenStack: { gap: 16 },
  search: { height: 54, borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.xs },
  searchInput: { flex: 1, ...typography.body },
  catalogSearch: { borderRadius: radius.xs, shadowOpacity: 0, elevation: 0 },
  rail: { gap: 10, paddingVertical: 3 },
  controls: { gap: 10 },
  pill: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  pillText: { ...typography.caption, fontWeight: '900' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { ...typography.h3 },
  sectionAction: { ...typography.bodySm, fontWeight: '900' },
  hero: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.xs },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...typography.h3 },
  heroBody: { ...typography.bodySm, marginTop: 2 },
  // Two-up grid. `flexBasis: '48%'` with flexGrow lets the row absorb the gap
  // instead of overflowing — a fixed 48.4% plus a 10px gap exceeded 100% and
  // pushed the second tile onto its own line at narrow widths.
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 92,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    justifyContent: 'center',
    ...shadow.xs,
  },
  quickIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { ...typography.h4 },
  quickBody: { ...typography.caption },

  // Three-up category grid, same basis technique.
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryTile: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 86,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  categoryLabel: { ...typography.caption, fontWeight: '900' },
  categoryCount: { ...typography.caption },

  termWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  resultCount: { ...typography.bodySm, fontWeight: '700', flex: 1 },
  mapStrip: { minHeight: 76, borderRadius: radius.xs, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  mapIcon: { width: 44, height: 44, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  mapTitle: { ...typography.h4 },
  mapMeta: { ...typography.caption, marginTop: 2 },
  browseLinks: { flexDirection: 'row', gap: 12, paddingTop: 2 },
  browseLink: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  browseLinkText: { ...typography.bodySm, fontWeight: '700' },
  featuredCard: { borderRadius: radius.xs, borderWidth: 1, overflow: 'hidden' },
  featuredPhoto: { height: 215, justifyContent: 'flex-end', backgroundColor: '#11161D' },
  featuredImage: { ...StyleSheet.absoluteFill },
  featuredVerified: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.xs, backgroundColor: 'rgba(8,10,13,0.86)', paddingHorizontal: 9, paddingVertical: 6 },
  featuredVerifiedText: { color: '#fff', ...typography.caption },
  featuredIdentity: { padding: 14, gap: 3, backgroundColor: 'rgba(8,10,13,0.88)' },
  featuredName: { color: '#fff', ...typography.h3 },
  featuredLocation: { color: '#fff', ...typography.caption },
  featuredBody: { padding: 14, gap: 12 },
  featuredFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featuredFact: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  featuredFactText: { ...typography.caption },
  featuredPriceRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.xs, padding: 12 },
  featuredPriceLabel: { ...typography.overline },
  featuredPrice: { ...typography.h4, marginTop: 3 },
  featuredSave: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  featuredBook: { minHeight: 52, borderRadius: radius.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  featuredBookText: { color: '#fff', ...typography.h4 },
  moreButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { ...typography.bodySm, fontWeight: '800' },
  garageCard: { padding: 12, borderRadius: radius.xl, borderWidth: 1, gap: 10, ...shadow.xs },
  garageFavorite: { position: 'absolute', top: 4, right: 4, zIndex: 1, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  garageTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  garageImage: { width: 74, height: 74, borderRadius: radius.md },
  garageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceValue: { ...typography.h4 },
  priceMeta: { ...typography.caption, marginTop: 1 },
  bookNow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.full,
  },
  bookNowText: { color: '#fff', ...typography.caption, fontWeight: '900' },
  dot: { ...typography.caption },
  rowBody: { flex: 1, minWidth: 0, gap: 5 },
  titleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingRight: 44 },
  rowTitle: { ...typography.h4 },
  rowMeta: { ...typography.caption },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  factItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  factText: { ...typography.caption, fontWeight: '700' },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  badge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { ...typography.caption, fontWeight: '900' },
  price: { ...typography.caption, fontWeight: '900' },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: radius.xl, borderWidth: 1, ...shadow.xs },
  servicePrimary: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 13 },
  serviceIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bookButton: { minHeight: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  bookButtonText: { color: '#fff', ...typography.caption, fontWeight: '900' },
  catalogHeader: { minHeight: 62, paddingHorizontal: spacing.page, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  catalogHeaderButton: { width: 44, height: 44, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  catalogHeaderTitle: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  catalogBrandMark: { width: 38, height: 38 },
  catalogBrand: { fontSize: 19, fontWeight: '800' },
  catalogHeaderSub: { ...typography.overline },
  catalogContent: { padding: spacing.page, paddingBottom: spacing.xxl },
  catalogStack: { gap: 14 },
  catalogRail: { gap: 8, paddingVertical: 2 },
  catalogToolbar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  catalogCount: { ...typography.caption, flex: 1, minWidth: 0 },
  catalogTool: { minHeight: 44, maxWidth: 144, paddingHorizontal: 9, borderRadius: radius.xs, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  catalogToolText: { ...typography.caption, fontWeight: '800', flexShrink: 1 },
  catalogFilterButton: { width: 44, height: 44, borderRadius: radius.xs, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  catalogMenu: { borderRadius: radius.xs, borderWidth: 1, paddingHorizontal: 12 },
  catalogMenuItem: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  catalogMenuText: { ...typography.bodySm, flex: 1 },
  catalogMapLink: { minHeight: 44, justifyContent: 'center' },
  catalogCard: { borderRadius: radius.xs, borderWidth: 1, padding: 12, gap: 10 },
  catalogDetails: { minHeight: 76, flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  catalogThumb: { width: 70, height: 70, borderRadius: radius.xs },
  catalogCopy: { flex: 1, minWidth: 0, gap: 4 },
  catalogName: { ...typography.h4 },
  catalogMeta: { ...typography.caption },
  catalogFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catalogTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catalogTag: { borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 5 },
  catalogTagText: { ...typography.caption },
  catalogFooter: { minHeight: 58, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  catalogPriceBlock: { flex: 1, minWidth: 0, gap: 3 },
  catalogEyebrow: { ...typography.overline },
  catalogPrice: { ...typography.bodySm, fontWeight: '800' },
  catalogRequest: { minHeight: 44, minWidth: 102, borderRadius: radius.xs, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  catalogRequestText: { color: '#fff', ...typography.caption, fontWeight: '800' },
  catalogWorkshopTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  catalogSave: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  catalogLoading: { marginVertical: spacing.lg },
  catalogEmpty: { minHeight: 154, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start', justifyContent: 'center', gap: 7, paddingVertical: 16 },
  catalogClear: { minHeight: 44, justifyContent: 'center' },
  catalogNoWorkshops: { ...typography.bodySm, paddingVertical: 10 },
  detailCard: { gap: 14, padding: 18, borderRadius: radius.xl, borderWidth: 1, ...shadow.sm },
  detailTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  detailIcon: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  detailKicker: { ...typography.overline },
  detailTitle: { ...typography.h2, marginTop: 2 },
  detailBody: { ...typography.bodySm, marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 10 },
  metricLabel: { ...typography.caption },
  metricValue: { ...typography.h4, marginTop: 2 },
  offerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: 16, borderRadius: radius.xl, borderWidth: 1, ...shadow.xs },
  offerKicker: { ...typography.overline },
  offerTitle: { ...typography.h4 },
  offerBody: { ...typography.bodySm },
  offerBook: { minWidth: 62, height: 38, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  offerBookText: { color: '#fff', ...typography.caption, fontWeight: '900' },
  primaryBtn: { minHeight: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  empty: { alignItems: 'center', gap: 10, padding: 28, borderRadius: radius.xl, borderWidth: 1 },
  emptyTitle: { ...typography.h3 },
  emptyBody: { ...typography.bodySm, textAlign: 'center' },
  emptyBtn: { height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
