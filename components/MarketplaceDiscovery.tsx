/**
 * QarWheels 2026 marketplace discovery.
 * Shared service, search, category, compare, map, offer, and saved screens.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '@/components/AnimatedPressable';
import { RemoteImage } from '@/components/RemoteImage';
import RecordNotFound from '@/components/RecordNotFound';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import {
  garages,
  lookupGarage,
  lookupJob,
  offers,
  popularJobs,
  serviceCategories,
  type Garage,
  type PopularJob,
} from '@/lib/marketplace';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { tap } from '@/lib/haptics';
import { radius, shadow, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type SortKey = 'Best match' | 'Nearest' | 'Top rated' | 'Lowest price' | 'Fastest';
type FilterKey = 'Open now' | 'Instant booking' | 'Pickup' | 'Warranty' | 'Today';

const sortOptions: SortKey[] = ['Best match', 'Nearest', 'Top rated', 'Lowest price', 'Fastest'];
const filterOptions: FilterKey[] = ['Open now', 'Instant booking', 'Pickup', 'Warranty', 'Today'];
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
  if (sort === 'Nearest') return copy.sort((a, b) => a.distanceKm - b.distanceKm);
  if (sort === 'Top rated') return copy.sort((a, b) => b.rating - a.rating);
  if (sort === 'Lowest price') return copy.sort((a, b) => a.startingPriceValue - b.startingPriceValue);
  if (sort === 'Fastest') return copy.sort((a, b) => Number.parseInt(a.responseTime, 10) - Number.parseInt(b.responseTime, 10));
  return copy.sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating - a.rating);
}

function filterServices(list: PopularJob[], activeFilters: FilterKey[]) {
  return list.filter((service) => {
    const garage = service.garageId ? lookupGarage(service.garageId) : undefined;
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

function sortServices(list: PopularJob[], sort: SortKey) {
  const copy = [...list];
  if (sort === 'Nearest') return copy.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
  if (sort === 'Top rated') return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sort === 'Lowest price') return copy.sort((a, b) => a.priceValue - b.priceValue);
  if (sort === 'Fastest') return copy.sort((a, b) => Number.parseInt(a.duration ?? '60', 10) - Number.parseInt(b.duration ?? '60', 10));
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
        <AnimatedPressable
          style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.push('/filters' as never)}
          hitSlop={8}
          accessibilityLabel="Filters"
          accessibilityHint="Narrow the results by price, rating and distance"
        >
          <Icon name="funnel-outline" size={18} color={c.primary} />
        </AnimatedPressable>
      </View>
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MotionScreen style={s.screenStack}>{children}</MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

function SearchInput({ value, onChangeText, onSubmit, onClear, autoFocus }: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
}) {
  const c = useQarColors();
  const hasValue = value.length > 0;

  return (
    <View style={[s.search, { backgroundColor: c.surface, borderColor: hasValue ? c.primary : c.border }]}>
      <Icon name="search-outline" size={18} color={hasValue ? c.primary : c.muted} />
      <TextInput
        style={[s.searchInput, { color: c.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search services, garages, areas…"
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
      ) : (
        <Icon name="sparkles-outline" size={16} color={c.ai} />
      )}
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
  const isFav = useQarWheelsStore((state) => state.favoriteGarageIds.includes(garage.id));
  const toggleFav = useQarWheelsStore((state) => state.toggleFavoriteGarage);

  // Two rows rather than three columns: details on top, price and CTA on a
  // dedicated footer. The old layout squeezed price, availability and a Book
  // chip into a 76px column, so long prices truncated and the button was
  // below a comfortable tap target.
  return (
    <AnimatedPressable
      style={[s.garageCard, { backgroundColor: c.surface, borderColor: isFav ? c.primary : c.border }]}
      onPress={() => { void tap(); router.push(route(`/garage/${garage.id}`)); }}
      scaleValue={0.985}
      accessibilityLabel={`${garage.name}, ${garage.rating} stars, ${garage.distanceKm.toFixed(1)} kilometres away, from ${garage.startingPrice}`}
    >
      <View style={s.garageTop}>
        <RemoteImage uri={garage.imageUrl} style={s.garageImage} fallbackIcon="business-outline" accessibilityLabel={garage.name} />
        <View style={s.rowBody}>
          <View style={s.titleLine}>
            <Text style={[s.rowTitle, { color: c.text }]} numberOfLines={1}>{garage.name}</Text>
            <Pressable
              hitSlop={10}
              onPress={() => { void tap(); toggleFav(garage.id); }}
              accessibilityRole="button"
              accessibilityLabel={isFav ? `Remove ${garage.name} from saved` : `Save ${garage.name}`}
              accessibilityState={{ selected: isFav }}
            >
              <Icon name={isFav ? 'heart' : 'heart-outline'} size={19} color={isFav ? c.danger : c.muted} />
            </Pressable>
          </View>

          <View style={s.factRow}>
            <Fact icon="star" text={`${garage.rating}`} color="#F59E0B" />
            <Text style={[s.dot, { color: c.muted }]}>·</Text>
            <Text style={[s.rowMeta, { color: c.textSecondary }]} numberOfLines={1}>
              {garage.area} · {garage.distanceKm.toFixed(1)} km
            </Text>
          </View>

          <View style={s.tagRow}>
            <Badge label={garage.openNow ? 'Open now' : garage.availability} tone={garage.openNow ? 'success' : 'muted'} />
            {garage.verified ? <Badge label="Verified" tone="primary" /> : null}
            {garage.pickupAvailable ? <Badge label="Pickup" tone="ai" /> : null}
          </View>
        </View>
      </View>

      <View style={[s.garageFooter, { borderTopColor: c.border }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.priceValue, { color: c.text }]} numberOfLines={1}>
            {garage.startingPrice}
          </Text>
          <Text style={[s.priceMeta, { color: c.muted }]} numberOfLines={1}>
            {garage.responseTime} · {compare ? garage.warranty : garage.availability}
          </Text>
        </View>
        <AnimatedPressable
          style={[s.bookNow, { backgroundColor: c.primary }]}
          onPress={() => { void tap(); router.push(route(`/checkout/${garage.id}`)); }}
          scaleValue={0.96}
          accessibilityLabel={`Book ${garage.name}`}
        >
          <Text style={s.bookNowText}>Book now</Text>
          <Icon name="arrow-forward" size={14} color="#fff" />
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
}

function ServiceCard({ service }: { service: PopularJob }) {
  const router = useRouter();
  const c = useQarColors();
  // May be undefined for a service whose garage was delisted; the card renders
  // without garage context rather than borrowing another garage's identity.
  const garage = service.garageId ? lookupGarage(service.garageId) : undefined;

  return (
    <AnimatedPressable
      style={[s.serviceCard, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={() => { void tap(); router.push(route(`/service/${service.id}`)); }}
      scaleValue={0.985}
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
          <Fact icon="time-outline" text={service.duration ?? '45 min'} color={c.muted} />
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
      <Pressable style={[s.bookButton, { backgroundColor: c.primary }]} onPress={() => router.push(route(`/checkout/${service.id}`))}>
        <Text style={s.bookButtonText}>Book now</Text>
      </Pressable>
    </AnimatedPressable>
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
  showServices = true,
  showGarages = true,
}: {
  services: PopularJob[];
  garageList: Garage[];
  showServices?: boolean;
  showGarages?: boolean;
}) {
  const router = useRouter();
  const hasAny = (showServices && services.length > 0) || (showGarages && garageList.length > 0);

  if (!hasAny) return <EmptyState />;

  return (
    <>
      {showServices ? (
        <>
          <Section title={`Services (${services.length})`} action="View all" onPress={() => router.push('/services' as never)} />
          {services.map((service) => <ServiceCard key={service.id} service={service} />)}
        </>
      ) : null}
      {showGarages ? (
        <>
          <Section title={`Garages (${garageList.length})`} action="Map" onPress={() => router.push('/map' as never)} />
          {garageList.map((garage) => <GarageCard key={garage.id} garage={garage} />)}
        </>
      ) : null}
    </>
  );
}

function useDiscovery(queryText = '', categoryId?: string) {
  const [sort, setSort] = useState<SortKey>('Best match');
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const normalized = useDebounced(queryText.trim().toLowerCase());

  const toggleFilter = (filter: FilterKey) => {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  };

  const services = useMemo(() => {
    let list = popularJobs;
    if (categoryId) list = list.filter((job) => job.categoryId === categoryId);
    if (normalized) {
      list = list.filter((job) => {
        const garage = job.garageId ? lookupGarage(job.garageId) : undefined;
        return parseQueryMatch(`${job.title} ${job.availability} ${job.warranty} ${garage?.name ?? ''} ${garage?.area ?? ''}`, normalized);
      });
    }
    return sortServices(filterServices(list, filters), sort);
  }, [categoryId, filters, normalized, sort]);

  const garageList = useMemo(() => {
    let list = garages;
    if (categoryId) {
      const category = serviceCategories.find((item) => item.id === categoryId);
      list = list.filter((garage) => {
        const serviceMatch = popularJobs.some((job) => job.categoryId === categoryId && job.garageId === garage.id);
        const textMatch = category ? parseQueryMatch(`${garage.type} ${garage.category} ${garage.tags.join(' ')}`, category.label) : false;
        return serviceMatch || textMatch;
      });
    }
    if (normalized) {
      list = list.filter((garage) => parseQueryMatch(`${garage.name} ${garage.type} ${garage.category} ${garage.area} ${garage.tags.join(' ')}`, normalized));
    }
    return sortGarages(filterGarages(list, filters), sort);
  }, [categoryId, filters, normalized, sort]);

  return { sort, setSort, filters, toggleFilter, services, garageList };
}

/**
 * Search behaves as two distinct screens sharing one input:
 *
 *  • Idle (no query) — a browse surface: shortcuts, categories, popular terms.
 *  • Searching — results only, with sort/filter controls and a result count.
 *
 * Previously both states rendered at once, so tapping the home search bar
 * dropped you into a wall of shortcut tiles, sort rails, filter rails and
 * unfiltered results with no indication anything was searchable.
 */
