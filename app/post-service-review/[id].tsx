import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Keyboard, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { saveReview } from '@/lib/firestoreOps';
import { useAuthContext } from '@/lib/AuthContext';

const ASPECTS = [
  { id: 'quality', label: 'Service quality' },
  { id: 'time', label: 'On-time delivery' },
  { id: 'comms', label: 'Communication' },
  { id: 'price', label: 'Value for money' },
];

const TAGS = [
  'Professional staff', 'Fast service', 'Great value',
  'Clean workspace', 'Honest pricing', 'Would recommend',
  'Good communication', 'Quality parts',
];

export default function PostServiceReviewScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthContext();
  const booking = useQarWheelsStore((s) => s.bookings.find((b) => b.id === id));

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!booking) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="alert-circle-outline" size={40} color={c.muted} />
          <Text style={[{ color: c.muted, fontSize: 15, fontWeight: '600' }]}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayRating = hovered || rating;

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function handleSubmit() {
    if (!booking) return;
    if (rating === 0) {
      Alert.alert('Rating required', 'Please give at least an overall star rating.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      const fullComment = [
        selectedTags.length ? `✓ ${selectedTags.join(' · ')}` : '',
        comment.trim(),
      ].filter(Boolean).join('\n\n');

      await saveReview({
        bookingId: booking.id,
        vendorId: booking.garageId ?? booking.garage,
        userId: user?.uid ?? 'anonymous',
        rating,
        comment: fullComment,
        serviceLabel: booking.service,
        garageName: booking.garage,
      });

      Alert.alert(
        'Review submitted!',
        `Thank you for rating ${booking.garage}. Your feedback helps other drivers.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert(
        'Submission failed',
        e instanceof Error ? e.message : 'Could not save your review. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Rate Your Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MotionScreen>
          {/* Garage summary */}
          <View style={[s.garageCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[s.garageIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="storefront-outline" size={24} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[s.garageName, { color: c.text }]}>{booking.garage}</Text>
              <Text style={[s.garageService, { color: c.textSecondary }]}>{booking.service}</Text>
              <Text style={[s.garageVehicle, { color: c.muted }]}>{booking.vehicle || '—'} · {typeof booking.date === 'string' ? booking.date : ''}</Text>
            </View>
          </View>

          {/* Overall star rating */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Overall rating</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  onPressIn={() => setHovered(star)}
                  onPressOut={() => setHovered(0)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={star <= displayRating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= displayRating ? '#F59E0B' : c.border}
                  />
                </Pressable>
              ))}
            </View>
            {rating > 0 && (
              <Text style={[s.ratingLabel, { color: c.primary }]}>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
              </Text>
            )}
          </View>

          {/* Aspect ratings */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Rate specific aspects</Text>
            {ASPECTS.map((aspect) => (
              <View key={aspect.id} style={[s.aspectRow, { borderBottomColor: c.border }]}>
                <Text style={[s.aspectLabel, { color: c.textSecondary }]}>{aspect.label}</Text>
                <View style={s.miniStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setAspectRatings((prev) => ({ ...prev, [aspect.id]: star }))}
                      hitSlop={6}
                    >
                      <Ionicons
                        name={star <= (aspectRatings[aspect.id] ?? 0) ? 'star' : 'star-outline'}
                        size={22}
                        color={star <= (aspectRatings[aspect.id] ?? 0) ? '#F59E0B' : c.border}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Quick tags */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>What stood out?</Text>
            <View style={s.tagsWrap}>
              {TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    style={[s.tagChip, {
                      backgroundColor: active ? c.primaryLight : c.surfaceAlt,
                      borderColor: active ? c.primary : c.border,
                    }]}
                    onPress={() => toggleTag(tag)}
                  >
                    {active && <Ionicons name="checkmark" size={12} color={c.primary} />}
                    <Text style={[s.tagText, { color: active ? c.primary : c.textSecondary }]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Written comment */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Tell us more (optional)</Text>
            <TextInput
              style={[s.commentInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
              value={comment}
              onChangeText={setComment}
              placeholder="What did you like or dislike? Your honest feedback helps other drivers."
              placeholderTextColor={c.muted}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={[s.charCount, { color: c.muted }]}>{comment.length}/500</Text>
          </View>

          {/* Submit */}
          <Pressable
            style={[s.submitBtn, {
              backgroundColor: rating > 0 && !loading ? c.primary : c.surfaceAlt,
              opacity: loading ? 0.7 : 1,
            }]}
            onPress={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="send-outline" size={18} color={rating > 0 ? '#fff' : c.muted} />
                  <Text style={[s.submitBtnText, { color: rating > 0 ? '#fff' : c.muted }]}>Submit Review</Text>
                </>
            }
          </Pressable>
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
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  garageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.sm,
  },
  garageIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  garageName: { ...typography.h4 },
  garageService: { fontSize: 13, fontWeight: '600' },
  garageVehicle: { fontSize: 12, fontWeight: '500' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  ratingLabel: { textAlign: 'center', fontSize: 15, fontWeight: '900' },

  aspectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aspectLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  miniStars: { flexDirection: 'row', gap: 4 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7,
  },
  tagText: { fontSize: 12, fontWeight: '700' },

  commentInput: {
    borderRadius: radius.lg, borderWidth: 1, padding: 12,
    fontSize: 14, minHeight: 100, textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, fontWeight: '600', textAlign: 'right' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  submitBtnText: { fontSize: 16, fontWeight: '900' },
});
