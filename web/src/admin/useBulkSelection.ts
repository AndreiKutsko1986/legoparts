import { useCallback, useMemo, useState } from 'react';

export function useBulkSelection(itemIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((current) => (current.length === itemIds.length ? [] : [...itemIds]));
  }, [itemIds]);

  const clear = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const pruneMissing = useCallback((nextItemIds: string[]) => {
    const allowed = new Set(nextItemIds);
    setSelectedIds((current) => current.filter((id) => allowed.has(id)));
  }, []);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    isSelected: (id: string) => selectedSet.has(id),
    allSelected: itemIds.length > 0 && selectedIds.length === itemIds.length,
    someSelected: selectedIds.length > 0,
    toggle,
    toggleAll,
    clear,
    pruneMissing,
  };
}
