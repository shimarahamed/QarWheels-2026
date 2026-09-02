import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: SW, height: SH } = Dimensions.get('window');

const MAROON       = '#8D1B3D';
const MAROON_MID   = '#5C1128';
const MAROON_BG    = '#130208';
const GOLD         = '#D4AF37';
const DIAMOND_CLR  = 'rgba(141,27,61,0.20)';
const SERRATE_CLR  = 'rgba(141,27,61,0.30)';
const GOLD_LINE    = 'rgba(212,175,55,0.22)';

// Pre-compute diamond lattice
const STEP = 54;
const LATTICE: { x: number; y: number }[] = [];
for (let r = -1; r <= Math.ceil(SH / STEP) + 1; r++) {
  for (let c = -1; c <= Math.ceil(SW / STEP) + 1; c++) {
    LATTICE.push({ x: c * STEP + (r % 2 === 0 ? 0 : STEP / 2), y: r * STEP });
  }
}

const N_TEETH = 14;
const TOOTH_H = SH / N_TEETH;

function DiamondLattice() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {LATTICE.map((pt, i) => (
        <View
          key={i}
          style={[ss.latticeDiamond, { left: pt.x - 13, top: pt.y - 13 }]}
        />
      ))}
    </View>
  );
}

// Qatar flag-style zigzag serration strip
function Serrations({ side }: { side: 'left' | 'right' }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: side === 'left' ? 0 : undefined,
        right: side === 'right' ? 0 : undefined,
        width: 40,
        flexDirection: 'column',
      }}
      pointerEvents="none"
    >
      {Array.from({ length: N_TEETH }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 0,
            height: 0,
            borderTopWidth: TOOTH_H / 2,
            borderBottomWidth: TOOTH_H / 2,
            borderLeftWidth: side === 'left' ? 40 : 0,
            borderRightWidth: side === 'right' ? 40 : 0,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: side === 'left' ? SERRATE_CLR : 'transparent',
            borderRightColor: side === 'right' ? SERRATE_CLR : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

// 8-pointed star medallion (two overlapping squares)
function StarMedallion() {
  return (
    <View style={ss.medallionWrap} pointerEvents="none">
      <View style={ss.medallionSq} />
      <View style={[ss.medallionSq, { transform: [{ rotate: '45deg' }] }]} />
      <View style={ss.medallionCircle} />
    </View>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 520, easing: Easing.out(Easing.ease) }),
          withTiming(0.6, { duration: 520, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520 }),
          withTiming(0.25, { duration: 520 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[ss.dot, aStyle]} />;
}

export default function SplashScreenRoute() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/language' as never);
    }, 2800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={ss.container}>
      {/* Background layers */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: MAROON_BG }]} />
      <View style={ss.gradTop} />

      {/* Geometric patterns */}
      <DiamondLattice />
      <Serrations side="left" />
      <Serrations side="right" />

      {/* Gold accent lines */}
      <View style={ss.goldTop} />
      <View style={ss.goldBottom} />

      {/* Background star medallion watermark */}
      <StarMedallion />

      {/* Corner diamonds */}
      <View style={[ss.cornerDiamond, { top: -30, left: SW * 0.18 }]} />
      <View style={[ss.cornerDiamond, { bottom: 60, right: SW * 0.15 }]} />

      {/* Center content */}
      <View style={ss.center}>
        <Animated.View
          entering={FadeIn.duration(700).delay(150)}
          style={ss.logoWrap}
        >
          <Text style={ss.logoGlyph} allowFontScaling={false}>Q</Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.duration(600).delay(350)} style={ss.brandName}>
          QarWheel
        </Animated.Text>

        <Animated.Text entering={FadeInDown.duration(600).delay(500)} style={ss.brandSub}>
          Your Car. Our Care.
        </Animated.Text>

        <Animated.Text entering={FadeInDown.duration(600).delay(680)} style={ss.arabicText}>
          منصة رعاية السيارات الموثوقة في قطر
        </Animated.Text>
      </View>

      {/* Bottom */}
      <Animated.View entering={FadeInUp.duration(700).delay(700)} style={ss.bottom}>
        <Text style={ss.caption}>Cars · Garages · Services · One hub</Text>
        <View style={ss.dotsRow}>
          <PulsingDot delay={0} />
          <PulsingDot delay={80} />
          <PulsingDot delay={120} />
        </View>
      </Animated.View>
    </View>
  );
}

const LOGO_SIZE = 92;

const ss = StyleSheet.create({
  container:      { flex: 1, backgroundColor: MAROON_BG },
  gradTop:        { position: 'absolute', top: 0, left: 0, right: 0, height: SH * 0.5, backgroundColor: MAROON_MID, opacity: 0.45 },
  goldTop:        { position: 'absolute', top: 58, left: 0, right: 0, height: 1, backgroundColor: GOLD_LINE },
  goldBottom:     { position: 'absolute', bottom: 90, left: 0, right: 0, height: 1, backgroundColor: GOLD_LINE },
  latticeDiamond: { position: 'absolute', width: 26, height: 26, borderWidth: 1, borderColor: DIAMOND_CLR, transform: [{ rotate: '45deg' }] },
  medallionWrap:  { position: 'absolute', top: SH * 0.1, alignSelf: 'center', width: 260, height: 260, alignItems: 'center', justifyContent: 'center', opacity: 0.05 },
  medallionSq:    { position: 'absolute', width: 220, height: 220, borderWidth: 2, borderColor: '#fff' },
  medallionCircle:{ position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: GOLD },
  cornerDiamond:  { position: 'absolute', width: 80, height: 80, borderWidth: 2, borderColor: MAROON, opacity: 0.30, transform: [{ rotate: '45deg' }] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 48,
  },
  logoGlyph: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 58,
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MAROON,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 16,
  },
  brandName: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  brandSub: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
    lineHeight: 22,
  },
  arabicText: {
    fontSize: 13,
    fontWeight: '400',
    color: GOLD,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.80,
  },
  bottom: {
    alignItems: 'center',
    paddingBottom: 56,
    gap: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dotsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dot:     { width: 9, height: 9, borderRadius: 4.5, backgroundColor: MAROON },
});
