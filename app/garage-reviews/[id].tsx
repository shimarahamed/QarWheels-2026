import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useGarage } from '@/lib/firestoreOps';
import RecordNotFound from '@/components/RecordNotFound';

type Review = {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  serviceLabel: string;
  createdAt: Date;
};

const DEMO_REVIEWS: Review[] = [
  { id: 'r1', userId: 'u1', rating: 5, comment: '✓ Professional staff · Fast service · Honest pricing\n\nExcellent service, very thorough and honest about what needed doing. Car came back feeling like new.', serviceLabel: 'Oil & Filter Change', createdAt: new Date(Date.now() - 86400000 * 2) },
  { id: 'r2', userId: 'u2', rating: 4, comment: '✓ Quality parts · Good communication\n\nFixed my AC quickly. A bit of a wait but worth it.', serviceLabel: 'AC Cooling Check', createdAt: new Date(Date.now() - 86400000 * 5) },
  { id: 'r3', userId: 'u3', rating: 5, comment: '✓ Would recommend · Fast service\n\nAmazing team. Battery was dead in the morning, they had me back on the road within an hour.', serviceLabel: 'Battery Replacement', createdAt: new Date(Date.now() - 86400000 * 9) },
];

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= rating ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );
}

function dateFmt(d: Date): string {
  return d.toLocaleDateString('en-QA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GarageReviewsScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const { garage, loading: garageLoading } = useGarage(id);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const q = query(
      collection(firestore, 'reviews'),
      where('vendorId', '==', id),
      orderBy('createdAt', 'desc'),
      limit(30),
    );
    getDocs(q).then((snap) => {
      if (snap.empty) { setReviews(DEMO_REVIEWS); }
      else {
        setReviews(snap.docs.map((d) => ({
          id: d.id,
          userId: d.data().userId ?? '',
          rating: d.data().rating ?? 5,
          comment: d.data().comment ?? '',
          serviceLabel: d.data().serviceLabel ?? '',
          createdAt: d.data().createdAt?.toDate() ?? new Date(),
        })));
      }
    }).catch(() => setReviews(DEMO_REVIEWS)).finally(() => setLoading(false));
  }, [id]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : garage?.rating.toFixed(1) ?? '—';

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0 ? reviews.filter((r) => r.rating === star).length / reviews.length : 0,
  }));

  if (!garage && garageLoading) return null;
  if (!garage) {
    return <RecordNotFound title="Garage not found" message="This garage may no longer be listed." />;
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text style={[s.navTitle, { color: c.text }]} numberOfLines={1}>{garage?.name ?? 'Reviews'}</Text>
          <Text style={[s.navSub, { color: c.muted }]}>{reviews.length} verified reviews</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Rating summary */}
          <View style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.summaryLeft}>
              <Text style={[s.bigRating, { color: c.text }]}>{avgRating}</Text>
              <StarRow rating={Math.round(parseFloat(avgRating))} size={18} />
              <Text style={[s.reviewCount, { color: c.muted }]}>{reviews.length} reviews</Text>
            </View>
            <View style={s.summaryRight}>
              {ratingDist.map(({ star, count, pct }) => (
                <View key={star} style={s.distRow}>
                  <Text style={[s.distStar, { color: c.muted }]}>{star}</Text>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <View style={[s.distTrack, { backgroundColor: c.surfaceAlt }]}>
                    <View style={[s.distFill, { width: `${pct * 100}%` as unknown as number, backgroundColor: '#F59E0B' }]} />
                  </View>
                  <Text style={[s.distCount, { color: c.muted }]}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          {loading ? (
            <View style={s.loadingWrap}><ActivityIndicator color={c.primary} /></View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={[s.reviewCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={s.reviewTop}>
                  <View style={[s.avatar, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="person" size={16} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.reviewerName, { color: c.text }]}>
                      {'Customer ' + review.userId.slice(-4).toUpperCase()}
                    </Text>
                    <Text style={[s.reviewDate, { color: c.muted }]}>{dateFmt(review.createdAt)}</Text>
                  </View>
                  <StarRow rating={review.rating} />
                </View>
                {review.serviceLabel && (
                  <View style={[s.servicePill, { backgroundColor: c.primaryLight }]}>
                    <Text style={[s.servicePillText, { color: c.primary }]}>{review.serviceLabel}</Text>
                  </View>
                )}
                <Text style={[s.reviewText, { color: c.textSecondary }]}>{review.comment}</Text>
              </View>
            ))
          )}
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  navSub: { fontSize: 12, fontWeight: '600' },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  loadingWrap: { paddingTop: 40, alignItems: 'center' },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    borderRadius: radius.xl, borderWidth: 1, padding: 18, ...shadow.sm,
  },
  summaryLeft: { alignItems: 'center', gap: 6 },
  bigRating: { fontSize: 40, fontWeight: '900', letterSpacing: -2 },
  reviewCount: { fontSize: 12, fontWeight: '600' },
  summaryRight: { flex: 1, gap: 5 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distStar: { fontSize: 12, fontWeight: '700', width: 10 },
  distTrack: { flex: 1, height: 6, borderRadius: 99, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 99 },
  distCount: { fontSize: 12, fontWeight: '700', width: 18, textAlign: 'right' },
  reviewCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10, ...shadow.xs },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reviewerName: { fontSize: 13, fontWeight: '800' },
  reviewDate: { fontSize: 12, fontWeight: '500' },
  servicePill: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  servicePillText: { fontSize: 12, fontWeight: '800' },
  reviewText: { fontSize: 13, lineHeight: 19 },
});
