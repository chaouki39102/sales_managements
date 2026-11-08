// DataTable/internal/useTableContextMenu.ts — right-click context menu
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useCallback } from 'react';
import type { Column, ContextMenuContext, ContextMenuItem } from '../types';
import { getRawValue } from '../utils';
import { useContextMenu, useEscapeKey } from '../hooks';
import type { ResolvedProps } from './resolveProps';
import type { ColumnVisibilityState } from './useColumnVisibilityState';
import type { ColumnArrangementState } from './useColumnArrangement';
import type { SearchFilterSortState } from './useSearchFilterSort';
import type { VisibleColumnsAndAggregatesState } from './useVisibleColumnsAndAggregates';
import type { SelectionAndExpandState } from './useSelectionAndExpand';
import type { CellEditingState } from './useCellEditing';
import type { NavigationAndClipboardState } from './useNavigationAndClipboard';

type Params<T> =
  Pick<ResolvedProps<T>, 'data' | 'rowKey' | 'enableContextMenu' | 'contextMenuItems'>
  & Pick<ColumnVisibilityState<T>, 'toggleColVisibility'>
  & Pick<ColumnArrangementState<T>, 'pinColumn'>
  & Pick<SearchFilterSortState<T>, 'setFilters'>
  & Pick<VisibleColumnsAndAggregatesState<T>, 'allColDefs'>
  & Pick<SelectionAndExpandState<T>, 'selectedKeys' | 'toggleExpanded'>
  & Pick<CellEditingState<T>, 'startEdit'>
  & Pick<NavigationAndClipboardState<T>, 'tableWrapRef'>;

export function useTableContextMenu<T>(p: Params<T>) {
  const {
    data, rowKey, enableContextMenu, contextMenuItems, toggleColVisibility, pinColumn,
    setFilters, allColDefs, selectedKeys, toggleExpanded, startEdit, tableWrapRef,
  } = p;

  // ── Context Menu 🆕 ───────────────────────────────────────────────────────
  const defaultContextMenuItems = useCallback(
    (ctx: ContextMenuContext): ContextMenuItem[] => {
      const items: ContextMenuItem[] = [];
      if (ctx.type === 'cell') {
        items.push(
          {
            label: 'نسخ القيمة',
            icon: 'copy',
            onClick: c => {
              if (c.value) navigator.clipboard.writeText(String(c.value));
            },
          },
          { divider: true },
          {
            label: 'فلتر بنفس القيمة',
            icon: 'filter',
            onClick: c => {
              if (c.colKey && c.value)
                setFilters(prev => ({ ...prev, [c.colKey!]: String(c.value) }));
            },
          },
          {
            label: 'تعديل الخلية',
            icon: 'edit',
            onClick: c => {
              if (c.colKey && c.rowIndex !== undefined && c.row) {
                const col = allColDefs.find(col => col.key === c.colKey);
                if (!col?.editable) return;
                const row = c.row as T;
                startEdit(rowKey(row, c.rowIndex), c.colKey, getRawValue(row, col as Column<T>), c.originalEvent);
              }
            },
            disabled: !allColDefs.find(col => col.key === ctx.colKey)?.editable,
          },
        );
      } else if (ctx.type === 'row') {
        items.push(
          {
            label: 'نسخ معرف الصف',
            icon: 'copy',
            onClick: c => {
              if (c.row) navigator.clipboard.writeText(String(c.row.id));
            },
          },
          {
            label: 'توسيع/طي',
            icon: 'arrows-expand',
            onClick: c => {
              if (c.rowIndex !== undefined) {
                toggleExpanded(rowKey(data[c.rowIndex], c.rowIndex), new MouseEvent('click') as unknown as React.MouseEvent);
              }
            },
          },
        );
      } else if (ctx.type === 'header') {
        items.push(
          {
            label: 'إخفاء العمود',
            icon: 'eye-off',
            onClick: c => {
              if (c.colKey) toggleColVisibility(c.colKey);
            },
          },
          {
            label: 'تثبيت العمود',
            icon: 'pin',
            onClick: c => {
              if (c.colKey) pinColumn(c.colKey, 'start');
            },
          },
        );
      }
      return items;
    },
    [allColDefs, data, rowKey, toggleExpanded, toggleColVisibility, pinColumn, setFilters, startEdit],
  );

  const { menuState, closeMenu } = useContextMenu(
    enableContextMenu ? contextMenuItems || defaultContextMenuItems : () => [],
    tableWrapRef,
    data,   // ✅ context.row يحتاج بيانات الصف الفعلية
    selectedKeys,
  );

  // ✅ إصلاح: إغلاق قائمة السياق بـ Escape (كانت تبقى مفتوحة بدون هذا)
  useEscapeKey(closeMenu);

  return { defaultContextMenuItems, menuState, closeMenu };
}

export type TableContextMenuState<T> = ReturnType<typeof useTableContextMenu<T>>;
