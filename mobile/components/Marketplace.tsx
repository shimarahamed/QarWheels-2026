/** Customer search, bookings, vehicles, and account screens. */

import Ionicons from '@expo/vector-icons/Ionicons';
import type React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ErrorState from '@/components/ErrorState';
import { type Booking, type Garage, serviceCategories } from '@/lib/marketplace';
import { type FirestoreBooking, type FirestoreCar, useCars, useFirestoreBookings, useBranches, cancelBooking as cancelRemoteBooking } from '@/lib/firestoreOps';
import { auth } from '@/lib/firebase';
import { useAuthContext } from '@/lib/AuthContext';
import { getQarColors, getThemedStatusColors, type QarColors, radius, shadow, spacing, typography } from '@/lib/theme';
import { tap } from '@/lib/haptics';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { signOutCompletely } from '@/lib/session';
import { recordedHealth } from '@/lib/vehicle-records';
import { RemoteImage } from '@/components/RemoteImage';
import { MotionScreen } from '@/lib/motion';
import { formatBookingDate } from '@/lib/booking-date';
import {
  getBookingStatusDescription,
  getBookingStatusIndex,
  getBookingStatusLabel,
  isBookingTerminal,
  actorAllowedTransitions,
  type BookingWorkflowStatus,
} from '@/lib/booking-workflow';

