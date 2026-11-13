import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

export type LegalSection = { heading: string; body: string[] };

// Shared renderer for both legal documents (Privacy Policy, Terms of
// Service) — matches web's LegalPageLayout (src/components/legal/) content
// section-for-section, so the two platforms are never out of sync on what
// the policy actually says.
export function LegalDocument({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const c = useQarColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          <Text style={[s.updated, { color: c.muted }]}>Last updated: {lastUpdated}</Text>

          <View style={[s.draftBanner, { backgroundColor: c.warning + '18', borderColor: c.warning + '55' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={c.warning} />
            <Text style={[s.draftText, { color: c.text }]}>
              <Text style={{ fontWeight: '800' }}>Draft — pending legal review. </Text>
              This document is a template pending review by qualified legal counsel before public launch.
            </Text>
          </View>

          <Text style={[s.paragraph, { color: c.textSecondary }]}>{intro}</Text>

          {sections.map((section) => (
            <View key={section.heading} style={s.section}>
              <Text style={[s.heading, { color: c.text }]}>{section.heading}</Text>
              {section.body.map((para, i) => (
                <Text key={i} style={[s.paragraph, { color: c.textSecondary }]}>{para}</Text>
              ))}
            </View>
          ))}
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
  navTitle: { ...typography.h4, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  content: { padding: spacing.page, paddingBottom: 48 },
  updated: { fontSize: 12, fontWeight: '600', marginBottom: 12 },
  draftBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 12, marginBottom: 16 },
  draftText: { flex: 1, fontSize: 12, lineHeight: 17 },
  section: { marginTop: 18 },
  heading: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  paragraph: { fontSize: 13.5, lineHeight: 21, marginBottom: 10 },
});
