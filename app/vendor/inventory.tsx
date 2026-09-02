import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore, useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useVendorTabBottom } from '@/components/VendorTabBar';

const CATEGORIES = ['All', 'Fluids', 'Filters', 'Brakes', 'Electrical', 'Ignition', 'Accessories'];

export default function InventoryScreen() {
  const c = useQarColors();
  const vendorTabBottom = useVendorTabBottom();
  const inventory = useQarWheelStore((s) => s.vendorInventory);
  const updateQty = useQarWheelStore((s) => s.updateVendorInventoryQty);
  const addInventoryItem = useQarWheelStore((s) => s.addVendorInventoryItem);
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All' ? inventory : inventory.filter((i) => i.category === activeCategory);
  const lowStock = inventory.filter((i) => i.quantity <= i.minQuantity);

  function handleAdjust(itemId: string, itemName: string, delta: number) {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    if (delta < 0 && item.quantity === 0) {
      Alert.alert('Out of stock', `${itemName} is already at 0.`);
      return;
    }
    updateQty(itemId, delta);
  }

  function handleAddItem() {
    const item = addInventoryItem({
      sku: `PART-${Date.now().toString().slice(-5)}`,
      name: 'New inventory item',
      category: activeCategory === 'All' ? 'Accessories' : activeCategory,
      quantity: 1,
      minQuantity: 1,
      unitPrice: 0,
      unit: 'piece',
      supplier: 'Unassigned supplier',
    });
    Alert.alert('Inventory item added', `${item.name} was added. Adjust quantity now, then rename it when the edit form is added.`);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Inventory</Text>
        <Pressable
          style={[s.addBtn, { backgroundColor: c.primary }]}
          onPress={handleAddItem}
          accessible accessibilityRole="button" accessibilityLabel="Add inventory item"
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <View style={[s.alertBanner, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B30', marginTop: 60 }]}>
          <Ionicons name="warning-outline" size={16} color="#F59E0B" />
          <Text style={[s.alertText, { color: '#F59E0B' }]}>
            {lowStock.length} item{lowStock.length > 1 ? 's' : ''} low or out of stock — reorder needed
          </Text>
        </View>
      )}

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.catBar, { paddingTop: lowStock.length === 0 ? 60 : 0 }]} contentContainerStyle={s.catBarContent}>
        {CATEGORIES.map((cat) => {
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
                      <Pressable
                        style={[s.qtyBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                        onPress={() => handleAdjust(item.id, item.name, -1)}
                        accessible accessibilityRole="button" accessibilityLabel={`Decrease ${item.name} quantity`}
                      >
                        <Ionicons name="remove" size={14} color={c.text} />
                      </Pressable>
                      <Text style={[s.qtyValue, { color: c.text }]}>{item.quantity}</Text>
                      <Pressable
                        style={[s.qtyBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                        onPress={() => handleAdjust(item.id, item.name, 1)}
                        accessible accessibilityRole="button" accessibilityLabel={`Increase ${item.name} quantity`}
                      >
                        <Ionicons name="add" size={14} color={c.text} />
                      </Pressable>
                    </View>
                    <Text style={[s.minQty, { color: c.muted }]}>Min: {item.minQuantity}</Text>
                    <Text style={[s.restocked, { color: c.muted }]}>Restocked: {item.lastRestocked}</Text>
                    <Pressable
                      style={[s.reorderBtn, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}
                      onPress={() => Alert.alert('Reorder', `Reorder request sent for ${item.name}.`)}
                    >
                      <Text style={[s.reorderText, { color: c.primary }]}>Reorder</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

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

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.page, paddingVertical: 10, borderBottomWidth: 1,
  },
  alertText: { fontSize: 13, fontWeight: '700', flex: 1 },

  catBar: { flexGrow: 0 },
  catBarContent: { paddingHorizontal: spacing.page, paddingVertical: 12, gap: 12 },
  catChip: {
    minHeight: 42, minWidth: 76, paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  catChipText: { fontSize: 13, fontWeight: '700' },

  content: { padding: spacing.page, gap: spacing.gap },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 4, ...shadow.xs,
  },
  summaryValue: { ...typography.h4 },
  summaryLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  itemCard: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  itemTop: { flexDirection: 'row', padding: 14, gap: 10 },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemSku: { fontSize: 12, fontWeight: '600' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  catTagText: { fontSize: 12, fontWeight: '700' },
  supplier: { fontSize: 12, fontWeight: '500' },
  unitPrice: { fontSize: 13, fontWeight: '800' },
  stockAlert: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  stockAlertText: { fontSize: 12, fontWeight: '800' },

  itemFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },

  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 15, fontWeight: '900', minWidth: 28, textAlign: 'center' },
  minQty: { fontSize: 12, fontWeight: '600' },
  restocked: { fontSize: 12, fontWeight: '500', flex: 1 },
  reorderBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  reorderText: { fontSize: 12, fontWeight: '800' },
});
