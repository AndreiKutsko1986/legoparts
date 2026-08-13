import { useCallback, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export function useTableSort<T extends string>(defaultColumn: T, defaultDirection: SortDirection = 'asc') {
  const [sortColumn, setSortColumn] = useState<T>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const toggleSort = useCallback((column: T) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  }, [sortColumn]);

  const getSortIndicator = useCallback(
    (column: T) => {
      if (sortColumn !== column) {
        return '↕';
      }

      return sortDirection === 'asc' ? '↑' : '↓';
    },
    [sortColumn, sortDirection],
  );

  const resetSort = useCallback(() => {
    setSortColumn(defaultColumn);
    setSortDirection(defaultDirection);
  }, [defaultColumn, defaultDirection]);

  return {
    sortColumn,
    sortDirection,
    toggleSort,
    getSortIndicator,
    resetSort,
  };
}
