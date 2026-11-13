import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorState from '@/components/ErrorState';
import { BranchSwitcher } from '@/components/vendor/BranchSwitcher';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import { MotionScreen } from '@/lib/motion';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { radius, spacing, typography } from '@/lib/theme';
import { aggregateVendorReviews, INSIGHT_LIMITS, useVendorInsights } from '@/lib/vendor-insights';
import type { InsightScope } from '@/lib/vendor-insights';
import { saveVendorReviewReply } from '@/lib/vendor-review-reply';

function ReviewReply({ scope, reviewId, initial, onSaved }: {
  scope: InsightScope; reviewId: string; initial: string; onSaved: () => void;
}) {
  const c = useQarColors();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const save = async () => {
    if (submitting.current || !text.trim()) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await saveVendorReviewReply(scope, reviewId, text);
      if (active.current) { setEditing(false); onSaved(); }
    } catch {
      if (active.current) setError('Reply was not saved. Check your connection and try again.');
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  };
  if (!editing) return <Pressable accessibilityRole="button" accessibilityLabel={initial ? 'Edit reply' : 'Reply'} onPress={() => { setText(initial); setEditing(true); }} style={s.replyButton}>
    <Ionicons name="chatbubble-outline" size={18} color={c.primary} />
    <Text style={{ color: c.primary }}>{initial ? 'Edit reply' : 'Reply'}</Text>
  </Pressable>;
  return <View style={{ gap: 8 }}>
    <TextInput accessibilityLabel="Review reply" multiline maxLength={1000} editable={!busy}
      value={text} onChangeText={setText} placeholder="Write a reply..." placeholderTextColor={c.textSecondary}
      style={[s.replyInput, { color: c.text, borderColor: c.border }]} />
    {!!error && <Text accessibilityRole="alert" style={{ color: c.text }}>{error}</Text>}
    <View style={s.stars}>
      <Pressable accessibilityRole="button" accessibilityLabel="Save reply" accessibilityState={{ disabled: busy || !text.trim(), busy }}
        disabled={busy || !text.trim()} onPress={() => void save()} style={s.replyButton}>
        {busy ? <ActivityIndicator color={c.primary} /> : <Ionicons name="send-outline" size={18} color={c.primary} />}
        <Text style={{ color: c.primary }}>{busy ? 'Saving...' : 'Save reply'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => setEditing(false)} style={s.replyButton}>
        <Text style={{ color: c.textSecondary }}>Cancel</Text>
      </Pressable>
    </View>
  </View>;
}

