import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import AnimatedPressable from '@/components/AnimatedPressable';
import { tap } from '@/lib/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

// "Cockpit Precision" hero — a deliberate one-off in the same spirit as
// splash.tsx: fixed dark cockpit surfaces rather than the light/dark-adaptive
// `useQarColors()` tokens the rest of the (auth) flow reads live...
const OBSIDIAN = '#101418';
const SURFACE_LOWEST = '#0B0E13';
const SURFACE_LOW = '#191C20';
const SURFACE = '#1D2024';
const SURFACE_HIGH = '#272A2F';
const SURFACE_BRIGHT = '#36393E';
const HAIRLINE = 'rgba(255, 255, 255, 0.08)';
const SCARLET = '#E31E24';
const SCARLET_SOFT = 'rgba(227, 30, 36, 0.10)';
const GOLD = '#E9C349';
const TEXT_PRIMARY = '#E0E2E8';
const TEXT_MUTED = '#E7BDB8';
const TEXT_FAINT = 'rgba(224, 226, 232, 0.55)';

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida/AEtjO1Vibxoq1LnU8WPf3TEWftikpJb3Wj5mNJHR6niYjBK4XF43BLfw30g_foTW6TOGUTHZlrk7nnRb5J28CNXXfhU_GMXXbF2D_t6xe_zMDkPsCksfTdOmselAeUy1dh-EhGsSj5t-DgxYCkF83bcP-j8wMkaRgD9PzfVr9mLAdyjbHG0XkvnLhSRIWtImE_J7MrLnoAh6mf5f73KVRn6BB-g_W_PV5GIFmV16NEnChqt6i6NUbP_1pUw';

type ValueRow = { title: string; body: string; icon: IconName; chip: string; chipColor: string };

