import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useAuthContext } from '@/lib/AuthContext';
import { auth, firestore } from '@/lib/firebase';
import { apiPost } from '@/lib/api';
import { signOutCompletely } from '@/lib/session';
import { success, tap } from '@/lib/haptics';
import { useTranslation } from '@/lib/i18n';
import { promptRestartForRTL } from '@/lib/i18n/restart';
import type { Garage } from '@/lib/marketplace';
import {
  useBranches,
  useCars,
  setDefaultCar,
  saveNotificationPreferences,
  type FirestoreCar,
  type NotificationPreferences,
} from '@/lib/firestoreOps';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import {
  useQarColors,
  useQarWheelStore,
  type SavedAddress,
  type VaultDocument,
  type VaultDocumentKind,
  type WalletTransaction,
} from '@/lib/store';
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
  | 'vendorMode'
  | 'systemSettings'
  | 'vehiclePreferences';

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
  systemSettings: { title: 'System settings', eyebrow: 'App', icon: 'settings-outline' },
  vehiclePreferences: { title: 'Vehicle & preferences', eyebrow: 'Garage', icon: 'car-sport-outline' },
};

const sectionTabs: Array<{ id: AccountSection; label: string; icon: IconName }> = [
  { id: 'profile', label: 'Profile', icon: 'person-outline' },
  { id: 'addresses', label: 'Address', icon: 'location-outline' },
  { id: 'paymentMethods', label: 'Pay', icon: 'card-outline' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
  { id: 'documents', label: 'Docs', icon: 'folder-outline' },
  { id: 'privacy', label: 'Notify & Security', icon: 'shield-outline' },
  { id: 'vehiclePreferences', label: 'Vehicle', icon: 'car-sport-outline' },
  { id: 'systemSettings', label: 'System', icon: 'settings-outline' },
];

function route(path: string) {
  return path as never;
}

function fromSettingsSection(section?: string): AccountSection {
  const normalized = (section ?? '').toLowerCase();
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
    'system-settings': 'systemSettings',
    'vehicle-preferences': 'vehiclePreferences',
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
  const bookings = useQarWheelStore((s) => s.bookings);
  const favorites = useQarWheelStore((s) => s.favoriteGarageIds);
  const { vendors: liveGarages, loading: loadingGarages, error: garagesError, refresh: refreshGarages } = useBranches();
  const { language, changeLanguage } = useTranslation();
  const notifications = useQarWheelStore((s) => s.notifications);
  const markNotificationsRead = useQarWheelStore((s) => s.markNotificationsRead);
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const toggleThemeMode = useQarWheelStore((s) => s.toggleThemeMode);
  const [section, setSection] = useState<AccountSection>(initialSection);
  const [saving, setSaving] = useState(false);
  const profileSavePending = useRef(false);
  const preferenceSavePending = useRef(false);
  const carSavePending = useRef(false);
  const [loadingProfile, setLoadingProfile] = useState(!!user);
  const [profileError, setProfileError] = useState(false);
  const [profileLoad, setProfileLoad] = useState(0);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profile, setProfile] = useState<AccountProfile>({
    name: 'QarWheel User',
    email: '',
    phone: '+974 ',
    country: 'Qatar',
    area: 'Doha',
  });

  // Notification preferences — genuinely persisted to users/{uid} (mirrors
  // the web app's UserProfile.notificationPreferences). Previously these
  // three toggles were plain component useState that reset on every app
  // restart; they're now loaded from and saved to Firestore.
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    bookingConfirmations: true,
    serviceReminders: true,
    promotionalOffers: false,
  });
  const [savingNotificationPrefs, setSavingNotificationPrefs] = useState(false);

  // Vehicles + default vehicle preference, for the Profile stat tiles and
  // the Vehicle & Preferences screen.
  const { cars, isLoading: isLoadingCars, error: carsError, refresh: refreshCars } = useCars(user?.uid);
  const [defaultCarId, setDefaultCarIdState] = useState<string | null>(null);
  const [savingDefaultCar, setSavingDefaultCar] = useState(false);

  useEffect(() => {
    setProfile({ name: user?.displayName ?? '', email: user?.email ?? '', phone: user?.phoneNumber ?? '', country: 'Qatar', area: '' });
    setNotificationPrefs({ bookingConfirmations: true, serviceReminders: true, promotionalOffers: false });
    setDefaultCarIdState(null);
    setProfileError(false);
    setLoadingProfile(!!user);
    if (!user) return;
    let cancelled = false;
    getDoc(doc(firestore, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data();
        setProfile({
          name: typeof data?.displayName === 'string' ? data.displayName : user.displayName ?? '',
          email: user.email ?? '',
          phone: typeof data?.phone === 'string' ? data.phone : user.phoneNumber ?? '',
          country: typeof data?.country === 'string' ? data.country : 'Qatar',
          area: typeof data?.area === 'string' ? data.area : '',
        });
        if (data?.notificationPreferences) {
          setNotificationPrefs({
            bookingConfirmations: data.notificationPreferences.bookingConfirmations ?? true,
            serviceReminders: data.notificationPreferences.serviceReminders ?? true,
            promotionalOffers: data.notificationPreferences.promotionalOffers ?? false,
          });
        }
        setDefaultCarIdState(typeof data?.defaultCarId === 'string' ? data.defaultCarId : null);
      })
      .catch(() => { if (!cancelled) setProfileError(true); })
      .finally(() => { if (!cancelled) setLoadingProfile(false); });
    return () => { cancelled = true; };
  }, [user?.uid, profileLoad]);

  async function updateNotificationPref(key: keyof NotificationPreferences, value: boolean) {
    if (!user || loadingProfile || profileError || preferenceSavePending.current) return;
    preferenceSavePending.current = true;
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    setSavingNotificationPrefs(true);
    try {
      await saveNotificationPreferences(user.uid, next);
    } catch {
      // Revert on failure so the switch doesn't lie about what's saved.
      setNotificationPrefs(notificationPrefs);
      Alert.alert('Could not save', 'Your notification preference could not be saved. Please try again.');
    } finally {
      preferenceSavePending.current = false;
      setSavingNotificationPrefs(false);
    }
  }

  async function chooseDefaultCar(carId: string) {
    if (!user || loadingProfile || profileError || carSavePending.current) return;
    carSavePending.current = true;
    setSavingDefaultCar(true);
    try {
      await setDefaultCar(user.uid, carId);
      setDefaultCarIdState(carId);
      void success();
    } catch {
      Alert.alert('Could not save', 'Your default vehicle could not be saved. Please try again.');
    } finally {
      carSavePending.current = false;
      setSavingDefaultCar(false);
    }
  }

  // ── Account domain, from the persisted store ──────────────────────────────
  const addresses = useQarWheelStore((s) => s.addresses);
  const addAddress = useQarWheelStore((s) => s.addAddress);
  const updateAddress = useQarWheelStore((s) => s.updateAddress);
  const removeAddress = useQarWheelStore((s) => s.removeAddress);
  const setDefaultAddress = useQarWheelStore((s) => s.setDefaultAddress);
  const walletBalance = useQarWheelStore((s) => s.walletBalance);
  const walletTransactions = useQarWheelStore((s) => s.walletTransactions);
  const invoices = useQarWheelStore((s) => s.invoices);
  const documents = useQarWheelStore((s) => s.documents);
  const addDocument = useQarWheelStore((s) => s.addDocument);
  const removeDocument = useQarWheelStore((s) => s.removeDocument);

  const [addressEditor, setAddressEditor] = useState<AddressDraft | null>(null);
  const [documentPicker, setDocumentPicker] = useState(false);
  const [addingDocument, setAddingDocument] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<VaultDocument | null>(null);
  const [documentError, setDocumentError] = useState(false);

  useEffect(() => setSection(initialSection), [initialSection]);

  // ── Document vault ────────────────────────────────────────────────────────

  async function handleUploadDocument(kind: { id: VaultDocumentKind; label: string }) {
    setDocumentPicker(false);
    setAddingDocument(true);
    let copiedFile: File | null = null;
    try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a document.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) throw new Error('No image selected');
    const subtype = asset.mimeType?.split('/')[1];
    if (!subtype || !['jpeg', 'png', 'heic', 'webp'].includes(subtype)) {
      throw new Error('Choose a JPEG, PNG, HEIC or WebP image.');
    }
    const source = new File(asset.uri);
    const size = asset.fileSize ?? source.size;
    if (!Number.isFinite(size) || size < 1 || size > 10 * 1024 * 1024) {
      throw new Error('Choose an image smaller than 10 MB.');
    }
    const file = new File(Paths.document, `qarwheel-vault-${randomUUID()}.${subtype}`);
    await source.copy(file);
    copiedFile = file;
    addDocument({
      kind: kind.id,
      title: kind.label,
      uri: file.uri,
      mimeType: asset.mimeType,
      sizeBytes: size,
    });
    copiedFile = null;
    void success();
    } catch (error) {
      try { if (copiedFile?.exists) copiedFile.delete(); } catch { /* a failed copy may not exist */ }
      Alert.alert('Could not add document', error instanceof Error ? error.message : 'Please try selecting the image again.');
    } finally {
      setAddingDocument(false);
    }
  }

  const documentKinds: Array<{ id: VaultDocumentKind; label: string }> = [
      { id: 'license', label: 'Driving licence' },
      { id: 'id', label: 'QID / national ID' },
      { id: 'insurance', label: 'Insurance certificate' },
      { id: 'registration', label: 'Vehicle registration' },
      { id: 'other', label: 'Other document' },
  ];

  function openDocument(document: VaultDocument) {
    setDocumentError(false);
    setDocumentPreview(document);
  }

  async function shareDocument(document: VaultDocument) {
    try {
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'File sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(document.uri, { dialogTitle: document.title, mimeType: document.mimeType });
    } catch {
      Alert.alert('Share failed', 'This document could not be shared.');
    }
  }

  function confirmDeleteDocument(document: VaultDocument) {
    Alert.alert('Delete document', `Remove "${document.title}" from your vault?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        try {
          if (document.uri.startsWith(new File(Paths.document, 'qarwheel-vault-').uri)) {
            const file = new File(document.uri);
            if (file.exists) file.delete();
          }
          removeDocument(document.id);
          void tap();
        } catch {
          Alert.alert('Could not delete document', 'Please try again.');
        }
      } },
    ]);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  function openAddressEditor(address?: SavedAddress) {
    setAddressEditor(
      address
        ? { id: address.id, label: address.label, line: address.line, area: address.area, instructions: address.instructions ?? '' }
        : { id: null, label: '', line: '', area: '', instructions: '' },
    );
  }

  function saveAddressDraft(draft: AddressDraft) {
    if (!draft.line.trim()) {
      Alert.alert('Address needed', 'Enter the street or building so a driver can find you.');
      return;
    }
    if (draft.id) {
      updateAddress(draft.id, {
        label: draft.label.trim() || 'Address',
        line: draft.line.trim(),
        area: draft.area.trim(),
        instructions: draft.instructions.trim() || undefined,
      });
    } else {
      addAddress({
        label: draft.label,
        line: draft.line,
        area: draft.area,
        instructions: draft.instructions,
      });
    }
    setAddressEditor(null);
    void success();
  }

  function confirmDeleteAddress(address: SavedAddress) {
    Alert.alert('Delete address', `Remove "${address.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeAddress(address.id); void tap(); } },
    ]);
  }

  // Soft-delete + anonymize, run server-side via the same route web uses
  // (src/app/api/account/delete) — GDPR Art. 17 + app-store account
  // deletion requirements (Apple 5.1.1(v), Play Data Safety). The Auth
  // account is genuinely deleted; bookings/invoices are retained but
  // anonymized. A business_owner account is rejected server-side with an
  // explanation, since a business can't be left ownerless by this flow.
  async function handleDeleteAccount() {
    if (deletingAccount) return;
    if (!user) {
      Alert.alert('Login required', 'Please sign in before deleting your account.');
      return;
    }
    setDeletingAccount(true);
    try {
      const token = await user.getIdToken();
      await apiPost('/api/account/delete', token, {});
      await signOutCompletely();
      Alert.alert('Account deleted', 'Your account and personal data have been removed.');
      router.replace('/(auth)/login' as never);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again or contact support.';
      Alert.alert('Could not delete account', message);
    } finally {
      setDeletingAccount(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your login and personal profile data. Bookings and invoices with garages are kept for financial records, with your name and contact details removed from them. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete My Account', style: 'destructive', onPress: () => { void handleDeleteAccount(); } },
      ],
    );
  }

  async function handleExportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: { ...profile, email: user?.email ?? profile.email },
      bookings: bookings.map((b) => ({
        id: b.id,
        service: b.service,
        garage: b.garage,
        vehicle: b.vehicle,
        status: b.status,
        date: b.date,
      })),
      savedGarages: favorites,
      vehicles: cars,
      invoices,
    };
    try {
      await Share.share({
        title: 'QarWheel data export',
        message: JSON.stringify(payload, null, 2),
      });
    } catch {
      Alert.alert('Export failed', 'The data export could not be shared. Please try again.');
    }
  }

  // ── Wallet ────────────────────────────────────────────────────────────────

  async function handleExportStatement() {
    if (walletTransactions.length === 0) {
      Alert.alert('Nothing to export', 'There are no transactions on your account yet.');
      return;
    }
    const lines = walletTransactions.map(
      (t) =>
        `${new Date(t.createdAt).toLocaleDateString()}  ${t.reference}  ${t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}  ${t.description}  (balance ${t.balanceAfter.toFixed(2)})`,
    );
    const statement = [
      'QarWheel device-only wallet history (not a payment statement)',
      `Generated ${new Date().toLocaleString()}`,
      `Previously displayed local balance: ${money(walletBalance)}`,
      '',
      ...lines,
    ].join('\n');

    try {
      await Share.share({ title: 'QarWheel statement', message: statement });
    } catch {
      Alert.alert('Export failed', 'The statement could not be shared. Please try again.');
    }
  }

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
    if (profileSavePending.current || loadingProfile || profileError) return;
    if (!user) {
      Alert.alert('Login required', 'Please sign in before saving profile details.');
      return;
    }
    if (!profile.name.trim()) {
      Alert.alert('Name needed', 'Enter your full name before saving.');
      return;
    }
    profileSavePending.current = true;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser ?? user, { displayName: profile.name.trim() || 'QarWheel User' });
      // email is intentionally NOT written here — it's not user-editable
      // (matches web's disabled email field) and firestore.rules rejects
      // any client attempt to change it on users/{uid}, whitelist-enforced.
      // Writing it would make every profile save fail outright.
      await setDoc(
        doc(firestore, 'users', user.uid),
        {
          displayName: profile.name.trim(),
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
      profileSavePending.current = false;
      setSaving(false);
    }
  }

  function renderSection() {
    if (section === 'profile' || section === 'editProfile') {
      if (section === 'editProfile') {
        return (
          <>
            <SectionCard title="Personal details" subtitle="Used for booking confirmation, invoices, pickup, and support." icon="person-outline" c={c}>
              <Field label="Full name" value={profile.name} onChangeText={(name) => setProfile((state) => ({ ...state, name }))} c={c} editable={!saving && !loadingProfile && !profileError} />
              <Field label="Email" value={profile.email} onChangeText={(email) => setProfile((state) => ({ ...state, email }))} c={c} editable={false} />
              <Field label="Phone" value={profile.phone} onChangeText={(phone) => setProfile((state) => ({ ...state, phone }))} c={c} editable={!saving && !loadingProfile && !profileError} keyboardType="phone-pad" />
              <Field label="Country" value={profile.country} onChangeText={(country) => setProfile((state) => ({ ...state, country }))} c={c} editable={!saving && !loadingProfile && !profileError} />
              <Field label="Preferred area" value={profile.area} onChangeText={(area) => setProfile((state) => ({ ...state, area }))} c={c} editable={!saving && !loadingProfile && !profileError} />
              <PrimaryButton label={saving ? 'Saving...' : 'Save profile'} icon="checkmark-circle-outline" onPress={saveProfile} c={c} disabled={saving || loadingProfile || profileError || !user} />
            </SectionCard>
            <ComingSoonCard
              title="Profile photo upload"
              description="Uploading a custom avatar isn't available yet — your initials are shown instead."
              icon="camera-outline"
              c={c}
            />
          </>
        );
      }

      // Real telemetry-shaped stats — vehicle count, fleet mileage, and
      // bookings, all sourced from useCars()/the bookings store. No
      // fabricated CAN-bus/safety-index/passport numbers.
      const totalMileage = cars.reduce((sum, car) => sum + (car.currentMileage || 0), 0);
      const upcomingCount = bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Pending').length;

      return (
        <>
          <SectionCard title="Your account" subtitle="Personal details, saved to your QarWheel profile." icon="person-outline" c={c}>
            <Field label="Full name" value={profile.name} onChangeText={() => {}} c={c} editable={false} />
            <Field label="Email" value={profile.email} onChangeText={() => {}} c={c} editable={false} />
            <Field label="Phone" value={profile.phone} onChangeText={() => {}} c={c} editable={false} />
            <Field label="Location" value={[profile.area, profile.country].filter(Boolean).join(', ')} onChangeText={() => {}} c={c} editable={false} />
            <PrimaryButton label="Edit profile" icon="create-outline" onPress={() => setSection('editProfile')} c={c} />
          </SectionCard>

          <SectionCard title="Your fleet at a glance" subtitle="Live counts from your saved vehicles and bookings." icon="speedometer-outline" c={c}>
            <SummaryGrid
              c={c}
              items={[
                { label: 'Vehicles', value: isLoadingCars || carsError ? '—' : String(cars.length), icon: 'car-sport-outline' },
                { label: 'Fleet mileage', value: isLoadingCars || carsError ? '—' : `${totalMileage.toLocaleString()} km`, icon: 'speedometer-outline' },
                { label: 'Upcoming', value: String(upcomingCount), icon: 'calendar-outline' },
                { label: 'Total bookings', value: String(bookings.length), icon: 'receipt-outline' },
              ]}
            />
            {carsError && <PrimaryButton label="Retry vehicles" icon="refresh-outline" onPress={refreshCars} c={c} />}
          </SectionCard>

          <SectionCard title="Manage" subtitle="Everything else about your account, in one place." icon="grid-outline" c={c}>
            <ActionRow label="Notifications & privacy" meta="Alerts, data export, delete account" icon="shield-checkmark-outline" onPress={() => setSection('privacy')} c={c} />
            <ActionRow label="Vehicle & preferences" meta={`${cars.length} vehicle${cars.length === 1 ? '' : 's'} saved`} icon="car-sport-outline" onPress={() => setSection('vehiclePreferences')} c={c} />
            <ActionRow label="System settings" meta="Theme, language, support" icon="settings-outline" onPress={() => setSection('systemSettings')} c={c} />
            <ActionRow label="Documents" meta={`${documents.length} in your vault`} icon="folder-open-outline" onPress={() => setSection('documents')} c={c} />
            <ActionRow label="Wallet" meta="Unavailable" icon="wallet-outline" onPress={() => setSection('wallet')} c={c} />
          </SectionCard>
        </>
      );
    }

    if (section === 'addresses') {
      return (
        <SectionCard title="Pickup and drop-off" subtitle="Save as many addresses as you need and label them however you like." icon="location-outline" c={c}>
          {addresses.length === 0 ? (
            <EmptyState
              title="No saved addresses"
              body="Add a pickup point so drivers know where to collect your car."
              icon="location-outline"
              c={c}
            />
          ) : (
            addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                c={c}
                onMakeDefault={() => { setDefaultAddress(address.id); void tap(); }}
                onEdit={() => openAddressEditor(address)}
                onDelete={() => confirmDeleteAddress(address)}
              />
            ))
          )}
          <PrimaryButton label="Add address" icon="add-circle-outline" onPress={() => openAddressEditor()} c={c} />
        </SectionCard>
      );
    }

    if (section === 'paymentMethods') {
      return (
        <SectionCard title="Cards and checkout" subtitle="Card payments are not available yet." icon="card-outline" c={c}>
          <Text style={[styles.rowMeta, { color: c.textSecondary }]}>Pay at the garage after your service.</Text>
        </SectionCard>
      );
    }

    if (section === 'wallet') {
      return (
        <SectionCard title="Wallet unavailable" subtitle="Wallet payments and top-ups are not enabled." icon="wallet-outline" c={c}>
          <Text style={[styles.rowMeta, { color: c.textSecondary }]}>Pay at the garage after your service.</Text>
          {walletTransactions.length > 0 ? (
            <ActionRow label="Earlier device-only history" meta="Not a verified payment record" icon="receipt-outline" onPress={() => setSection('transactions')} c={c} />
          ) : null}
        </SectionCard>
      );
    }

    if (section === 'documents') {
      const expiringSoon = documents.filter((d) => isExpiringSoon(d.expiresAt));

      return (
        <>
          {expiringSoon.length > 0 && (
            <MotionSurface style={[styles.noticeCard, { backgroundColor: c.warningBg, borderColor: c.warning + '55' }]}>
              <Ionicons name="alert-circle-outline" size={20} color={c.warning} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.rowTitle, { color: c.text }]}>
                  {expiringSoon.length === 1 ? '1 document expires soon' : `${expiringSoon.length} documents expire soon`}
                </Text>
                <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
                  {expiringSoon.map((d) => d.title).join(', ')}
                </Text>
              </View>
            </MotionSurface>
          )}

          <SectionCard
            title="Document vault"
            subtitle="Documents saved on this device, not uploaded to your account."
            icon="folder-open-outline"
            c={c}
          >
            {documents.length === 0 ? (
              <EmptyState
                title="Your vault is empty"
                body="Add your licence, insurance certificate or vehicle registration so they're on hand when a garage asks."
                icon="folder-open-outline"
                c={c}
              />
            ) : (
              documents.map((document) => (
                <VaultDocumentRow
                  key={document.id}
                  document={document}
                  c={c}
                  onOpen={() => openDocument(document)}
                  onShare={() => shareDocument(document)}
                  onDelete={() => confirmDeleteDocument(document)}
                />
              ))
            )}
            <PrimaryButton label={addingDocument ? 'Adding document...' : 'Add document'} icon="cloud-upload-outline" onPress={() => setDocumentPicker(true)} c={c} disabled={addingDocument} />
          </SectionCard>
        </>
      );
    }

    // Notifications & Privacy — combines the two former separate sections
    // under one screen (matching the mockup's grouping). Both the old
    // 'notifications' and 'privacy' AccountSection ids land here so every
    // existing route (/settings/notifications, /privacy-security) keeps
    // working.
    if (section === 'privacy' || section === 'notifications') {
      const unread = notifications.filter((item) => !item.read).length;
      return (
        <>
          <SectionCard title="Notification preferences" subtitle="Choose what reaches you about bookings and offers." icon="notifications-outline" c={c}>
            <ToggleRow
              label="Booking confirmations"
              meta="Alerts for new bookings and status changes"
              value={notificationPrefs.bookingConfirmations}
              onValueChange={(v) => updateNotificationPref('bookingConfirmations', v)}
              c={c}
              disabled={savingNotificationPrefs || loadingProfile || profileError || !user}
            />
            <ToggleRow
              label="Service reminders"
              meta="Before pickup, drop-off, and service completion"
              value={notificationPrefs.serviceReminders}
              onValueChange={(v) => updateNotificationPref('serviceReminders', v)}
              c={c}
              disabled={savingNotificationPrefs || loadingProfile || profileError || !user}
            />
            <ToggleRow
              label="Promotional offers"
              meta="News from saved garages and QarWheel"
              value={notificationPrefs.promotionalOffers}
              onValueChange={(v) => updateNotificationPref('promotionalOffers', v)}
              c={c}
              disabled={savingNotificationPrefs || loadingProfile || profileError || !user}
            />
            <ActionRow label={`Mark ${unread} unread as read`} meta="Clear notification badges" icon="checkmark-done-outline" onPress={() => { markNotificationsRead(); void success(); }} c={c} disabled={unread === 0} />
          </SectionCard>

          <SectionCard title="Privacy and account" subtitle="Data export, legal, and account deletion." icon="shield-checkmark-outline" c={c}>
            <ActionRow label="Export my data" meta="Profile, vehicles, bookings, invoices" icon="download-outline" onPress={handleExportData} disabled={loadingProfile || profileError || isLoadingCars || carsError} c={c} />
            <ActionRow label="Privacy Policy" meta="How we collect, use, and share your data" icon="document-text-outline" onPress={() => router.push('/privacy-policy' as never)} c={c} />
            <ActionRow label="Terms of Service" meta="The terms that govern using QarWheel" icon="document-text-outline" onPress={() => router.push('/terms-of-service' as never)} c={c} />
            <ActionRow label={deletingAccount ? 'Deleting…' : 'Delete my account'} meta="Permanently deletes your login and personal data" icon="trash-outline" onPress={confirmDeleteAccount} disabled={deletingAccount} c={c} danger />
          </SectionCard>

          <SectionCard title="Device security" subtitle="Unlock this account with your device credentials." icon="finger-print-outline" c={c}>
            <ActionRow label="Biometric unlock" meta="Face ID / fingerprint" icon="finger-print-outline" onPress={() => router.push('/(auth)/biometric?source=settings')} c={c} />
          </SectionCard>
        </>
      );
    }

    if (section === 'systemSettings') {
      return (
        <>
          <SectionCard title="Appearance" subtitle="Choose how QarWheel looks on this device." icon="color-palette-outline" c={c}>
            <View style={[styles.segmentGroup, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              {(['dark', 'light'] as const).map((mode) => {
                const active = themeMode === mode;
                return (
                  <AnimatedPressable
                    key={mode}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    style={[styles.segmentOption, active && { backgroundColor: c.primary }]}
                    onPress={() => { if (!active) { toggleThemeMode(); void tap(); } }}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#fff' : c.textSecondary }]}>
                      {mode === 'dark' ? 'Cockpit Dark' : 'Daylight'}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard title="Language and region" subtitle="Set the app language and see the display currency." icon="language-outline" c={c}>
            {(['en', 'ar'] as const).map((lang) => (
              <ActionRow
                key={lang}
                label={lang === 'en' ? 'English' : 'العربية'}
                meta={lang === 'en' ? 'Left-to-right interface' : 'Right-to-left interface'}
                icon={language === lang ? 'checkmark-circle' : 'radio-button-off-outline'}
                onPress={() => {
                  const needsRestart = changeLanguage(lang);
                  void success();
                  if (needsRestart) void promptRestartForRTL();
                }}
                c={c}
              />
            ))}
            <View style={[styles.actionRow, { borderColor: c.border }]}>
              <View style={[styles.actionIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="cash-outline" size={17} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.rowTitle, { color: c.text }]}>Currency</Text>
                <Text style={[styles.rowMeta, { color: c.textSecondary }]}>QarWheel operates in Qatar only</Text>
              </View>
              <Text style={[styles.rowTitle, { color: c.text }]}>QAR</Text>
            </View>
          </SectionCard>

          <SectionCard title="Support" subtitle="Reach the QarWheel team directly." icon="call-outline" c={c}>
            <ActionRow
              label="Contact support"
              meta="Unavailable in this release"
              icon="call-outline"
              onPress={() => router.push('/contact-us')}
              c={c}
            />
            <ActionRow label={deletingAccount ? 'Deleting…' : 'Delete my account'} meta="Permanently deletes your login and personal data" icon="trash-outline" onPress={confirmDeleteAccount} disabled={deletingAccount} c={c} danger />
          </SectionCard>

          <ComingSoonCard
            title="Hardware, sync & device management"
            description="Cloud sync status, offline cache controls, and authorized-device management are on the roadmap."
            icon="hardware-chip-outline"
            c={c}
          />
        </>
      );
    }

    if (section === 'vehiclePreferences') {
      return (
        <>
          <SectionCard title="Your vehicles" subtitle="Pick which car is used by default when booking a service." icon="car-sport-outline" c={c}>
            {isLoadingCars ? (
              <EmptyState title="Loading your vehicles…" body="This will just take a moment." icon="car-sport-outline" c={c} />
            ) : carsError ? (
              <PrimaryButton label="Retry vehicles" icon="refresh-outline" onPress={refreshCars} c={c} />
            ) : cars.length === 0 ? (
              <EmptyState
                title="No vehicles yet"
                body="Add a car to set a default vehicle and see it here."
                icon="car-sport-outline"
                c={c}
              />
            ) : (
              cars.map((carItem) => (
                <VehiclePreferenceRow
                  key={carItem.id}
                  car={carItem}
                  isDefault={defaultCarId === carItem.id}
                  onSetDefault={() => chooseDefaultCar(carItem.id)}
                  disabled={savingDefaultCar || loadingProfile || profileError || !user}
                  c={c}
                />
              ))
            )}
            <PrimaryButton label="Manage vehicles" icon="car-sport-outline" onPress={() => router.push(route('/(tabs)/cars'))} c={c} />
          </SectionCard>

          <ComingSoonCard
            title="OBD streaming, units & service radius"
            description="Live OBD-II stream mode, distance/pressure/temperature units, preferred service radius, and workshop certification filters are on the roadmap."
            icon="pulse-outline"
            c={c}
          />
        </>
      );
    }

    if (section === 'language') {
      return (
        <SectionCard title="Language and region" subtitle="Set the app language for the mobile experience." icon="language-outline" c={c}>
          {(['en', 'ar'] as const).map((lang) => (
            <ActionRow
              key={lang}
              label={lang === 'en' ? 'English' : 'العربية'}
              meta={lang === 'en' ? 'Left-to-right interface' : 'Right-to-left interface'}
              icon={language === lang ? 'checkmark-circle' : 'radio-button-off-outline'}
              onPress={() => {
                // Switching direction needs a bundle reload to take effect.
                const needsRestart = changeLanguage(lang);
                void success();
                if (needsRestart) void promptRestartForRTL();
              }}
              c={c}
            />
          ))}
        </SectionCard>
      );
    }

    if (section === 'savedGarages') {
      const saved = favorites
        .map((garageId) => liveGarages.find((garage) => garage.id === garageId))
        .filter((g): g is Garage => g !== undefined);
      return (
        <SectionCard title="Saved garages" subtitle="Fast access to trusted workshops and repeat bookings." icon="heart-outline" c={c}>
          {loadingGarages ? (
            <Text accessibilityLiveRegion="polite" style={{ color: c.text }}>Loading saved garages...</Text>
          ) : garagesError ? (
            <PrimaryButton label="Retry saved garages" icon="refresh-outline" onPress={() => void refreshGarages()} c={c} />
          ) : saved.length === 0 ? (
            <EmptyState title={favorites.length ? 'Saved garages unavailable' : 'No saved garages yet'} body={favorites.length ? 'Your saved garages are not currently listed.' : 'Save a garage from discovery to keep it here.'} icon="heart-outline" c={c} />
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

    if (section === 'transactions') {
      return (
        <SectionCard
          title="Transactions"
          subtitle="Device-only entries from earlier builds; not verified payments."
          icon="receipt-outline"
          c={c}
        >
          {walletTransactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              body="Wallet payments are not enabled."
              icon="receipt-outline"
              c={c}
            />
          ) : (
            <>
              {walletTransactions.map((txn) => <TransactionRow key={txn.id} txn={txn} c={c} />)}
              <PrimaryButton label="Export local history" icon="download-outline" onPress={handleExportStatement} c={c} />
            </>
          )}
        </SectionCard>
      );
    }

    if (section === 'invoices') {
      return (
        <SectionCard
          title="Invoices"
          subtitle="Invoices issued by garages for completed work."
          icon="document-text-outline"
          c={c}
        >
          <PrimaryButton label="View invoices" icon="document-text-outline" onPress={() => router.push(route('/invoices'))} c={c} />
        </SectionCard>
      );
    }

    if (section === 'subscriptions') {
      return (
        <SectionCard title="Subscriptions unavailable" subtitle="Care plans are not offered in this release." icon="repeat-outline" c={c}>
          <Text style={[styles.rowMeta, { color: c.textSecondary }]}>There is no subscription charge or active plan on your account.</Text>
        </SectionCard>
      );
    }

    if (section === 'coupons') {
      return (
        <SectionCard title="Coupons unavailable" subtitle="Discount codes are not offered in this release." icon="pricetag-outline" c={c}>
          <Text style={[styles.rowMeta, { color: c.textSecondary }]}>Confirm the final service price with the garage before paying there.</Text>
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
        <AnimatedPressable accessibilityLabel="Go back" style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => section !== initialSection ? setSection(initialSection) : router.canGoBack() ? router.back() : router.replace('/(tabs)/account')} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.navTitle, { color: c.text }]} numberOfLines={1}>{copy.title}</Text>
        <AnimatedPressable accessibilityLabel="Edit profile" style={[styles.navButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setSection('editProfile')} hitSlop={8}>
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
            const active =
              section === tab.id ||
              (section === 'editProfile' && tab.id === 'profile') ||
              (section === 'notifications' && tab.id === 'privacy');
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

        {loadingProfile && <Text accessibilityLiveRegion="polite" style={{ color: c.text }}>Loading account...</Text>}
        {profileError && <>
          <Text accessibilityRole="alert" style={{ color: c.danger }}>Could not load your account. Retry before changing saved details.</Text>
          <PrimaryButton label="Retry account" icon="refresh-outline" onPress={() => setProfileLoad((value) => value + 1)} c={c} />
        </>}
        {!user && <ActionRow label="Sign in" meta="Sign in to save account preferences" icon="log-in-outline" onPress={() => router.push('/(auth)/login')} c={c} />}
        {renderSection()}
      </ScrollView>

      <AddressEditorSheet
        draft={addressEditor}
        c={c}
        onChange={setAddressEditor}
        onCancel={() => setAddressEditor(null)}
        onSave={saveAddressDraft}
      />
      <Modal visible={documentPicker} transparent animationType="slide" onRequestClose={() => setDocumentPicker(false)}>
        <View style={styles.sheetBackdrop}>
          <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: c.surface }]}>
            <Text style={[styles.title, { color: c.text }]}>What are you adding?</Text>
            {documentKinds.map((kind) => <ActionRow key={kind.id} label={kind.label} meta="Select an image" icon={documentIcons[kind.id]} onPress={() => void handleUploadDocument(kind)} c={c} />)}
            <PrimaryButton label="Cancel" icon="close-outline" onPress={() => setDocumentPicker(false)} c={c} />
          </View>
        </View>
      </Modal>
      <Modal visible={!!documentPreview} animationType="slide" onRequestClose={() => setDocumentPreview(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
          <PrimaryButton label="Close document" icon="close-outline" onPress={() => setDocumentPreview(null)} c={c} />
          {documentError ? <Text accessibilityRole="alert" style={{ color: c.danger }}>This image is no longer available on this device. Add the document again.</Text> : documentPreview && (
            <Image source={{ uri: documentPreview.uri }} accessibilityLabel={documentPreview.title} resizeMode="contain" style={{ flex: 1 }} onError={() => setDocumentError(true)} />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/** Bottom sheet for creating or editing a labelled address. */
function AddressEditorSheet({ draft, c, onChange, onCancel, onSave }: {
  draft: AddressDraft | null;
  c: ReturnType<typeof useQarColors>;
  onChange: (draft: AddressDraft) => void;
  onCancel: () => void;
  onSave: (draft: AddressDraft) => void;
}) {
  if (!draft) return null;
  const editing = draft.id !== null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Dismiss" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.sheetGrabber, { backgroundColor: c.border }]} />
            <Text style={[styles.title, { color: c.text }]}>{editing ? 'Edit address' : 'Add address'}</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Label it however you think of it — Home, Villa 12, Mum's place.
            </Text>

            <SheetField
              label="Label"
              value={draft.label}
              placeholder="Home"
              onChangeText={(label) => onChange({ ...draft, label })}
              c={c}
            />
            <SheetField
              label="Street or building"
              value={draft.line}
              placeholder="Building 24, Al Sadd Street"
              onChangeText={(line) => onChange({ ...draft, line })}
              c={c}
            />
            <SheetField
              label="Area"
              value={draft.area}
              placeholder="Doha"
              onChangeText={(area) => onChange({ ...draft, area })}
              c={c}
            />
            <SheetField
              label="Notes for the driver (optional)"
              value={draft.instructions}
              placeholder="Gate code 4412, park by the blue door"
              onChangeText={(instructions) => onChange({ ...draft, instructions })}
              c={c}
            />

            <View style={styles.sheetActions}>
              <AnimatedPressable
                style={[styles.sheetCancel, { borderColor: c.border }]}
                onPress={onCancel}
              >
                <Text style={[styles.rowTitle, { color: c.textSecondary }]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.sheetSave, { backgroundColor: c.primary }]}
                onPress={() => onSave(draft)}
              >
                <Text style={styles.primaryButtonText}>{editing ? 'Save changes' : 'Add address'}</Text>
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function SheetField({ label, value, placeholder, onChangeText, c }: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
      />
    </View>
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
        accessibilityLabel={label}
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

function ToggleRow({ label, meta, value, onValueChange, c, disabled }: {
  label: string;
  meta: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  c: ReturnType<typeof useQarColors>;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.actionRow, { borderColor: c.border, opacity: disabled ? 0.6 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{label}</Text>
        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>{meta}</Text>
      </View>
      <Switch accessibilityLabel={label} accessibilityHint={meta} accessibilityState={{ disabled: !!disabled }} value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ false: c.surfaceAlt, true: c.primaryMid }} thumbColor={value ? c.primary : c.muted} />
    </View>
  );
}

/** One reusable placeholder for any mockup cluster with no real feature
 * behind it yet — a single honest card instead of one fake control per item. */
function ComingSoonCard({ title, description, icon, c }: {
  title: string;
  description: string;
  icon: IconName;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <MotionSurface style={[styles.comingSoonCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      <View style={[styles.actionIcon, { backgroundColor: c.surface }]}>
        <Ionicons name={icon} size={18} color={c.muted} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.comingSoonHeader}>
          <Text style={[styles.rowTitle, { color: c.text }]}>{title}</Text>
          <View style={[styles.defaultChip, { backgroundColor: c.surface }]}>
            <Text style={[styles.defaultChipText, { color: c.muted }]}>Coming soon</Text>
          </View>
        </View>
        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>{description}</Text>
      </View>
    </MotionSurface>
  );
}

/** A single vehicle row on the Vehicle & Preferences screen — real
 * make/model/year, mileage, and data-source badge, plus a default-vehicle
 * selector. */
function VehiclePreferenceRow({ car, isDefault, onSetDefault, c, disabled }: {
  car: FirestoreCar;
  isDefault: boolean;
  onSetDefault: () => void;
  disabled?: boolean;
  c: ReturnType<typeof useQarColors>;
}) {
  const sourceLabel = car.dataSource === 'obd' ? 'OBD connected' : car.dataSource === 'smartcar' ? 'Smartcar connected' : 'Manual entry';
  return (
    <View style={[styles.addressCard, { backgroundColor: c.surfaceAlt, borderColor: isDefault ? c.primary : c.border }]}>
      <View style={styles.addressHead}>
        <Ionicons name="car-sport" size={16} color={isDefault ? c.primary : c.muted} />
        <Text style={[styles.rowTitle, { color: c.text, flex: 1 }]} numberOfLines={1}>{car.year} {car.make} {car.model}</Text>
        {isDefault ? (
          <View style={[styles.defaultChip, { backgroundColor: c.primaryLight }]}>
            <Text style={[styles.defaultChipText, { color: c.primary }]}>Default</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
        {car.currentMileage.toLocaleString()} km · {sourceLabel}
      </Text>
      {!isDefault && (
        <View style={styles.addressActions}>
          <AnimatedPressable disabled={disabled} style={[styles.miniAction, { borderColor: c.border }]} onPress={onSetDefault} accessibilityLabel={`Make ${car.make} ${car.model} the default vehicle`}>
            <Ionicons name="star-outline" size={13} color={c.textSecondary} />
            <Text style={[styles.miniActionText, { color: c.textSecondary }]}>Set default</Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

function ActionRow({ label, meta, icon, onPress, c, danger, disabled }: {
  label: string;
  meta: string;
  icon: IconName;
  onPress: () => void;
  c: ReturnType<typeof useQarColors>;
  danger?: boolean;
  disabled?: boolean;
}) {
  const color = danger ? c.danger : c.primary;
  return (
    <AnimatedPressable
      style={[styles.actionRow, { borderColor: c.border }]}
      disabled={disabled}
      onPress={() => { void tap(); onPress(); }}
      // Screen readers announce the row as one control: title then detail.
      // The decorative icon and chevron are hidden so they aren't read out.
      accessibilityLabel={label}
      accessibilityHint={meta}
    >
      <View
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={[styles.actionIcon, { backgroundColor: danger ? c.dangerBg : c.primaryLight }]}
      >
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

// ─── Account domain rows ─────────────────────────────────────────────────────

type AddressDraft = {
  id: string | null;
  label: string;
  line: string;
  area: string;
  instructions: string;
};

/** QAR formatter with grouped thousands and two decimals. */
function money(amount: number) {
  return `QAR ${Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeDate(iso: string) {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** True when a document expires within 60 days — enough notice to renew. */
function isExpiringSoon(expiresAt?: string) {
  if (!expiresAt) return false;
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
  return days <= 60;
}

const documentIcons: Record<VaultDocumentKind, IconName> = {
  license: 'card-outline',
  id: 'finger-print-outline',
  insurance: 'shield-checkmark-outline',
  registration: 'document-text-outline',
  invoice: 'receipt-outline',
  other: 'document-attach-outline',
};

function AddressCard({ address, c, onMakeDefault, onEdit, onDelete }: {
  address: SavedAddress;
  c: ReturnType<typeof useQarColors>;
  onMakeDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.addressCard, { backgroundColor: c.surfaceAlt, borderColor: address.isDefault ? c.primary : c.border }]}>
      <View style={styles.addressHead}>
        <Ionicons name="location" size={16} color={address.isDefault ? c.primary : c.muted} />
        <Text style={[styles.rowTitle, { color: c.text, flex: 1 }]} numberOfLines={1}>{address.label}</Text>
        {address.isDefault ? (
          <View style={[styles.defaultChip, { backgroundColor: c.primaryLight }]}>
            <Text style={[styles.defaultChipText, { color: c.primary }]}>Default</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
        {[address.line, address.area].filter(Boolean).join(', ')}
      </Text>
      {address.instructions ? (
        <Text style={[styles.rowMeta, { color: c.muted, fontStyle: 'italic' }]}>{address.instructions}</Text>
      ) : null}

      <View style={styles.addressActions}>
        {!address.isDefault && (
          <AnimatedPressable style={[styles.miniAction, { borderColor: c.border }]} onPress={onMakeDefault} accessibilityLabel={`Make ${address.label} the default address`}>
            <Ionicons name="star-outline" size={13} color={c.textSecondary} />
            <Text style={[styles.miniActionText, { color: c.textSecondary }]}>Set default</Text>
          </AnimatedPressable>
        )}
        <AnimatedPressable style={[styles.miniAction, { borderColor: c.border }]} onPress={onEdit} accessibilityLabel={`Edit ${address.label}`}>
          <Ionicons name="create-outline" size={13} color={c.textSecondary} />
          <Text style={[styles.miniActionText, { color: c.textSecondary }]}>Edit</Text>
        </AnimatedPressable>
        <AnimatedPressable style={[styles.miniAction, { borderColor: c.border }]} onPress={onDelete} accessibilityLabel={`Delete ${address.label}`}>
          <Ionicons name="trash-outline" size={13} color={c.danger} />
          <Text style={[styles.miniActionText, { color: c.danger }]}>Delete</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function TransactionRow({ txn, c }: { txn: WalletTransaction; c: ReturnType<typeof useQarColors> }) {
  const credit = txn.amount > 0;
  const tone = credit ? c.success : c.text;
  const icon: IconName =
    txn.kind === 'topup' ? 'add-circle-outline'
    : txn.kind === 'refund' ? 'return-down-back-outline'
    : txn.kind === 'reward' ? 'gift-outline'
    : 'car-outline';

  return (
    <View style={[styles.txnRow, { borderColor: c.border }]}>
      <View style={[styles.actionIcon, { backgroundColor: credit ? c.successBg : c.surfaceAlt }]}>
        <Ionicons name={icon} size={16} color={credit ? c.success : c.textSecondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{txn.description}</Text>
        <Text style={[styles.rowMeta, { color: c.muted }]}>
          {relativeDate(txn.createdAt)} · {txn.reference}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={[styles.txnAmount, { color: tone }]}>
          {credit ? '+' : '−'}{money(txn.amount).replace('QAR ', '')}
        </Text>
        <Text style={[styles.txnBalance, { color: c.muted }]}>{money(txn.balanceAfter)}</Text>
      </View>
    </View>
  );
}

function VaultDocumentRow({ document, c, onOpen, onShare, onDelete }: {
  document: VaultDocument;
  c: ReturnType<typeof useQarColors>;
  onOpen: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const expiring = isExpiringSoon(document.expiresAt);
  return (
    <View style={[styles.addressCard, { backgroundColor: c.surfaceAlt, borderColor: expiring ? c.warning : c.border }]}>
      <AnimatedPressable
        style={styles.addressHead}
        onPress={() => { void tap(); onOpen(); }}
        accessibilityLabel={`Open ${document.title}`}
      >
        <View style={[styles.actionIcon, { backgroundColor: c.primaryLight }]}>
          <Ionicons name={documentIcons[document.kind]} size={16} color={c.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{document.title}</Text>
          <Text style={[styles.rowMeta, { color: expiring ? c.warning : c.muted }]} numberOfLines={1}>
            {document.expiresAt
              ? `Expires ${new Date(document.expiresAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}`
              : `Added ${relativeDate(document.addedAt)}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={c.muted} />
      </AnimatedPressable>

      <View style={styles.addressActions}>
        <AnimatedPressable style={[styles.miniAction, { borderColor: c.border }]} onPress={onShare} accessibilityLabel={`Share ${document.title}`}>
          <Ionicons name="share-outline" size={13} color={c.textSecondary} />
          <Text style={[styles.miniActionText, { color: c.textSecondary }]}>Share</Text>
        </AnimatedPressable>
        <AnimatedPressable style={[styles.miniAction, { borderColor: c.border }]} onPress={onDelete} accessibilityLabel={`Delete ${document.title}`}>
          <Ionicons name="trash-outline" size={13} color={c.danger} />
          <Text style={[styles.miniActionText, { color: c.danger }]}>Delete</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function DocumentRow({ title, meta, icon, c, onPress }: { title: string; meta: string; icon: IconName; c: ReturnType<typeof useQarColors>; onPress?: () => void }) {
  return (
    <ActionRow
      label={title}
      meta={meta}
      icon={icon}
      onPress={onPress ?? (() => Alert.alert(title, 'This document is not available on your account yet.'))}
      c={c}
    />
  );
}

function PrimaryButton({ label, icon, onPress, c, disabled }: {
  label: string;
  icon: IconName;
  onPress: () => void;
  c: ReturnType<typeof useQarColors>;
  disabled?: boolean;
}) {
  return (
    <AnimatedPressable accessibilityLabel={label} disabled={disabled} style={[styles.primaryButton, { backgroundColor: disabled ? c.muted : c.primary }]} onPress={onPress}>
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
  tabRow: { gap: 10, paddingEnd: spacing.page },
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
  summaryTile: { flexBasis: '48%', flexGrow: 1, minHeight: 104, borderRadius: radius.lg, borderWidth: 1, padding: 14, justifyContent: 'space-between' },
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
  comingSoonCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, borderRadius: radius.xl, borderWidth: 1, padding: 16 },
  comingSoonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  segmentGroup: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, padding: 4, gap: 4 },
  segmentOption: { flex: 1, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  segmentText: { ...typography.bodySm, fontWeight: '800' },

  // ── Account domain ────────────────────────────────────────────────────────
  noticeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, borderWidth: 1, padding: 14 },
  addressCard: { borderRadius: radius.lg, borderWidth: 1, padding: 14, gap: 8 },
  addressHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addressActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  miniAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  miniActionText: { ...typography.caption, fontWeight: '800' },
  defaultChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  defaultChipText: { ...typography.caption, fontWeight: '900' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Tabular figures keep the amount column aligned down the ledger.
  txnAmount: { ...typography.h4, fontVariant: ['tabular-nums'] },
  txnBalance: { ...typography.caption, fontVariant: ['tabular-nums'] },

  // ── Address editor sheet ──────────────────────────────────────────────────
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.page,
    paddingBottom: spacing.xxl,
    gap: 12,
  },
  sheetGrabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 4 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  sheetCancel: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSave: {
    flex: 2,
    minHeight: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.h3 },
  emptyBody: { ...typography.bodySm, textAlign: 'center' },
});
