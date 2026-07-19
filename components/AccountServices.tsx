import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useAuthContext } from '@/lib/AuthContext';
import { auth, firestore } from '@/lib/firebase';
import { success, tap } from '@/lib/haptics';
import { garages, type Garage } from '@/lib/marketplace';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type AccountSection =
  | 'profile'
  | 'editProfile'
  | 'addresses'
  | 'paymentMethods'
  | 'wallet'
  | 'documents'
  | 'privacy'
  | 'notifications'
  | 'language'
  | 'savedGarages'
  | 'bookingHistory'
  | 'transactions'
  | 'invoices'
  | 'subscriptions'
  | 'coupons'
  | 'vendorMode';

type AccountProfile = {
  name: string;
  email: string;
  phone: string;
  country: string;
  area: string;
};

const sectionCopy: Record<AccountSection, { title: string; eyebrow: string; icon: IconName }> = {
  profile: { title: 'Profile overview', eyebrow: 'Account', icon: 'person-circle-outline' },
  editProfile: { title: 'Edit profile', eyebrow: 'Identity', icon: 'create-outline' },
  addresses: { title: 'Pickup addresses', eyebrow: 'Convenience', icon: 'location-outline' },
  paymentMethods: { title: 'Payment methods', eyebrow: 'Payments', icon: 'card-outline' },
  wallet: { title: 'Wallet', eyebrow: 'Balance', icon: 'wallet-outline' },
  documents: { title: 'Documents', eyebrow: 'Vault', icon: 'folder-open-outline' },
  privacy: { title: 'Privacy and security', eyebrow: 'Safety', icon: 'shield-checkmark-outline' },
  notifications: { title: 'Notifications', eyebrow: 'Preferences', icon: 'notifications-outline' },
  language: { title: 'Language', eyebrow: 'Preferences', icon: 'language-outline' },
  savedGarages: { title: 'Saved garages', eyebrow: 'Shortlist', icon: 'heart-outline' },
  bookingHistory: { title: 'Booking history', eyebrow: 'Services', icon: 'calendar-outline' },
  transactions: { title: 'Transactions', eyebrow: 'Ledger', icon: 'receipt-outline' },
  invoices: { title: 'Invoices', eyebrow: 'Records', icon: 'document-text-outline' },
  subscriptions: { title: 'Subscriptions', eyebrow: 'Plans', icon: 'repeat-outline' },
  coupons: { title: 'Coupons', eyebrow: 'Offers', icon: 'pricetag-outline' },
  vendorMode: { title: 'Vendor mode', eyebrow: 'Business', icon: 'business-outline' },
};

const sectionTabs: Array<{ id: AccountSection; label: string; icon: IconName }> = [
  { id: 'profile', label: 'Profile', icon: 'person-outline' },
  { id: 'addresses', label: 'Address', icon: 'location-outline' },
  { id: 'paymentMethods', label: 'Pay', icon: 'card-outline' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
  { id: 'documents', label: 'Docs', icon: 'folder-outline' },
  { id: 'privacy', label: 'Security', icon: 'shield-outline' },
];

function route(path: string) {
  return path as never;
}

function fromSettingsSection(section?: string): AccountSection {
  const normalized = decodeURIComponent(section ?? '').toLowerCase();
  const map: Record<string, AccountSection> = {
    notifications: 'notifications',
    language: 'language',
    'saved-garages': 'savedGarages',
    'privacy-data-safety': 'privacy',
    'vendor-mode': 'vendorMode',
    'payment-methods': 'paymentMethods',
    wallet: 'wallet',
    documents: 'documents',
    addresses: 'addresses',
    profile: 'profile',
  };
  return map[normalized] ?? 'profile';
}

export function AccountSettingsRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return <AccountServices initialSection={fromSettingsSection(section)} />;
}