// ── Constants ─────────────────────────────────────────────────────
// Extra padding so content clears the absolute-positioned tab bar.
// iOS 26 floating pill: 62 (bar) + 34 (safe area) + 10 (gap above indicator) + 14 breathing = 120
// Android: 62 (bar) + 14 (bottom gap) + 14 breathing = 90
const TAB_BOTTOM = Platform.OS === 'ios' ? 120 : 90;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function route(path: string) { return path as never; }
function Icon({ name, size = 18, color }: { name: IoniconName; size?: number; color: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

// ── Pull-to-refresh hook ───────────────────────────────────────────

const ACCOUNT_MENU_SECTIONS = [
  {
    title: 'Profile & documents',
    items: [
      { label: 'Profile overview', icon: 'person-circle-outline' as IoniconName, href: '/profile-overview', color: '#E31E24' },
      { label: 'Edit profile', icon: 'create-outline' as IoniconName, href: '/edit-profile', color: '#22C55E' },
      { label: 'Pickup addresses', icon: 'location-outline' as IoniconName, href: '/addresses', color: '#3B82F6' },
      { label: 'Documents vault', icon: 'folder-open-outline' as IoniconName, href: '/documents', color: '#A78BFA' },
    ],
  },
  {
    title: 'Vehicles & bookings',
    items: [
      { label: 'My cars', icon: 'car-sport-outline' as IoniconName, href: '/(tabs)/cars', color: '#E31E24' },
      { label: 'Vehicle & preferences', icon: 'speedometer-outline' as IoniconName, href: '/settings/vehicle-preferences', color: '#3B82F6' },
      { label: 'Saved garages', icon: 'heart-outline' as IoniconName, href: '/settings/saved-garages', color: '#EF4444' },
      { label: 'Booking history', icon: 'calendar-outline' as IoniconName, href: '/booking-history', color: '#22C55E' },
    ],
  },
  {
    title: 'Payments & security',
    items: [
      { label: 'Payment methods', icon: 'card-outline' as IoniconName, href: '/payment-methods', color: '#E31E24' },
      { label: 'Wallet balance', icon: 'wallet-outline' as IoniconName, href: '/wallet', color: '#818CF8' },
      { label: 'Transactions', icon: 'receipt-outline' as IoniconName, href: '/transactions', color: '#F59E0B' },
      { label: 'Invoices', icon: 'document-text-outline' as IoniconName, href: '/invoices', color: '#22D3EE' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Notifications & privacy', icon: 'notifications-outline' as IoniconName, href: '/settings/notifications', color: '#F59E0B' },
      { label: 'System settings', icon: 'settings-outline' as IoniconName, href: '/settings/system-settings', color: '#22D3EE' },
      { label: 'Subscriptions', icon: 'repeat-outline' as IoniconName, href: '/subscriptions', color: '#22C55E' },
      { label: 'Coupons & rewards', icon: 'pricetag-outline' as IoniconName, href: '/coupons', color: '#EF4444' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Messages', icon: 'chatbubbles-outline' as IoniconName, href: '/messages', color: '#3B82F6' },
      { label: 'Help center', icon: 'help-circle-outline' as IoniconName, href: '/help-center', color: '#22D3EE' },
      { label: 'FAQ', icon: 'information-circle-outline' as IoniconName, href: '/faq', color: '#A78BFA' },
      { label: 'Contact us', icon: 'mail-outline' as IoniconName, href: '/contact-us', color: '#22C55E' },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Vendor mode', icon: 'business-outline' as IoniconName, href: '/settings/vendor-mode', color: '#F59E0B' },
    ],
  },
];

function useRefresh(onRefresh?: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const c = useQarColors();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const control = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={c.primary}
      colors={[c.primary]}
      progressBackgroundColor={c.surface}
    />
  );

  return { refreshing, handleRefresh, control };
}

// ── Shared sub-components ──────────────────────────────────────────

function ScreenWrap({ c, children, onRefresh }: { c: QarColors; children: React.ReactNode; onRefresh?: () => Promise<void> }) {
  const { control } = useRefresh(onRefresh);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.background }}
        contentContainerStyle={{ paddingBottom: TAB_BOTTOM + 18, gap: spacing.section }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={control}
      >
        <MotionScreen>
          {children}
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── GarageListCard ─────────────────────────────────────────────────
function GarageListCard({ garage, c }: { garage: Garage; c: QarColors }) {
  const router = useRouter();
  const isFav = useQarWheelStore((s) => s.favoriteGarageIds.includes(garage.id));
  const toggleFav = useQarWheelStore((s) => s.toggleFavoriteGarage);

  return (
    <View style={[ss.garageCard, { backgroundColor: c.surface, borderColor: isFav ? c.primary : c.border }]}>
      <Pressable
        style={ss.garageDetails}
        accessibilityRole="button"
        accessibilityLabel={`View ${garage.name}`}
        onPress={() => { void tap(); router.push(route(`/garage/${garage.id}`)); }}
      >
      <RemoteImage uri={garage.imageUrl} style={ss.garageThumb} fallbackIcon="business-outline" accessibilityLabel={garage.name} />

      <View style={ss.garageBody}>
        <View style={ss.garageTopRow}>
          <Text numberOfLines={1} style={[ss.garageName, { color: c.text }]}>{garage.name}</Text>
        </View>

        <Text style={[ss.garageSpecialty, { color: c.muted }]}>{garage.type}</Text>

        <View style={ss.garageFactRow}>
          <Icon name="star" size={12} color="#F59E0B" />
          <Text style={[ss.garageFact, { color: c.text }]}>{garage.rating}</Text>
          <Text style={[ss.garageFact, { color: c.muted }]}>({garage.reviews})</Text>
          <Text style={[ss.garageDot, { color: c.muted }]}>·</Text>
          <Icon name="time-outline" size={11} color={c.muted} />
          <Text style={[ss.garageFact, { color: c.muted }]}>{garage.responseTime}</Text>
          <Text style={[ss.garageDot, { color: c.muted }]}>·</Text>
          <Text style={[ss.garageFact, { color: c.text, fontWeight: '700' }]}>{garage.startingPrice}</Text>
        </View>

        <View style={ss.tagRow}>
          <View style={[ss.openPill, { backgroundColor: garage.openNow ? 'rgba(34,197,94,0.14)' : c.surfaceAlt }]}>
            <View style={[ss.openDot, { backgroundColor: garage.openNow ? '#22C55E' : c.muted }]} />
            <Text style={[ss.openText, { color: garage.openNow ? '#22C55E' : c.muted }]}>
              {garage.openNow === null ? 'Hours unavailable' : garage.openNow ? 'Open' : 'Closed'}
            </Text>
          </View>

          {garage.verified && (
            <View style={[ss.verifiedPill, { backgroundColor: 'rgba(227,30,36,0.12)' }]}>
              <Icon name="shield-checkmark" size={10} color={c.primary} />
              <Text style={[ss.verifiedText, { color: c.primary }]}>Verified</Text>
            </View>
          )}

          {garage.tags.map((tag) => (
            <View key={tag} style={[ss.tagPill, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={[ss.tagText, { color: c.muted }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={isFav ? `Unsave ${garage.name}` : `Save ${garage.name}`} accessibilityState={{ selected: isFav }} style={ss.garageFavorite} onPress={() => { void tap(); toggleFav(garage.id); }}>
        <Icon name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#EF4444' : c.muted} />
      </Pressable>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════════════

// ── SearchGarageList — live vendors for search screen ─────────────
function SearchGarageList({ c }: { c: QarColors }) {
  const { vendors, loading } = useBranches();
  if (loading) return <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />;
  return <>{vendors.map((g) => <GarageListCard key={g.id} garage={g} c={c} />)}</>;
}

// ══════════════════════════════════════════════════════════════════
// SEARCH SCREEN
// ══════════════════════════════════════════════════════════════════
export function SearchScreen() {
  const router = useRouter();
  const c = useQarColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(searchQuery);
  const { vendors, loading, error, refresh } = useBranches();
  const trimmed = deferredQuery.trim().toLocaleLowerCase();
  const filteredVendors = useMemo(() => {
    const terms = trimmed.split(/\s+/).filter(Boolean);
    return vendors.filter((garage) => {
      const searchable = [garage.name, garage.type, garage.area, garage.category, ...garage.tags].join(' ').toLocaleLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
  }, [vendors, trimmed]);
  const suggestions = useMemo(() => [...new Set(vendors.map((garage) => garage.type).filter(Boolean))].slice(0, 5), [vendors]);
  const remember = () => {
    const value = searchQuery.trim();
    if (value) setRecent((previous) => [value, ...previous.filter((item) => item !== value)].slice(0, 5));
    Keyboard.dismiss();
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <View style={{ padding: spacing.page, gap: 12 }}>
        <Text accessibilityRole="header" style={[ss.pageTitle, { color: c.text }]}>Find a garage</Text>
        <View style={[ss.searchBarActive, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Icon name="search-outline" size={19} color={c.muted} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery}
            accessibilityLabel="Search garages" placeholder="Name, area, or service type"
            placeholderTextColor={c.muted} returnKeyType="search" onSubmitEditing={remember}
            autoCorrect={false} autoCapitalize="none"
            style={[ss.searchInput, { color: c.text, flex: 1, minWidth: 0 }]} />
          {searchQuery !== '' && <Pressable accessibilityRole="button" accessibilityLabel="Clear search"
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setSearchQuery('')}>
            <Icon name="close-circle-outline" size={22} color={c.muted} />
          </Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel="Back to home"
            style={{ minHeight: 44, justifyContent: 'center' }}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={{ color: c.primary, fontWeight: '700' }}>Back</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={filteredVendors} keyExtractor={(garage) => garage.id}
        renderItem={({ item }) => <GarageListCard garage={item} c={c} />}
        initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: spacing.page, paddingBottom: TAB_BOTTOM + 18, gap: 12 }}
        refreshing={loading && vendors.length > 0} onRefresh={() => void refresh()}
        ListHeaderComponent={<View style={{ gap: 12 }}>
          {!searchQuery && recent.length > 0 && <View style={{ gap: 4 }}>
            <Text accessibilityRole="header" style={[ss.suggestHeading, { color: c.textSecondary }]}>Recent searches</Text>
            {recent.map((item) => <View key={item} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Search for ${item}`}
                style={{ flex: 1, minHeight: 44, justifyContent: 'center' }} onPress={() => setSearchQuery(item)}>
                <Text style={{ color: c.text }}>{item}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove search ${item}`}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setRecent((previous) => previous.filter((value) => value !== item))}>
                <Icon name="close" color={c.muted} />
              </Pressable>
            </View>)}
          </View>}
          {!searchQuery && suggestions.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {suggestions.map((item) => <Pressable key={item} accessibilityRole="button"
              accessibilityLabel={`Search for ${item}`} onPress={() => setSearchQuery(item)}
              style={[ss.trendChip, { minHeight: 44, justifyContent: 'center', backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={{ color: c.text }}>{item}</Text>
            </Pressable>)}
          </ScrollView>}
          <SectionRow title={loading && !vendors.length ? 'Garages' : `${filteredVendors.length} garages`}
            linkLabel="Map" onPress={() => router.push('/map')} c={c} />
          {error && <ErrorState compact onRetry={() => void refresh()} />}
        </View>}
        ListEmptyComponent={loading ? <ActivityIndicator accessibilityLabel="Loading garages" color={c.primary} style={{ padding: 24 }} />
          : error ? undefined : <View style={ss.emptyBox}>
            <Icon name="search-outline" size={36} color={c.muted} />
            <Text style={[ss.emptyTitle, { color: c.text }]}>{trimmed ? 'No matching garages' : 'No garages listed yet'}</Text>
            <Text style={[ss.emptyDesc, { color: c.textSecondary }]}>{trimmed ? 'Try another name, area, or service type.' : 'Pull down to check again.'}</Text>
            {trimmed !== '' && <Pressable accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => setSearchQuery('')}>
              <Text style={{ color: c.primary, fontWeight: '700' }}>Clear search</Text>
            </Pressable>}
          </View>}
      />
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════
// BOOKINGS SCREEN
// ══════════════════════════════════════════════════════════════════
export function BookingsScreen() {
  const router = useRouter();
  const c = useQarColors();
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const statusColorsThemed = getThemedStatusColors(themeMode);
  const cancelBooking = useQarWheelStore((s) => s.cancelBooking);
  const [activeTab, setActiveTab] = useState<'Active' | BookingWorkflowStatus | 'History'>('Active');

  // Live sync from Firestore — merges into Zustand on top of local/seed bookings
  const { user } = useAuthContext();
  const feed = useFirestoreBookings(user?.uid ?? null);
  const bookings = feed.bookings;
  const cancellingRef = useRef(new Set<string>());
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const sortedBookings = [...bookings].sort((a, b) => {
    const left = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
    const right = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
    return right - left;
  });
  const filteredBookings = sortedBookings.filter((booking) => {
    if (activeTab === 'Active') return !isBookingTerminal(booking.status);
    if (activeTab === 'History') return isBookingTerminal(booking.status);
    return booking.status === activeTab;
  });
  const tabs: { key: 'Active' | BookingWorkflowStatus | 'History'; label: string }[] = [
    { key: 'Active', label: 'Active' },
    { key: 'Pending', label: 'Pending' },
    { key: 'InProgress', label: 'In progress' },
    { key: 'ReadyForPickup', label: 'Ready' },
    { key: 'History', label: 'History' },
    { key: 'Cancelled', label: 'Cancelled' },
  ];
  const upcoming = bookings.filter((b) => !isBookingTerminal(b.status)).length;
  const pending = bookings.filter((b) => b.status === 'Pending').length;
  const history = bookings.filter((b) => isBookingTerminal(b.status)).length;

  function handleCancel(booking: Booking) {
    if (!actorAllowedTransitions('customer', booking.status).includes('Cancelled')) return;
    Alert.alert('Cancel booking?', 'This will cancel your request and notify the garage.', [
      { text: 'Keep booking', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: async () => {
        if (cancellingRef.current.has(booking.id)) return;
        cancellingRef.current.add(booking.id);
        setCancellingId(booking.id);
        try {
          await cancelRemoteBooking(booking.id);
          cancelBooking(booking.id);
        } catch {
          Alert.alert('Cancellation failed', 'Your booking has not been cancelled. Please retry.');
        } finally { cancellingRef.current.delete(booking.id); setCancellingId(null); }
      } },
    ]);
  }

  function handleReschedule(booking: Booking) {
    if (isBookingTerminal(booking.status) || booking.status === 'Cancelled') return;
    Alert.alert('Ask for a new time', 'Message the garage to agree on a new time. Your current booking stays unchanged until they confirm it.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Message garage', onPress: () => router.push(booking.garageId ? route(`/chat/${booking.garageId}`) : '/messages') },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <FlatList
        data={filteredBookings} keyExtractor={(booking) => booking.id}
        initialNumToRender={6} maxToRenderPerBatch={6} windowSize={7}
        contentContainerStyle={{ padding: spacing.page, paddingBottom: TAB_BOTTOM + 18, gap: 16 }}
        refreshing={feed.loading && bookings.length > 0} onRefresh={feed.refresh}
        ListHeaderComponent={<View style={{ gap: 16 }}>
        <View style={{ gap: 2 }}>
          <Text style={[ss.pageEyebrow, { color: c.primary }]}>Appointments</Text>
          <Text style={[ss.pageTitle, { color: c.text }]}>My bookings</Text>
          {feed.hasMore ? <Text style={{ color: c.muted, fontSize: 12 }}>Counts show loaded bookings</Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="New booking" style={[ss.primaryBtn, { backgroundColor: c.primary }]}
          onPress={() => router.push('/search')}>
          <Icon name="add-circle-outline" size={19} color="#fff" />
          <Text style={[ss.primaryBtnText, { color: '#fff' }]}>New booking</Text>
        </Pressable>

        <View style={[ss.summaryStrip, { backgroundColor: c.surface, borderColor: c.border }]}>
          {[
            { label: 'Active', value: upcoming, color: '#22C55E' },
            { label: 'Pending', value: pending, color: '#F59E0B' },
            { label: 'History', value: history, color: '#818CF8' },
          ].map((item, i) => (
            <View key={item.label} style={[ss.summaryStat, i < 2 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.border }]}>
              <Text style={[ss.summaryVal, { color: item.color }]}>{item.value}</Text>
              <Text style={[ss.summaryLbl, { color: c.muted }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.bookingTabRow}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const count = tab.key === 'Active'
              ? upcoming
              : tab.key === 'History'
                ? history
                : bookings.filter((booking) => booking.status === tab.key).length;
            return (
              <Pressable
                key={tab.key}
                style={[ss.bookingTab, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab" accessibilityLabel={`${tab.label}, ${count} bookings`} accessibilityState={{ selected: active }}
              >
                <Text style={[ss.bookingTabText, { color: active ? '#fff' : c.textSecondary }]}>{tab.label}</Text>
                <View style={[ss.bookingTabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : c.surfaceAlt }]}>
                  <Text style={[ss.bookingTabBadgeText, { color: active ? '#fff' : c.muted }]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
          {feed.error && <ErrorState compact onRetry={feed.refresh} />}
        </View>}
        ListEmptyComponent={feed.loading ? <ActivityIndicator color={c.primary} accessibilityLabel="Loading bookings" style={{ padding: 24 }} />
          : feed.error ? undefined : <View style={ss.emptyBox}>
            <Icon name="calendar-outline" size={40} color={c.muted} />
            <Text style={[ss.emptyTitle, { color: c.text }]}>No {activeTab.toLowerCase()} bookings</Text>
            <Text style={[ss.emptyDesc, { color: c.textSecondary }]}>{feed.hasMore ? 'Load older bookings to continue searching this history.' : 'Choose a garage to book your next service.'}</Text>
          </View>}
        ListFooterComponent={feed.hasMore && !feed.loading && !feed.error ? <Pressable
          accessibilityRole="button" accessibilityLabel="Load older bookings"
          accessibilityState={{ disabled: feed.loadingMore }}
          disabled={feed.loadingMore}
          style={[ss.primaryBtn, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, minHeight: 44, justifyContent: 'center' }]}
          onPress={feed.loadMore}>
          {feed.loadingMore ? <ActivityIndicator color={c.primary} /> : <Text style={[ss.primaryBtnText, { color: c.primary }]}>Load older bookings</Text>}
        </Pressable> : undefined}
        renderItem={({ item: booking }) => {
          const sc = statusColorsThemed[booking.status] ?? statusColorsThemed.Pending;
          const progressIndex = Math.max(getBookingStatusIndex(booking.status), 0);
          const progressPercent = isBookingTerminal(booking.status) ? (booking.status === 'Completed' ? 100 : 0) : Math.round(((progressIndex + 1) / 6) * 100);
          const canModify = actorAllowedTransitions('customer', booking.status).includes('Cancelled') && cancellingId !== booking.id;
          return (
            <View
              key={booking.id}
              style={[ss.bookingCard, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Pressable style={ss.bookingPrimary}
                accessibilityRole="button"
                accessibilityLabel={`View ${booking.service} booking at ${booking.garage}`}
                onPress={() => { void tap(); router.push(route(`/booking/${booking.id}`)); }}>
                <View style={ss.bookingTop}>
                <View style={[ss.statusPill, { backgroundColor: sc.bg }]}> 
                  <View style={[ss.statusDot, { backgroundColor: sc.dot }]} />
                  <Text style={[ss.statusText, { color: sc.text }]}>{getBookingStatusLabel(booking.status)}</Text>
                </View>
                <Text style={[ss.bookingDate, { color: c.muted }]}>{formatBookingDate(booking.bookingDate || booking.date)}</Text>
                </View>
                <View style={ss.bookingBody}>
                <Text style={[ss.bookingService, { color: c.text }]}>{booking.service}</Text>
                <Text style={[ss.bookingStatusDesc, { color: c.textSecondary }]}>{getBookingStatusDescription(booking.status)}</Text>
                <View style={ss.bookingMeta}>
                  <Icon name="business-outline" size={13} color={c.muted} />
                  <Text style={[ss.bookingMetaText, { color: c.muted }]}>{booking.garage}</Text>
                </View>
                <View style={ss.bookingMeta}>
                  <Icon name="car-outline" size={13} color={c.muted} />
                  <Text style={[ss.bookingMetaText, { color: c.muted }]}>{booking.vehicle}</Text>
                </View>
                <View style={[ss.bookingProgressTrack, { backgroundColor: c.surfaceAlt }]}> 
                  <View style={[ss.bookingProgressFill, { width: `${progressPercent}%`, backgroundColor: sc.dot }]} />
                </View>
                </View>
              </Pressable>
              <View style={[ss.bookingActions, { borderTopColor: c.border }]}> 
                <Pressable style={ss.bookingAction} accessibilityRole="button" accessibilityLabel={`Message ${booking.garage}`} onPress={() => router.push(booking.garageId ? route(`/chat/${booking.garageId}`) : '/messages')}>
                  <Icon name="chatbubble-ellipses-outline" size={15} color={c.primary} />
                  <Text style={[ss.bookingActionText, { color: c.primary }]}>Message</Text>
                </Pressable>
                <View style={[ss.bookingActionSep, { backgroundColor: c.border }]} />
                <Pressable style={ss.bookingAction} accessibilityRole="button" accessibilityLabel={`Ask to reschedule ${booking.service}`} disabled={!canModify} accessibilityState={{ disabled: !canModify }} onPress={() => handleReschedule(booking)}>
                  <Icon name="calendar-outline" size={15} color={canModify ? c.primary : c.muted} />
                  <Text style={[ss.bookingActionText, { color: canModify ? c.primary : c.muted }]}>Ask new time</Text>
                </Pressable>
                <View style={[ss.bookingActionSep, { backgroundColor: c.border }]} />
                <Pressable style={ss.bookingAction} accessibilityRole="button" accessibilityLabel={`Cancel ${booking.service}`} disabled={!canModify} accessibilityState={{ disabled: !canModify, busy: cancellingId === booking.id }} onPress={() => handleCancel(booking)}>
                  <Icon name="close-circle-outline" size={15} color={canModify ? c.danger : c.muted} />
                  <Text style={[ss.bookingActionText, { color: canModify ? c.danger : c.muted }]}>{cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
// CARS SCREEN
// ══════════════════════════════════════════════════════════════════
export function CarsScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { user } = useAuthContext();
  const { cars: carList, isLoading: loading, error: carsError, refresh: refreshCars } = useCars(user?.uid);

  function hColor(pct: number) { return pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444'; }
  function hLabel(pct: number) { return pct >= 80 ? 'Great' : pct >= 60 ? 'Fair' : 'Needs attention'; }
  function nextService(car: FirestoreCar) {
    if (car.nextServiceDate) {
      try {
        const raw = car.nextServiceDate as unknown;
        const iso = typeof raw === 'string' ? raw
          : (raw && typeof (raw as { toDate?: () => Date }).toDate === 'function')
            ? (raw as { toDate: () => Date }).toDate().toISOString()
            : String(raw);
        const d = new Date(iso);
        if (isNaN(d.getTime())) return 'Service due';
        return d.toLocaleDateString('en-QA', { month: 'short', day: 'numeric' });
      } catch {
        return 'Service due';
      }
    }
    return 'Not scheduled';
  }

  const totalCars = carList.length;
  const scores = carList.map(recordedHealth).filter((score): score is number => score !== null);
  const avgHealth = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const attentionCount = scores.filter((score) => score < 70).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: spacing.page, paddingBottom: TAB_BOTTOM + 18, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={ss.carsHeroWrap}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[ss.pageEyebrow, { color: c.primary }]}>Digital garage</Text>
            <Text style={[ss.pageTitle, { color: c.text }]}>My cars</Text>
            <Text style={[ss.carsHeroSub, { color: c.textSecondary }]}>Health, documents, service history, and bookings in one place.</Text>
          </View>
          <Pressable
            style={[ss.carsAddFab, { backgroundColor: c.primary }]}
            onPress={() => router.push('/add-car' as never)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Add vehicle"
          >
            <Icon name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {(!loading && !carsError || carList.length > 0) && <View style={[ss.garageOverview, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[ss.garageOverviewIcon, { backgroundColor: c.primaryLight }]}>
            <Icon name="shield-checkmark-outline" size={24} color={c.primary} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[ss.garageOverviewTitle, { color: c.text }]}>Ownership overview</Text>
            <View style={ss.garageStatRow}>
              {[
                { label: 'Cars', value: String(totalCars), icon: 'car-sport-outline' as IoniconName },
                { label: 'Avg scan', value: avgHealth === null ? '--' : `${avgHealth}%`, icon: 'pulse-outline' as IoniconName },
                { label: 'Alerts', value: String(attentionCount), icon: 'warning-outline' as IoniconName },
              ].map((item) => (
                <View key={item.label} style={[ss.garageStat, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Icon name={item.icon} size={14} color={c.primary} />
                  <Text style={[ss.garageStatValue, { color: c.text }]}>{item.value}</Text>
                  <Text style={[ss.garageStatLabel, { color: c.muted }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>}

        {loading && carList.length === 0 && (
          <View style={[ss.loadBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ActivityIndicator color={c.primary} />
            <Text style={[ss.loadText, { color: c.muted }]}>Loading vehicles…</Text>
          </View>
        )}

        {carsError && <ErrorState compact onRetry={refreshCars} />}

        {!loading && !carsError && carList.length === 0 && (
          <View style={[ss.emptyBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Icon name="car-outline" size={40} color={c.muted} />
            <Text style={[ss.emptyTitle, { color: c.textSecondary }]}>Your garage is empty</Text>
            <Text style={[ss.emptyDesc, { color: c.muted }]}>Add a car to unlock the digital passport, service timeline, documents, expenses, and smart reminders.</Text>
            <Pressable
              style={[ss.carAction, { borderColor: c.primary, alignSelf: 'stretch', marginTop: 4 }]}
              onPress={() => router.push('/add-car' as never)}
            >
              <Icon name="add-circle-outline" size={15} color={c.primary} />
              <Text style={[ss.carActionText, { color: c.primary }]}>Add your first car</Text>
            </Pressable>
          </View>
        )}

        {carList.map((car) => {
          const health = recordedHealth(car);
          const hc = health === null ? c.muted : hColor(health);
          const hl = health === null ? 'Not measured' : 'Recorded scan';
          return (
            <View
              key={car.id}
              style={[ss.carCard2, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Pressable
                style={ss.carCard2Body}
                onPress={() => router.push(route(`/vehicle-dashboard/${car.id}`))}
                accessibilityRole="button"
                accessibilityLabel={`Open ${car.year} ${car.make} ${car.model} dashboard`}
              >
              {/* ── Top: identity + health badge ── */}
              <View style={ss.carCard2Top}>
                <View style={[ss.carCard2Icon, { backgroundColor: `${hc}18` }]}>
                  <Icon name="car-sport" size={26} color={hc} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={[ss.carCard2Name, { color: c.text }]}>
                    {car.year} {car.make} {car.model}
                  </Text>
                  <Text style={[ss.carCard2Plate, { color: c.muted }]}>
                    {car.licensePlate || car.vin || '—'}
                  </Text>
                </View>
                <View style={[ss.carCard2Badge, { backgroundColor: `${hc}18` }]}>
                  <Text style={[ss.carCard2BadgeText, { color: hc }]}>{hl}</Text>
                </View>
              </View>

              {/* ── Health bar ── */}
              <View style={ss.carCard2HealthRow}>
                <View style={[ss.carCard2HealthTrack, { backgroundColor: c.surfaceAlt }]}>
                  <View style={[ss.carCard2HealthFill, { width: `${health ?? 0}%`, backgroundColor: hc }]} />
                </View>
                <Text style={[ss.carCard2HealthPct, { color: hc }]}>{health === null ? '--' : `${health}%`}</Text>
              </View>

              {/* ── Stat chips ── */}
              <View style={ss.carCard2Chips}>
                <View style={[ss.carCard2Chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Icon name="speedometer-outline" size={13} color={c.muted} />
                  <Text style={[ss.carCard2ChipText, { color: c.textSecondary }]}>
                    {(car.currentMileage ?? 0).toLocaleString()} km
                  </Text>
                </View>
                <View style={[ss.carCard2Chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Icon name="time-outline" size={13} color={c.muted} />
                  <Text style={[ss.carCard2ChipText, { color: c.textSecondary }]}>{nextService(car)}</Text>
                </View>
              </View>

              </Pressable>
              {/* ── Divider ── */}
              <View style={[ss.carCard2Divider, { backgroundColor: c.border }]} />

              {/* ── Actions row ── */}
              <View style={ss.carCard2Actions}>
                <Pressable
                  style={[ss.carCard2ActionPrimary, { backgroundColor: c.primary }]}
                  onPress={() => router.push(route(`/checkout/${car.id}`))}
                  accessibilityRole="button"
                  accessibilityLabel={`Request service for ${car.year} ${car.make} ${car.model}`}
                >
                  <Icon name="calendar-outline" size={14} color="#fff" />
                  <Text style={ss.carCard2ActionPrimaryText}>Book service</Text>
                </Pressable>
                {[
                  { label: 'Passport', icon: 'id-card-outline' as IoniconName, href: `/vehicle-passport/${car.id}` },
                  { label: 'Docs',     icon: 'folder-open-outline' as IoniconName, href: `/vehicle-documents/${car.id}` },
                  { label: 'Health', icon: 'pulse-outline' as IoniconName, href: `/vehicle-health-score/${car.id}` },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    style={[ss.carCard2ActionGhost, { borderColor: c.border }]}
                    onPress={() => router.push(route(item.href))}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.label.toLowerCase()} for ${car.year} ${car.make} ${car.model}`}
                  >
                    <Icon name={item.icon} size={15} color={c.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        <Pressable
          style={[ss.primaryBtn, { backgroundColor: 'transparent', borderWidth: 2, borderColor: c.primary }]}
          onPress={() => router.push('/add-car' as never)}
        >
          <Icon name="add-circle-outline" size={19} color={c.primary} />
          <Text style={[ss.primaryBtnText, { color: c.primary }]}>Add new vehicle</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════
// ACCOUNT SCREEN
// ══════════════════════════════════════════════════════════════════
export function AccountScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { user } = useAuthContext();
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const toggleTheme = useQarWheelStore((s) => s.toggleThemeMode);
  const favoriteGarageIds = useQarWheelStore((s) => s.favoriteGarageIds);

  // Live car count from Firestore (shared hook — same subscription as CarsScreen)
  const { cars: accountCarList, isLoading: accountCarsLoading, error: accountCarsError } = useCars(user?.uid);

  const totalVehicles = accountCarList.length;
  const totalSaved = favoriteGarageIds.length;

  const initial = user?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? 'U';
  const name = user?.displayName ?? 'QarWheel User';
  const email = user?.email ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: spacing.page, paddingBottom: TAB_BOTTOM + 18, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 2 }}>
          <Text style={[ss.pageEyebrow, { color: c.primary }]}>QarWheel</Text>
          <Text style={[ss.pageTitle, { color: c.text }]}>Account</Text>
        </View>

        {/* Profile card */}
        <View style={[ss.profileCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[ss.profileAvatar, { backgroundColor: c.primary }]}>
            <Text style={ss.profileAvatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[ss.profileName, { color: c.text }]}>{name}</Text>
            <Text style={[ss.profileEmail, { color: c.muted }]}>{email}</Text>
          </View>
          <Pressable
            style={[ss.profileEditBtn, { backgroundColor: c.primaryLight }]}
            onPress={() => router.push(route('/edit-profile'))}
          >
            <Icon name="create-outline" size={16} color={c.primary} />
          </Pressable>
        </View>

        {/* Theme toggle */}
        <Pressable
          style={[ss.themeRow, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={toggleTheme}
        >
          <View style={[ss.menuIcon, { backgroundColor: c.primaryLight }]}>
            <Icon name={themeMode === 'dark' ? 'moon' : 'sunny'} size={18} color={c.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[ss.menuLabel, { color: c.text }]}>Theme</Text>
            <Text style={[ss.profileEmail, { color: c.muted }]}>
              {themeMode === 'dark' ? 'Dark premium' : 'Light premium'} appearance
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.primary }}>
            {themeMode === 'dark' ? 'Light' : 'Dark'}
          </Text>
        </Pressable>

        {/* Stats */}
        <View style={[ss.statsStrip, { backgroundColor: c.surface, borderColor: c.border }]}>
          {[
            { label: 'Vehicles', value: accountCarsError ? '--' : accountCarsLoading ? '...' : String(totalVehicles), icon: 'car-outline' as IoniconName },
            { label: 'Saved garages', value: String(totalSaved), icon: 'heart-outline' as IoniconName },
          ].map((s, i) => (
            <View
              key={s.label}
              style={[
                ss.statItem,
                i < 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.border },
              ]}
            >
              <Icon name={s.icon} size={18} color={c.primary} />
              <Text style={[ss.statVal, { color: c.text }]}>{s.value}</Text>
              <Text style={[ss.statLbl, { color: c.muted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu sections */}
        {ACCOUNT_MENU_SECTIONS.map((section) => (
          <View key={section.title} style={{ gap: 6 }}>
            <Text style={[ss.menuSectionTitle, { color: c.muted }]}>{section.title}</Text>
            <View style={[ss.menuCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  style={[
                    ss.menuRow,
                    idx < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
                  ]}
                  onPress={() => router.push(route(item.href))}
                >
                  <View style={[ss.menuIcon, { backgroundColor: `${item.color}18` }]}>
                    <Icon name={item.icon} size={17} color={item.color} />
                  </View>
                  <Text style={[ss.menuLabel, { color: c.text, flex: 1 }]}>{item.label}</Text>
                  <Icon name="chevron-forward" size={16} color={c.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        <Pressable
          style={[ss.signOutBtn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)' }]}
          onPress={() =>
            Alert.alert(
              'Sign out',
              'Your saved addresses, wallet history and documents will be removed from this device.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => void signOutCompletely() },
              ],
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Icon name="log-out-outline" size={17} color="#EF4444" />
          <Text style={[ss.signOutText, { color: '#EF4444' }]}>Sign out</Text>
        </Pressable>

        <Text style={[ss.version, { color: c.muted }]}>QarWheel</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── SectionRow ────────────────────────────────────────────────────
function SectionRow({ title, linkLabel, onPress, c, style }: {
  title: string; linkLabel?: string; onPress?: () => void; c: QarColors; style?: object;
}) {
  return (
    <View style={[ss.sectionRow, style]}>
      <Text style={[ss.sectionTitle, { color: c.text }]}>{title}</Text>
      {linkLabel && (
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.primary }}>{linkLabel} ›</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── StyleSheet ────────────────────────────────────────────────────
const ss = StyleSheet.create({
  // Section header
  sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34, gap: 12 },
  sectionTitle:   { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

  // Garage card — consistent internal padding and gap
  garageCard:     { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', alignItems: 'center', padding: 12, gap: 12 },
  garageDetails:  { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  garageFavorite: { position: 'absolute', right: 8, top: 8, zIndex: 1, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  garageThumb:    { width: 70, height: 70, borderRadius: 11 },
  garageBody:     { flex: 1, minWidth: 0, gap: 4 },
  garageTopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingRight: 44 },
  garageName:     { flex: 1, fontSize: 14, fontWeight: '800' },
  garageSpecialty:{ fontSize: 12, fontWeight: '500' },
  garageFactRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  garageFact:     { fontSize: 12, fontWeight: '600' },
  garageDot:      { fontSize: 12 },
  tagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  openPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  openDot:        { width: 6, height: 6, borderRadius: 3 },
  openText:       { fontSize: 12, fontWeight: '800' },
  verifiedPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText:   { fontSize: 12, fontWeight: '800' },
  tagPill:        { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  tagText:        { fontSize: 12, fontWeight: '600' },

  // Search screen
  searchBarActive:{ height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1.5, gap: 10 },
  suggestCard:    { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  suggestHeading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', padding: 12, paddingBottom: 8 },
  suggestRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth },
  suggestText:    { fontSize: 14, fontWeight: '500' },
  trendChip:      { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  searchInput:    { fontSize: 14, paddingVertical: 0 },

  // Page headers — consistent top padding so eyebrow isn't flush against safe area
  pageEyebrow:    { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  pageTitle:      { fontSize: 26, fontWeight: '900', letterSpacing: -0.4, lineHeight: 32 },

  // Cars screen
  carsHeroWrap:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  carsHeroSub:    { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  carsAddFab:     { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...shadow.primary },
  garageOverview: { flexDirection: 'row', gap: 13, borderRadius: 20, borderWidth: 1, padding: 16, ...shadow.sm },
  garageOverviewIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  garageOverviewTitle: { fontSize: 16, fontWeight: '900' },
  garageStatRow:  { flexDirection: 'row', gap: 8 },
  garageStat:     { flex: 1, borderRadius: 14, borderWidth: 1, padding: 10, gap: 4, minHeight: 76 },
  garageStatValue:{ fontSize: 16, fontWeight: '900' },
  garageStatLabel:{ fontSize: 12, fontWeight: '800' },

  // Summary strip (Bookings / Cars stat bar)
  summaryStrip:   { flexDirection: 'row', borderRadius: 16, borderWidth: 1 },
  summaryStat:    { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  summaryVal:     { fontSize: 24, fontWeight: '900' },
  summaryLbl:     { fontSize: 12, fontWeight: '700' },

  // Booking card
  bookingTabRow:   { gap: 10, paddingEnd: spacing.page },
  bookingTab:      { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14 },
  bookingTabText:  { fontSize: 12, fontWeight: '900' },
  bookingTabBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  bookingTabBadgeText: { fontSize: 12, fontWeight: '900' },
  bookingCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  bookingPrimary: { minHeight: 44 },
  bookingTop:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 8 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot:      { width: 7, height: 7, borderRadius: 4 },
  statusText:     { fontSize: 12, fontWeight: '900' },
  bookingDate:    { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  bookingBody:    { paddingHorizontal: 14, paddingBottom: 14, gap: 5 },
  bookingService: { fontSize: 17, fontWeight: '900' },
  bookingStatusDesc: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  bookingMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookingMetaText:{ fontSize: 12, fontWeight: '600' },
  bookingProgressTrack: { height: 7, borderRadius: 999, overflow: 'hidden', marginTop: 5 },
  bookingProgressFill: { height: '100%', borderRadius: 999 },
  bookingActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  bookingAction:  { flex: 1, minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13 },
  bookingActionText: { fontSize: 12, fontWeight: '800' },
  bookingActionSep:  { width: StyleSheet.hairlineWidth, marginVertical: 10 },

  // Car card
  carCard:        { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  carHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
  carHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  carIconWrap:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  carVisual:      { width: 58, height: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  carName:        { fontSize: 15, fontWeight: '800' },
  carVin:         { fontSize: 12 },
  healthBadge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0 },
  healthBadgeText:{ fontSize: 12, fontWeight: '900' },
  carBody:        { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  carScoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  healthScoreBox: { width: 70, minHeight: 70, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  healthScoreValue: { fontSize: 24, lineHeight: 28, fontWeight: '900' },
  healthScoreLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  barRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel:       { fontSize: 12 },
  barVal:         { fontSize: 12, fontWeight: '900' },
  healthTrack:    { height: 7, borderRadius: 99, overflow: 'hidden' },
  healthFill:     { height: '100%', borderRadius: 99 },
  carFactRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  carFactText:    { fontSize: 12, fontWeight: '700' },
  carInfoGrid:    { flexDirection: 'row', gap: 8 },
  carInfoPill:    { flex: 1, minHeight: 42, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  carShortcutRow: { flexDirection: 'row', gap: 8 },
  carShortcut:    { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  carShortcutText:{ fontSize: 12, fontWeight: '900' },
  // Two equal action buttons with a gap between them — no touching borders
  carActions:     { flexDirection: 'row', gap: 10 },
  carAction:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 11, borderWidth: 1 },
  carActionText:  { fontSize: 13, fontWeight: '800' },

  // Car card v2 — clean 2026 design
  carCard2: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    padding: 16, gap: 12, ...shadow.sm,
  },
  carCard2Body: { gap: 12, minHeight: 44 },
  carCard2Top:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  carCard2Icon:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  carCard2Name:     { fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  carCard2Plate:    { fontSize: 12, fontWeight: '600' },
  carCard2Badge:    { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0 },
  carCard2BadgeText:{ fontSize: 12, fontWeight: '900' },
  carCard2HealthRow:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  carCard2HealthTrack: { flex: 1, height: 5, borderRadius: 99, overflow: 'hidden' },
  carCard2HealthFill:  { height: '100%', borderRadius: 99 },
  carCard2HealthPct:   { fontSize: 13, fontWeight: '900', minWidth: 38, textAlign: 'right' },
  carCard2Chips:    { flexDirection: 'row', gap: 8 },
  carCard2Chip:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  carCard2ChipText: { fontSize: 12, fontWeight: '700' },
  carCard2Divider:  { height: StyleSheet.hairlineWidth },
  carCard2Actions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  carCard2ActionPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, minHeight: 44, borderRadius: 12,
  },
  carCard2ActionPrimaryText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  carCard2ActionGhost: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  // Account
  profileCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, padding: 18 },
  profileAvatar:  { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileAvatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  profileName:    { fontSize: 17, fontWeight: '900' },
  profileEmail:   { fontSize: 12 },
  // 36×36 edit button — sufficient touch target with hitSlop applied at call site
  profileEditBtn: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  themeRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 16, minHeight: 72 },
  // Stats strip — minHeight prevents clipping when "QAR 2,800" wraps to two lines
  statsStrip:     { flexDirection: 'row', borderRadius: 16, borderWidth: 1 },
  statItem:       { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 5, gap: 5, minHeight: 88 },
  statVal:        { fontSize: 16, fontWeight: '900', textAlign: 'center', lineHeight: 22 },
  statLbl:        { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  menuSectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 2 },
  menuCard:       { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  menuRow:        { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 16, minHeight: 68 },
  menuIcon:       { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuLabel:      { fontSize: 15, fontWeight: '700' },
  signOutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, borderWidth: 1 },
  signOutText:    { fontSize: 15, fontWeight: '900' },
  version:        { textAlign: 'center', fontSize: 12 },

  // Shared action button — primaryBtnText color must be set per-instance for outline variant
  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, borderRadius: 18, paddingHorizontal: 16 },
  primaryBtnText: { fontSize: 16, fontWeight: '900' },
  loadBox:        { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 36, borderRadius: 16, borderWidth: 1 },
  loadText:       { fontSize: 14 },
  emptyBox:       { alignItems: 'center', gap: 10, paddingVertical: 44, borderRadius: 16, borderWidth: 1, paddingHorizontal: 20 },
  emptyTitle:     { fontSize: 18, fontWeight: '800' },
  emptyDesc:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

