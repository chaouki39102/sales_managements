// DataTable/internal/useSavedViewsState.ts — saved views menu + save dialog
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SavedView } from '../types';
import { useSavedViews } from '../hooks';
import type { ResolvedProps } from './resolveProps';
import type { URLState } from './useDataTableState';
import type { SearchFilterSortState } from './useSearchFilterSort';
import type { PaginationState } from './usePagination';
import type { ColumnVisibilityState } from './useColumnVisibilityState';
import type { ColumnArrangementState } from './useColumnArrangement';

type Params<T> =
  Pick<ResolvedProps<T>, 'enableSavedViews' | 'savedViewsConfig' | 'urlState'>
  & { url: URLState }
  & Pick<SearchFilterSortState<T>, 'filters' | 'sorts' | 'globalQuery' | 'setFilters' | 'setSorts' | 'setGlobalQuery' | 'setLocalPerPage' | 'setLocalPage'>
  & Pick<PaginationState<T>, 'perPage'>
  & Pick<ColumnVisibilityState<T>, 'hiddenKeys' | 'updateHidden'>
  & Pick<ColumnArrangementState<T>, 'orderedColumns' | 'pinConfig' | 'setColumnOrder' | 'setPinConfigBatch'>;

export function useSavedViewsState<T>(p: Params<T>) {
  const {
    enableSavedViews, savedViewsConfig, urlState, url, filters, sorts,
    globalQuery, setFilters, setSorts, setGlobalQuery, setLocalPerPage, setLocalPage,
    perPage, hiddenKeys, updateHidden, orderedColumns, pinConfig, setColumnOrder,
    setPinConfigBatch,
  } = p;

  // ── Saved Views 🆕 ────────────────────────────────────────────────────────
  const { loadViews, saveView, deleteView } = useSavedViews(
    enableSavedViews && savedViewsConfig ? savedViewsConfig : { tableKey: 'default' },
  );
  const [savedViewsList, setSavedViewsList] = useState<SavedView[]>([]);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const viewsMenuRef    = useRef<HTMLDivElement>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);

  useEffect(() => {
    if (!viewsMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (viewsMenuRef.current && !viewsMenuRef.current.contains(e.target as Node))
        setViewsMenuOpen(false);
    };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [viewsMenuOpen]);
  const [saveViewName, setSaveViewName] = useState('');
  const saveViewInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (enableSavedViews) setSavedViewsList(loadViews());
  }, [enableSavedViews, loadViews]);

  const handleSaveCurrentView = useCallback(() => {
    setSaveViewDialogOpen(true);
    setSaveViewName('');
    setTimeout(() => saveViewInputRef.current?.focus(), 50);
  }, []);

  const commitSaveView = useCallback(() => {
    const name = saveViewName.trim();
    if (!name) return;
    saveView(name, {
      filters,
      sorts,
      searchQuery: globalQuery,
      pageSize: perPage,
      hiddenColumns: Array.from(hiddenKeys),
      columnOrder: orderedColumns.map(c => c.key),
      pinnedColumns: pinConfig,
    });
    setSavedViewsList(loadViews());
    setSaveViewDialogOpen(false);
    setSaveViewName('');
  }, [
    saveViewName,
    filters,
    sorts,
    globalQuery,
    perPage,
    hiddenKeys,
    orderedColumns,
    pinConfig,
    saveView,
    loadViews,
  ]);

  const handleApplyView = useCallback(
    (view: SavedView) => {
      // ✅ إصلاح: تطبيق كامل الحالة المحفوظة (كانت تُطبق نصف الحالة فقط)
      setFilters(view.filters);
      setSorts(view.sorts);
      setGlobalQuery(view.searchQuery);

      // pageSize
      if (view.pageSize) setLocalPerPage(view.pageSize);

      // hiddenColumns — كامل + إعلام الأب
      updateHidden(new Set(view.hiddenColumns ?? []));

      // columnOrder — كامل
      if (view.columnOrder?.length) setColumnOrder(view.columnOrder);

      // pinnedColumns — batch update بـ setState واحد (تجنب renders متعددة)
      setPinConfigBatch(view.pinnedColumns ?? {});

      setLocalPage(1);
      if (urlState?.enabled) {
        url.writeFilters(view.filters);
        url.writeSort(view.sorts);
        url.writeSearch(view.searchQuery);
        url.writePage(1);
      }
      setViewsMenuOpen(false);
    },
    [
      setFilters, setSorts, setGlobalQuery,
      setLocalPerPage, updateHidden,
      setColumnOrder, setPinConfigBatch,
      setLocalPage, url, urlState,
    ],
  );

  return {
    loadViews, deleteView, savedViewsList, setSavedViewsList, viewsMenuOpen, setViewsMenuOpen,
    viewsMenuRef, saveViewDialogOpen, setSaveViewDialogOpen, saveViewName, setSaveViewName, saveViewInputRef,
    handleSaveCurrentView, commitSaveView, handleApplyView,
  };
}

export type SavedViewsState<T> = ReturnType<typeof useSavedViewsState<T>>;