export default function ReviewsScreen() {
  const c = useQarColors();
  const vendorTabBottom = useVendorTabBottom();
  const insights = useVendorInsights('reviews');
  const summary = insights.status === 'ready' && insights.scope ? aggregateVendorReviews(insights.records, insights.scope) : null;
  const reviews = summary?.reviews ?? [];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Reviews</Text>
        <BranchSwitcher />
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh reviews" onPress={insights.retry}
          disabled={insights.status === 'loading'} style={s.iconButton}>
          <Ionicons name="refresh" size={22} color={c.primary} />
        </Pressable>
      </View>
      <FlatList data={reviews} keyExtractor={(review) => review.id} initialNumToRender={10}
        contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]}
        refreshControl={<RefreshControl refreshing={insights.status === 'loading'} onRefresh={insights.retry} tintColor={c.primary} />}
        ListHeaderComponent={<MotionScreen style={s.header}>
          {insights.status === 'loading' && <ActivityIndicator accessibilityLabel="Loading reviews" color={c.primary} />}
          {insights.status === 'error' && <ErrorState onRetry={insights.retry} />}
          {insights.status === 'blocked' && <Text style={[s.notice, { color: c.textSecondary }]}>{insights.message}</Text>}
          {summary && <>
            {insights.limited && <Text style={[s.notice, { color: c.textSecondary }]}>
              More than {INSIGHT_LIMITS.reviews} reviews exist. Showing a limited set, not necessarily the latest. Ratings below cover only loaded reviews.
            </Text>}
            {summary.excludedRecords > 0 && <Text style={[s.notice, { color: c.textSecondary }]}>
              {summary.excludedRecords} reviews with invalid ratings excluded from this list and summary.
            </Text>}
            {reviews.length > 0 ? <>
              <View style={[s.overview, { borderColor: c.border }]}>
                <View style={s.overviewLeft}>
                  <Text accessibilityLabel={`Average rating ${summary.averageRating?.toFixed(1)} out of 5`} style={[s.average, { color: c.text }]}>
                    {summary.averageRating?.toFixed(1)}
                  </Text>
                  <Text style={[s.caption, { color: c.textSecondary }]}>{reviews.length} {insights.limited ? 'loaded reviews' : 'reviews'}</Text>
                </View>
                <View style={s.distribution}>
                  {summary.distribution.map(({ star, count }) => <View key={star} style={s.distributionRow}
                    accessible accessibilityLabel={`${star} stars: ${count} reviews`}>
                    <Text style={[s.caption, { color: c.textSecondary }]}>{star}</Text>
                    <Ionicons name="star" size={12} color="#D4AF37" />
                    <View style={[s.track, { backgroundColor: c.surfaceAlt }]}>
                      <View style={[s.fill, { width: `${count / reviews.length * 100}%` }]} />
                    </View>
                    <Text style={[s.distCount, { color: c.textSecondary }]}>{count}</Text>
                  </View>)}
                </View>
              </View>
            </> : <View style={s.empty}>
              <Ionicons name="star-outline" size={32} color={c.muted} />
              <Text style={[s.sectionTitle, { color: c.text }]}>{summary.excludedRecords ? 'No usable reviews' : 'No reviews yet'}</Text>
            </View>}
          </>}
        </MotionScreen>}
        renderItem={({ item: review }) => <View style={[s.reviewCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={s.reviewTop}>
            <View style={[s.avatar, { backgroundColor: c.primaryLight }]}>
              <Text style={[s.initial, { color: c.primary }]}>{review.customerName[0]}</Text>
            </View>
            <View style={s.reviewer}>
              <Text style={[s.reviewerName, { color: c.text }]}>{review.customerName}</Text>
              {review.service ? <Text style={[s.caption, { color: c.textSecondary }]}>{review.service}</Text> : null}
              <Text style={[s.caption, { color: c.textSecondary }]}>
                {review.date ? review.date.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Qatar' }) : 'Date unavailable'}
              </Text>
            </View>
          </View>
          <View style={s.stars} accessible accessibilityLabel={`${review.rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={15} color="#D4AF37" />)}
          </View>
          {review.comment ? <Text style={[s.comment, { color: c.text }]}>{review.comment}</Text> : null}
          {review.vendorReply && <View style={[s.reply, { borderLeftColor: c.primary }]}>
            <Text style={[s.replyLabel, { color: c.primary }]}>Your reply</Text>
            <Text style={[s.comment, { color: c.textSecondary }]}>{review.vendorReply}</Text>
          </View>}
          {insights.scope && <ReviewReply key={JSON.stringify([insights.scope, review.id])}
            scope={insights.scope} reviewId={review.id} initial={review.vendorReply ?? ''} onSaved={insights.retry} />}
        </View>}
      />
      <VendorTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: spacing.page, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  navTitle: { ...typography.h3, flexGrow: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.page },
  header: { marginBottom: 16 },
  notice: { fontSize: 14, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { ...typography.h4 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  overview: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  overviewLeft: { gap: 4 },
  average: { fontSize: 32, fontWeight: '800' },
  distribution: { flex: 1, minWidth: 140, gap: 6 },
  distributionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#D4AF37' },
  distCount: { fontSize: 12, minWidth: 24, textAlign: 'right' },
  reviewCard: { borderRadius: radius.sm, borderWidth: 1, padding: 14, gap: 10, marginBottom: 12 },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 14, fontWeight: '800' },
  reviewer: { flex: 1, gap: 3 },
  reviewerName: { fontSize: 14, fontWeight: '700' },
  stars: { flexDirection: 'row', gap: 3 },
  comment: { fontSize: 14, lineHeight: 21 },
  reply: { borderLeftWidth: 2, paddingLeft: 12, gap: 4 },
  replyLabel: { fontSize: 12, fontWeight: '700' },
  replyButton: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  replyInput: { minHeight: 88, borderWidth: 1, borderRadius: 6, padding: 12, fontSize: 14, textAlignVertical: 'top' },
});
