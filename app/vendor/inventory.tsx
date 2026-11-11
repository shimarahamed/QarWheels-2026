import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useVendorTabBottom } from '@/components/VendorTabBar';
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
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: '', sku: '', quantity: '0', minQuantity: '1', unitPrice: '', unit: 'piece', supplier: '' });
  const [category, setCategory] = useState('Accessories');
  const [error, setError] = useState('');
  const submitted = useRef(false);

  const filtered = activeCategory === 'All' ? inventory : inventory.filter((i) => i.category === activeCategory);
  const lowStock = inventory.filter((i) => i.quantity <= i.minQuantity);

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
        <Text style={[s.navTitle, { color: c.text }]}>Inventory</Text>
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
          <Ionicons name="warning-outline" size={16} color="#F59E0B" />
          <Text style={[s.alertText, { color: '#F59E0B' }]}>
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
          {/* Summary */}
          <View style={s.summaryRow}>
            {[
              { label: 'Total Items', value: String(inventory.length), color: c.text },
              { label: 'Low Stock', value: String(lowStock.length), color: '#F59E0B' },
              { label: 'Total Value', value: `QAR ${inventory.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}`, color: c.success },
            ].map((stat) => (
              <View key={stat.label} style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.summaryValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[s.summaryLabel, { color: c.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Items */}
          {filtered.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="cube-outline" size={36} color={c.muted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>No items</Text>
              <Text style={[s.emptyText, { color: c.muted }]}>No {activeCategory === 'All' ? '' : `${activeCategory} `}inventory items found.</Text>
            </View>
          )}
          <View style={{ gap: 10 }}>
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
                      <Text style={[s.itemSku, { color: c.muted }]}>{item.sku}</Text>
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
                          <Text style={[s.stockAlertText, { color: isOut ? '#EF4444' : '#F59E0B' }]}>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page, 
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navTitle: { ...typography.h3 },
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

  content: { padding: spacing.page, gap: spacing.gap },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    flexGrow: 1, flexBasis: 100, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 4, ...shadow.xs,
  },
  summaryValue: { ...typography.h4 },
  summaryLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  itemCard: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  itemTop: { flexDirection: 'row', padding: 14, gap: 10 },
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

  qtyBtn: { width: 44, height: 44, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 15, fontWeight: '900', minWidth: 28, textAlign: 'center' },
  minQty: { fontSize: 12, fontWeight: '600' },
  restocked: { fontSize: 12, fontWeight: '500', flex: 1 },
});
