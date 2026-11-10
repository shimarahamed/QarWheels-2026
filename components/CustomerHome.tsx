import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorState from '@/components/ErrorState';
import { useGlassTabBottom } from '@/components/GlassTabBar';
import { RemoteImage } from '@/components/RemoteImage';
import { useAuthContext } from '@/lib/AuthContext';
import { useBranches } from '@/lib/firestoreOps';
import { useTranslation } from '@/lib/i18n';
import type { Garage } from '@/lib/marketplace';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { radius, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const carPhoto = 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=80';

const quickActions: { label: string; icon: IconName; route: string }[] = [
  { label: 'Book Service', icon: 'calendar-outline', route: '/services' },
  { label: 'My Cars', icon: 'car-outline', route: '/(tabs)/cars' },
  { label: 'Roadside', icon: 'warning-outline', route: '/roadside' },
  { label: 'Request Quote', icon: 'document-text-outline', route: '/modal' },
];

const featuredServices: { label: string; query: string; image: string }[] = [
  { label: 'AC Service', query: 'AC service', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=300&q=80' },
  { label: 'Oil Change', query: 'Oil change', image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=300&q=80' },
  { label: 'Brake Repair', query: 'Brake repair', image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=300&q=80' },
  { label: 'Battery', query: 'Battery', image: 'https://images.unsplash.com/photo-1580274455191-1c62238fa333?auto=format&fit=crop&w=300&q=80' },
  { label: 'Tire Change', query: 'Tire change', image: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=300&q=80' },
];

const categories: { label: string; labelAr: string; icon: IconName; query: string; route?: string }[] = [
  { label: 'AC & Heating', labelAr: 'تكييف وتدفئة', icon: 'snow-outline', query: 'AC' },
  { label: 'Electrical', labelAr: 'كهربائي', icon: 'flash-outline', query: 'Electrical' },
  { label: 'Tires & Wheels', labelAr: 'الإطارات', icon: 'disc-outline', query: 'Tire' },
  { label: 'Body & Paint', labelAr: 'هيكل ودهان', icon: 'color-palette-outline', query: 'Body' },
  { label: 'Car Wash', labelAr: 'غسيل السيارة', icon: 'water-outline', query: 'Wash' },
  { label: 'Diagnostics', labelAr: 'تشخيص', icon: 'analytics-outline', query: 'Diagnostics' },
  { label: 'Detailing', labelAr: 'تلميع', icon: 'sparkles-outline', query: 'Detailing' },
  { label: 'Accessories', labelAr: 'إكسسوارات', icon: 'cube-outline', query: 'Accessories' },
  { label: 'Roadside', labelAr: 'خدمة الطريق', icon: 'warning-outline', query: '', route: '/roadside' },
];

const brands = ['All', 'BMW', 'Mercedes', 'Audi', 'Porsche'];
const germanTerms = ['bmw', 'mercedes', 'audi', 'porsche', 'volkswagen', 'vw', 'german'];

const trustItems: { label: string; labelAr: string; icon: IconName }[] = [
  { label: 'Listed Garages', labelAr: 'كراجات مدرجة', icon: 'shield-checkmark-outline' },
  { label: 'Clear Requests', labelAr: 'طلبات واضحة', icon: 'document-text-outline' },
  { label: 'Vehicle Records', labelAr: 'سجلات المركبات', icon: 'car-outline' },
  { label: 'Help Center', labelAr: 'مركز المساعدة', icon: 'help-circle-outline' },
];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function searchRoute(query: string) {
  return `/search?term=${encodeURIComponent(query)}` as never;
}

function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const c = useQarColors();
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {action && onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${action} ${title}`} onPress={onPress} style={styles.sectionLink}>
          <Text style={[styles.sectionLinkText, { color: c.primary }]}>{action}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function WorkshopRow({ garage }: { garage: Garage }) {
  const c = useQarColors();
  const router = useRouter();
  const saved = useQarWheelStore((state) => state.favoriteGarageIds.includes(garage.id));
  const toggleFavorite = useQarWheelStore((state) => state.toggleFavoriteGarage);
  const location = [garage.area, garage.city].filter(Boolean).join(', ') || 'Location not listed';

  return (
    <View style={[styles.workshop, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${garage.name}`} onPress={() => router.push(`/garage/${garage.id}` as never)} style={styles.workshopDetails}>
        <RemoteImage uri={garage.imageUrl} style={styles.workshopImage} fallbackIcon="business-outline" accessibilityLabel={`${garage.name} workshop`} />
        <View style={styles.workshopBody}>
          <Text numberOfLines={1} style={[styles.workshopName, { color: c.text }]}>{garage.name}</Text>
          <Text numberOfLines={1} style={[styles.workshopMeta, { color: c.textSecondary }]}>{location}</Text>
          <View style={styles.workshopFacts}>
            {garage.reviews > 0 && garage.rating > 0 ? <Text style={[styles.fact, { color: c.textSecondary }]}>{garage.rating.toFixed(1)} ({garage.reviews})</Text> : null}
            <Text style={[styles.fact, { color: c.textSecondary }]}>{garage.startingPrice}</Text>
          </View>
          <Text style={[styles.fact, { color: garage.openNow === true ? c.success : c.textSecondary }]}>
            {garage.openNow === null ? 'Hours unavailable' : garage.openNow ? 'Open' : 'Closed'}
          </Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={saved ? `Unsave ${garage.name}` : `Save ${garage.name}`} accessibilityState={{ selected: saved }} onPress={() => toggleFavorite(garage.id)} style={styles.saveButton}>
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={21} color={saved ? c.danger : c.textSecondary} />
      </Pressable>
    </View>
  );
}

export default function CustomerHome() {
  const c = useQarColors();
  const router = useRouter();
  const tabBottom = useGlassTabBottom();
  const { user } = useAuthContext();
  const { language } = useTranslation();
  const unread = useQarWheelStore((state) => state.notifications.filter((item) => !item.read).length);
  const { vendors, loading, error, refresh } = useBranches();
  const [refreshing, setRefreshing] = useState(false);
  const [activeBrand, setActiveBrand] = useState('All');
  const firstName = user?.displayName?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || 'there';
  const specialists = useMemo(() => vendors.filter((garage) => {
    const text = `${garage.name} ${garage.type} ${garage.category} ${garage.tags?.join(' ') ?? ''}`.toLowerCase();
    return activeBrand === 'All'
      ? germanTerms.some((term) => text.includes(term))
      : text.includes(activeBrand.toLowerCase());
  }).slice(0, 5), [activeBrand, vendors]);
  const locationAvailable = vendors.some((garage) => garage.distanceKm > 0);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBottom + spacing.lg }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.primary} colors={[c.primary]} />}>
        <View style={styles.header}>
          <View style={styles.brand} accessibilityRole="header">
            <Image source={require('../assets/images/adaptive-icon.png')} style={styles.brandImage} accessibilityLabel="QarWheel" />
            <Text style={[styles.brandName, { color: c.text }]}>QarWheel</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Change language" onPress={() => router.push('/settings/language' as never)} style={[styles.langButton, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={[styles.langText, { color: c.textSecondary }]}>{language.toUpperCase()}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'} onPress={() => router.push('/notifications' as never)} style={[styles.iconButton, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Ionicons name="notifications-outline" size={21} color={c.text} />
              {unread > 0 ? <View style={[styles.unreadBadge, { backgroundColor: c.primary }]}><Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.pageSection}>
          <Text style={[styles.greeting, { color: c.text }]} numberOfLines={2}>{greeting()}, {firstName}</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>What's your next move?</Text>
          <Text style={[styles.arabic, { color: c.textSecondary }]}>ما هي خطوتك القادمة؟</Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Search garages, services, parts" onPress={() => router.push('/search' as never)} style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={20} color={c.textSecondary} />
          <Text style={[styles.searchText, { color: c.textSecondary }]} numberOfLines={1}>Search garages, services, parts...</Text>
          <View style={[styles.searchIcon, { backgroundColor: c.primary }]}><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></View>
        </Pressable>

        <View style={styles.hero}>
          <RemoteImage uri={carPhoto} style={styles.heroImage} accessibilityLabel="Car ready for service" />
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>BOOK WITH CLARITY</Text>
            <Text style={styles.heroTitle}>Find your next service.{'\n'}Compare workshops.</Text>
            <Text style={styles.heroArabic}>ابحث عن الخدمة المناسبة لسيارتك.</Text>
            <View style={styles.heroActions}>
              <Pressable accessibilityRole="button" onPress={() => router.push('/services' as never)} style={[styles.heroPrimary, { backgroundColor: c.primary }]}><Text style={styles.heroActionText}>Explore Now</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push('/modal' as never)} style={styles.heroSecondary}><Text style={styles.heroActionText}>Request Quote</Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          {quickActions.map((action) => (
            <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label} onPress={() => router.push(action.route as never)} style={styles.quickItem}>
              <View style={[styles.quickIcon, { backgroundColor: c.surface, borderColor: c.border }]}><Ionicons name={action.icon} size={23} color={c.primary} /></View>
              <Text style={[styles.quickLabel, { color: c.textSecondary }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.pageInset}><SectionHeading title="Featured Services" action="View all" onPress={() => router.push('/services' as never)} /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceRail}>
            {featuredServices.map((service) => (
              <Pressable key={service.label} accessibilityRole="button" accessibilityLabel={`Find ${service.label}`} onPress={() => router.push(searchRoute(service.query))} style={[styles.serviceCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <RemoteImage uri={service.image} style={styles.serviceImage} fallbackIcon="construct-outline" accessibilityLabel={service.label} />
                <View style={styles.serviceInfo}><Text style={[styles.serviceName, { color: c.text }]}>{service.label}</Text><Text style={[styles.fact, { color: c.textSecondary }]}>Browse garages</Text></View>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.pageInset}>
            <View style={[styles.bookBanner, { backgroundColor: c.primaryDark }]}>
              <RemoteImage uri={carPhoto} style={styles.bannerImage} accessibilityLabel="Car service" />
              <View style={styles.bannerShade} />
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>Book Any Service</Text>
                <Text style={styles.bannerText}>Choose a workshop that fits your car.</Text>
                <Text style={styles.bannerArabic}>اختر الخدمة المناسبة لسيارتك.</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Browse services" onPress={() => router.push('/services' as never)} style={styles.bannerButton}><Text style={[styles.bannerButtonText, { color: c.primaryDark }]}>Browse Services</Text></Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.pageSection}>
          <SectionHeading title="All Categories" action="See all" onPress={() => router.push('/search' as never)} />
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <Pressable key={category.label} accessibilityRole="button" accessibilityLabel={category.label} onPress={() => router.push(category.route ? category.route as never : searchRoute(category.query))} style={[styles.category, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.categoryIcon, { backgroundColor: c.surfaceAlt }]}><Ionicons name={category.icon} size={22} color={c.primary} /></View>
                <Text style={[styles.categoryName, { color: c.text }]}>{category.label}</Text>
                <Text style={[styles.categoryArabic, { color: c.textSecondary }]}>{category.labelAr}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.pageSection}>
          <SectionHeading title="Garages Near You" action="See map" onPress={() => router.push('/map' as never)} />
          <Text style={[styles.locationHint, { color: c.textSecondary }]}>{locationAvailable ? 'Based on your location' : 'Location unavailable - showing listed garages'}</Text>
          {error ? <ErrorState compact onRetry={() => void refresh()} /> : null}
          {loading && vendors.length === 0 ? <ActivityIndicator accessibilityLabel="Loading workshops" color={c.primary} style={styles.loadState} /> : null}
          {!loading && !error && vendors.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: c.surface, borderColor: c.border }]}><Ionicons name="business-outline" size={26} color={c.muted} /><Text style={[styles.emptyTitle, { color: c.text }]}>No workshops listed yet</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry workshops" onPress={() => void refresh()} style={styles.emptyAction}><Text style={[styles.sectionLinkText, { color: c.primary }]}>Retry</Text></Pressable></View>
          ) : null}
          {vendors.slice(0, 5).map((garage) => <WorkshopRow key={garage.id} garage={garage} />)}
          {vendors.length > 5 ? <Pressable accessibilityRole="button" accessibilityLabel="View all garages" onPress={() => router.push('/search' as never)} style={styles.moreAction}><Text style={[styles.sectionLinkText, { color: c.primary }]}>View all garages</Text></Pressable> : null}
        </View>

        <View style={styles.pageInset}>
          <View style={[styles.acBanner, { backgroundColor: c.surface }]}>
            <RemoteImage uri={carPhoto} style={styles.bannerImage} accessibilityLabel="Car AC service" />
            <View style={styles.bannerShade} />
            <View style={styles.bannerContent}>
              <Text style={styles.eyebrow}>AC SERVICE</Text>
              <Text style={styles.bannerTitle}>Find an AC specialist</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Find AC service" onPress={() => router.push(searchRoute('AC'))} style={styles.bannerButton}><Text style={[styles.bannerButtonText, { color: c.primaryDark }]}>Find Service</Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.pageSection}>
          <SectionHeading title="Offers" action="View all" onPress={() => router.push('/offers' as never)} />
          <View style={[styles.offerEmpty, { borderColor: c.border }]}><Ionicons name="pricetag-outline" size={20} color={c.muted} /><Text style={[styles.body, { color: c.textSecondary }]}>No live offers right now</Text></View>
        </View>

        <View style={styles.pageSection}>
          <SectionHeading title="German Car Specialist" />
          <Text style={[styles.arabic, { color: c.textSecondary }]}>متخصصون في السيارات الألمانية</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRail}>
            {brands.map((brand) => (
              <Pressable key={brand} accessibilityRole="button" accessibilityLabel={`${brand} specialists`} accessibilityState={{ selected: activeBrand === brand }} onPress={() => setActiveBrand(brand)} style={[styles.brandPill, { backgroundColor: activeBrand === brand ? c.primary : c.surface, borderColor: activeBrand === brand ? c.primary : c.border }]}><Text style={[styles.brandText, { color: activeBrand === brand ? '#FFFFFF' : c.textSecondary }]}>{brand}</Text></Pressable>
            ))}
          </ScrollView>
          {loading && vendors.length === 0 ? <ActivityIndicator accessibilityLabel="Loading specialists" color={c.primary} /> : null}
          {!loading && !error && specialists.length === 0 ? <View style={[styles.emptyState, { backgroundColor: c.surface, borderColor: c.border }]}><Ionicons name="car-sport-outline" size={26} color={c.muted} /><Text style={[styles.body, { color: c.textSecondary }]}>No {activeBrand === 'All' ? 'German specialist' : activeBrand} garages listed yet.</Text></View> : null}
          {specialists.map((garage) => <WorkshopRow key={garage.id} garage={garage} />)}
        </View>

        <View style={styles.pageSection}>
          <SectionHeading title="Trust & Safety" />
          <Text style={[styles.arabic, { color: c.textSecondary }]}>الأمان والثقة</Text>
          <View style={styles.trustGrid}>
            {trustItems.map((item) => <View key={item.label} style={[styles.trustItem, { backgroundColor: c.surface, borderColor: c.border }]}><View style={[styles.trustIcon, { backgroundColor: c.surfaceAlt }]}><Ionicons name={item.icon} size={21} color={c.primary} /></View><View style={styles.trustCopy}><Text style={[styles.trustLabel, { color: c.text }]}>{item.label}</Text><Text style={[styles.trustArabic, { color: c.textSecondary }]}>{item.labelAr}</Text></View></View>)}
          </View>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>QarWheel - Your Car. Our Care.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: spacing.section },
  header: { minHeight: 58, paddingHorizontal: spacing.page, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  brandImage: { width: 42, height: 42 },
  brandName: { fontSize: 19, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langButton: { minWidth: 44, height: 44, borderRadius: radius.xs, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  langText: { ...typography.caption, fontWeight: '800' },
  iconButton: { width: 44, height: 44, borderRadius: radius.xs, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  pageSection: { paddingHorizontal: spacing.page, gap: 12 },
  pageInset: { paddingHorizontal: spacing.page },
  section: { gap: 12 },
  greeting: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  body: { ...typography.bodySm },
  arabic: { ...typography.caption, textAlign: 'right', writingDirection: 'rtl' },
  searchBar: { marginHorizontal: spacing.page, minHeight: 56, borderRadius: radius.xs, borderWidth: 1, paddingLeft: 14, paddingRight: 7, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchText: { ...typography.bodySm, flex: 1 },
  searchIcon: { width: 40, height: 40, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  hero: { marginHorizontal: spacing.page, minHeight: 212, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: '#11161D' },
  heroImage: { ...StyleSheet.absoluteFill },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(7,10,14,0.78)' },
  heroContent: { padding: 20, gap: 8, justifyContent: 'center', minHeight: 212 },
  eyebrow: { ...typography.overline, color: '#FFB4AB' },
  heroTitle: { fontSize: 22, fontWeight: '800', lineHeight: 27, color: '#FFFFFF' },
  heroArabic: { ...typography.caption, color: '#E0E2E8', writingDirection: 'rtl', textAlign: 'left' },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  heroPrimary: { minHeight: 44, borderRadius: radius.xs, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  heroSecondary: { minHeight: 44, borderRadius: radius.xs, borderWidth: 1, borderColor: 'rgba(255,255,255,0.42)', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  heroActionText: { color: '#FFFFFF', ...typography.caption, fontWeight: '800' },
  quickRow: { flexDirection: 'row', paddingHorizontal: spacing.page, gap: 7 },
  quickItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 7 },
  quickIcon: { width: 52, height: 52, borderRadius: radius.xs, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { ...typography.caption, textAlign: 'center', minHeight: 32 },
  sectionHeading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { ...typography.h4, flex: 1 },
  sectionLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLinkText: { ...typography.caption, fontWeight: '800' },
  serviceRail: { paddingHorizontal: spacing.page, gap: 10 },
  serviceCard: { width: 138, borderRadius: radius.xs, borderWidth: 1, overflow: 'hidden' },
  serviceImage: { width: 138, height: 88 },
  serviceInfo: { minHeight: 56, padding: 10, gap: 3 },
  serviceName: { ...typography.caption, fontWeight: '800' },
  fact: { ...typography.caption },
  bookBanner: { minHeight: 146, borderRadius: radius.sm, overflow: 'hidden', justifyContent: 'center' },
  acBanner: { minHeight: 172, borderRadius: radius.sm, overflow: 'hidden', justifyContent: 'center' },
  bannerImage: { ...StyleSheet.absoluteFill },
  bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(7,10,14,0.74)' },
  bannerContent: { padding: 18, gap: 6, alignItems: 'flex-start' },
  bannerTitle: { ...typography.h3, color: '#FFFFFF' },
  bannerText: { ...typography.bodySm, color: '#E0E2E8' },
  bannerArabic: { ...typography.caption, color: '#E0E2E8', writingDirection: 'rtl' },
  bannerButton: { minHeight: 44, backgroundColor: '#FFFFFF', borderRadius: radius.xs, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bannerButtonText: { ...typography.caption, fontWeight: '800' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { flexBasis: '30%', flexGrow: 1, minWidth: 0, minHeight: 122, borderRadius: radius.xs, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 7, gap: 6 },
  categoryIcon: { width: 42, height: 42, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  categoryName: { ...typography.caption, fontWeight: '800', textAlign: 'center' },
  categoryArabic: { ...typography.caption, textAlign: 'center', writingDirection: 'rtl' },
  locationHint: { ...typography.caption },
  workshop: { minHeight: 96, borderRadius: radius.xs, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 10 },
  workshopDetails: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  workshopImage: { width: 68, height: 68, borderRadius: radius.xs },
  workshopBody: { flex: 1, minWidth: 0, gap: 4 },
  workshopName: { ...typography.bodySm, fontWeight: '800', paddingRight: 30 },
  workshopMeta: { ...typography.caption },
  workshopFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  saveButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 4, right: 4 },
  loadState: { marginVertical: spacing.lg },
  emptyState: { minHeight: 110, borderWidth: 1, borderRadius: radius.xs, padding: 16, alignItems: 'flex-start', justifyContent: 'center', gap: 7 },
  emptyTitle: { ...typography.h4 },
  emptyAction: { minHeight: 44, justifyContent: 'center' },
  moreAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  offerEmpty: { minHeight: 70, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandRail: { gap: 8 },
  brandPill: { minHeight: 44, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  brandText: { ...typography.caption, fontWeight: '800' },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trustItem: { flexBasis: '47%', flexGrow: 1, minWidth: 0, minHeight: 78, borderRadius: radius.xs, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustIcon: { width: 36, height: 36, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  trustCopy: { flex: 1, minWidth: 0, gap: 3 },
  trustLabel: { ...typography.caption, fontWeight: '800' },
  trustArabic: { ...typography.caption, writingDirection: 'rtl' },
  tagline: { ...typography.caption, textAlign: 'center', marginTop: 4 },
});
