/**
 * QarWheel 2026 — Marketplace screens
 * Pixel-accurate reimplementation matching the uploaded design.
 * Light + dark theme fully supported via useQarColors().
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import type React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Booking, type Garage, garages as firestoreGarages, popularJobs, serviceCategories } from '@/lib/marketplace';
import { type FirestoreBooking, type FirestoreCar, useFirestoreBookings, useBranches } from '@/lib/firestoreOps';
import { auth, firestore } from '@/lib/firebase';
import { useAuthContext } from '@/lib/AuthContext';
import { getQarColors, getThemedStatusColors, type QarColors, radius, shadow, spacing, typography } from '@/lib/theme';
import { tap } from '@/lib/haptics';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { signOutCompletely } from '@/lib/session';
import { RemoteImage } from '@/components/RemoteImage';
import { MotionScreen } from '@/lib/motion';
import {
  getBookingStatusDescription,
  getBookingStatusIndex,
  getBookingStatusLabel,
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
function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Static home-screen data ────────────────────────────────────────

const HOME_CATEGORIES = [
  { id: 'ac',          label: 'AC & Heating',   labelAr: 'تكييف وتدفئة',  icon: 'snow-outline' as IoniconName,          iconColor: '#38BDF8', bg: 'rgba(56,189,248,0.16)'  },
  { id: 'electrical',  label: 'Electrical',      labelAr: 'كهربائي',       icon: 'flash-outline' as IoniconName,          iconColor: '#FCD34D', bg: 'rgba(252,211,77,0.16)'  },
  { id: 'tires',       label: 'Tires & Wheels',  labelAr: 'الإطارات',      icon: 'disc-outline' as IoniconName,           iconColor: '#94A3B8', bg: 'rgba(148,163,184,0.16)' },
  { id: 'body',        label: 'Body & Paint',    labelAr: 'هيكل ودهان',   icon: 'color-palette-outline' as IoniconName,  iconColor: '#FB923C', bg: 'rgba(251,146,60,0.16)'  },
  { id: 'wash',        label: 'Car Wash',        labelAr: 'غسيل السيارة', icon: 'water-outline' as IoniconName,          iconColor: '#22D3EE', bg: 'rgba(34,211,238,0.16)'  },
  { id: 'diagnostics', label: 'Diagnostics',     labelAr: 'تشخيص',        icon: 'analytics-outline' as IoniconName,      iconColor: '#A78BFA', bg: 'rgba(167,139,250,0.16)' },
  { id: 'detailing',   label: 'Detailing',       labelAr: 'تلميع',        icon: 'sparkles-outline' as IoniconName,       iconColor: '#34D399', bg: 'rgba(52,211,153,0.16)'  },
  { id: 'accessories', label: 'Accessories',     labelAr: 'إكسسوارات',    icon: 'cube-outline' as IoniconName,           iconColor: '#818CF8', bg: 'rgba(129,140,248,0.16)' },
  { id: 'roadside',    label: 'Roadside',        labelAr: 'خدمة الطريق',  icon: 'warning-outline' as IoniconName,        iconColor: '#F87171', bg: 'rgba(248,113,113,0.16)' },
];

const HOME_GARAGES = [
  { id: 'g1', name: 'German Auto Care',      specialty: 'Specialist in German Cars',    rating: 4.8, reviews: 812, response: '12 min', price: 'AED 150–200', isOpen: true,  isVerified: true,  tags: ['GCC Specs'],       imageUrl: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=400&q=80' },
  { id: 'g2', name: 'Al Futtaim Auto Svcs',  specialty: 'Multi-brand Service Center',   rating: 4.8, reviews: 462, response: '15 min', price: 'AED 100–150', isOpen: true,  isVerified: false, tags: ['Free AC Checkup'], imageUrl: 'https://images.unsplash.com/photo-1549636367-13c144c47063?auto=format&fit=crop&w=400&q=80' },
  { id: 'g3', name: 'Pro PitStop Garage',    specialty: 'One Stop Auto Care',           rating: 4.5, reviews: 321, response: '18 min', price: 'AED 120–180', isOpen: true,  isVerified: true,  tags: ['Gas Top-up'],      imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=400&q=80' },
  { id: 'g4', name: 'My Care Garage',        specialty: 'Basic AC Service',             rating: 4.8, reviews: 199, response: '22 min', price: 'AED 159',     isOpen: false, isVerified: false, tags: [],                  imageUrl: 'https://images.unsplash.com/photo-1585014165903-6d6c6ebad3e9?auto=format&fit=crop&w=400&q=80' },
  { id: 'g5', name: 'Speedy Auto Care',      specialty: 'Quick. Reliable. Affordable.', rating: 4.5, reviews: 201, response: '20 min', price: 'AED 179',     isOpen: true,  isVerified: true,  tags: ['24/7'],            imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=400&q=80' },
];

const FEATURED_SERVICES = [
  { id: 's1', label: 'AC Service',    price: 'From AED 159', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=300&q=80' },
  { id: 's2', label: 'Oil Change',    price: 'From AED 99',  imageUrl: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=300&q=80' },
  { id: 's3', label: 'Brake Repair',  price: 'From AED 149', imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=300&q=80' },
  { id: 's4', label: 'Battery',       price: 'From AED 199', imageUrl: 'https://images.unsplash.com/photo-1580274455191-1c62238fa333?auto=format&fit=crop&w=300&q=80' },
  { id: 's5', label: 'Tire Change',   price: 'From AED 249', imageUrl: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=300&q=80' },
];

const TOP_OFFERS = [
  { id: 'o1', service: 'Oil Change',   discount: '15% OFF', until: 'Valid till 30 May', imageUrl: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=200&q=80' },
  { id: 'o2', service: 'Brake Pads',   discount: '10% OFF', until: 'Valid till 30 May', imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=200&q=80' },
  { id: 'o3', service: 'Full Service', discount: 'AED 99',  until: 'Limited Time',      imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=200&q=80' },
];

const TRUST_ITEMS = [
  { icon: 'shield-checkmark' as IoniconName, label: 'Verified Garages',  labelAr: 'كراجات موثقة',        iconColor: '#E31E24', bg: 'rgba(227,30,36,0.14)'  },
  { icon: 'card' as IoniconName,             label: 'Secure Payments',   labelAr: 'مدفوعات آمنة',        iconColor: '#22C55E', bg: 'rgba(34,197,94,0.14)'   },
  { icon: 'globe' as IoniconName,            label: 'GCC Standard',      labelAr: 'معيار الخليج',         iconColor: '#38BDF8', bg: 'rgba(56,189,248,0.14)'  },
  { icon: 'call' as IoniconName,             label: '24/7 Support',      labelAr: 'دعم على مدار الساعة', iconColor: '#FCD34D', bg: 'rgba(252,211,77,0.14)'  },
];

const QUICK_ACTIONS = [
  { icon: 'calendar-outline' as IoniconName, label: 'Book Service', href: '/services' },
  { icon: 'car-outline' as IoniconName,      label: 'My Cars',      href: '/(tabs)/cars' },
  { icon: 'warning-outline' as IoniconName,  label: 'Roadside',     href: '/checkout/emergency' },
  { icon: 'pricetag-outline' as IoniconName, label: 'Sell My Car',  href: '/modal'    },
];

const GERMAN_GARAGES = [
  { id: 'gg1', name: 'German Auto Care',   specialty: 'BMW · Mercedes',         rating: 4.8, reviews: 512, response: '12 min', price: 'AED 150–200', isVerified: true,  imageUrl: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=400&q=80' },
  { id: 'gg2', name: 'Euro Meister Garage',specialty: 'BMW · Mercedes Spec.',   rating: 4.6, reviews: 342, response: '14 min', price: 'AED 130–190', isVerified: false, imageUrl: 'https://images.unsplash.com/photo-1549636367-13c144c47063?auto=format&fit=crop&w=400&q=80' },
  { id: 'gg3', name: 'Auto Haus Dubai',    specialty: 'Audi · VW Specialist',  rating: 4.5, reviews: 289, response: '16 min', price: 'AED 130–190', isVerified: false, imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=400&q=80' },
];

const BRAND_FILTERS = ['All', 'BMW', 'Mercedes', 'Audi', 'Porsche'];

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
      { label: 'Notifications', icon: 'notifications-outline' as IoniconName, href: '/settings/notifications', color: '#F59E0B' },
      { label: 'Language', icon: 'language-outline' as IoniconName, href: '/settings/language', color: '#22D3EE' },
      { label: 'Privacy & data safety', icon: 'shield-outline' as IoniconName, href: '/privacy-security', color: '#A78BFA' },
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

// ── Pull-to-refresh hook ───────────────────────────────────────────

function useRefresh(onRefresh?: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const c = useQarColors();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
      // Minimum visual delay so the spinner is satisfying
      await new Promise<void>((r) => setTimeout(r, 600));
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
    <Pressable
      style={[ss.garageCard, { backgroundColor: c.surface, borderColor: isFav ? c.primary : c.border }]}
      onPress={() => { void tap(); router.push(route(`/garage/${garage.id}`)); }}
    >
      <RemoteImage uri={garage.imageUrl} style={ss.garageThumb} fallbackIcon="business-outline" accessibilityLabel={garage.name} />

      <View style={ss.garageBody}>
        <View style={ss.garageTopRow}>
          <Text numberOfLines={1} style={[ss.garageName, { color: c.text }]}>{garage.name}</Text>
          <Pressable hitSlop={8} onPress={() => { void tap(); toggleFav(garage.id); }}>
            <Icon name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#EF4444' : c.muted} />
          </Pressable>
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
              {garage.openNow ? 'Open' : 'Closed'}
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
  );
}

// ══════════════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════════════
export function HomeScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { user } = useAuthContext();
  const { width: screenWidth } = useWindowDimensions();
  const unread = useQarWheelStore((s) => s.notifications.filter((n) => !n.read).length);
  const [activeBrand, setActiveBrand] = useState('All');
  const { vendors: liveVendors, loading: vendorsLoading } = useBranches();

  const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const trustCardWidth = Math.floor((screenWidth - spacing.page * 2 - 10) / 2);

  const handleRefresh = async () => {
    // Firestore listeners are always live — nothing to re-fetch.
    // The 600ms minimum in useRefresh provides the satisfying spinner feedback.
  };

  return (
    <ScreenWrap c={c} onRefresh={handleRefresh}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={[ss.header, { paddingHorizontal: spacing.page }]}>
        {/* Logo */}
        <View style={ss.logoRow}>
          <View style={[ss.logoQ, { backgroundColor: c.primary }]}>
            <Text style={ss.logoQText}>Q</Text>
          </View>
          <Text style={[ss.logoText, { color: c.text }]}>QarWheel</Text>
        </View>

        <View style={ss.headerRight}>
          {/* Language chip */}
          <View style={[ss.langChip, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Text style={[ss.langText, { color: c.textSecondary }]}>EN</Text>
          </View>

          {/* Bell */}
          <Pressable
            style={[ss.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/notifications')}
            hitSlop={6}
          >
            <Icon name="notifications-outline" size={19} color={c.text} />
            {unread > 0 && (
              <View style={[ss.notifDot, { backgroundColor: c.primary, borderColor: c.surface }]}>
                <Text style={ss.notifDotText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Greeting ───────────────────────────────────────────── */}
      <View style={ss.greetingBlock}>
        <Text style={[ss.greetingMain, { color: c.text }]}>{timeGreeting()}, {firstName}</Text>
        <Text style={[ss.greetingSub, { color: c.textSecondary }]}>What's your next move?</Text>
        <Text style={[ss.greetingAr, { color: c.muted }]}>ما هي خطوتك القادمة؟</Text>
      </View>

      {/* ── Search bar ─────────────────────────────────────────── */}
      <Pressable
        style={[ss.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}
        onPress={() => router.push('/search')}
        accessibilityRole="search"
      >
        <Icon name="search-outline" size={19} color={c.muted} />
        <Text style={[ss.searchPlaceholder, { color: c.muted }]}>Search garages, services, parts...</Text>
        <Text style={[ss.searchAr, { color: c.muted }]}>ابحث</Text>
        <View style={[ss.searchBtn, { backgroundColor: c.primary }]}>
          <Icon name="search" size={16} color="#fff" />
        </View>
      </Pressable>

      {/* ── Hero card ──────────────────────────────────────────── */}
      <View style={ss.heroCard}>
        {/* Car image right side */}
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=600&q=80' }}
          style={ss.heroImage}
          resizeMode="cover"
        />
        {/* Dark overlay – left 65% */}
        <View style={[ss.heroOverlayLeft, { backgroundColor: 'rgba(5,7,10,0.93)' }]} />
        {/* Fade strip */}
        <View style={[ss.heroOverlayMid, { backgroundColor: 'rgba(5,7,10,0.55)' }]} />

        <View style={ss.heroContent}>
          <Text style={ss.heroEyebrow}>BOOK WITH CONFIDENCE</Text>
          <Text style={ss.heroHeadline}>Verified garages.{'\n'}Best prices.</Text>
          <Text style={ss.heroAr}>كراجات موثقة. أفضل الأسعار.</Text>
          <View style={ss.heroBtnRow}>
            <Pressable
              style={[ss.heroBtnPrimary, { backgroundColor: c.primary }]}
              onPress={() => { void tap(); router.push('/services'); }}
            >
              <Text style={ss.heroBtnPrimaryText}>Explore Now</Text>
            </Pressable>
            {user ? (
              <Pressable
                style={ss.heroBtnGhost}
                onPress={() => { void tap(); router.push(route('/checkout/emergency')); }}
              >
                <Text style={ss.heroBtnGhostText}>Book Now</Text>
              </Pressable>
            ) : (
              <Pressable
                style={ss.heroBtnGhost}
                onPress={() => { void tap(); router.push(route('/(auth)/register')); }}
              >
                <Text style={ss.heroBtnGhostText}>Join Free</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* ── Quick Actions ───────────────────────────────────────── */}
      <View style={[ss.quickRow, { paddingHorizontal: spacing.page }]}>
        {QUICK_ACTIONS.map((qa) => (
          <Pressable
            key={qa.label}
            style={ss.quickItem}
            onPress={() => { void tap(); router.push(qa.href as never); }}
          >
            <View style={[ss.quickIcon, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Icon name={qa.icon} size={22} color={c.primary} />
            </View>
            <Text style={[ss.quickLabel, { color: c.muted }]}>{qa.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Featured Services ───────────────────────────────────── */}
      <View style={{ gap: 10 }}>
        <SectionRow
          title="Featured Services"
          linkLabel="View all"
          onPress={() => router.push('/services')}
          c={c}
          style={{ paddingHorizontal: spacing.page }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[ss.hScroll, { paddingHorizontal: spacing.page }]}
        >
          {FEATURED_SERVICES.map((svc) => (
            <Pressable
              key={svc.id}
              style={[ss.featSvcCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => { void tap(); router.push('/services'); }}
            >
              <RemoteImage uri={svc.imageUrl} style={ss.featSvcImage} fallbackIcon="construct-outline" accessibilityLabel={svc.label} />
              <View style={ss.featSvcInfo}>
                <Text style={[ss.featSvcLabel, { color: c.text }]}>{svc.label}</Text>
                <Text style={[ss.featSvcPrice, { color: c.muted }]}>{svc.price}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Book Any Service CTA */}
        <View style={[ss.bookCta, { backgroundColor: c.primary, marginHorizontal: spacing.page }]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=400&q=80' }}
            style={ss.bookCtaImage}
            resizeMode="cover"
          />
          <View style={ss.bookCtaOverlay} />
          <View style={ss.bookCtaContent}>
            <Text style={ss.bookCtaTitle}>Book Any Service</Text>
            <Text style={ss.bookCtaSub}>Fast. Trusted. Affordable.</Text>
            <Text style={ss.bookCtaSubAr}>سريع. موثوق. بأسعار مناسبة.</Text>
            <Pressable
              style={[ss.bookCtaBtn, { backgroundColor: '#fff' }]}
              onPress={() => { void tap(); router.push(route('/checkout/emergency')); }}
            >
              <Text style={[ss.bookCtaBtnText, { color: c.primary }]}>Book Now</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Categories 3×3 ──────────────────────────────────────── */}
      <View style={{ gap: 10 }}>
        <SectionRow
          title="All Categories"
          linkLabel="See all"
          onPress={() => router.push('/search')}
          c={c}
          style={{ paddingHorizontal: spacing.page }}
        />
        <View style={[ss.catGrid, { paddingHorizontal: spacing.page }]}>
          {HOME_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[ss.catCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => { void tap(); router.push(route(`/category/${cat.id}`)); }}
            >
              <View style={[ss.catIconWrap, { backgroundColor: cat.bg }]}>
                <Icon name={cat.icon} size={20} color={cat.iconColor} />
              </View>
              <Text style={[ss.catLabel, { color: c.text }]}>{cat.label}</Text>
              <Text style={[ss.catLabelAr, { color: c.muted }]}>{cat.labelAr}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Garages Near You ────────────────────────────────────── */}
      <View style={ss.landingSection}>
        <View style={ss.garageHeader}>
          <View>
            <Text style={[ss.sectionTitle, { color: c.text }]}>Garages Near You</Text>
            <View style={ss.locationRow}>
              <Icon name="location" size={12} color={c.primary} />
              <Text style={[ss.locationText, { color: c.muted }]}>Doha, Qatar</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/map')} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.primary }}>See map ›</Text>
          </Pressable>
        </View>
        {vendorsLoading
          ? <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />
          : liveVendors.map((g) => <GarageListCard key={g.id} garage={g} c={c} />)
        }
      </View>

      {/* ── Promotional Banner ──────────────────────────────────── */}
      <View style={[ss.promoBanner, { marginHorizontal: spacing.page }]}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=600&q=80' }}
          style={ss.promoImage}
          resizeMode="cover"
        />
        <View style={ss.promoOverlay} />
        <View style={ss.promoContent}>
          <Text style={ss.promoEyebrow}>Summer AC Special</Text>
          <Text style={ss.promoSub}>On All AC Services</Text>
          <Text style={ss.promoDiscount}>20%</Text>
          <Text style={ss.promoOff}>OFF</Text>
          <Pressable
            style={[ss.promoBtn, { backgroundColor: '#fff' }]}
            onPress={() => { void tap(); router.push(route('/checkout/ac')); }}
          >
            <Text style={[ss.promoBtnText, { color: c.primary }]}>Book Now</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Top Offers For You ──────────────────────────────────── */}
      <View style={ss.landingSection}>
        <SectionRow
          title="Top Offers For You"
          linkLabel="View all"
          onPress={() => router.push('/offers')}
          c={c}
        />
        <View style={ss.offersRow}>
          {TOP_OFFERS.map((offer) => (
            <Pressable
              key={offer.id}
              style={[ss.offerCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => { void tap(); router.push('/offers'); }}
            >
              <View style={ss.offerImgWrap}>
                <RemoteImage uri={offer.imageUrl} style={ss.offerImg} fallbackIcon="pricetag-outline" accessibilityLabel={offer.service} />
                <View style={ss.offerImgOverlay} />
                <Text style={ss.offerDiscount}>{offer.discount}</Text>
              </View>
              <View style={ss.offerInfo}>
                <Text style={[ss.offerService, { color: c.text }]}>{offer.service}</Text>
                <Text style={[ss.offerUntil, { color: c.muted }]}>{offer.until}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── German Car Specialist ───────────────────────────────── */}
      <View style={ss.landingSection}>
        <View>
          <Text style={[ss.sectionTitle, { color: c.text }]}>German Car Specialist</Text>
          <Text style={[ss.sectionSubAr, { color: c.muted }]}>متخصصون في السيارات الألمانية</Text>
        </View>
        {/* Brand pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.brandPills}>
          {BRAND_FILTERS.map((brand) => (
            <Pressable
              key={brand}
              style={[
                ss.brandPill,
                {
                  backgroundColor: activeBrand === brand ? c.primary : c.surface,
                  borderColor: activeBrand === brand ? c.primary : c.border,
                },
              ]}
              onPress={() => { void tap(); setActiveBrand(brand); }}
            >
              <Text style={[ss.brandPillText, { color: activeBrand === brand ? '#fff' : c.muted }]}>
                {brand}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {vendorsLoading
          ? <ActivityIndicator color={c.primary} style={{ marginVertical: 8 }} />
          : liveVendors
              .filter((g) => {
                const haystack = `${g.name} ${g.type ?? ''} ${g.category ?? ''}`.toLowerCase();
                if (activeBrand !== 'All') return haystack.includes(activeBrand.toLowerCase());
                // Default: show garages that mention any German brand or "german"
                return ['bmw', 'mercedes', 'audi', 'porsche', 'volkswagen', 'vw', 'german'].some((kw) =>
                  haystack.includes(kw),
                );
              })
              .map((g) => <GarageListCard key={g.id} garage={g} c={c} />)
        }
        {/* Fallback when live data has no German-specialist entries yet */}
        {!vendorsLoading && liveVendors.filter((g) => {
          const haystack = `${g.name} ${g.type ?? ''} ${g.category ?? ''}`.toLowerCase();
          if (activeBrand !== 'All') return haystack.includes(activeBrand.toLowerCase());
          return ['bmw', 'mercedes', 'audi', 'porsche', 'volkswagen', 'vw', 'german'].some((kw) => haystack.includes(kw));
        }).length === 0 && (
          <View style={[ss.emptyBox, { backgroundColor: c.surface, borderColor: c.border, paddingVertical: 24 }]}>
            <Icon name="car-sport-outline" size={32} color={c.muted} />
            <Text style={[ss.emptyDesc, { color: c.muted }]}>No {activeBrand === 'All' ? 'German specialist' : activeBrand} garages listed yet.</Text>
          </View>
        )}
      </View>

      {/* ── Trust & Safety ──────────────────────────────────────── */}
      <View style={ss.landingSection}>
        <View style={ss.sectionRow}>
          <Text style={[ss.sectionTitle, { color: c.text }]}>Trust & Safety</Text>
          <Text style={[ss.sectionSubAr, { color: c.muted }]}>الأمان والثقة</Text>
        </View>
        <View style={ss.trustGrid}>
          {TRUST_ITEMS.map((item) => (
            <View
              key={item.label}
              style={[ss.trustCard, { width: trustCardWidth, backgroundColor: c.surface, borderColor: c.border }]}
            >
              <View style={[ss.trustIcon, { backgroundColor: item.bg }]}>
                <Icon name={item.icon} size={20} color={item.iconColor} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[ss.trustLabel, { color: c.text }]}>{item.label}</Text>
                <Text style={[ss.trustLabelAr, { color: c.muted }]}>{item.labelAr}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={[ss.tagline, { color: c.muted }]}>
          QarWheel — Your Car. Our Care.{'\n'}
          <Text style={[ss.taglineAr, { color: c.muted }]}>قارويلز - سيارتك، رعايتنا.</Text>
        </Text>
      </View>

    </ScreenWrap>
  );
}

// ── SearchGarageList — live vendors for search screen ─────────────
function SearchGarageList({ c }: { c: QarColors }) {
  const { vendors, loading } = useBranches();
  if (loading) return <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />;
  return <>{vendors.map((g) => <GarageListCard key={g.id} garage={g} c={c} />)}</>;
}

// ══════════════════════════════════════════════════════════════════
// SEARCH SCREEN
// ══════════════════════════════════════════════════════════════════
const RECENT_SEARCHES = ['AC Service near me', 'German specialist garages', 'Oil change under AED 199'];
const SMART_SUGGESTIONS = [
  'AC Service near me',
  'German specialist garages',
  'Oil change under AED 199',
  'Best rated garages in Dubai',
  '24/7 Garages near me',
];
const TRENDING = ['AC Service', 'Oil Change', 'Brake Repair', 'Battery Replacement'];

export function SearchScreen() {
  const router = useRouter();
  const c = useQarColors();
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { vendors, loading: vendorsLoading } = useBranches();

  // Auto-focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const trimmed = searchQuery.trim().toLowerCase();
  const filteredVendors = trimmed
    ? vendors.filter((g) =>
        g.name.toLowerCase().includes(trimmed) ||
        g.type?.toLowerCase().includes(trimmed) ||
        g.area?.toLowerCase().includes(trimmed) ||
        g.category?.toLowerCase().includes(trimmed),
      )
    : vendors;

  const showSuggestions = trimmed.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingBottom: TAB_BOTTOM, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search header */}
        <View style={{ paddingHorizontal: spacing.page, paddingTop: 14, gap: 14 }}>
          <View style={[ss.searchBarActive, { backgroundColor: c.surface, borderColor: c.primary }]}>
            <Icon name="search-outline" size={19} color={c.muted} />
            <TextInput
              ref={inputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Garages, services, parts..."
              placeholderTextColor={c.muted}
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={[ss.searchInput, { color: c.text, flex: 1 }]}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Pressable onPress={() => { setSearchQuery(''); router.back(); }} hitSlop={8}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>Cancel</Text>
            </Pressable>
          </View>

          {showSuggestions && (
            <>
              {/* Recent Searches */}
              <View style={[ss.suggestCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[ss.suggestHeading, { color: c.textSecondary }]}>Recent Searches</Text>
                {RECENT_SEARCHES.map((item) => (
                  <Pressable key={item} style={[ss.suggestRow, { borderTopColor: c.border }]}
                    onPress={() => { void tap(); setSearchQuery(item); }}>
                    <Icon name="time-outline" size={15} color={c.muted} />
                    <Text style={[ss.suggestText, { color: c.text, flex: 1 }]}>{item}</Text>
                    <Icon name="close" size={14} color={c.muted} />
                  </Pressable>
                ))}
              </View>

              {/* Smart Suggestions */}
              <View style={[ss.suggestCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[ss.suggestHeading, { color: c.textSecondary }]}>Smart Suggestions</Text>
                {SMART_SUGGESTIONS.map((item) => (
                  <Pressable key={item} style={[ss.suggestRow, { borderTopColor: c.border }]}
                    onPress={() => { void tap(); setSearchQuery(item); }}>
                    <Icon name="search-outline" size={15} color={c.muted} />
                    <Text style={[ss.suggestText, { color: c.text, flex: 1 }]}>{item}</Text>
                    <Icon name="chevron-forward" size={14} color={c.muted} />
                  </Pressable>
                ))}
              </View>

              {/* Trending Services */}
              <View style={{ gap: 8 }}>
                <Text style={[ss.suggestHeading, { color: c.textSecondary }]}>Trending Services</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {TRENDING.map((t) => (
                    <Pressable
                      key={t}
                      style={[ss.trendChip, { backgroundColor: c.surface, borderColor: c.border }]}
                      onPress={() => { void tap(); setSearchQuery(t); }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{t}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </>
          )}
        </View>

        {/* Garage results */}
        <View style={ss.landingSection}>
          <SectionRow
            title={trimmed ? `Results for "${searchQuery}"` : 'Garage Listings'}
            linkLabel="Map"
            onPress={() => router.push('/map')}
            c={c}
          />
          {vendorsLoading
            ? <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />
            : filteredVendors.length === 0
              ? (
                <View style={[ss.emptyBox, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Icon name="search-outline" size={36} color={c.muted} />
                  <Text style={[ss.emptyTitle, { color: c.textSecondary }]}>No results</Text>
                  <Text style={[ss.emptyDesc, { color: c.muted }]}>Try a different name, area, or service type.</Text>
                </View>
              )
              : filteredVendors.map((g) => <GarageListCard key={g.id} garage={g} c={c} />)
          }
        </View>
      </ScrollView>
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
  const bookings = useQarWheelStore((s) => s.bookings);
  const cancelBooking = useQarWheelStore((s) => s.cancelBooking);
  const rescheduleBooking = useQarWheelStore((s) => s.rescheduleBooking);
  const [activeTab, setActiveTab] = useState<'Active' | BookingWorkflowStatus | 'History'>('Active');

  // Live sync from Firestore — merges into Zustand on top of local/seed bookings
  const { user } = useAuthContext();
  useFirestoreBookings(user?.uid ?? null);

  const sortedBookings = [...bookings].sort((a, b) => {
    const left = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
    const right = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
    return right - left;
  });
  const filteredBookings = sortedBookings.filter((booking) => {
    if (activeTab === 'Active') return booking.status !== 'Completed' && booking.status !== 'Cancelled';
    if (activeTab === 'History') return booking.status === 'Completed';
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
  const upcoming = bookings.filter((b) => b.status !== 'Completed' && b.status !== 'Cancelled').length;
  const pending = bookings.filter((b) => b.status === 'Pending').length;
  const history = bookings.filter((b) => b.status === 'Completed').length;

  function handleCancel(booking: Booking) {
    if (booking.status === 'Completed' || booking.status === 'Cancelled') return;
    Alert.alert('Cancel booking?', 'This will cancel your request and notify the garage.', [
      { text: 'Keep booking', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: () => cancelBooking(booking.id) },
    ]);
  }

  function handleReschedule(booking: Booking) {
    if (booking.status === 'Completed' || booking.status === 'Cancelled') return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    rescheduleBooking(booking.id, { date: 'Tomorrow, 10:00 AM', bookingDate: tomorrow.toISOString(), timeSlot: '10:00 AM' });
    Alert.alert('Reschedule requested', 'Your booking was moved to Tomorrow, 10:00 AM and is waiting for garage confirmation.');
  }

  const { control: refreshControl } = useRefresh();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: spacing.page, paddingBottom: TAB_BOTTOM + 18, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={{ gap: 2 }}>
          <Text style={[ss.pageEyebrow, { color: c.primary }]}>Appointments</Text>
          <Text style={[ss.pageTitle, { color: c.text }]}>My bookings</Text>
        </View>

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
              >
                <Text style={[ss.bookingTabText, { color: active ? '#fff' : c.textSecondary }]}>{tab.label}</Text>
                <View style={[ss.bookingTabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : c.surfaceAlt }]}>
                  <Text style={[ss.bookingTabBadgeText, { color: active ? '#fff' : c.muted }]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {filteredBookings.length === 0 && (
          <View style={[ss.emptyBox, { backgroundColor: c.surface, borderColor: c.border }]}> 
            <Icon name="calendar-outline" size={40} color={c.muted} />
            <Text style={[ss.emptyTitle, { color: c.textSecondary }]}>No {activeTab.toString().toLowerCase()} bookings</Text>
            <Text style={[ss.emptyDesc, { color: c.muted }]}>Book a service or switch tabs to view another status.</Text>
          </View>
        )}

        {filteredBookings.map((booking) => {
          const sc = statusColorsThemed[booking.status] ?? statusColorsThemed.Pending;
          const progressIndex = Math.max(getBookingStatusIndex(booking.status), 0);
          const progressPercent = booking.status === 'Cancelled' ? 100 : Math.round(((progressIndex + 1) / 6) * 100);
          const canModify = booking.status !== 'Completed' && booking.status !== 'Cancelled';
          return (
            <Pressable
              key={booking.id}
              style={[ss.bookingCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => { void tap(); router.push(route(`/booking/${booking.id}`)); }}
            >
              <View style={ss.bookingTop}>
                <View style={[ss.statusPill, { backgroundColor: sc.bg }]}> 
                  <View style={[ss.statusDot, { backgroundColor: sc.dot }]} />
                  <Text style={[ss.statusText, { color: sc.text }]}>{getBookingStatusLabel(booking.status)}</Text>
                </View>
                <Text style={[ss.bookingDate, { color: c.muted }]}>{typeof booking.date === 'string' ? booking.date : ''}</Text>
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
              <View style={[ss.bookingActions, { borderTopColor: c.border }]}> 
                <Pressable style={ss.bookingAction} onPress={() => router.push('/notifications')}>
                  <Icon name="chatbubble-ellipses-outline" size={15} color={c.primary} />
                  <Text style={[ss.bookingActionText, { color: c.primary }]}>Message</Text>
                </Pressable>
                <View style={[ss.bookingActionSep, { backgroundColor: c.border }]} />
                <Pressable style={ss.bookingAction} onPress={() => handleReschedule(booking)}>
                  <Icon name="calendar-outline" size={15} color={canModify ? c.primary : c.muted} />
                  <Text style={[ss.bookingActionText, { color: canModify ? c.primary : c.muted }]}>Reschedule</Text>
                </Pressable>
                <View style={[ss.bookingActionSep, { backgroundColor: c.border }]} />
                <Pressable style={ss.bookingAction} onPress={() => handleCancel(booking)}>
                  <Icon name="close-circle-outline" size={15} color={canModify ? c.danger : c.muted} />
                  <Text style={[ss.bookingActionText, { color: canModify ? c.danger : c.muted }]}>Cancel</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        <Pressable style={[ss.primaryBtn, { backgroundColor: c.primary, ...shadow.primary }]}
          onPress={() => router.push(route('/checkout/emergency'))}>
          <Icon name="add-circle-outline" size={19} color="#fff" />
          <Text style={[ss.primaryBtnText, { color: '#fff' }]}>New booking</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
// CARS SCREEN
// ══════════════════════════════════════════════════════════════════
export function CarsScreen() {
  const router = useRouter();
  const c = useQarColors();
  const { user } = useAuthContext();
  const [carList, setCarList] = useState<FirestoreCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(firestore, 'users', user.uid, 'cars'));
    return onSnapshot(
      q,
      (snap) => {
        setCarList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreCar, 'id'>) })));
        setLoading(false);
      },
      (_err) => { setLoading(false); },
    );
  }, [user]);

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
    return (car.health ?? 90) < 70 ? 'Inspection due' : 'On track';
  }

  const totalCars = carList.length;
  const avgHealth = totalCars
    ? Math.round(carList.reduce((sum, car) => sum + (car.health ?? 90), 0) / totalCars)
    : 0;
  const attentionCount = carList.filter((car) => (car.health ?? 90) < 70).length;

  const { control: refreshControl } = useRefresh();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: spacing.page, paddingBottom: TAB_BOTTOM + 18, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
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

        <View style={[ss.garageOverview, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[ss.garageOverviewIcon, { backgroundColor: c.primaryLight }]}>
            <Icon name="shield-checkmark-outline" size={24} color={c.primary} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[ss.garageOverviewTitle, { color: c.text }]}>Ownership overview</Text>
            <View style={ss.garageStatRow}>
              {[
                { label: 'Cars', value: String(totalCars), icon: 'car-sport-outline' as IoniconName },
                { label: 'Avg health', value: totalCars ? `${avgHealth}%` : '--', icon: 'pulse-outline' as IoniconName },
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
        </View>

        {loading && (
          <View style={[ss.loadBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ActivityIndicator color={c.primary} />
            <Text style={[ss.loadText, { color: c.muted }]}>Loading vehicles…</Text>
          </View>
        )}

        {!loading && carList.length === 0 && (
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
          const hc = hColor(car.health ?? 90);
          const hl = hLabel(car.health ?? 90);
          const health = car.health ?? 90;
          return (
            <Pressable
              key={car.id}
              style={[ss.carCard2, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => router.push(route(`/vehicle-dashboard/${car.id}`))}
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
                  <View style={[ss.carCard2HealthFill, { width: `${health}%` as any, backgroundColor: hc }]} />
                </View>
                <Text style={[ss.carCard2HealthPct, { color: hc }]}>{health}%</Text>
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

              {/* ── Divider ── */}
              <View style={[ss.carCard2Divider, { backgroundColor: c.border }]} />

              {/* ── Actions row ── */}
              <View style={ss.carCard2Actions}>
                <Pressable
                  style={[ss.carCard2ActionPrimary, { backgroundColor: c.primary }]}
                  onPress={() => router.push(route(`/checkout/${car.id}`))}
                >
                  <Icon name="calendar-outline" size={14} color="#fff" />
                  <Text style={ss.carCard2ActionPrimaryText}>Book service</Text>
                </Pressable>
                {[
                  { label: 'Passport', icon: 'id-card-outline' as IoniconName, href: `/vehicle-passport/${car.id}` },
                  { label: 'Docs',     icon: 'folder-open-outline' as IoniconName, href: `/vehicle-documents/${car.id}` },
                  { label: 'Predict',  icon: 'analytics-outline' as IoniconName,  href: `/predictive-maintenance/${car.id}` },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    style={[ss.carCard2ActionGhost, { borderColor: c.border }]}
                    onPress={() => router.push(route(item.href))}
                  >
                    <Icon name={item.icon} size={15} color={c.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </Pressable>
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
  const bookings = useQarWheelStore((s) => s.bookings);
  const favoriteGarageIds = useQarWheelStore((s) => s.favoriteGarageIds);
  const vendorInvoices = useQarWheelStore((s) => s.vendorInvoices);

  // Live car count from Firestore (mirrors CarsScreen)
  const [accountCarList, setAccountCarList] = useState<FirestoreCar[]>([]);
  useEffect(() => {
    if (!user) return;
    const q = query(collection(firestore, 'users', user.uid, 'cars'));
    return onSnapshot(q, (snap) => {
      setAccountCarList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreCar, 'id'>) })));
    });
  }, [user]);

  const totalVehicles = accountCarList.length;
  const totalBookings = bookings.length;
  const totalSaved = favoriteGarageIds.length;
  const totalSpent = vendorInvoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const spentLabel = totalSpent > 0 ? `QAR ${totalSpent.toLocaleString()}` : 'QAR 0';

  const initial = user?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? 'U';
  const name = user?.displayName ?? 'QarWheel User';
  const email = user?.email ?? '';

  const menuSections = [
    {
      title: 'Vehicles & bookings',
      items: [
        { label: 'My cars',         icon: 'car-sport-outline' as IoniconName, href: '/(tabs)/cars',    color: '#E31E24', isTab: true },
        { label: 'Saved garages',   icon: 'heart-outline' as IoniconName,    href: 'saved-garages',   color: '#EF4444' },
        { label: 'Booking history', icon: 'calendar-outline' as IoniconName,  href: 'payment-methods', color: '#22C55E' },
      ],
    },
    {
      title: 'Payments & security',
      items: [
        { label: 'Payment methods', icon: 'card-outline' as IoniconName,   href: 'payment-methods', color: c.primary },
        { label: 'Wallet balance',  icon: 'wallet-outline' as IoniconName,  href: 'payment-methods', color: '#818CF8' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { label: 'Notifications',           icon: 'notifications-outline' as IoniconName, href: 'notifications',       color: '#F59E0B' },
        { label: 'Language: English / عربي', icon: 'language-outline' as IoniconName,     href: 'language',            color: '#22D3EE' },
        { label: 'Privacy & data safety',   icon: 'shield-outline' as IoniconName,        href: 'privacy-data-safety', color: '#A78BFA' },
      ],
    },
    {
      title: 'Business',
      items: [
        { label: 'Vendor mode', icon: 'business-outline' as IoniconName, href: 'vendor-mode', color: '#F59E0B' },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: spacing.page, paddingBottom: TAB_BOTTOM + 18, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor={c.primary} colors={[c.primary]} />}
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
            { label: 'Vehicles', value: String(totalVehicles), icon: 'car-outline' as IoniconName },
            { label: 'Bookings', value: String(totalBookings), icon: 'calendar-outline' as IoniconName },
            { label: 'Saved',    value: String(totalSaved),    icon: 'heart-outline' as IoniconName },
            { label: 'Spent',    value: spentLabel,            icon: 'wallet-outline' as IoniconName },
          ].map((s, i) => (
            <View
              key={s.label}
              style={[
                ss.statItem,
                i < 3 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.border },
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

        <Text style={[ss.version, { color: c.muted }]}>QarWheel v2.0.0 · Qatar & UAE</Text>
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
  sectionSubAr:   { fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl', flexShrink: 0 },
  landingSection: { paddingHorizontal: spacing.page, gap: 14 },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 8 },
  logoRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoQ:          { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoQText:      { color: '#fff', fontSize: 18, fontWeight: '900' },
  logoText:       { fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langChip:       { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  langText:       { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  // 44×44 minimum touch target for the notification button
  iconBtn:        { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  notifDot:       { position: 'absolute', right: -2, top: -2, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  notifDotText:   { color: '#fff', fontSize: 12, fontWeight: '900' },

  // Greeting
  greetingBlock:  { paddingHorizontal: spacing.page, gap: 4 },
  greetingMain:   { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  greetingSub:    { fontSize: 14, fontWeight: '400' },
  greetingAr:     { fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },

  // Search
  searchBar:      { marginHorizontal: spacing.page, minHeight: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', paddingStart: 16, paddingEnd: 8, borderWidth: 1, gap: 10 },
  searchBarActive:{ height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1.5, gap: 10 },
  searchPlaceholder: { fontSize: 14, flex: 1 },
  searchAr:       { fontSize: 12, writingDirection: 'rtl', textAlign: 'right' },
  searchBtn:      { height: 36, width: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroCard:       { marginHorizontal: spacing.page, minHeight: 196, borderRadius: 22, overflow: 'hidden', backgroundColor: '#060810' },
  heroImage:      { position: 'absolute', right: 0, top: 0, bottom: 0, width: '60%' },
  heroOverlayLeft:{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%' },
  heroOverlayMid: { position: 'absolute', left: '40%', top: 0, bottom: 0, width: '30%' },
  heroContent:    { position: 'absolute', left: 0, top: 0, bottom: 0, width: '70%', padding: 20, justifyContent: 'center', gap: 5 },
  heroEyebrow:    { color: '#E31E24', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  heroHeadline:   { color: '#fff', fontSize: 19, fontWeight: '900', lineHeight: 24 },
  heroAr:         { color: 'rgba(255,255,255,0.48)', fontSize: 12, lineHeight: 17, marginBottom: 8, textAlign: 'right', writingDirection: 'rtl', alignSelf: 'stretch' },
  heroBtnRow:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  heroBtnPrimary: { height: 36, borderRadius: 11, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  heroBtnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  heroBtnGhost:   { height: 36, borderRadius: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  heroBtnGhostText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Quick actions — equal-width 4-column grid
  quickRow:       { flexDirection: 'row', gap: 10 },
  quickItem:      { flex: 1, alignItems: 'center', gap: 8, minHeight: 82 },
  quickIcon:      { width: 58, height: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickLabel:     { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 15, minHeight: 30 },

  // Featured services
  hScroll:        { gap: 12 },
  featSvcCard:    { width: 136, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  featSvcImage:   { width: 136, height: 88 },
  featSvcInfo:    { padding: 10, gap: 3 },
  featSvcLabel:   { fontSize: 12, fontWeight: '800' },
  featSvcPrice:   { fontSize: 12 },

  // Book any service CTA
  bookCta:        { borderRadius: 22, overflow: 'hidden', minHeight: 132 },
  bookCtaImage:   { position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%' },
  bookCtaOverlay: { position: 'absolute', left: '30%', top: 0, bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  bookCtaContent: { padding: 20, flex: 1, justifyContent: 'center', gap: 6 },
  bookCtaTitle:   { color: '#fff', fontSize: 16, fontWeight: '900' },
  bookCtaSub:     { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  bookCtaSubAr:   { color: 'rgba(255,255,255,0.62)', fontSize: 12, lineHeight: 17, textAlign: 'right', writingDirection: 'rtl', alignSelf: 'stretch' },
  bookCtaBtn:     { minHeight: 40, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  bookCtaBtnText: { fontSize: 12, fontWeight: '900' },

  // Categories 3-column grid — gap 10 on both axes for consistent spacing
  catGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' },
  catCard: {
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 124,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 7,
  },
  catIconWrap:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catLabel:       { fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 14 },
  catLabelAr:     { fontSize: 12, textAlign: 'center', lineHeight: 14, writingDirection: 'rtl', minHeight: 16 },

  // Garage card — consistent internal padding and gap
  garageCard:     { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', alignItems: 'center', padding: 12, gap: 12 },
  garageThumb:    { width: 70, height: 70, borderRadius: 11 },
  garageBody:     { flex: 1, minWidth: 0, gap: 4 },
  garageTopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
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

  // Garage section header
  garageHeader:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  locationRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText:   { fontSize: 12 },

  // Promo banner
  promoBanner:    { minHeight: 220, borderRadius: 22, overflow: 'hidden', backgroundColor: '#1A0409' },
  promoImage:     { position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%' },
  promoOverlay:   { position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, backgroundColor: 'rgba(15,4,6,0.65)' },
  promoContent:   { position: 'absolute', left: 0, top: 0, bottom: 0, padding: 22, justifyContent: 'center', gap: 3 },
  promoEyebrow:   { color: '#FDA4AF', fontSize: 12, fontWeight: '800' },
  promoSub:       { color: 'rgba(253,164,175,0.7)', fontSize: 12 },
  promoDiscount:  { color: '#fff', fontSize: 56, fontWeight: '900', lineHeight: 60, marginTop: 2 },
  promoOff:       { color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 28 },
  promoBtn:       { marginTop: 10, height: 38, borderRadius: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  promoBtnText:   { fontSize: 13, fontWeight: '900' },

  // Top offers
  offersRow:      { flexDirection: 'row', gap: 10 },
  offerCard:      { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  offerImgWrap:   { height: 76, position: 'relative' },
  offerImg:       { ...StyleSheet.absoluteFillObject },
  offerImgOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  offerDiscount:  { position: 'absolute', bottom: 7, left: 9, color: '#fff', fontSize: 12, fontWeight: '900' },
  offerInfo:      { padding: 9, gap: 2 },
  offerService:   { fontSize: 12, fontWeight: '800' },
  offerUntil:     { fontSize: 12 },

  // German car section
  brandPills:     { gap: 10, paddingVertical: 2 },
  brandPill:      { borderRadius: 20, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 9, minHeight: 40 },
  brandPillText:  { fontSize: 12, fontWeight: '800' },

  // Trust & Safety
  trustGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trustCard:      {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, padding: 14, minHeight: 82,
  },
  trustIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trustLabel:     { fontSize: 12, fontWeight: '800', lineHeight: 16 },
  trustLabelAr:   { fontSize: 12, lineHeight: 16, textAlign: 'right', writingDirection: 'rtl' },
  tagline:        { textAlign: 'center', fontSize: 12, lineHeight: 19, paddingTop: 2 },
  taglineAr:      { fontSize: 12, lineHeight: 18, textAlign: 'center', writingDirection: 'rtl' },

  // Search screen
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
  bookingTab:      { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 42, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14 },
  bookingTabText:  { fontSize: 12, fontWeight: '900' },
  bookingTabBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  bookingTabBadgeText: { fontSize: 12, fontWeight: '900' },
  bookingCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  bookingTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 8 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot:      { width: 7, height: 7, borderRadius: 4 },
  statusText:     { fontSize: 12, fontWeight: '900' },
  bookingDate:    { fontSize: 12, fontWeight: '600' },
  bookingBody:    { paddingHorizontal: 14, paddingBottom: 14, gap: 5 },
  bookingService: { fontSize: 17, fontWeight: '900' },
  bookingStatusDesc: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  bookingMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookingMetaText:{ fontSize: 12, fontWeight: '600' },
  bookingProgressTrack: { height: 7, borderRadius: 999, overflow: 'hidden', marginTop: 5 },
  bookingProgressFill: { height: '100%', borderRadius: 999 },
  bookingActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  bookingAction:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13 },
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
    gap: 6, height: 40, borderRadius: 12,
  },
  carCard2ActionPrimaryText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  carCard2ActionGhost: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
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