export default function AccountServices({ initialSection = 'profile' }: { initialSection?: AccountSection }) {
  const router = useRouter();
  const c = useQarColors();
  const { user } = useAuthContext();
  const bookings = useQarWheelsStore((s) => s.bookings);
  const favorites = useQarWheelsStore((s) => s.favoriteGarageIds);
  const language = useQarWheelsStore((s) => s.language);
  const setLanguage = useQarWheelsStore((s) => s.setLanguage);
  const notifications = useQarWheelsStore((s) => s.notifications);
  const markNotificationsRead = useQarWheelsStore((s) => s.markNotificationsRead);
  const [section, setSection] = useState<AccountSection>(initialSection);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AccountProfile>({
    name: 'QarWheels User',
    email: '',
    phone: '+974 ',
    country: 'Qatar',
    area: 'Doha',
  });
  const [homeAddress, setHomeAddress] = useState('West Bay, Doha');
  const [workAddress, setWorkAddress] = useState('Msheireb Downtown, Doha');
  const [defaultPickup, setDefaultPickup] = useState<'home' | 'work'>('home');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => setSection(initialSection), [initialSection]);

  useEffect(() => {
    setProfile({
      name: user?.displayName ?? 'QarWheels User',
      email: user?.email ?? '',
      phone: user?.phoneNumber ?? '+974 ',
      country: 'Qatar',
      area: 'Doha',
    });
  }, [user?.displayName, user?.email, user?.phoneNumber]);

  const copy = sectionCopy[section];
  const initials = useMemo(() => {
    const source = profile.name || profile.email || 'User';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [profile.name, profile.email]);

  async function saveProfile() {
    if (!user) {
      Alert.alert('Login required', 'Please sign in before saving profile details.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(auth.currentUser ?? user, { displayName: profile.name.trim() || 'QarWheels User' });
      await setDoc(
        doc(firestore, 'users', user.uid),
        {
          displayName: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          country: profile.country.trim(),
          area: profile.area.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await success();
      Alert.alert('Profile saved', 'Your account details are ready for bookings and support.');
    } catch {
      Alert.alert('Could not save', 'Profile changes are kept on this screen. Please try again when Firebase is reachable.');
    } finally {
      setSaving(false);
    }
  }

  function renderSection() {
    if (section === 'profile' || section === 'editProfile') {
      return (
        <>
          <SectionCard title="Personal details" subtitle="Used for booking confirmation, invoices, pickup, and support." icon="person-outline" c={c}>
            <Field label="Full name" value={profile.name} onChangeText={(name) => setProfile((state) => ({ ...state, name }))} c={c} editable={section === 'editProfile'} />
            <Field label="Email" value={profile.email} onChangeText={(email) => setProfile((state) => ({ ...state, email }))} c={c} editable={section === 'editProfile'} keyboardType="email-address" />
            <Field label="Phone" value={profile.phone} onChangeText={(phone) => setProfile((state) => ({ ...state, phone }))} c={c} editable={section === 'editProfile'} keyboardType="phone-pad" />
            <Field label="Country" value={profile.country} onChangeText={(country) => setProfile((state) => ({ ...state, country }))} c={c} editable={section === 'editProfile'} />
            <Field label="Preferred area" value={profile.area} onChangeText={(area) => setProfile((state) => ({ ...state, area }))} c={c} editable={section === 'editProfile'} />
            {section === 'editProfile' ? (
              <PrimaryButton label={saving ? 'Saving...' : 'Save profile'} icon="checkmark-circle-outline" onPress={saveProfile} c={c} disabled={saving} />
            ) : (
              <PrimaryButton label="Edit profile" icon="create-outline" onPress={() => setSection('editProfile')} c={c} />
            )}
          </SectionCard>
          <SectionCard title="Account readiness" subtitle="Production-ready profile services connected from the account page." icon="analytics-outline" c={c}>
            <SummaryGrid
              c={c}
              items={[
                { label: 'Bookings', value: String(bookings.length), icon: 'calendar-outline' },
                { label: 'Saved', value: String(favorites.length), icon: 'heart-outline' },
                { label: 'Verified docs', value: '3', icon: 'checkmark-done-outline' },
                { label: 'Wallet', value: 'QAR 280', icon: 'wallet-outline' },
              ]}
            />
          </SectionCard>
        </>
      );
    }

    if (section === 'addresses') {
      return (
        <SectionCard title="Pickup and drop-off" subtitle="Store service addresses and choose the default pickup point." icon="location-outline" c={c}>
          <AddressBox label="Home" value={homeAddress} selected={defaultPickup === 'home'} onSelect={() => setDefaultPickup('home')} onChangeText={setHomeAddress} c={c} />
          <AddressBox label="Work" value={workAddress} selected={defaultPickup === 'work'} onSelect={() => setDefaultPickup('work')} onChangeText={setWorkAddress} c={c} />
          <PrimaryButton label="Use for next booking" icon="navigate-outline" onPress={() => { void success(); router.push(route('/services')); }} c={c} />
        </SectionCard>
      );
    }

    if (section === 'paymentMethods') {
      return (
        <SectionCard title="Cards and checkout" subtitle="Manage saved cards, default payment, receipts, and secure checkout behavior." icon="card-outline" c={c}>
          <PaymentCard brand="Visa" label="Personal card" number="**** 2481" status="Default" c={c} />
          <PaymentCard brand="Mastercard" label="Business card" number="**** 9144" status="Backup" c={c} />
          <ActionRow label="Add new card" meta="Tokenized through the payment gateway" icon="add-circle-outline" onPress={() => router.push(route('/saved-cards'))} c={c} />
          <ActionRow label="Payment security" meta="3DS, receipts, and refund preferences" icon="shield-checkmark-outline" onPress={() => setSection('privacy')} c={c} />
        </SectionCard>
      );
    }

    if (section === 'wallet') {
      return (
        <>
          <MotionSurface style={[styles.walletCard, { backgroundColor: c.dark, borderColor: c.primaryMid }]}>
            <Text style={styles.walletEyebrow}>Available wallet</Text>
            <Text style={styles.walletAmount}>QAR 280.00</Text>
            <Text style={styles.walletMeta}>Credits, refunds, and loyalty rewards are applied at checkout.</Text>
          </MotionSurface>
          <SectionCard title="Wallet actions" subtitle="Move money through credits, refunds, and rewards." icon="wallet-outline" c={c}>
            <ActionRow label="Top up wallet" meta="Add balance before a service" icon="add-outline" onPress={() => void success()} c={c} />
            <ActionRow label="View transactions" meta="Credits, refunds, and service payments" icon="receipt-outline" onPress={() => setSection('transactions')} c={c} />
            <ActionRow label="Coupons and rewards" meta="Apply eligible offers" icon="pricetag-outline" onPress={() => setSection('coupons')} c={c} />
          </SectionCard>
        </>
      );
    }

    if (section === 'documents') {
      return (
        <SectionCard title="Document vault" subtitle="Keep account and vehicle paperwork ready for bookings and claims." icon="folder-open-outline" c={c}>
          <DocumentRow title="Driving license" meta="Verified - expires Oct 2028" icon="id-card-outline" c={c} />
          <DocumentRow title="QID / Emirates ID" meta="Verified for invoices and vendor checks" icon="finger-print-outline" c={c} />
          <DocumentRow title="Insurance certificates" meta="2 active policies linked to vehicles" icon="shield-outline" c={c} />
          <DocumentRow title="Service invoices" meta="Downloadable records from completed bookings" icon="receipt-outline" c={c} />
          <PrimaryButton label="Upload document" icon="cloud-upload-outline" onPress={() => void success()} c={c} />
        </SectionCard>
      );
    }

    if (section === 'privacy') {
      return (
        <SectionCard title="Privacy and security" subtitle="Control sign-in, sharing, data exports, and account protection." icon="shield-checkmark-outline" c={c}>
          <ToggleRow label="Biometric unlock" meta="Prepare native Face ID / Touch ID support" value={biometricEnabled} onValueChange={setBiometricEnabled} c={c} />
          <ToggleRow label="Two-factor login" meta="Require an extra code for sensitive actions" value={twoFactorEnabled} onValueChange={setTwoFactorEnabled} c={c} />
          <ActionRow label="Export my data" meta="Profile, vehicles, bookings, invoices" icon="download-outline" onPress={() => void success()} c={c} />
          <ActionRow label="Delete account request" meta="Starts a secure deletion workflow" icon="trash-outline" onPress={() => Alert.alert('Delete account', 'A production build should require identity verification before this action.')} c={c} danger />
        </SectionCard>
      );
    }

    if (section === 'notifications') {
      const unread = notifications.filter((item) => !item.read).length;
      return (
        <SectionCard title="Notification center" subtitle="Choose what reaches the mobile app, email, and SMS." icon="notifications-outline" c={c}>
          <ToggleRow label="Push notifications" meta="Booking, quote, service, and payment updates" value={pushEnabled} onValueChange={setPushEnabled} c={c} />
          <ToggleRow label="Booking reminders" meta="Before pickup, drop-off, and service completion" value={bookingEnabled} onValueChange={setBookingEnabled} c={c} />
          <ToggleRow label="Promotions" meta="Offers from saved garages and QarWheels" value={promoEnabled} onValueChange={setPromoEnabled} c={c} />
          <ActionRow label={`Mark ${unread} unread as read`} meta="Clear notification badges" icon="checkmark-done-outline" onPress={() => { markNotificationsRead(); void success(); }} c={c} />
        </SectionCard>
      );
    }

    if (section === 'language') {
      return (
        <SectionCard title="Language and region" subtitle="Set the app language for the mobile experience." icon="language-outline" c={c}>
          {(['en', 'ar'] as const).map((lang) => (
            <ActionRow
              key={lang}
              label={lang === 'en' ? 'English' : 'Arabic'}
              meta={lang === 'en' ? 'Left-to-right interface' : 'Right-to-left interface preparation'}
              icon={language === lang ? 'checkmark-circle' : 'radio-button-off-outline'}
              onPress={() => { setLanguage(lang); void success(); }}
              c={c}
            />
          ))}
        </SectionCard>
      );
    }

    if (section === 'savedGarages') {
      const saved = favorites
        .map((garageId) => garages.find((garage) => garage.id === garageId))
        .filter((g): g is Garage => g !== undefined);
      return (
        <SectionCard title="Saved garages" subtitle="Fast access to trusted workshops and repeat bookings." icon="heart-outline" c={c}>
          {saved.length === 0 ? (
            <EmptyState title="No saved garages yet" body="Save a garage from discovery to keep it here." icon="heart-outline" c={c} />
          ) : (
            saved.map((garage) => (
              <ActionRow key={garage.id} label={garage.name} meta={`${garage.area} - ${garage.rating} rating - ${garage.startingPrice}`} icon="business-outline" onPress={() => router.push(route(`/garage/${garage.id}`))} c={c} />
            ))
          )}
          <PrimaryButton label="Explore garages" icon="search-outline" onPress={() => router.push(route('/services'))} c={c} />
        </SectionCard>
      );
    }

    if (section === 'bookingHistory') {
      return (
        <SectionCard title="Booking history" subtitle="Upcoming, completed, cancelled, and invoice-ready service records." icon="calendar-outline" c={c}>
          {bookings.slice(0, 5).map((booking) => (
            <ActionRow key={booking.id} label={booking.service || 'Service'} meta={`${booking.garage || '—'} - ${booking.status} - ${typeof booking.date === 'string' ? booking.date : ''}`} icon="calendar-outline" onPress={() => router.push(route(`/booking/${booking.id}`))} c={c} />
          ))}
          <PrimaryButton label="Open bookings tab" icon="albums-outline" onPress={() => router.push(route('/(tabs)/bookings'))} c={c} />
        </SectionCard>
      );
    }

    if (section === 'transactions' || section === 'invoices') {
      return (
        <SectionCard title={section === 'transactions' ? 'Transactions' : 'Invoices'} subtitle="Payment records connected to services, refunds, and wallet credits." icon="receipt-outline" c={c}>
          {[
            ['Oil service', 'QAR 180 - Paid by wallet - INV-2026-0184'],
            ['AC inspection', 'QAR 95 - Visa ****2481 - INV-2026-0162'],
            ['Refund credit', 'QAR 40 - Wallet adjustment - CR-2026-0041'],
          ].map(([title, meta]) => (
            <DocumentRow key={title} title={title} meta={meta} icon="receipt-outline" c={c} />
          ))}
          <PrimaryButton label="Download statement" icon="download-outline" onPress={() => void success()} c={c} />
        </SectionCard>
      );
    }

    if (section === 'subscriptions') {
      return (
        <SectionCard title="Subscriptions" subtitle="Care plans for regular service, inspections, and priority support." icon="repeat-outline" c={c}>
          <PlanCard title="QarWheels Care" price="QAR 49 / month" meta="Priority slots, annual inspection reminder, 2 free pickup credits." active c={c} />
          <PlanCard title="Family garage plan" price="QAR 89 / month" meta="Up to 4 vehicles, shared wallet, consolidated invoices." c={c} />
        </SectionCard>
      );
    }

    if (section === 'coupons') {
      return (
        <SectionCard title="Coupons and rewards" subtitle="Apply offers at checkout or save them for later." icon="pricetag-outline" c={c}>
          <CouponRow code="QARCARE20" meta="20% off AC service - expires Jun 30" c={c} />
          <CouponRow code="PICKUPFREE" meta="Free pickup on bookings above QAR 250" c={c} />
          <CouponRow code="LOYALTY80" meta="QAR 80 loyalty credit after 3 completed services" c={c} />
        </SectionCard>
      );
    }

    return (
      <SectionCard title="Vendor mode" subtitle="Register or switch into the vendor portal from the mobile account area." icon="business-outline" c={c}>
        <SummaryGrid
          c={c}
          items={[
            { label: 'KYC', value: 'Ready', icon: 'shield-checkmark-outline' },
            { label: 'Services', value: 'Setup', icon: 'construct-outline' },
            { label: 'Payouts', value: 'Bank', icon: 'cash-outline' },
            { label: 'Staff', value: 'Invite', icon: 'people-outline' },
          ]}
        />
        <ActionRow label="Register as vendor" meta="Create garage profile, KYC, services, and payout details" icon="business-outline" onPress={() => router.push(route('/(auth)/vendor-login'))} c={c} />
        <ActionRow label="Open vendor dashboard" meta="Bookings, calendar, analytics, inventory, and staff" icon="speedometer-outline" onPress={() => router.push(route('/vendor/dashboard'))} c={c} />
      </SectionCard>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <AnimatedPressable style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.navTitle, { color: c.text }]} numberOfLines={1}>{copy.title}</Text>
        <AnimatedPressable style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setSection('editProfile')} hitSlop={8}>
          <Ionicons name="create-outline" size={18} color={c.primary} />
        </AnimatedPressable>
      </View>

      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MotionScreen style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={[styles.eyebrow, { color: c.primary }]}>{copy.eyebrow}</Text>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{copy.title}</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]} numberOfLines={1}>{profile.email || 'Add an email to complete your profile'}</Text>
          </View>
          <View style={[styles.heroIcon, { backgroundColor: c.primaryLight }]}>
            <Ionicons name={copy.icon} size={20} color={c.primary} />
          </View>
        </MotionScreen>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {sectionTabs.map((tab) => {
            const active = section === tab.id || (section === 'editProfile' && tab.id === 'profile');
            return (
              <AnimatedPressable
                key={tab.id}
                style={[styles.tabChip, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
                onPress={() => { void tap(); setSection(tab.id); }}
              >
                <Ionicons name={tab.icon} size={15} color={active ? '#fff' : c.textSecondary} />
                <Text style={[styles.tabText, { color: active ? '#fff' : c.text }]}>{tab.label}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {renderSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ title, subtitle, icon, c, children }: { title: string; subtitle: string; icon: IconName; c: ReturnType<typeof useQarColors>; children: ReactNode }) {
  return (
    <MotionSurface style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: c.primaryLight }]}>
          <Ionicons name={icon} size={18} color={c.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: c.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </MotionSurface>
  );
}

function Field({ label, value, onChangeText, c, editable = true, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  c: ReturnType<typeof useQarColors>;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholderTextColor={c.muted}
        style={[styles.input, { color: c.text, backgroundColor: editable ? c.surfaceAlt : c.backgroundElevated, borderColor: c.border }]}
      />
    </View>
  );
}

function AddressBox({ label, value, selected, onSelect, onChangeText, c }: {
  label: string;
  value: string;
  selected: boolean;
  onSelect: () => void;
  onChangeText: (value: string) => void;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <View style={[styles.addressBox, { backgroundColor: c.surfaceAlt, borderColor: selected ? c.primary : c.border }]}>
      <View style={styles.addressTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: c.text }]}>{label}</Text>
          <Text style={[styles.rowMeta, { color: selected ? c.primary : c.textSecondary }]}>{selected ? 'Default pickup' : 'Saved address'}</Text>
        </View>
        <AnimatedPressable style={[styles.selectPill, { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.border }]} onPress={onSelect}>
          <Text style={[styles.selectText, { color: selected ? '#fff' : c.textSecondary }]}>{selected ? 'Selected' : 'Use'}</Text>
        </AnimatedPressable>
      </View>
      <TextInput value={value} onChangeText={onChangeText} style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]} placeholderTextColor={c.muted} />
    </View>
  );
}

