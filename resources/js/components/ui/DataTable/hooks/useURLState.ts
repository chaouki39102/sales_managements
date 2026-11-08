// DataTable/hooks/useURLState.ts

import { useCallback } from 'react';
import type { MultiSortState, URLStateConfig, FilterMap } from '../types';

export function useURLState(config: URLStateConfig | undefined) {
  const prefix = config?.prefix ?? 'dt';
  const buildKey = useCallback((name: string) => `${prefix}_${name}`, [prefix]);
  const read = useCallback((name: string): string => {
    if (!config?.enabled || typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get(buildKey(name)) ?? '';
  }, [config?.enabled, buildKey]);
  const write = useCallback((updates: Record<string, string>) => {
    if (!config?.enabled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([name, value]) => {
      const k = buildKey(name);
      if (value) params.set(k, value); else params.delete(k);
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [config?.enabled, buildKey]);
  const clear = useCallback(() => {
    if (!config?.enabled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    [...params.keys()].filter(k => k.startsWith(`${prefix}_`)).forEach(k => params.delete(k));
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [config?.enabled, prefix]);
  const readInitialFilters = useCallback((): FilterMap => {
    if (!config?.enabled || !config?.filters) return {};
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const filterPfx = buildKey('f_');
    const result: FilterMap = {};
    params.forEach((value, key) => { if (key.startsWith(filterPfx)) result[key.slice(filterPfx.length)] = value; });
    return result;
  }, [config?.enabled, config?.filters, buildKey]);
  const readInitialSort = useCallback((): MultiSortState => {
    if (!config?.enabled || !config?.sort) return [];
    const raw = read('sort');
    if (!raw) return [];
    return raw.split(',').map(s => {
      const [key, dir] = s.split(':');
      return { key, dir: (dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc' };
    }).filter(s => s.key);
  }, [config?.enabled, config?.sort, read]);
  const readInitialPage = useCallback((): number => {
    if (!config?.enabled || !config?.page) return 1;
    const n = parseInt(read('page'), 10);
    return isNaN(n) || n < 1 ? 1 : n;
  }, [config?.enabled, config?.page, read]);
  const readInitialSearch = useCallback((): string => {
    if (!config?.enabled || !config?.search) return '';
    return read('q');
  }, [config?.enabled, config?.search, read]);
  const writeFilters = useCallback((filters: FilterMap) => {
    if (!config?.filters) return;
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const filterPfx = buildKey('f_');
    [...params.keys()].filter(k => k.startsWith(filterPfx)).forEach(k => params.delete(k));
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(`${filterPfx}${k}`, v); });
    if (typeof window !== 'undefined') window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [config?.filters, buildKey]);
  const writeSort = useCallback((sorts: MultiSortState) => {
    if (!config?.sort) return;
    write({ sort: sorts.map(s => `${s.key}:${s.dir}`).join(',') });
  }, [config?.sort, write]);
  const writePage = useCallback((page: number) => {
    if (!config?.page) return;
    write({ page: page > 1 ? String(page) : '' });
  }, [config?.page, write]);
  const writeSearch = useCallback((q: string) => {
    if (!config?.search) return;
    write({ q });
  }, [config?.search, write]);
  return {
    enabled: config?.enabled ?? false,
    readInitialFilters, readInitialSort, readInitialPage, readInitialSearch,
    writeFilters, writeSort, writePage, writeSearch, clear,
  };
}