const VALUES: ValueRow[] = [
  { title: 'Predictive Diagnostics', body: 'Early failure detection across 1,400+ ECU parameters', icon: 'pulse-outline', chip: 'AI Pulse 99.8%', chipColor: GOLD },
  { title: 'Verified Bay Network', body: 'Direct dispatch to certified OEM EV and ICE specialists', icon: 'construct-outline', chip: 'Tier-1 Master Guild', chipColor: TEXT_FAINT },
  { title: 'Immutable Passport', body: 'Cryptographically signed provenance for maximum resale value', icon: 'finger-print-outline', chip: 'Zero-Knowledge Proof', chipColor: SCARLET },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [fleetCount, setFleetCount] = useState(482914);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (Math.random() > 0.6) {
        setFleetCount((n) => n + Math.floor(Math.random() * 3) + 1);
      }
    }, 3200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.content}>
        {/* Top brand + live status */}
        <Animated.View entering={FadeIn.duration(500)} style={s.topRow}>
          <View style={s.brandRow}>
            <View style={s.brandBadge}>
              <Ionicons name="speedometer-outline" size={17} color={SCARLET} />
            </View>
            <View>
              <Text style={s.brandName} allowFontScaling={false}>
                QAR<Text style={{ color: SCARLET }}>WHEEL</Text>
              </Text>
              <Text style={s.brandTag}>OS v4.12 TELEMETRY</Text>
            </View>
          </View>
          <View style={s.pingPill}>
            <View style={s.pingDotWrap}>
              <View style={s.pingDot} />
            </View>
            <Text style={s.pingLabel}>CAN-BUS ACTIVE</Text>
          </View>
        </Animated.View>

        {/* Hero image stage */}
        <Animated.View entering={FadeIn.duration(600).delay(80)} style={s.hero}>
          <Image source={{ uri: HERO_IMAGE }} style={s.heroImage} resizeMode="cover" />
          <View pointerEvents="none" style={[s.heroScrim, { opacity: 0.35 }]} />
          <View pointerEvents="none" style={[s.heroScrim, { opacity: 0.55, top: '55%' }]} />

          <BlurView intensity={40} tint="dark" style={[s.hudChip, s.hudTopLeft]}>
            <Ionicons name="flash" size={11} color={GOLD} />
            <Text style={s.hudText}>98.4% CELL HEALTH</Text>
          </BlurView>
          <BlurView intensity={40} tint="dark" style={[s.hudChip, s.hudTopRight]}>
            <Ionicons name="shield-checkmark" size={11} color={SCARLET} />
            <Text style={s.hudText}>ECU SYNCED</Text>
          </BlurView>

          <BlurView intensity={50} tint="dark" style={s.hudBar}>
            <View style={s.hudBarLeft}>
              <Ionicons name="navigate-circle-outline" size={16} color={SCARLET} />
              <Text style={s.hudBarLabel}>Precision Telematics</Text>
            </View>
            <View style={s.hudBarRight}>
              <Text style={s.hudBarNode}>NODE</Text>
              <Text style={s.hudBarNodeValue}>#QW-9902</Text>
            </View>
          </BlurView>
        </Animated.View>

        {/* Primary messaging */}
        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={s.messageBlock}>
          <View style={s.eyebrowRow}>
            <View style={s.eyebrowBar} />
            <Text style={s.eyebrow}>UNIFIED DRIVER COCKPIT</Text>
          </View>
          <Text style={s.title}>The operating system for modern automotive care.</Text>
          <Text style={s.subtitle}>
            Real-time AI telemetry, certified workshop dispatch, and a verified vehicle history in one unified cockpit.
          </Text>
        </Animated.View>

        {/* Value grid */}
        <View style={s.values}>
          {VALUES.map((v, i) => (
            <Animated.View key={v.title} entering={FadeInDown.duration(450).delay(260 + i * 80)} style={s.valueRow}>
              <View style={s.valueIcon}>
                <Ionicons name={v.icon} size={19} color={SCARLET} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.valueTop}>
                  <Text style={s.valueTitle} numberOfLines={1}>{v.title}</Text>
                  <Text style={[s.valueChip, { color: v.chipColor }]} numberOfLines={1}>{v.chip}</Text>
                </View>
                <Text style={s.valueBody} numberOfLines={1}>{v.body}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Live fleet counter */}
        <Animated.View entering={FadeInDown.duration(450).delay(500)} style={s.counterRow}>
          <View style={s.counterLeft}>
            <Ionicons name="radio-outline" size={15} color={TEXT_FAINT} />
            <Text style={s.counterLabel}>Global fleet monitored:</Text>
          </View>
          <View style={s.counterRight}>
            <Text style={s.counterValue} allowFontScaling={false}>{fleetCount.toLocaleString()}</Text>
            <Text style={s.counterUnit}>VEHICLES</Text>
          </View>
        </Animated.View>
      </View>

      {/* CTAs */}
      <Animated.View entering={FadeInUp.duration(500).delay(420)} style={s.footer}>
        <AnimatedPressable
          style={s.primaryButton}
          onPress={() => { void tap(); router.push('/(auth)/role' as never); }}
          scaleValue={0.985}
          accessibilityRole="button"
          accessibilityLabel="Get started, create account"
        >
          <Text style={s.primaryLabel}>Get started / Create account</Text>
          <Ionicons name="arrow-forward" size={17} color="#fff" />
        </AnimatedPressable>

        <AnimatedPressable
          style={s.secondaryButton}
          onPress={() => { void tap(); router.push('/(auth)/login' as never); }}
          scaleValue={0.985}
          accessibilityRole="button"
          accessibilityLabel="Sign in to cockpit"
        >
          <Ionicons name="log-in-outline" size={17} color={TEXT_FAINT} />
          <Text style={s.secondaryLabel}>Sign in to cockpit</Text>
        </AnimatedPressable>

        <Text style={s.legal}>By continuing, you agree to QarWheel's Terms & Privacy Policy.</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: OBSIDIAN },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: 1 },
  brandTag: { fontSize: 9, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1.4, marginTop: 2 },
  pingPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SURFACE_LOW, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pingDotWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  pingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SCARLET },
  pingLabel: { fontSize: 9, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 0.8 },
  hero: { width: '100%', height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: SURFACE_LOWEST, marginTop: 6, marginBottom: 18 },
  heroImage: { width: '100%', height: '100%' },
  heroScrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: SURFACE_LOWEST },
  hudChip: { position: 'absolute', top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, overflow: 'hidden' },
  hudTopLeft: { left: 10 },
  hudTopRight: { right: 10 },
  hudText: { fontSize: 9, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: 0.6 },
  hudBar: { position: 'absolute', left: 10, right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, overflow: 'hidden' },
  hudBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hudBarLabel: { fontSize: 12.5, fontWeight: '700', color: TEXT_PRIMARY },
  hudBarRight: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  hudBarNode: { fontSize: 9, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },
  hudBarNodeValue: { fontSize: 12, fontWeight: '700', color: SCARLET },
  messageBlock: { gap: 8, marginBottom: 18 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowBar: { width: 22, height: 3, borderRadius: 2, backgroundColor: SCARLET },
  eyebrow: { fontSize: 10.5, fontWeight: '700', color: SCARLET, letterSpacing: 2 },
  title: { fontSize: 27, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.6, lineHeight: 33 },
  subtitle: { fontSize: 14.5, fontWeight: '400', color: TEXT_MUTED, lineHeight: 22 },
  values: { gap: 8, marginBottom: 16 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SURFACE, borderRadius: 14, padding: 12 },
  valueIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  valueTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  valueTitle: { fontSize: 13.5, fontWeight: '700', color: TEXT_PRIMARY, flexShrink: 1 },
  valueChip: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2, flexShrink: 0 },
  valueBody: { fontSize: 11.5, fontWeight: '400', color: TEXT_FAINT, marginTop: 2 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: SURFACE_LOW, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  counterLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  counterLabel: { fontSize: 12.5, fontWeight: '500', color: TEXT_FAINT },
  counterRight: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  counterValue: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.3 },
  counterUnit: { fontSize: 9.5, fontWeight: '700', color: SCARLET, letterSpacing: 0.8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 10 },
  primaryButton: { height: 52, borderRadius: 16, backgroundColor: SCARLET, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: SCARLET, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
  primaryLabel: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryButton: { height: 52, borderRadius: 16, backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryLabel: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '800' },
  legal: { fontSize: 10.5, color: TEXT_FAINT, textAlign: 'center', lineHeight: 15, paddingTop: 4, opacity: 0.85 },
});
