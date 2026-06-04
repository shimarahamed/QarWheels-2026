import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { vendorReviews, vendorProfile, type VendorReview } from '@/lib/vendor-data';
import { useVendorTabBottom } from '@/components/VendorTabBar';

export default function ReviewsScreen() {
  const c = useQarColors();
  const vendorTabBottom = useVendorTabBottom();
  const [reviews, setReviews] = useState<VendorReview[]>(vendorReviews);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  function handleReply(reviewId: string) {
    if (!replyText.trim()) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, reply: replyText.trim() } : r)),
    );
    setReplyText('');
    setReplyingTo(null);
    Alert.alert('Reply sent', 'Your reply has been posted.');
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Reviews</Text>
        <Text style={[s.navCount, { color: c.muted }]}>{reviews.length} reviews</Text>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Rating overview */}
          <View style={[s.overviewCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.overviewLeft}>
              <Text style={[s.avgRating, { color: c.text }]}>{avg.toFixed(1)}</Text>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(avg) ? 'star' : 'star-outline'}
                    size={14}
                    color="#D4AF37"
                  />
                ))}
              </View>
              <Text style={[s.reviewCount, { color: c.muted }]}>{vendorProfile.totalReviews} total</Text>
            </View>
            <View style={s.overviewRight}>
              {dist.map(({ star, count }) => (
                <View key={star} style={s.distRow}>
                  <Text style={[s.distStar, { color: c.muted }]}>{star}★</Text>
                  <View style={[s.distBar, { backgroundColor: c.surfaceAlt }]}>
                    <View
                      style={[
                        s.distFill,
                        {
                          width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%',
                          backgroundColor: '#D4AF37',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[s.distCount, { color: c.muted }]}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Reviews list */}
          <View style={{ gap: 10 }}>
            {reviews.map((review) => (
              <View key={review.id} style={[s.reviewCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={s.reviewTop}>
                  <View style={[s.reviewerAvatar, { backgroundColor: c.primaryLight }]}>
                    <Text style={[s.reviewerInitial, { color: c.primary }]}>{review.customerName[0]}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.reviewerName, { color: c.text }]}>{review.customerName}</Text>
                    <Text style={[s.reviewService, { color: c.muted }]}>{review.service} · {review.date}</Text>
                  </View>
                  <View style={s.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={12}
                        color="#D4AF37"
                      />
                    ))}
                  </View>
                </View>

                <Text style={[s.reviewComment, { color: c.text }]}>{review.comment}</Text>

                {review.reply ? (
                  <View style={[s.replyBox, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Text style={[s.replyLabel, { color: c.primary }]}>Your reply</Text>
                    <Text style={[s.replyText, { color: c.textSecondary }]}>{review.reply}</Text>
                  </View>
                ) : (
                  replyingTo === review.id ? (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        style={[s.replyInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Write a reply..."
                        placeholderTextColor={c.muted}
                        multiline
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          style={[s.replySubmit, { backgroundColor: c.primary }]}
                          onPress={() => handleReply(review.id)}
                        >
                          <Text style={s.replySubmitText}>Post Reply</Text>
                        </Pressable>
                        <Pressable
                          style={[s.replyCancel, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                          onPress={() => { setReplyingTo(null); setReplyText(''); }}
                        >
                          <Text style={[s.replyCancelText, { color: c.muted }]}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={[s.replyBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                      onPress={() => setReplyingTo(review.id)}
                    >
                      <Ionicons name="chatbubble-outline" size={14} color={c.textSecondary} />
                      <Text style={[s.replyBtnText, { color: c.textSecondary }]}>Reply to review</Text>
                    </Pressable>
                  )
                )}
              </View>
            ))}
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
    paddingHorizontal: spacing.page, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { ...typography.h3 },
  navCount: { fontSize: 13, fontWeight: '600' },

  content: { padding: spacing.page, gap: spacing.gap },

  overviewCard: {
    flexDirection: 'row', borderRadius: radius.xl, borderWidth: 1,
    padding: 16, gap: 16, ...shadow.sm,
  },
  overviewLeft: { alignItems: 'center', gap: 4 },
  avgRating: { ...typography.display },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewCount: { fontSize: 11, fontWeight: '600' },
  overviewRight: { flex: 1, gap: 4 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distStar: { fontSize: 10, fontWeight: '700', width: 20 },
  distBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 3 },
  distCount: { fontSize: 10, fontWeight: '700', width: 16, textAlign: 'right' },

  reviewCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10, ...shadow.xs },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reviewerInitial: { fontSize: 14, fontWeight: '900' },
  reviewerName: { fontSize: 14, fontWeight: '700' },
  reviewService: { fontSize: 11, fontWeight: '500' },
  reviewComment: { fontSize: 13, lineHeight: 20, fontWeight: '400' },

  replyBox: { borderRadius: radius.lg, borderWidth: 1, padding: 10, gap: 4 },
  replyLabel: { fontSize: 11, fontWeight: '800' },
  replyText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  replyInput: {
    borderRadius: radius.lg, borderWidth: 1, padding: 10,
    fontSize: 13, minHeight: 70, textAlignVertical: 'top',
  },
  replySubmit: { flex: 1, height: 38, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  replySubmitText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  replyCancel: { flex: 1, height: 38, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  replyCancelText: { fontSize: 13, fontWeight: '700' },

  replyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg, borderWidth: 1, alignSelf: 'flex-start',
  },
  replyBtnText: { fontSize: 12, fontWeight: '700' },
});