export function SearchSuggestionsScreen() {
  const router = useRouter();
  const c = useQarColors();
  const [term, setTerm] = useState('');
  const discovery = useDiscovery(term);

  const searching = term.trim().length > 0;
  const resultCount = discovery.services.length + discovery.garageList.length;

  return (
    <Frame title="Search" subtitle="Find trusted services and garages" root>
      <SearchInput
        value={term}
        onChangeText={setTerm}
        onClear={() => setTerm('')}
        autoFocus
      />

      {searching ? (
        <>
          {/* Controls belong with results, not above an empty browse state. */}
          <DiscoveryControls {...discovery} />

          <View style={s.resultHead}>
            <Text style={[s.resultCount, { color: c.textSecondary }]}>
              {resultCount === 0
                ? 'No matches'
                : `${resultCount} ${resultCount === 1 ? 'result' : 'results'} for "${term.trim()}"`}
            </Text>
            {resultCount > 0 && (
              <Pressable onPress={() => setTerm('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                <Text style={[s.sectionAction, { color: c.primary }]}>Clear</Text>
              </Pressable>
            )}
          </View>

          {resultCount === 0 ? (
            <View style={[s.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Icon name="search-outline" size={34} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>Nothing matched "{term.trim()}"</Text>
              <Text style={[s.emptyBody, { color: c.textSecondary }]}>
                Try a broader term, or browse the categories below.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                {quickTerms.slice(0, 5).map((item) => (
                  <Pill key={item} label={item} onPress={() => setTerm(item)} />
                ))}
              </ScrollView>
            </View>
          ) : (
            <DiscoveryResults services={discovery.services} garageList={discovery.garageList} />
          )}
        </>
      ) : (
        <>
          {/* ── Browse state ── */}
          <Section title="Jump to" />
          <View style={s.quickGrid}>
            {[
              { icon: 'map-outline' as IconName, label: 'Map', body: 'Garages near you', href: '/map' },
              { icon: 'git-compare-outline' as IconName, label: 'Compare', body: 'Side by side', href: '/compare' },
              { icon: 'heart-outline' as IconName, label: 'Saved', body: 'Your shortlist', href: '/saved' },
              { icon: 'pricetag-outline' as IconName, label: 'Offers', body: 'Live discounts', href: '/offers' },
            ].map((item) => (
              <AnimatedPressable
                key={item.label}
                style={[s.quickCard, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => router.push(item.href as never)}
                accessibilityLabel={item.label}
                accessibilityHint={item.body}
                scaleValue={0.97}
              >
                <View style={[s.quickIcon, { backgroundColor: c.primaryLight }]}>
                  <Icon name={item.icon} size={19} color={c.primary} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={[s.quickTitle, { color: c.text }]}>{item.label}</Text>
                  <Text style={[s.quickBody, { color: c.muted }]} numberOfLines={1}>{item.body}</Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>

          <Section title="Browse by category" action="All services" onPress={() => router.push('/services' as never)} />
          <View style={s.categoryGrid}>
            {serviceCategories.slice(0, 6).map((category) => (
              <AnimatedPressable
                key={category.id}
                style={[s.categoryTile, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => router.push(route(`/category/${category.id}`))}
                accessibilityLabel={category.label}
                accessibilityHint={`${category.count} providers`}
                scaleValue={0.97}
              >
                <Icon name={categoryIcon(category.id)} size={20} color={c.primary} />
                <Text style={[s.categoryLabel, { color: c.text }]} numberOfLines={1}>{category.label}</Text>
                <Text style={[s.categoryCount, { color: c.muted }]}>{category.count}</Text>
              </AnimatedPressable>
            ))}
          </View>

          <Section title="Popular searches" />
          <View style={s.termWrap}>
            {quickTerms.map((item) => (
              <Pill key={item} label={item} onPress={() => setTerm(item)} />
            ))}
          </View>
        </>
      )}
    </Frame>
  );
}

export function ServiceListingsScreen() {
  const c = useQarColors();
  const [term, setTerm] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const discovery = useDiscovery(term, categoryId);

  return (
    <Frame title="Services" subtitle="Compare price, distance, rating, and availability">
      <View style={[s.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[s.heroIcon, { backgroundColor: c.primaryLight }]}>
          <Icon name="construct-outline" size={24} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.heroTitle, { color: c.text }]}>Book with clear context</Text>
          <Text style={[s.heroBody, { color: c.textSecondary }]}>Filter by open garages, pickup, warranty, price, distance, and available time.</Text>
        </View>
      </View>

      <SearchInput value={term} onChangeText={setTerm} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        <Pill label="All" active={!categoryId} onPress={() => setCategoryId(undefined)} />
        {serviceCategories.map((category) => (
          <Pill key={category.id} label={category.label} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
        ))}
      </ScrollView>
      <DiscoveryControls {...discovery} />
      <DiscoveryResults services={discovery.services} garageList={discovery.garageList} />
    </Frame>
  );
}

export function CategoryGaragesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useQarColors();
  const category = serviceCategories.find((item) => item.id === id) ?? serviceCategories[0];
  const discovery = useDiscovery('', category.id);

  return (
    <Frame title={category.label} subtitle="Category services and garages">
      <View style={[s.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[s.heroIcon, { backgroundColor: c.primaryLight }]}>
          <Icon name={categoryIcon(category.id)} size={24} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.heroTitle, { color: c.text }]}>{category.label}</Text>
          <Text style={[s.heroBody, { color: c.textSecondary }]}>{category.count} providers with filtered services, transparent prices, and booking availability.</Text>
        </View>
      </View>
      <DiscoveryControls {...discovery} />
      <DiscoveryResults services={discovery.services} garageList={discovery.garageList} />
    </Frame>
  );
}

export function ServiceDetailScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const service = lookupJob(Array.isArray(id) ? id[0] : (id ?? ''));

  if (!service) {
    return (
      <RecordNotFound
        title="Service not found"
        message="This service is no longer offered on QarWheels."
      />
    );
  }

  const garage = service.garageId ? lookupGarage(service.garageId) : undefined;
  const alternatives = sortGarages(
    garages.filter((item) => item.id !== garage?.id),
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
            <Badge label={`${garage.distanceKm.toFixed(1)} km away`} tone="primary" />
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
        <Text style={s.primaryText}>Book now</Text>
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
  return (
    <Frame title="Nearby garages" subtitle="Distance, rating, and availability">
      {sortGarages(garages, 'Nearest').map((garage) => <GarageCard key={garage.id} garage={garage} />)}
    </Frame>
  );
}

export function FiltersSortingScreen() {
  const router = useRouter();
  const c = useQarColors();
  const discovery = useDiscovery('');
  return (
    <Frame title="Filters" subtitle="Location, price, rating, availability">
      <DiscoveryControls {...discovery} />
      <DiscoveryResults services={discovery.services} garageList={discovery.garageList} />
      <Pressable style={[s.primaryBtn, { backgroundColor: c.primary }]} onPress={() => router.push('/search' as never)}>
        <Text style={s.primaryText}>Apply to search</Text>
      </Pressable>
    </Frame>
  );
}

export function CompareGaragesScreen() {
  return (
    <Frame title="Compare garages" subtitle="Price, distance, rating, warranty">
      {sortGarages(garages, 'Top rated').slice(0, 3).map((garage) => <GarageCard key={garage.id} garage={garage} compare />)}
    </Frame>
  );
}

export function SavedItemsScreen() {
  const favoriteIds = useQarWheelsStore((state) => state.favoriteGarageIds);
  const savedGarages = garages.filter((garage) => favoriteIds.includes(garage.id));
  const list = savedGarages.length > 0 ? savedGarages : garages.slice(0, 2);

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

function PromotionalOffersList({ limit }: { limit?: number }) {
  const router = useRouter();
  const c = useQarColors();
  return (
    <>
      {offers.slice(0, limit).map((offer) => {
        const service = lookupJob(offer.serviceId);
        const garage = lookupGarage(offer.garageId);
        // A dangling offer is skipped: showing it against a substituted
        // garage would advertise a price that garage never set.
        if (!service || !garage) return null;
        return (
          <AnimatedPressable key={offer.id} style={[s.offerCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push(route(`/service/${offer.serviceId}`))}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={[s.offerKicker, { color: c.primary }]}>{offer.discount} · {offer.validUntil}</Text>
              <Text style={[s.offerTitle, { color: c.text }]}>{offer.title}</Text>
              <Text style={[s.offerBody, { color: c.textSecondary }]}>{service.title} at {garage.name}</Text>
            </View>
            <Pressable style={[s.offerBook, { backgroundColor: c.primary }]} onPress={() => router.push(route(`/checkout/${offer.serviceId}`))}>
              <Text style={s.offerBookText}>Book</Text>
            </Pressable>
          </AnimatedPressable>
        );
      })}
    </>
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
  rail: { gap: 10, paddingVertical: 3 },
  controls: { gap: 10 },
  pill: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
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
  garageCard: { padding: 12, borderRadius: radius.xl, borderWidth: 1, gap: 10, ...shadow.xs },
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
  titleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
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
  serviceIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bookButton: { minHeight: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  bookButtonText: { color: '#fff', ...typography.caption, fontWeight: '900' },
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
