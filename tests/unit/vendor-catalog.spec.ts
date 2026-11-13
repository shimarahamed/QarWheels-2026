import { describe, expect, it } from 'vitest';
import { filterVendorInventory, filterVendorServices } from '@/lib/vendor-catalog';
import type { InventoryItem, Service } from '@/lib/types';

const inventory = [
  { name: 'Brake pads', sku: 'BR-001', supplier: 'Parts Depot', stock: 0, price: 120, businessId: 'business', branchId: 'branch' },
  { name: 'Engine oil', sku: 'OL-002', supplier: 'Oil Supply', stock: 9, price: 40, businessId: 'business', branchId: 'branch' },
  { name: 'Air filter', sku: 'AF-003', supplier: 'Parts Depot', stock: 10, price: 65, businessId: 'business', branchId: 'branch' },
];
const services = [
  { name: 'Oil change', description: 'Engine oil and filter replacement', category: 'Maintenance', active: true, duration: 30, price: 200, businessId: 'business', branchId: 'branch' },
  { name: 'Brake inspection', description: 'Safety check', category: 'Brakes', active: true, duration: 45, price: 150, businessId: 'business', branchId: 'branch' },
  { name: 'Diagnostic check', description: 'Fault code scan', active: false, duration: 20, price: 100, businessId: 'business', branchId: 'branch' },
];

describe('vendor catalog filters', () => {
  it('combines stock scope with case-insensitive name, SKU and supplier searches', () => {
    expect(filterVendorInventory(inventory, '  br-001 ', 'all')).toEqual([inventory[0]]);
    expect(filterVendorInventory(inventory, 'PARTS DEPOT', 'available')).toEqual([inventory[2]]);
    expect(filterVendorInventory(inventory, 'oil', 'low')).toEqual([inventory[1]]);
    expect(filterVendorInventory(inventory, 'missing', 'all')).toEqual([]);
  });

  it('keeps the low-stock boundary explicit and preserves source order', () => {
    expect(filterVendorInventory(inventory, '', 'all')).toEqual(inventory);
    expect(filterVendorInventory(inventory, '', 'low')).toEqual(inventory.slice(0, 2));
    expect(filterVendorInventory(inventory, '', 'out')).toEqual([inventory[0]]);
    expect(filterVendorInventory(inventory, '', 'available')).toEqual(inventory.slice(1));
  });

  it('combines exact service category with name or description search', () => {
    expect(filterVendorServices(services, '  FILTER ', 'Maintenance')).toEqual([services[0]]);
    expect(filterVendorServices(services, 'brakes', '')).toEqual([services[1]]);
    expect(filterVendorServices(services, 'oil', 'Brakes')).toEqual([]);
    expect(filterVendorServices(services, '', '')).toEqual(services);
    expect(filterVendorServices(services, 'SCAN', '')).toEqual([services[2]]);
  });

  it('handles legacy records without supplier, description or category', () => {
    const legacyInventory = [{ name: 'Brake pads', sku: 'BR-001', stock: 3, price: 120 }] as InventoryItem[];
    const legacyServices = [{ name: 'Oil change', duration: 30, price: 200 }] as Service[];
    expect(filterVendorInventory(legacyInventory, 'missing', 'all')).toEqual([]);
    expect(filterVendorInventory(legacyInventory, '', 'low')).toEqual(legacyInventory);
    expect(filterVendorInventory(legacyInventory, 'br-001', 'all')).toEqual(legacyInventory);
    expect(filterVendorServices(legacyServices, 'missing', '')).toEqual([]);
    expect(filterVendorServices(legacyServices, '', '')).toEqual(legacyServices);
    expect(filterVendorServices(legacyServices, 'oil', '')).toEqual(legacyServices);
  });
});
