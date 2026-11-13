import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore } from '@/lib/store';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { exportVendorCsv } from '@/lib/vendor-export';
import { MotionScreen } from '@/lib/motion';
import { radius, spacing } from '@/lib/theme';
import { VendorTabBar, useVendorTabBottom } from '@/components/VendorTabBar';
import { useAuthContext } from '@/lib/AuthContext';
import { canAccess } from '@/lib/permissions';

const CATEGORIES = ['All', 'Fluids', 'Filters', 'Brakes', 'Electrical', 'Ignition', 'Accessories'];

export default function InventoryScreen() {
  const c = useQarColors();
  const { role, claimsLoading } = useAuthContext();
  const canRead = !claimsLoading && !!role && role !== 'customer' && role !== 'master_admin' && canAccess(role, 'inventory');
  const canWrite = canRead && canAccess(role, 'inventory', 'write');
  const vendorTabBottom = useVendorTabBottom();
  const inventory = useQarWheelStore((s) => s.vendorInventory);
  const updateQty = useQarWheelStore((s) => s.updateVendorInventoryQty);
  const addInventoryItem = useQarWheelStore((s) => s.addVendorInventoryItem);
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'All stock' | 'Low stock' | 'Out of stock'>('All stock');
  const [exporting, setExporting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: '', sku: '', quantity: '0', minQuantity: '1', unitPrice: '', unit: 'piece', supplier: '' });
  const [category, setCategory] = useState('Accessories');
  const [error, setError] = useState('');
  const submitted = useRef(false);

  const filtered = inventory.filter((item) =>
    (activeCategory === 'All' || item.category === activeCategory) &&
    (stockFilter === 'All stock' || (stockFilter === 'Out of stock' ? item.quantity === 0 : item.quantity <= item.minQuantity)) &&
    `${item.name} ${item.sku} ${item.supplier}`.toLowerCase().includes(query.trim().toLowerCase()));
  const lowStock = inventory.filter((i) => i.quantity <= i.minQuantity);

  async function handleExport() {
    if (!canRead || exporting) return;
    setExporting(true); setError('');
    try {
      await exportVendorCsv('qarwheel-inventory-drafts.csv', ['SKU', 'Item', 'Category', 'Quantity', 'Minimum', 'Unit price (QAR)', 'Unit', 'Supplier'],
        filtered.map((item) => [item.sku, item.name, item.category, item.quantity, item.minQuantity, item.unitPrice, item.unit, item.supplier]));
    } catch { setError('Inventory was not exported. Please try again.'); }
    finally { setExporting(false); }
  }

  function handleAdjust(itemId: string, itemName: string, delta: number) {
    if (!canWrite) return;
    const item = inventory.find((i) => i.id === itemId);
    if (!item) { setError('This draft is no longer available.'); return; }
    if (delta < 0 && item.quantity === 0) {
      Alert.alert('Out of stock', `${itemName} is already at 0.`);
      return;
    }
    if (!Number.isSafeInteger(item.quantity + delta) || item.quantity + delta > 1000000) {
      setError('Quantity must be a whole number between 0 and 1,000,000.'); return;
    }
    try { updateQty(itemId, delta); setError(''); }
    catch { setError('Quantity was not updated. Please try again.'); }
  }

  function handleAddItem() {
    if (!canWrite) return;
    if (submitted.current) return;
    if (!draft.name.trim() || !draft.sku.trim() || !draft.unit.trim()) {
      setError('Enter an item name, SKU and unit.'); return;
    }
    if (inventory.some((item) => item.sku.toLowerCase() === draft.sku.trim().toLowerCase())) {
      setError('This SKU already exists. Use a different SKU.'); return;
    }
    const quantity = Number(draft.quantity);
    const minQuantity = Number(draft.minQuantity);
    if (![draft.quantity, draft.minQuantity].every((value) => /^\d+$/.test(value.trim()) && Number(value) <= 1000000)) {
      setError('Quantity and minimum must be whole numbers between 0 and 1,000,000.'); return;
    }
    const unitPrice = Number(draft.unitPrice);
    if (!/^\d+(\.\d{1,2})?$/.test(draft.unitPrice.trim()) || !Number.isFinite(unitPrice) || unitPrice > 10000000) {
      setError('Enter a price between 0 and 10,000,000 QAR, with at most two decimal places.'); return;
    }
    submitted.current = true;
    try {
      addInventoryItem({ name: draft.name.trim(), sku: draft.sku.trim(), category, quantity, minQuantity,
        unitPrice, unit: draft.unit.trim(), supplier: draft.supplier.trim(), lastRestocked: 'Not recorded' });
      setDraft({ name: '', sku: '', quantity: '0', minQuantity: '1', unitPrice: '', unit: 'piece', supplier: '' });
      setActiveCategory('All'); setShowAdd(false); setError('');
    } catch { submitted.current = false; setError('Draft was not added. Your entries are still here; please try again.'); }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text heading style={[s.navTitle, { color: c.text }]}>Inventory &amp; Spare Parts Depot</Text>
        {canRead && <Pressable accessibilityRole="button" accessibilityLabel="Export visible inventory drafts" disabled={exporting || filtered.length === 0}
          accessibilityState={{ disabled: exporting || filtered.length === 0, busy: exporting }} onPress={() => void handleExport()}
          style={[s.exportBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border, opacity: exporting || !filtered.length ? 0.5 : 1 }]}>
          <Ionicons name="download-outline" size={16} color={c.text} /><Text style={{ color: c.text }}>Export CSV</Text>
        </Pressable>}
        {canWrite && <Pressable
          style={[s.addBtn, { backgroundColor: c.primary }]}
          onPress={() => { submitted.current = false; setError(''); setShowAdd(!showAdd); }}
          accessibilityState={{ expanded: showAdd }}
          accessible accessibilityRole="button" accessibilityLabel="Add inventory item"
        >
          <Ionicons name={showAdd ? 'close' : 'add'} size={18} color="#fff" />
        </Pressable>}
      </View>

      {/* Low stock alert */}
      {canRead && lowStock.length > 0 && (
        <View style={[s.alertBanner, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B30' }]}>
          <Ionicons name="warning-outline" size={16} color={c.warning} />
          <Text style={[s.alertText, { color: c.warning }]}>
            {lowStock.length} item{lowStock.length > 1 ? 's' : ''} low or out of stock. Review stock.
          </Text>
        </View>
      )}

      {/* Category filter */}
      {canRead && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catBar} contentContainerStyle={s.catBarContent}>
        {CATEGORIES.map((cat) => {
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {!canRead ? <Text accessibilityRole="alert" style={{ color: c.muted }}>{claimsLoading ? 'Checking inventory access...' : 'Inventory is unavailable for your role.'}</Text> : <>
          <Text style={{ color: c.muted, marginBottom: 12 }}>Device-local inventory drafts. Stock changes are not synced to any branch. No supplier orders are sent.</Text>
          {!!error && <Text accessibilityRole="alert" style={{ color: c.danger, marginBottom: 12 }}>{error}</Text>}
          {showAdd && canWrite && <View style={{ gap: 10, marginBottom: 16 }}>
            <Text style={[s.emptyTitle, { color: c.text }]}>New inventory draft</Text>
            {([
              ['name', 'Item name'], ['sku', 'SKU'], ['quantity', 'Quantity'], ['minQuantity', 'Minimum quantity'],
              ['unitPrice', 'Unit price in QAR'], ['unit', 'Unit'], ['supplier', 'Supplier (optional)'],
            ] as const).map(([key, label]) => <View key={key} style={{ gap: 4 }}>
              <Text style={{ color: c.textSecondary }}>{label}</Text>
              <TextInput accessibilityLabel={label} value={draft[key]} maxLength={key === 'name' ? 200 : 100}
                keyboardType={key === 'unitPrice' ? 'decimal-pad' : key === 'quantity' || key === 'minQuantity' ? 'number-pad' : 'default'}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
                style={[s.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
            </View>)}
            <Text style={{ color: c.textSecondary }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.filter((cat) => cat !== 'All').map((cat) => <Pressable key={cat}
                accessibilityRole="radio" accessibilityState={{ checked: category === cat }} onPress={() => setCategory(cat)}
                style={[s.catChip, { borderColor: c.border, backgroundColor: category === cat ? c.primaryLight : c.surface }]}>
                <Text style={{ color: c.text }}>{cat}</Text>
              </Pressable>)}
            </View>
            <Pressable accessibilityRole="button" onPress={handleAddItem} style={[s.formButton, { backgroundColor: c.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Add inventory draft</Text>
            </Pressable>
          </View>}
          <View style={[s.search, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="search-outline" size={18} color={c.muted} />
            <TextInput accessibilityLabel="Search inventory by name or SKU" placeholder="Search part, SKU or supplier" placeholderTextColor={c.muted}
              value={query} onChangeText={setQuery} style={{ flex: 1, minWidth: 0, color: c.text, minHeight: 44, fontFamily: 'VendorBody' }} />
          </View>
          <View style={s.stockFilters}>
            {(['All stock', 'Low stock', 'Out of stock'] as const).map((filter) => <Pressable key={filter} accessibilityRole="tab"
              accessibilityState={{ selected: stockFilter === filter }} onPress={() => setStockFilter(filter)}
              style={[s.catChip, { backgroundColor: stockFilter === filter ? c.primaryLight : c.surface, borderColor: stockFilter === filter ? c.primary : c.border }]}>
              <Text style={{ color: c.text }}>{filter}</Text>
            </Pressable>)}
          </View>
          {/* Summary */}
          <View style={s.summaryRow}>
            {[
              { label: 'Total Items', value: String(inventory.length), color: c.text },
              { label: 'Low / depleted', value: String(lowStock.length), color: c.warning },
              { label: 'Out of stock', value: String(inventory.filter((item) => item.quantity === 0).length), color: c.danger },
              { label: 'Total Value', value: `QAR ${inventory.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}`, color: c.success },
            ].map((stat) => (
              <View key={stat.label} style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text telemetry style={[s.summaryValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[s.summaryLabel, { color: c.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.matrixHeader}>
            <Text heading style={[s.emptyTitle, { color: c.text }]}>Depot Stock Matrix</Text>
            <Text telemetry style={{ color: c.muted }}>{filtered.length} displayed</Text>
          </View>
          {/* Items */}
          {filtered.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="cube-outline" size={36} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>No items</Text>
              <Text style={[s.emptyText, { color: c.muted }]}>No inventory drafts match these filters.</Text>
            </View>
          )}
          <View style={s.itemGrid}>
            {filtered.map((item) => {
              const isLow = item.quantity <= item.minQuantity;
              const isOut = item.quantity === 0;

              return (
                <View
                  key={item.id}
                  style={[
                    s.itemCard,
                    {
                      backgroundColor: c.surface,
                      borderColor: isOut ? '#EF444440' : isLow ? '#F59E0B30' : c.border,
                    },
                  ]}
                >
                  <View style={s.itemTop}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.itemName, { color: c.text }]}>{item.name}</Text>
                      <Text telemetry style={[s.itemSku, { color: c.muted }]}>{item.sku}</Text>
                      <View style={s.itemMeta}>
                        <View style={[s.catTag, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                          <Text style={[s.catTagText, { color: c.textSecondary }]}>{item.category}</Text>
                        </View>
                        <Text style={[s.supplier, { color: c.muted }]}>{item.supplier}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[s.unitPrice, { color: c.text }]}>QAR {item.unitPrice}/{item.unit}</Text>
                      {(isLow || isOut) && (
                        <View style={[s.stockAlert, { backgroundColor: isOut ? '#EF444420' : '#F59E0B20' }]}>
                          <Text style={[s.stockAlertText, { color: isOut ? c.danger : c.warning }]}>
                            {isOut ? 'Out of stock' : 'Low stock'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={[s.itemFooter, { borderTopColor: c.border }]}>
                    {/* Qty control */}
                    <View style={s.qtyControl}>
                      {canWrite && <Pressable
                        style={[s.qtyBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                        onPress={() => handleAdjust(item.id, item.name, -1)}
                        accessible accessibilityRole="button" accessibilityLabel={`Decrease ${item.name} quantity`}
                        disabled={isOut} accessibilityState={{ disabled: isOut }}
                      >
                        <Ionicons name="remove" size={14} color={c.text} />
                      </Pressable>}
                      <Text accessibilityLiveRegion="polite" style={[s.qtyValue, { color: c.text }]}>{item.quantity}</Text>
                      {canWrite && <Pressable
                        style={[s.qtyBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                        onPress={() => handleAdjust(item.id, item.name, 1)}
                        accessible accessibilityRole="button" accessibilityLabel={`Increase ${item.name} quantity`}
                        disabled={item.quantity >= 1000000} accessibilityState={{ disabled: item.quantity >= 1000000 }}
                      >
                        <Ionicons name="add" size={14} color={c.text} />
                      </Pressable>}
                    </View>
                    <Text style={[s.minQty, { color: c.muted }]}>Min: {item.minQuantity}</Text>
                    <Text style={[s.restocked, { color: c.muted }]}>Restocked: {item.lastRestocked}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          </>}
        </MotionScreen>
      </ScrollView>
      </KeyboardAvoidingView>
      <VendorTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  exportBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  search: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  stockFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
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
  input: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  formButton: { minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.page, paddingVertical: 10, borderBottomWidth: 1,
  },
  alertText: { fontSize: 13, fontWeight: '700', flex: 1 },

  catBar: { flexGrow: 0 },
  catBarContent: { paddingHorizontal: spacing.page, paddingVertical: 12, gap: 12 },
  catChip: {
    minHeight: 44, minWidth: 76, paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  catChipText: { fontSize: 13, fontWeight: '700' },

  content: { padding: spacing.page, gap: 14, width: '100%', maxWidth: 1600, alignSelf: 'center' },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    flexGrow: 1, flexBasis: 100, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 4,
  },
  summaryValue: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  itemCard: { flexBasis: 340, flexGrow: 1, flexShrink: 1, minWidth: 0, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  itemTop: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 10 },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemSku: { fontSize: 12, fontWeight: '600' },
  itemMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  catTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  catTagText: { fontSize: 12, fontWeight: '700' },
  supplier: { fontSize: 12, fontWeight: '500' },
  unitPrice: { fontSize: 13, fontWeight: '800' },
  stockAlert: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  stockAlertText: { fontSize: 12, fontWeight: '800' },

  itemFooter: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },

  qtyBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 15, fontWeight: '900', minWidth: 28, textAlign: 'center' },
  minQty: { fontSize: 12, fontWeight: '600' },
  restocked: { fontSize: 12, fontWeight: '500', flex: 1 },
});