function PaymentCard({ brand, label, number, status, c }: { brand: string; label: string; number: string; status: string; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={[styles.paymentCard, { backgroundColor: c.dark, borderColor: c.primaryMid }]}>
      <View style={styles.paymentTop}>
        <Text style={styles.paymentBrand}>{brand}</Text>
        <Text style={styles.paymentStatus}>{status}</Text>
      </View>
      <Text style={styles.paymentNumber}>{number}</Text>
      <Text style={styles.paymentLabel}>{label}</Text>
    </View>
  );
}

function ToggleRow({ label, meta, value, onValueChange, c }: {
  label: string;
  meta: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <View style={[styles.actionRow, { borderColor: c.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{label}</Text>
        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>{meta}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: c.surfaceAlt, true: c.primaryMid }} thumbColor={value ? c.primary : c.muted} />
    </View>
  );
}

function ActionRow({ label, meta, icon, onPress, c, danger }: {
  label: string;
  meta: string;
  icon: IconName;
  onPress: () => void;
  c: ReturnType<typeof useQarColors>;
  danger?: boolean;
}) {
  const color = danger ? c.danger : c.primary;
  return (
    <AnimatedPressable style={[styles.actionRow, { borderColor: c.border }]} onPress={() => { void tap(); onPress(); }}>
      <View style={[styles.actionIcon, { backgroundColor: danger ? c.dangerBg : c.primaryLight }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: danger ? c.danger : c.text }]}>{label}</Text>
        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.muted} />
    </AnimatedPressable>
  );
}

