import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet,
  TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore } from '@/lib/store';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { exportVendorCsv } from '@/lib/vendor-export';
import { MotionScreen } from '@/lib/motion';
import { radius, spacing } from '@/lib/theme';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import { BranchSwitcher } from '@/components/vendor/BranchSwitcher';
import type { VendorService } from '@/lib/vendor-data';
import { useAuthContext } from '@/lib/AuthContext';
import { canAccess } from '@/lib/permissions';

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
  onSave: (data: Omit<VendorService, 'id'>) => void | Promise<void>;
  onClose: () => void;
  c: ReturnType<typeof useQarColors>;
}) {
  const isNew = !service?.id;
  const [name, setName] = useState(service?.name ?? '');
  const [category, setCategory] = useState(service?.category ?? 'Maintenance');
  const [price, setPrice] = useState(String(service?.basePrice ?? ''));
  const [duration, setDuration] = useState(String(service?.duration ?? ''));
  const [description, setDescription] = useState(service?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  async function handleSave() {
    if (busy.current) return;
    if (!name.trim()) { setError('Enter a service name.'); return; }
    const priceNum = Number(price);
    const durNum = Number(duration);
    if (!/^\d+(\.\d{1,2})?$/.test(price.trim()) || !Number.isFinite(priceNum) || priceNum > 10000000) { setError('Enter a valid price.'); return; }
    if (!Number.isSafeInteger(durNum) || durNum <= 0) { setError('Enter a whole number of minutes greater than zero.'); return; }
    busy.current = true;
    setSaving(true); setError('');
    try {
      await onSave({ name: name.trim(), category, basePrice: priceNum, duration: durNum, description: description.trim(), active: service?.active ?? true });
      onClose();
    } catch { setError('Service was not saved. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  }

  const cats = SERVICE_CATEGORIES.filter((c) => c !== 'All');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={mod.overlay} onPress={() => { if (!saving) onClose(); }}>
        <Pressable accessibilityViewIsModal style={[mod.sheet, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
          <View style={[mod.handle, { backgroundColor: c.border }]} />
          <Text style={[mod.title, { color: c.text }]}>{isNew ? 'Add service' : 'Edit service'}</Text>
          <Text style={{ color: c.muted, marginBottom: 12 }}>Device-local draft. Not published to customers.</Text>

          <Text style={[mod.label, { color: c.muted }]}>Service name</Text>
          <TextInput
            style={[mod.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={name} onChangeText={setName} accessibilityLabel="Service name" editable={!saving} maxLength={200}
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
                accessibilityRole="radio" accessibilityLabel={cat} accessibilityState={{ checked: category === cat, disabled: saving }}
                disabled={saving} onPress={() => setCategory(cat)}
              >
                <Text style={[mod.catChipText, { color: category === cat ? c.primaryText : c.muted }]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[mod.label, { color: c.muted }]}>Price (QAR)</Text>
              <TextInput
                style={[mod.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={price} onChangeText={setPrice} accessibilityLabel="Price in QAR" editable={!saving}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={c.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[mod.label, { color: c.muted }]}>Duration (min)</Text>
              <TextInput
                style={[mod.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={duration} onChangeText={setDuration} accessibilityLabel="Duration in minutes" editable={!saving}
                keyboardType="number-pad" placeholder="45" placeholderTextColor={c.muted}
              />
            </View>
          </View>

          <Text style={[mod.label, { color: c.muted, marginTop: 12 }]}>Description (optional)</Text>
          <TextInput
            style={[mod.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text, height: 64, textAlignVertical: 'top', paddingTop: 10 }]}
            value={description} onChangeText={setDescription} accessibilityLabel="Service description" editable={!saving} maxLength={1000}
            placeholder="Short service description" placeholderTextColor={c.muted}
            multiline numberOfLines={2}
          />

          <View style={mod.actions}>
            <Pressable accessibilityRole="button" disabled={saving} style={[mod.cancelBtn, { borderColor: c.border }]} onPress={onClose}>
              <Text style={[mod.cancelText, { color: c.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} style={[mod.saveBtn, { backgroundColor: c.primary }]} onPress={() => void handleSave()}>
              <Text style={mod.saveBtnText}>{saving ? 'Saving...' : isNew ? 'Add service' : 'Save changes'}</Text>
            </Pressable>
          </View>
          {!!error && <Text accessibilityRole="alert" style={{ color: c.danger }}>{error}</Text>}
          </ScrollView>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const c = useQarColors();
  const { role, claimsLoading } = useAuthContext();
  const canRead = !claimsLoading && !!role && role !== 'customer' && role !== 'master_admin' && canAccess(role, 'services');
  const canWrite = canRead && canAccess(role, 'services', 'write');
  const vendorTabBottom = useVendorTabBottom();
  const services = useQarWheelStore((s) => s.vendorServices);
  const addService = useQarWheelStore((s) => s.addVendorService);
  const updateService = useQarWheelStore((s) => s.updateVendorService);
  const toggleService = useQarWheelStore((s) => s.toggleVendorService);

  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [editingService, setEditingService] = useState<Partial<VendorService> | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = services.filter((service) => (activeCategory === 'All' || service.category === activeCategory) &&
    `${service.name} ${service.description} ${service.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeCount = services.filter((s) => s.active).length;
  const totalRevenuePotential = services.filter((s) => s.active).reduce((sum, s) => sum + s.basePrice, 0);

  async function handleExport() {
    if (!canRead || exporting) return;
    setExporting(true); setExportError('');
    try {
      await exportVendorCsv('qarwheel-service-rate-drafts.csv', ['Service', 'Category', 'Description', 'Duration (minutes)', 'Base price (QAR)', 'Draft availability'],
        filtered.map((service) => [service.name, service.category, service.description, service.duration, service.basePrice, service.active ? 'Active' : 'Inactive']));
    } catch { setExportError('Service rates were not exported. Please try again.'); }
    finally { setExporting(false); }
  }

  function handleEdit(service: VendorService) {
    setEditingService(service);
    setShowModal(true);
  }

  function handleSaveService(data: Omit<VendorService, 'id'>) {
    if (!canWrite) throw new Error('Service draft access changed.');
    // shortcut: local IDs have no branch/server mapping; publish only after scoped reconciliation exists.
    if (editingService?.id) {
      updateService(editingService.id, data);
    } else {
      addService(data);
    }
  }

  function handleToggle(id: string) {
    if (!canWrite) return;
    try { toggleService(id); }
    catch { Alert.alert('Draft not updated', 'Please try changing the draft availability again.'); }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text heading style={[s.navTitle, { color: c.text }]}>Service Catalog &amp; Rates</Text>
        <BranchSwitcher />
        {canRead && <Pressable accessibilityRole="button" accessibilityLabel="Export visible service rate drafts" disabled={exporting || filtered.length === 0}
          accessibilityState={{ disabled: exporting || filtered.length === 0, busy: exporting }} onPress={() => void handleExport()}
          style={[s.exportBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border, opacity: exporting || !filtered.length ? 0.5 : 1 }]}>
          <Ionicons name="download-outline" size={16} color={c.text} /><Text style={{ color: c.text }}>Export rates CSV</Text>
        </Pressable>}
        {canWrite && <Pressable
          style={[s.addBtn, { backgroundColor: c.primary }]}
          accessibilityRole="button" accessibilityLabel="Add service"
          onPress={() => { setEditingService(null); setShowModal(true); }}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>}
      </View>

      {/* Category filter */}
      {canRead && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catBar} contentContainerStyle={s.catBarContent}>
        {SERVICE_CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <Pressable
              key={cat}
              accessibilityRole="tab" accessibilityState={{ selected: active }}
              style={[s.catChip, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[s.catChipText, { color: active ? '#fff' : c.muted }]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>}

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {!canRead ? <Text accessibilityRole="alert" style={{ color: c.muted }}>{claimsLoading ? 'Checking service access...' : 'Services are unavailable for your role.'}</Text> : <>
          <Text style={{ color: c.muted, marginBottom: 12 }}>Device-local service drafts. Prices and availability are not published or synced to any branch.</Text>

          {!!exportError && <Text accessibilityRole="alert" style={{ color: c.danger, marginBottom: 12 }}>{exportError}</Text>}
          <View style={[s.search, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="search-outline" size={18} color={c.muted} />
            <TextInput accessibilityLabel="Search services" value={query} onChangeText={setQuery} placeholder="Search procedure or category"
              placeholderTextColor={c.muted} style={{ flex: 1, minWidth: 0, minHeight: 44, color: c.text, fontFamily: 'VendorBody' }} />
          </View>
          {/* Summary */}
          <View style={s.summaryRow}>
            {[
              { label: 'Total Services', value: String(services.length), color: c.text },
              { label: 'Active', value: String(activeCount), color: c.success },
              { label: 'Active list prices', value: `QAR ${totalRevenuePotential}`, color: c.gold },
            ].map((stat) => (
              <View key={stat.label} style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text telemetry style={[s.summaryValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[s.summaryLabel, { color: c.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.matrixHeader}>
            <Text heading style={[s.emptyTitle, { color: c.text }]}>Service Pricing Matrix</Text>
            <Text telemetry style={{ color: c.muted }}>{filtered.length} displayed</Text>
          </View>
          {/* Service list */}
          {filtered.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="construct-outline" size={36} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>No services</Text>
              <Text style={[s.emptyText, { color: c.muted }]}>{services.length ? 'No service drafts match these filters.' : 'Add your first service to get started.'}</Text>
            </View>
          )}

          <View style={s.itemGrid}>
            {filtered.map((svc) => (
              <View
                key={svc.id}
                style={[s.card, { backgroundColor: c.surface, borderColor: svc.active ? c.border : c.borderLight, opacity: 1 }]}
              >
                <View style={s.cardTop}>
                  <View style={[s.iconWrap, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name={(CATEGORY_ICONS[svc.category] ?? 'construct-outline') as 'construct-outline'} size={18} color={c.primaryText} />
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
                    <Text telemetry style={[s.price, { color: c.text }]}>QAR {svc.basePrice}</Text>
                    <View style={[s.activeBadge, {
                      backgroundColor: svc.active ? c.successBg : c.surfaceAlt,
                    }]}>
                      <Text style={[s.activeBadgeText, { color: svc.active ? c.success : c.muted }]}>
                        {svc.active ? 'Draft: active' : 'Draft: inactive'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[s.cardFooter, { borderTopColor: c.border }]}>
                  {canWrite && <Pressable
                    style={[s.footerBtn, { borderColor: c.border }]}
                    accessibilityRole="button" accessibilityLabel={`Edit ${svc.name}`}
                    onPress={() => handleEdit(svc)}
                  >
                    <Ionicons name="pencil-outline" size={13} color={c.textSecondary} />
                    <Text style={[s.footerBtnText, { color: c.textSecondary }]}>Edit</Text>
                  </Pressable>}
                  {canWrite && <Pressable
                    style={[s.footerBtn, {
                      borderColor: svc.active ? c.border : c.primaryMid,
                      backgroundColor: svc.active ? 'transparent' : c.primaryLight,
                    }]}
                    onPress={() => handleToggle(svc.id)}
                    accessibilityRole="switch" accessibilityLabel={`Availability of ${svc.name}`} accessibilityState={{ checked: svc.active }}
                  >
                    <Ionicons
                      name={svc.active ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={13}
                      color={svc.active ? c.muted : c.primaryText}
                    />
                    <Text style={[s.footerBtnText, { color: svc.active ? c.muted : c.primaryText }]}>
                      {svc.active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </Pressable>}
                  <View style={[s.priceTag, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Ionicons name="pricetag-outline" size={11} color={c.muted} />
                    <Text style={[s.priceTagText, { color: c.muted }]}>Base price</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          </>}
        </MotionScreen>
      </ScrollView>

      {showModal && canWrite && <EditServiceModal
        key={editingService?.id ?? 'new'}
        visible={showModal}
        service={editingService}
        onSave={handleSaveService}
        onClose={() => { setShowModal(false); setEditingService(null); }}
        c={c}
      />}
      <VendorTabBar />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  exportBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  search: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  matrixHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginVertical: 16 },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  navbar: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page, 
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', flexShrink: 1 },
  addBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

  catBar: { flexGrow: 0 },
  catBarContent: { paddingHorizontal: spacing.page, paddingVertical: 12, gap: 12 },
  catChip: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  catChipText: { fontSize: 13, fontWeight: '700' },

  content: { padding: spacing.page, gap: 14, width: '100%', maxWidth: 1600, alignSelf: 'center' },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { flexGrow: 1, flexBasis: 100, borderRadius: 8, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  card: { flexBasis: 340, flexGrow: 1, flexShrink: 1, minWidth: 0, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12, padding: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  svcName: { fontSize: 14, fontWeight: '800' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  catTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  catTagText: { fontSize: 12, fontWeight: '700' },
  duration: { fontSize: 12 },
  desc: { fontSize: 12, lineHeight: 16 },
  price: { fontSize: 16, fontWeight: '900' },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  activeBadgeText: { fontSize: 12, fontWeight: '800' },

  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  footerBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  footerBtnText: { fontSize: 12, fontWeight: '700' },
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginStart: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  priceTagText: { fontSize: 12, fontWeight: '600' },
});

const mod = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 8, borderTopRightRadius: 8, maxHeight: '90%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '900', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  input: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, height: 48, fontSize: 15 },
  catChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1 },
  catChipText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, height: 46, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 2, height: 46, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
