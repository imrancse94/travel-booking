'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from './usePagination.js';
import { useDebounce } from './useDebounce.js';
import { useToast } from '../components/ui/index.js';
import { compactParams } from '../utils/queryParams.js';

/**
 * Composes usePagination + useDebounce + fetch/loading/error state for a
 * typical admin list page. `fetcher` is a services/*Service.js list function
 * that takes a params object and resolves to the `{ data, meta }` envelope.
 *
 * Example:
 *   const list = useResourceList({ fetcher: bookingService.list, initialFilters: { status: '' } });
 *   <SearchFilterBar search={list.search} onSearchChange={list.setSearch}>
 *     <Select value={list.filters.status} onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })} .../>
 *   </SearchFilterBar>
 *   <Table rows={list.rows} loading={list.loading} sort={list.sort} onSortChange={list.setSort} .../>
 *   <Pagination page={list.page} limit={list.limit} total={list.meta.total} totalPages={list.meta.totalPages} onPageChange={list.setPage} />
 */
export function useResourceList({ fetcher, initialFilters = {}, initialSort = null, limit: initialLimit = 20 }) {
  const { page, limit, setPage, setLimit, reset } = usePagination(initialLimit);
  const [search, setSearchState] = useState('');
  const [filters, setFiltersState] = useState(initialFilters);
  const [sort, setSort] = useState(initialSort);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: initialLimit, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { show } = useToast();

  const debouncedSearch = useDebounce(search, 400);

  const setSearch = useCallback(
    (value) => {
      setSearchState(value);
      reset();
    },
    [reset]
  );

  const setFilters = useCallback(
    (next) => {
      setFiltersState(next);
      reset();
    },
    [reset]
  );

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const params = useMemo(() => {
    // compactParams drops unselected filters (empty strings), which the API's
    // query validators would otherwise reject with a 422 -- surfacing as an
    // inexplicably empty table.
    const p = compactParams({ page, limit, ...filters });
    if (debouncedSearch) p.search = debouncedSearch;
    if (sort) {
      p.sortBy = sort.key;
      p.sortDir = sort.dir;
    }
    return p;
  }, [page, limit, filters, debouncedSearch, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher(params)
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
        if (res?.meta?.pagination) setMeta(res.meta.pagination);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        // Without this a failed fetch is indistinguishable from an empty
        // result set -- the table just renders its empty state.
        show(err.message || 'Could not load this list', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // fetcher is expected to be a stable module-level function reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, reloadToken]);

  return {
    rows,
    meta,
    loading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    filters,
    setFilters,
    sort,
    setSort,
    reload,
  };
}

export default useResourceList;
