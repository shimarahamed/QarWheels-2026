import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { type VendorPromotion } from '@/lib/vendor-data';
import { useVendorTabBottom } from '@/components/VendorTabBar';
import { useAuthContext } from '@/lib/AuthContext';
import { canAccess } from '@/lib/permissions';

export default function PromotionsScreen() {
  const c = useQarColors();
  const { role, claimsLoading } = useAuthContext();
  const canWrite = !claimsLoading && !!role && role !== 'customer' && role !== 'master_admin' && canAccess(role, 'promotions', 'write');
  const vendorTabBottom = useVendorTabBottom();
  const promos = useQarWheelStore((s) => s.vendorPromotions);
  const addPromo = useQarWheelStore((s) => s.addVendorPromotion);
  const togglePromo = useQarWheelStore((s) => s.toggleVendorPromotion);
  const archiveVendorPromotion = useQarWheelStore((s) => s.archiveVendorPromotion);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', discountValue: '', validFrom: '', validUntil: '', usageLimit: '', serviceCategory: '' });
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [error, setError] = useState('');
  const submitted = useRef(false);

  function handleCreatePromo() {
    if (!canWrite) return;
    if (submitted.current) return;
    if (!draft.title.trim() || !draft.serviceCategory.trim()) { setError('Enter a title and service category.'); return; }
    const discountValue = Number(draft.discountValue);
    if (!/^\d+(\.\d{1,2})?$/.test(draft.discountValue.trim()) || !Number.isFinite(discountValue) || discountValue <= 0 || discountValue > (discountType === 'percent' ? 100 : 10000000)) {
      setError(discountType === 'percent' ? 'Enter a discount greater than 0 and no more than 100%.' : 'Enter a discount greater than 0 and no more than 10,000,000 QAR.'); return;
    }
    const dates = [draft.validFrom.trim(), draft.validUntil.trim()];
    if (!dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date) || dates[1] < dates[0]) {
      setError('Enter valid dates as YYYY-MM-DD, with the end on or after the start.'); return;
    }
    const usageLimit = Number(draft.usageLimit);
    if (!/^\d+$/.test(draft.usageLimit.trim()) || !Number.isSafeInteger(usageLimit) || usageLimit <= 0) {
      setError('Enter a whole-number usage limit greater than zero.'); return;
    }
    submitted.current = true;
    try {
      addPromo({ title: draft.title.trim(), description: draft.description.trim(), serviceCategory: draft.serviceCategory.trim(),
        discountType, discountValue, discount: discountType === 'percent' ? `${discountValue}% off` : `QAR ${discountValue} off`,
        validFrom: dates[0], validUntil: dates[1], usageLimit, usageCount: 0, active: false });
      setDraft({ title: '', description: '', discountValue: '', validFrom: '', validUntil: '', usageLimit: '', serviceCategory: '' });
      setShowAdd(false); setError('');
    } catch { submitted.current = false; setError('Draft was not added. Your entries are still here; please try again.'); }
  }

  function handleToggle(id: string) {
    if (!canWrite) return;
    try { togglePromo(id); setError(''); }
    catch { setError('Draft status was not changed. Please try again.'); }
  }

  function archivePromo(id: string) {
    if (!canWrite) return;
    Alert.alert('Archive Promotion', 'Remove this device-local draft? No published promotion will change.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          if (!canWrite) return;
          try { archiveVendorPromotion(id); setError(''); }
          catch { setError('Draft was not removed. Please try again.'); }
        },
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
        {canWrite && <Pressable
          style={[s.addBtn, { backgroundColor: c.primary }]}
          accessibilityRole="button" accessibilityLabel={showAdd ? 'Cancel promotion draft' : 'New promotion draft'} accessibilityState={{ expanded: showAdd }}
          onPress={() => { submitted.current = false; setError(''); setShowAdd(!showAdd); }}
        >
          <Ionicons name={showAdd ? 'close' : 'add'} size={18} color="#fff" />
          <Text style={s.addBtnText}>{showAdd ? 'Cancel' : 'New'}</Text>
        </Pressable>}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {!canWrite ? <Text accessibilityRole="alert" style={{ color: c.muted }}>{claimsLoading ? 'Checking promotion access...' : 'Promotions are unavailable for your role.'}</Text> : <>
          <Text style={{ color: c.muted, marginBottom: 12 }}>Device-local promotion drafts. Not published or redeemable by customers. Status and usage below are local only.</Text>
          {!!error && <Text accessibilityRole="alert" style={{ color: c.danger, marginBottom: 12 }}>{error}</Text>}
          {showAdd && <View style={{ gap: 10, marginBottom: 16 }}>
            <Text style={[s.statValue, { color: c.text }]}>New promotion draft</Text>
            {([
              ['title', 'Promotion title'], ['description', 'Description (optional)'], ['serviceCategory', 'Service category'],
              ['discountValue', 'Discount value'], ['validFrom', 'Start date (YYYY-MM-DD)'], ['validUntil', 'End date (YYYY-MM-DD)'], ['usageLimit', 'Usage limit'],
            ] as const).map(([key, label]) => <View key={key} style={{ gap: 4 }}>
              <Text style={{ color: c.textSecondary }}>{label}</Text>
              <TextInput accessibilityLabel={label} value={draft[key]} maxLength={key === 'description' ? 1000 : 200}
                keyboardType={key === 'discountValue' ? 'decimal-pad' : key === 'usageLimit' ? 'number-pad' : 'default'}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
                style={[s.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
            </View>)}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['percent', 'fixed'] as const).map((type) => <Pressable key={type} accessibilityRole="radio"
                accessibilityLabel={type === 'percent' ? 'Percentage discount' : 'Fixed QAR discount'} accessibilityState={{ checked: discountType === type }}
                onPress={() => setDiscountType(type)} style={[s.formButton, { flex: 1, backgroundColor: discountType === type ? c.primaryLight : c.surface }]}>
                <Text style={{ color: c.text }}>{type === 'percent' ? '%' : 'QAR'}</Text>
              </Pressable>)}
            </View>
            <Pressable accessibilityRole="button" onPress={handleCreatePromo} style={[s.formButton, { backgroundColor: c.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Add promotion draft</Text>
            </Pressable>
          </View>}
          {promos.length === 0 && <Text style={{ color: c.muted, marginBottom: 12 }}>No promotion drafts</Text>}
          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Active drafts', value: String(active.length), color: c.success },
              { label: 'Local usage', value: String(promos.reduce((s, p) => s + p.usageCount, 0)), color: c.primary },
              { label: 'Inactive drafts', value: String(inactive.length), color: c.muted },
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
              <Text style={[s.groupLabel, { color: c.muted }]}>ACTIVE DRAFTS</Text>
              {active.map((promo) => (
                <PromoCard key={promo.id} promo={promo} c={c} onToggle={handleToggle} onArchive={archivePromo} />
              ))}
            </View>
          )}

          {/* Inactive */}
          {inactive.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={[s.groupLabel, { color: c.muted }]}>INACTIVE DRAFTS</Text>
              {inactive.map((promo) => (
                <PromoCard key={promo.id} promo={promo} c={c} onToggle={handleToggle} onArchive={archivePromo} />
              ))}
            </View>
          )}
          </>}
        </MotionScreen>
      </ScrollView>
      </KeyboardAvoidingView>
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
            <Text style={[ps.validity, { color: c.muted }]}>Draft dates: {promo.validFrom} – {promo.validUntil}</Text>
          </View>
        </View>
        <Switch
          accessibilityLabel={`Draft status of ${promo.title}`} accessibilityState={{ checked: promo.active }}
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
        <Pressable accessibilityRole="button" accessibilityLabel={`Archive ${promo.title}`}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => onArchive(promo.id)}>
          <Ionicons name="archive-outline" size={16} color={c.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
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
    minHeight: 44,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  content: { padding: spacing.page, gap: spacing.gap },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  formButton: { minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexGrow: 1, flexBasis: 100, borderRadius: radius.lg, borderWidth: 1, padding: 12,
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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
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
