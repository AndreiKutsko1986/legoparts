const columnWidthStore = new Map<string, number[]>();

export function getAdminTableColumnWidths(tableKey: string, defaultWidths: readonly number[]): number[] {
  const stored = columnWidthStore.get(tableKey);
  if (stored && stored.length === defaultWidths.length) {
    return [...stored];
  }

  return [...defaultWidths];
}

export function setAdminTableColumnWidths(tableKey: string, widths: number[]) {
  columnWidthStore.set(tableKey, [...widths]);
}

export function clearAdminTableColumnWidths(tableKey: string) {
  columnWidthStore.delete(tableKey);
}

export const ADMIN_TABLE_KEYS = {
  categories: 'admin-table-categories',
  subcategories: 'admin-table-subcategories',
  products: 'admin-table-products',
  orders: 'admin-table-orders',
} as const;
