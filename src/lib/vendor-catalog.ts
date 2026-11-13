import type { InventoryItem, Service } from '@/lib/types';

export type StockFilter = 'all' | 'low' | 'out' | 'available';

export function filterVendorInventory<T extends InventoryItem>(items: readonly T[], search: string, stock: StockFilter): T[] {
  const query = search.trim().toLowerCase();
  return items.filter((item) =>
    (stock === 'all' || (stock === 'low' && item.stock < 10) || (stock === 'out' && item.stock === 0) || (stock === 'available' && item.stock > 0)) &&
    [item.name, item.sku, item.supplier].some((value) => typeof value === 'string' && value.toLowerCase().includes(query)));
}

export function filterVendorServices<T extends Service>(services: readonly T[], search: string, category: string): T[] {
  const query = search.trim().toLowerCase();
  return services.filter((service) => (!category || service.category === category) &&
    [service.name, service.description, service.category].some((value) => typeof value === 'string' && value.toLowerCase().includes(query)));
}
