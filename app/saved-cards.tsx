import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';

type SavedCard = {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'mada' | string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  isDefault: boolean;
};

const DEMO_CARDS: SavedCard[] = [
  { id: 'card_001', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2027, holderName: 'Mohammed Al-Rashid', isDefault: true },
  { id: 'card_002', brand: 'mastercard', last4: '5555', expMonth: 6, expYear: 2026, holderName: 'Mohammed Al-Rashid', isDefault: false },
];

const BRAND_ICONS: Record<string, { icon: string; color: string }> = {
  visa:       { icon: 'card',   color: '#1A1F71' },
  mastercard: { icon: 'card',   color: '#EB001B' },
  amex:       { icon: 'card',   color: '#007BC1' },
  mada:       { icon: 'card',   color: '#0B5E35' },
};

function CardBrand({ brand }: { brand: string }) {
  const meta = BRAND_ICONS[brand] ?? { icon: 'card-outline', color: '#6B7280' };
  return <Ionicons name={meta.icon as never} size={22} color={meta.color} />;
}

function expFmt(m: number, y: number) {
  return `${String(m).padStart(2, '0')}/${String(y).slice(-2)}`;
}

export default function SavedCardsScreen() {
  const c = useQarColors();
  const router = useRouter();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid ?? 'demo';
    fetch(`${BACKEND_URL}/api/payment/cards`, {
      headers: { 'x-user-id': uid },
      signal: AbortSignal.timeout(8000),
    })
      .then((r) => r.json())
      .then((data: SavedCard[]) => setCards(data))
      .catch(() => setCards(DEMO_CARDS))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(cardId: string) {
    Alert.alert('Remove card', 'Remove this saved card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setDeleting(cardId);
          try {
            await fetch(`${BACKEND_URL}/api/payment/cards/${cardId}`, {
              method: 'DELETE',
              signal: AbortSignal.timeout(8000),
            });
            setCards((prev) => prev.filter((c) => c.id !== cardId));
          } catch {
            setCards((prev) => prev.filter((c) => c.id !== cardId));
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  }

  async function handleSetDefault(cardId: string) {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === cardId })));
    try {
      await fetch(`${BACKEND_URL}/api/payment/cards/${cardId}/default`, {
        method: 'PATCH',
        signal: AbortSignal.timeout(8000),
      });
    } catch { /* optimistic — already updated locally */ }
  }

  const isExpired = (m: number, y: number) => {
    const now = new Date();
    return y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Saved cards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {loading ? (
            <View style={s.loadingWrap}><ActivityIndicator color={c.primary} /></View>
          ) : cards.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="card-outline" size={40} color={c.muted} />
              </View>
              <Text style={[s.emptyTitle, { color: c.text }]}>No saved cards</Text>
              <Text style={[s.emptySub, { color: c.muted }]}>
                Cards you pay with are saved here for faster checkout.
              </Text>
            </View>
          ) : (
            <>
              {cards.map((card) => {
                const expired = isExpired(card.expMonth, card.expYear);
                return (
                  <View
                    key={card.id}
                    style={[s.cardRow, {
                      backgroundColor: c.surface,
                      borderColor: card.isDefault ? c.primary : c.border,
                      borderWidth: card.isDefault ? 1.5 : 1,
                      opacity: expired ? 0.55 : 1,
                    }]}
                  >
                    <View style={[s.brandIcon, { backgroundColor: c.surfaceAlt }]}>
                      <CardBrand brand={card.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.cardTop}>
                        <Text style={[s.cardNumber, { color: c.text }]}>
                          {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• {card.last4}
                        </Text>
                        {card.isDefault && (
                          <View style={[s.defaultBadge, { backgroundColor: c.primaryLight }]}>
                            <Text style={[s.defaultText, { color: c.primary }]}>Default</Text>
                          </View>
                        )}
                        {expired && (
                          <View style={[s.defaultBadge, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[s.defaultText, { color: c.danger }]}>Expired</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.cardMeta, { color: c.muted }]}>{card.holderName} · Exp {expFmt(card.expMonth, card.expYear)}</Text>
                    </View>
                    <View style={s.actions}>
                      {!card.isDefault && !expired && (
                        <Pressable style={[s.actionBtn, { borderColor: c.border }]} onPress={() => handleSetDefault(card.id)} hitSlop={4}>
                          <Text style={[s.actionBtnText, { color: c.textSecondary }]}>Set default</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={[s.actionBtn, { borderColor: c.border }]}
                        onPress={() => handleDelete(card.id)}
                        hitSlop={4}
                        disabled={deleting === card.id}
                      >
                        {deleting === card.id
                          ? <ActivityIndicator size="small" color={c.danger} />
                          : <Ionicons name="trash-outline" size={14} color={c.danger} />
                        }
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Add new card */}
          <Pressable
            style={[s.addCard, { borderColor: c.primary, backgroundColor: c.primaryLight }]}
            onPress={() => router.push('/payment-method/new' as never)}
          >
            <Ionicons name="add-circle" size={20} color={c.primary} />
            <Text style={[s.addCardText, { color: c.primary }]}>Add new card</Text>
          </Pressable>

          {/* Security note */}
          <View style={[s.securityNote, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={c.success} />
            <Text style={[s.securityText, { color: c.muted }]}>
              Card details are tokenised via Tap Payments and never stored on QarWheels servers.
            </Text>
          </View>
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', gap: 14, paddingTop: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...typography.h3 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, padding: 14, ...shadow.xs,
  },
  brandIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardNumber: { fontSize: 15, fontWeight: '800' },
  defaultBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  defaultText: { fontSize: 10, fontWeight: '800' },
  cardMeta: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { height: 30, paddingHorizontal: 8, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  addCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: radius.xl, borderWidth: 1.5, borderStyle: 'dashed',
  },
  addCardText: { fontSize: 14, fontWeight: '900' },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  securityText: { fontSize: 11, lineHeight: 16, flex: 1 },
});
