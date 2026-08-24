import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelsStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useVendorTabBottom } from '@/components/VendorTabBar';
import type { VendorService } from '@/lib/vendor-data';

const SERVICE_CATEGORIES = ['All', 'Maintenance', 'Tyres', 'Brakes', 'AC', 'Diagnostics', 'Electrical', 'Labour'];

const CATEGORY_ICONS: Record<string, string> = {
  Maintenance: 'water-outline',
  Tyres: 'ellipse-outline',
  Brakes: 'stop-circle-outline',
  AC: 'snow-outline',
  Diagnostics: 'pulse-outline',
  Electrical: 'flash-outline',
  Labour: 'hammer-outline',
};

// ─── Edit service modal ───────────────────────────────────────────────────────

function EditServiceModal({ visible, service, onSave, onClose, c }: {
  visible: boolean;
  service: Partial<VendorService> | null;
  onSave: (data: Omit<VendorService, 'id'>) => void;
  onClose: () => void;
  c: ReturnType<typeof useQarColors>;
}) {
  const isNew = !service?.id;
  const [name, setName] = useState(service?.name ?? '');
  const [category, setCategory] = useState(service?.category ?? 'Maintenance');
  const [price, setPrice] = useState(String(service?.basePrice ?? ''));
  const [duration, setDuration] = useState(String(service?.duration ?? ''));
  const [description, setDescription] = useState(service?.description ?? '');

  function handleSave() {
    if (!name.trim()) { Alert.alert('Missing', 'Enter a service name.'); return; }
    const priceNum = parseFloat(price);
    const durNum = parseInt(duration, 10);
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Invalid', 'Enter a valid price.'); return; }
    if (isNaN(durNum) || durNum <= 0) { Alert.alert('Invalid', 'Enter a valid duration in minutes.'); return; }
    onSave({ name: name.trim(), category, basePrice: priceNum, duration: durNum, description: description.trim(), active: service?.active ?? true });
    onClose();
  }

  const cats = SERVICE_CATEGORIES.filter((c) => c !== 'All');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={mod.overlay} onPress={onClose}>
        <Pressable style={[mod.sheet, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[mod.handle, { backgroundColor: c.border }]} />
          <Text style={[mod.title, { color: c.text }]}>{isNew ? 'Add service' : 'Edit service'}</Text>

          <Text style={[mod.label, { color: c.muted }]}>Service name</Text>
          <TextInput
            style={[mod.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={name} onChangeText={setName}
            placeholder="e.g. Full AC Service" placeholderTextColor={c.muted}
          />

          <Text style={[mod.label, { color: c.muted, marginTop: 12 }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {cats.map((cat) => (
              <Pressable
                key={cat}
                style={[mod.catChip,
                  { borderColor: category === cat ? c.primary : c.border,
                    backgroundColor: category === cat ? c.primaryLight : c.surfaceAlt }]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[mod.catChipText, { color: category === cat ? c.primary : c.muted }]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[mod.label, { color: c.muted }]}>Price (QAR)</Text>
              <TextInput
                style={[mod.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={price} onChangeText={setPrice}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={c.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[mod.label, { color: c.muted }]}>Duration (min)</Text>
              <TextInput
                style={[mod.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={duration} onChangeText={setDuration}
                keyboardType="number-pad" placeholder="45" placeholderTextColor={c.muted}
              />
            </View>
          </View>

          <Text style={[mod.label, { color: c.muted, marginTop: 12 }]}>Description (optional)</Text>
          <TextInput
            style={[mod.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text, height: 64, textAlignVertical: 'top', paddingTop: 10 }]}
            value={description} onChangeText={setDescription}
            placeholder="Short description shown to customers…" placeholderTextColor={c.muted}
            multiline numberOfLines={2}
          />

          <View style={mod.actions}>
            <Pressable style={[mod.cancelBtn, { borderColor: c.border }]} onPress={onClose}>
              <Text style={[mod.cancelText, { color: c.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[mod.saveBtn, { backgroundColor: c.primary }]} onPress={handleSave}>
              <Text style={mod.saveBtnText}>{isNew ? 'Add service' : 'Save changes'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const c = useQarColors();
  const vendorTabBottom = useVendorTabBottom();
  const services = useQarWheelsStore((s) => s.vendorServices);
  const addService = useQarWheelsStore((s) => s.addVendorService);
  const updateService = useQarWheelsStore((s) => s.updateVendorService);
  const toggleService = useQarWheelsStore((s) => s.toggleVendorService);

  const [activeCategory, setActiveCategory] = useState('All');
  const [editingService, setEditingService] = useState<Partial<VendorService> | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = activeCategory === 'All' ? services : services.filter((s) => s.category === activeCategory);
  const activeCount = services.filter((s) => s.active).length;
  const totalRevenuePotential = services.filter((s) => s.active).reduce((sum, s) => sum + s.basePrice, 0);

  function handleEdit(service: VendorService) {
    setEditingService(service);
    setShowModal(true);
  }

  function handleSaveService(data: Omit<VendorService, 'id'>) {
    if (editingService?.id) {
      updateService(editingService.id, data);
    } else {
      addService(data);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Services</Text>
        <Pressable
          style={[s.addBtn, { backgroundColor: c.primary }]}
          onPress={() => { setEditingService(null); setShowModal(true); }}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.catBar, { paddingTop: 60 }]} contentContainerStyle={s.catBarContent}>
        {SERVICE_CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <Pressable
              key={cat}
              style={[s.catChip, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[s.catChipText, { color: active ? '#fff' : c.muted }]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>

          {/* Summary */}
          <View style={s.summaryRow}>
            {[
              { label: 'Total Services', value: String(services.length), color: c.text },
              { label: 'Active', value: String(activeCount), color: c.success },
              { label: 'Revenue Potential', value: `QAR ${totalRevenuePotential}`, color: c.primary },
            ].map((stat) => (
              <View key={stat.label} style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.summaryValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[s.summaryLabel, { color: c.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Service list */}
          {filtered.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="construct-outline" size={36} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>No services</Text>
              <Text style={[s.emptyText, { color: c.muted }]}>Add your first service to get started.</Text>
            </View>
          )}

          <View style={{ gap: 10 }}>
            {filtered.map((svc) => (
              <View
                key={svc.id}
                style={[s.card, { backgroundColor: c.surface, borderColor: svc.active ? c.border : c.borderLight, opacity: svc.active ? 1 : 0.6 }]}
              >
                <View style={s.cardTop}>
                  <View style={[s.iconWrap, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name={(CATEGORY_ICONS[svc.category] ?? 'construct-outline') as 'construct-outline'} size={18} color={c.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.svcName, { color: c.text }]}>{svc.name}</Text>
                    <View style={s.metaRow}>
                      <View style={[s.catTag, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                        <Text style={[s.catTagText, { color: c.textSecondary }]}>{svc.category}</Text>
                      </View>
                      <Ionicons name="time-outline" size={11} color={c.muted} />
                      <Text style={[s.duration, { color: c.muted }]}>{svc.duration} min</Text>
                    </View>
                    {svc.description ? (
                      <Text style={[s.desc, { color: c.muted }]} numberOfLines={1}>{svc.description}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[s.price, { color: c.text }]}>QAR {svc.basePrice}</Text>
                    <View style={[s.activeBadge, {
                      backgroundColor: svc.active ? c.successBg : c.surfaceAlt,
                    }]}>
                      <Text style={[s.activeBadgeText, { color: svc.active ? c.success : c.muted }]}>
                        {svc.active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[s.cardFooter, { borderTopColor: c.border }]}>
                  <Pressable
                    style={[s.footerBtn, { borderColor: c.border }]}
                    onPress={() => handleEdit(svc)}
                  >
                    <Ionicons name="pencil-outline" size={13} color={c.textSecondary} />
                    <Text style={[s.footerBtnText, { color: c.textSecondary }]}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[s.footerBtn, {
                      borderColor: svc.active ? c.border : c.primaryMid,
                      backgroundColor: svc.active ? 'transparent' : c.primaryLight,
                    }]}
                    onPress={() => toggleService(svc.id)}
                  >
                    <Ionicons
                      name={svc.active ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={13}
                      color={svc.active ? c.muted : c.primary}
                    />
                    <Text style={[s.footerBtnText, { color: svc.active ? c.muted : c.primary }]}>
                      {svc.active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </Pressable>
                  <View style={[s.priceTag, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Ionicons name="pricetag-outline" size={11} color={c.muted} />
                    <Text style={[s.priceTagText, { color: c.muted }]}>Base price</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

        </MotionScreen>
      </ScrollView>

      <EditServiceModal
        visible={showModal}
        service={editingService}
        onSave={handleSaveService}
        onClose={() => { setShowModal(false); setEditingService(null); }}
        c={c}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  addBtn: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

  catBar: { flexGrow: 0 },
  catBarContent: { paddingHorizontal: spacing.page, paddingVertical: 12, gap: 12 },
  catChip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  catChipText: { fontSize: 13, fontWeight: '700' },

  content: { padding: spacing.page, gap: spacing.gap },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4, ...shadow.xs },
  summaryValue: { ...typography.h4 },
  summaryLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  svcName: { fontSize: 14, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  catTagText: { fontSize: 12, fontWeight: '700' },
  duration: { fontSize: 12 },
  desc: { fontSize: 12, lineHeight: 16 },
  price: { fontSize: 16, fontWeight: '900' },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  activeBadgeText: { fontSize: 12, fontWeight: '800' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  footerBtnText: { fontSize: 12, fontWeight: '700' },
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginStart: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  priceTagText: { fontSize: 12, fontWeight: '600' },
});

const mod = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '900', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  input: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, height: 48, fontSize: 15 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1 },
  catChipText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, height: 46, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 2, height: 46, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