function DocumentRow({ title, meta, icon, c }: { title: string; meta: string; icon: IconName; c: ReturnType<typeof useQarColors> }) {
  return <ActionRow label={title} meta={meta} icon={icon} onPress={() => void success()} c={c} />;
}

function PrimaryButton({ label, icon, onPress, c, disabled }: {
  label: string;
  icon: IconName;
  onPress: () => void;
  c: ReturnType<typeof useQarColors>;
  disabled?: boolean;
}) {
  return (
    <AnimatedPressable style={[styles.primaryButton, { backgroundColor: disabled ? c.muted : c.primary }]} onPress={() => { if (!disabled) onPress(); }}>
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </AnimatedPressable>
  );
}

function SummaryGrid({ items, c }: {
  items: Array<{ label: string; value: string; icon: IconName }>;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <View style={styles.summaryGrid}>
      {items.map((item) => (
        <View key={item.label} style={[styles.summaryTile, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <Ionicons name={item.icon} size={17} color={c.primary} />
          <Text style={[styles.summaryValue, { color: c.text }]}>{item.value}</Text>
          <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ title, body, icon, c }: { title: string; body: string; icon: IconName; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={[styles.emptyState, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      <Ionicons name={icon} size={34} color={c.muted} />
      <Text style={[styles.emptyTitle, { color: c.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: c.textSecondary }]}>{body}</Text>
    </View>
  );
}

function PlanCard({ title, price, meta, active, c }: { title: string; price: string; meta: string; active?: boolean; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={[styles.planCard, { backgroundColor: active ? c.primaryLight : c.surfaceAlt, borderColor: active ? c.primaryMid : c.border }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{title}</Text>
        <Text style={[styles.planPrice, { color: c.primary }]}>{price}</Text>
        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>{meta}</Text>
      </View>
      <Ionicons name={active ? 'checkmark-circle' : 'add-circle-outline'} size={22} color={active ? c.success : c.primary} />
    </View>
  );
}

function CouponRow({ code, meta, c }: { code: string; meta: string; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={[styles.couponRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      <View style={[styles.couponCode, { backgroundColor: c.primaryLight }]}>
        <Text style={[styles.couponCodeText, { color: c.primary }]}>{code}</Text>
      </View>
      <Text style={[styles.rowMeta, { color: c.textSecondary, flex: 1 }]}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.page, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  navButton: { width: 42, height: 42, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { flex: 1, textAlign: 'center', ...typography.h4 },
  content: { padding: spacing.page, paddingBottom: 64, gap: 16 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.xl, borderWidth: 1, padding: 18, ...shadow.sm },
  avatar: { width: 58, height: 58, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...typography.overline },
  title: { ...typography.h2 },
  subtitle: { ...typography.bodySm },
  tabRow: { gap: 10, paddingRight: spacing.page },
  tabChip: { minHeight: 40, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  tabText: { ...typography.caption, fontWeight: '900' },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 14, ...shadow.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.h3 },
  cardSubtitle: { ...typography.bodySm },
  fieldWrap: { gap: 6 },
  fieldLabel: { ...typography.caption, fontWeight: '900' },
  input: { minHeight: 50, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, ...typography.body },
  primaryButton: { minHeight: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16, ...shadow.primary },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: radius.lg, padding: 14, minHeight: 70 },
  actionIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...typography.h4 },
  rowMeta: { ...typography.bodySm },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryTile: { width: '48.4%', minHeight: 104, borderRadius: radius.lg, borderWidth: 1, padding: 14, justifyContent: 'space-between' },
  summaryValue: { ...typography.h3 },
  summaryLabel: { ...typography.caption },
  addressBox: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 12 },
  addressTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectPill: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  selectText: { ...typography.caption, fontWeight: '900' },
  paymentCard: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 16 },
  paymentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentBrand: { color: '#fff', fontSize: 16, fontWeight: '900' },
  paymentStatus: { color: 'rgba(255,255,255,0.68)', ...typography.caption, fontWeight: '900' },
  paymentNumber: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1.1 },
  paymentLabel: { color: 'rgba(255,255,255,0.66)', ...typography.bodySm },
  walletCard: { borderRadius: radius.xl, borderWidth: 1, padding: 22, gap: 8, ...shadow.md },
  walletEyebrow: { color: 'rgba(255,255,255,0.58)', ...typography.overline },
  walletAmount: { color: '#fff', fontSize: 36, lineHeight: 42, fontWeight: '900' },
  walletMeta: { color: 'rgba(255,255,255,0.66)', ...typography.bodySm },
  emptyState: { alignItems: 'center', borderRadius: radius.xl, borderWidth: 1, padding: 22, gap: 8 },
  emptyTitle: { ...typography.h3 },
  emptyBody: { ...typography.bodySm, textAlign: 'center' },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: radius.xl, borderWidth: 1, padding: 16, minHeight: 92 },
  planPrice: { ...typography.h4 },
  couponRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  couponCode: { borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8 },
  couponCodeText: { ...typography.caption, fontWeight: '900' },
});
