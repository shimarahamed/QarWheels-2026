import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { type VendorPromotion } from '@/lib/vendor-data';
import { useVendorTabBottom } from '@/components/VendorTabBar';

export default function PromotionsScreen() {
  const c = useQarColors();
  const vendorTabBottom = useVendorTabBottom();
  const promos = useQarWheelsStore((s) => s.vendorPromotions);
  const addPromo = useQarWheelsStore((s) => s.addVendorPromotion);
  const togglePromo = useQarWheelsStore((s) => s.toggleVendorPromotion);
  const archiveVendorPromotion = useQarWheelsStore((s) => s.archiveVendorPromotion);

  function handleCreatePromo() {
    const promo = addPromo();
    Alert.alert('Promotion created', `${promo.title} is active and ready to refine.`);
  }

  function archivePromo(id: string) {
    Alert.alert('Archive Promotion', 'Remove this promotion?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => archiveVendorPromotion(id),
      },
    ]);
  }

  const active = promos.filter((p) => p.active);
  const inactive = promos.filter((p) => !p.active);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Promotions</Text>
        <Pressable
          style={[s.addBtn, { backgroundColor: c.primary }]}
          onPress={handleCreatePromo}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16, paddingTop: 70 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Active', value: String(active.length), color: c.success },
              { label: 'Total Usage', value: String(promos.reduce((s, p) => s + p.usageCount, 0)), color: c.primary },
              { label: 'Inactive', value: String(inactive.length), color: c.muted },
            ].map((stat) => (
              <View key={stat.label} style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[s.statLabel, { color: c.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Active */}
          {active.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={[s.groupLabel, { color: c.muted }]}>ACTIVE PROMOTIONS</Text>
              {active.map((promo) => (
                <PromoCard key={promo.id} promo={promo} c={c} onToggle={togglePromo} onArchive={archivePromo} />
              ))}
            </View>
          )}

          {/* Inactive */}
          {inactive.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={[s.groupLabel, { color: c.muted }]}>INACTIVE</Text>
              {inactive.map((promo) => (
                <PromoCard key={promo.id} promo={promo} c={c} onToggle={togglePromo} onArchive={archivePromo} />
              ))}
            </View>
          )}
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

function PromoCard({
  promo, c, onToggle, onArchive,
}: {
  promo: VendorPromotion;
  c: ReturnType<typeof useQarColors>;
  onToggle: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const usagePct = promo.usageLimit > 0 ? (promo.usageCount / promo.usageLimit) * 100 : 0;

  return (
    <View style={[ps.card, { backgroundColor: c.surface, borderColor: promo.active ? c.primaryMid : c.border, opacity: promo.active ? 1 : 0.7 }]}>
      <View style={ps.cardTop}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[ps.title, { color: c.text }]}>{promo.title}</Text>
          <Text style={[ps.desc, { color: c.muted }]}>{promo.description}</Text>
          <View style={ps.metaRow}>
            <View style={[ps.discountTag, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
              <Text style={[ps.discountText, { color: c.primary }]}>{promo.discount}</Text>
            </View>
            <Text style={[ps.validity, { color: c.muted }]}>Valid: {promo.validFrom} – {promo.validUntil}</Text>
          </View>
        </View>
        <Switch
          value={promo.active}
          onValueChange={() => onToggle(promo.id)}
          trackColor={{ true: c.primary, false: c.surfaceAlt }}
          thumbColor="#fff"
        />
      </View>

      {/* Usage bar */}
      <View style={[ps.usageRow, { borderTopColor: c.border }]}>
        <Text style={[ps.usageLabel, { color: c.muted }]}>{promo.usageCount}/{promo.usageLimit} uses</Text>
        <View style={[ps.usageBar, { backgroundColor: c.surfaceAlt }]}>
          <View style={[ps.usageFill, { width: `${Math.min(100, usagePct)}%`, backgroundColor: c.primary }]} />
        </View>
        <Pressable onPress={() => onArchive(promo.id)}>
          <Ionicons name="archive-outline" size={16} color={c.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page, 
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navTitle: { ...typography.h3 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  content: { padding: spacing.page, gap: spacing.gap },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 4, ...shadow.xs,
  },
  statValue: { ...typography.h4 },
  statLabel: { fontSize: 12, fontWeight: '700' },

  groupLabel: { ...typography.overline, paddingHorizontal: 2 },
});

const ps = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  title: { fontSize: 14, fontWeight: '800', lineHeight: 20 },
  desc: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  discountText: { fontSize: 12, fontWeight: '800' },
  validity: { fontSize: 12, fontWeight: '500' },
  usageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  usageLabel: { fontSize: 12, fontWeight: '700', width: 80 },
  usageBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 3 },
});
