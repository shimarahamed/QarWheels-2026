import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useGarage } from '@/lib/firestoreOps';
import RecordNotFound from '@/components/RecordNotFound';

const { width: SCREEN_W } = Dimensions.get('window');
const CELL_SIZE = (SCREEN_W - spacing.page * 2 - 8) / 3;

// Static photo catalogue — in production served from Firebase Storage
const GARAGE_PHOTOS: Record<string, string[]> = {
  garage_011: [
    'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=600&q=70',
    'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?auto=format&fit=crop&w=600&q=70',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=70',
    'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=600&q=70',
    'https://images.unsplash.com/photo-1609952048180-7b35ea6b083b?auto=format&fit=crop&w=600&q=70',
    'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=600&q=70',
  ],
  garage_002: [
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=70',
    'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=70',
    'https://images.unsplash.com/photo-1600661653561-629509216228?auto=format&fit=crop&w=600&q=70',
    'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?auto=format&fit=crop&w=600&q=70',
  ],
};

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1549636367-13c144c47063?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=70',
];

export default function GaragePhotosScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { garage, loading } = useGarage(id);
  const photos = GARAGE_PHOTOS[id ?? ''] ?? FALLBACK_PHOTOS;

  if (!garage && loading) return null;
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
          <Text style={[s.navTitle, { color: c.text }]} numberOfLines={1}>{garage?.name ?? 'Photos'}</Text>
          <Text style={[s.navSub, { color: c.muted }]}>{photos.length} photos</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          <View style={s.grid}>
            {photos.map((uri, i) => (
              <Pressable key={uri} onPress={() => setLightboxIndex(i)}>
                <Image source={{ uri }} style={[s.cell, { borderColor: c.border }]} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
          <Text style={[s.note, { color: c.muted }]}>
            Tap any photo to view full size. Photos sourced from Firebase Storage.
          </Text>
        </MotionScreen>
      </ScrollView>

      {/* Lightbox */}
      <Modal
        visible={lightboxIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setLightboxIndex(null)}
      >
        <Pressable style={s.lightboxBg} onPress={() => setLightboxIndex(null)}>
          {lightboxIndex !== null && (
            <>
              <Image
                source={{ uri: photos[lightboxIndex] }}
                style={s.lightboxImg}
                resizeMode="contain"
              />
              <View style={s.lightboxMeta}>
                <Text style={s.lightboxCount}>{lightboxIndex + 1} / {photos.length}</Text>
              </View>
              <Pressable style={[s.lightboxClose]} onPress={() => setLightboxIndex(null)}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
              <View style={s.lightboxNav}>
                <Pressable
                  onPress={() => setLightboxIndex((i) => (i! > 0 ? i! - 1 : photos.length - 1))}
                  style={[s.lightboxArrow, { opacity: 0.8 }]}
                >
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => setLightboxIndex((i) => (i! < photos.length - 1 ? i! + 1 : 0))}
                  style={[s.lightboxArrow, { opacity: 0.8 }]}
                >
                  <Ionicons name="chevron-forward" size={28} color="#fff" />
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Modal>
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
  content: { padding: spacing.page, gap: 12, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  note: { fontSize: 12, fontWeight: '600', textAlign: 'center', paddingTop: 8 },
  lightboxBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { width: SCREEN_W, height: SCREEN_W * 1.2 },
  lightboxMeta: { position: 'absolute', bottom: 40, alignItems: 'center' },
  lightboxCount: { color: '#fff', fontSize: 14, fontWeight: '700' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  lightboxNav: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16 },
  lightboxArrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
