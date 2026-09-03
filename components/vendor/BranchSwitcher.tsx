import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useVendorBranches, type VendorBranch } from '@/lib/vendorQueries';

/**
 * Branch picker for the vendor header. Mirrors
 * src/components/vendor/branch-switcher.tsx on the web side: hidden
 * entirely for single-branch staff (nothing to switch between, rendered as
 * a static label instead), a tappable picker otherwise.
 */
export function BranchSwitcher() {
  const c = useQarColors();
  const { branches, activeBranch, setActiveBranch, canSeeAllBranches } = useVendorBranches();
  const [open, setOpen] = useState(false);

  if (branches.length === 0) return null;

  if (!canSeeAllBranches && branches.length === 1) {
    return (
      <View style={[s.staticPill, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        <Ionicons name="location-outline" size={13} color={c.muted} />
        <Text style={[s.staticText, { color: c.text }]} numberOfLines={1}>
          {activeBranch?.name ?? branches[0].name}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        style={[s.trigger, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
        onPress={() => setOpen(true)}
        accessible accessibilityRole="button" accessibilityLabel="Switch branch"
      >
        <Ionicons name="location-outline" size={13} color={c.primary} />
        <Text style={[s.triggerText, { color: c.text }]} numberOfLines={1}>
          {activeBranch?.name ?? 'Select branch'}
        </Text>
        <Ionicons name="chevron-down" size={13} color={c.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <SafeAreaView style={s.sheetWrap} edges={['bottom']}>
            <Pressable style={[s.sheet, { backgroundColor: c.surface, borderColor: c.border }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[s.sheetTitle, { color: c.text }]}>Branches</Text>
              {branches.map((branch: VendorBranch) => {
                const isActive = activeBranch?.id === branch.id;
                return (
                  <Pressable
                    key={branch.id}
                    style={[
                      s.row,
                      { borderColor: isActive ? c.primary : c.border, backgroundColor: isActive ? `${c.primary}12` : c.background },
                    ]}
                    onPress={() => { setActiveBranch(branch.id); setOpen(false); }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.rowTitle, { color: c.text }]}>{branch.name}</Text>
                      <Text style={[s.rowSub, { color: c.muted }]}>{branch.city}, {branch.country}</Text>
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={20} color={c.primary} />}
                  </Pressable>
                );
              })}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  staticPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
    maxWidth: 200,
  },
  staticText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },

  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
    maxWidth: 220,
  },
  triggerText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%' },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderWidth: 1, borderBottomWidth: 0, padding: spacing.page, gap: 10,
    ...shadow.md,
  },
  sheetTitle: { ...typography.h4, marginBottom: 4 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.lg, borderWidth: 1, padding: 12,
  },
  rowTitle: { fontSize: 14, fontWeight: '800' },
  rowSub: { fontSize: 12, fontWeight: '500' },
});
