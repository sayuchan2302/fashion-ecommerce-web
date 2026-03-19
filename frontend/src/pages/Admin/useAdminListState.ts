import { useEffect, useMemo, useState } from 'react';
import { useAdminPagination } from './useAdminPagination';

type SortDirection = 'asc' | 'desc';

interface UseAdminListStateOptions<T> {
  items: T[];
  pageSize?: number;
  initialSearch?: string;
  getSearchText: (item: T) => string;
  filterPredicate?: (item: T) => boolean;
  sorters?: Record<string, (a: T, b: T) => number>;
  initialSortKey?: string | null;
  initialSortDirection?: SortDirection;
  loadingDelayMs?: number;
  loadingDeps?: readonly unknown[];
}

export const useAdminListState = <T,>({
  items,
  pageSize = 10,
  initialSearch = '',
  getSearchText,
  filterPredicate,
  sorters,
  initialSortKey = null,
  initialSortDirection = 'asc',
  loadingDelayMs = 220,
  loadingDeps = [],
}: UseAdminListStateOptions<T>) => {
  const [search, setSearch] = useState(initialSearch);
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [isLoading, setIsLoading] = useState(true);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let next = items.filter((item) => {
      if (filterPredicate && !filterPredicate(item)) return false;
      if (!keyword) return true;
      return getSearchText(item).toLowerCase().includes(keyword);
    });

    if (sortKey && sorters && sorters[sortKey]) {
      const sorter = sorters[sortKey];
      next = [...next].sort((a, b) => {
        const result = sorter(a, b);
        return sortDirection === 'asc' ? result : -result;
      });
    }

    return next;
  }, [items, filterPredicate, getSearchText, search, sortKey, sorters, sortDirection]);

  const pagination = useAdminPagination(filteredItems, pageSize);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), loadingDelayMs);
    return () => clearTimeout(timer);
  }, [search, sortKey, sortDirection, loadingDelayMs, ...loadingDeps]);

  const toggleSort = (key: string) => {
    if (!sorters || !sorters[key]) return;
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection('asc');
      return;
    }
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const clearFilters = () => {
    setSearch('');
    setSortKey(initialSortKey);
    setSortDirection(initialSortDirection);
  };

  return {
    search,
    setSearch,
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    toggleSort,
    isLoading,
    filteredItems,
    ...pagination,
    clearFilters,
  };
};
