// DataTable/internal/useSmartFilterDialog.ts — Arabic smart filter dialog
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSmartFilter } from '../hooks';
import type { ResolvedProps } from './resolveProps';
import type { URLState } from './useDataTableState';
import type { VisibleColumnsAndAggregatesState } from './useVisibleColumnsAndAggregates';
import type { SearchFilterSortState } from './useSearchFilterSort';

type Params<T> =
  Pick<ResolvedProps<T>, 'smartFilterPatterns' | 'onSmartFilterApply' | 'urlState'>
  & { url: URLState }
  & Pick<VisibleColumnsAndAggregatesState<T>, 'allColDefs'>
  & Pick<SearchFilterSortState<T>, 'setFilters' | 'setSorts' | 'setLocalPage'>;

export function useSmartFilterDialog<T>(p: Params<T>) {
  const {
    smartFilterPatterns, onSmartFilterApply, urlState, url, allColDefs, setFilters,
    setSorts, setLocalPage,
  } = p;

  // ── Smart Filter + Saved Views — Dialog states (يجب قبل الـ callbacks) ────
  const [smartFilterOpen, setSmartFilterOpen] = useState(false);
  const [smartFilterInput, setSmartFilterInput] = useState('');
  const smartFilterRef = useRef<HTMLDivElement>(null);
  const smartInputRef = useRef<HTMLInputElement>(null);

  // Smart Filter (اللغة العربية) 🆕 ───────────────────────────────────────
  const { applySmartFilter } = useSmartFilter(allColDefs, (newFilters, newSorts) => {
    setFilters(newFilters);
    if (newSorts) setSorts(newSorts);
    setLocalPage(1);
    if (urlState?.enabled) {
      url.writeFilters(newFilters);
      if (newSorts) url.writeSort(newSorts);
    }
  }, smartFilterPatterns);

  const handleSmartFilter = useCallback(() => {
    setSmartFilterOpen(true);
    setTimeout(() => smartInputRef.current?.focus(), 50);
  }, []);

  const submitSmartFilter = useCallback(() => {
    const q = smartFilterInput.trim();
    if (!q) return;
    const result = applySmartFilter(q);
    onSmartFilterApply?.(q, result
      ? { success: true,  filters: result.filters ?? {}, sort: result.sort ?? [] }
      : { success: false, filters: {},                   sort: [] }
    );
    setSmartFilterOpen(false);
    setSmartFilterInput('');
  }, [smartFilterInput, applySmartFilter, onSmartFilterApply]);

  const closeSmartFilter = useCallback(() => {
    setSmartFilterOpen(false);
    setSmartFilterInput('');
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!smartFilterOpen) return;
    const handler = (e: MouseEvent) => {
      if (smartFilterRef.current && !smartFilterRef.current.contains(e.target as Node)) {
        closeSmartFilter();
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [smartFilterOpen, closeSmartFilter]);

  return {
    smartFilterOpen, smartFilterInput, setSmartFilterInput, smartFilterRef, smartInputRef, handleSmartFilter,
    submitSmartFilter, closeSmartFilter,
  };
}

export type SmartFilterDialogState<T> = ReturnType<typeof useSmartFilterDialog<T>>;
