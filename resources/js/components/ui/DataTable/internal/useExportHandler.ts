// DataTable/internal/useExportHandler.ts — export dispatch (CSV / Excel / JSON / print)
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useCallback } from 'react';
import type { ExportFormat } from '../types';
import { exportToCSV, exportToExcel, exportToJSON, exportToPrint } from '../utils';
import type { ResolvedProps } from './resolveProps';
import type { SearchFilterSortState } from './useSearchFilterSort';
import type { RowPipelineState } from './useRowPipeline';
import type { VisibleColumnsAndAggregatesState } from './useVisibleColumnsAndAggregates';
import type { ColumnVisibilityState } from './useColumnVisibilityState';
import type { SelectionAndExpandState } from './useSelectionAndExpand';

type Params<T> =
  Pick<ResolvedProps<T>, 'exportConfig' | 'excelExportOptions' | 'exportName' | 'documentInfo' | 'excelExportAdvancedOptions' | 'showAggregates' | 'fetchAllForExport' | 'selectable' | 'rowKey'>
  & Pick<SearchFilterSortState<T>, 'isServerPaged'>
  & Pick<RowPipelineState<T>, 'processedData'>
  & Pick<VisibleColumnsAndAggregatesState<T>, 'aggregates' | 'visibleCols'>
  & Pick<ColumnVisibilityState<T>, 'exportScope' | 'setExportMenuOpen'>
  & Pick<SelectionAndExpandState<T>, 'selectedKeys'>;

export function useExportHandler<T>(p: Params<T>) {
  const {
    exportConfig, excelExportOptions, exportName, documentInfo, excelExportAdvancedOptions, showAggregates,
    fetchAllForExport, selectable, rowKey, isServerPaged, processedData, aggregates,
    visibleCols, exportScope, setExportMenuOpen, selectedKeys,
  } = p;

  // helper: تنفيذ الـ export حسب الصيغة
  const handleExport = useCallback(async (format: ExportFormat) => {
    const cfg      = exportConfig ?? {};
    const legacy   = excelExportOptions ?? {};
    const fileName = cfg.fileName ?? legacy.fileName ?? exportName;
    const title    = cfg.title ?? legacy.title;
    const includeHiddenColumns = cfg.includeHiddenColumns ?? legacy.includeHiddenColumns ?? false;

    // For server-paged tables, fetch ALL rows before exporting
    const allExportData = isServerPaged && fetchAllForExport
      ? await fetchAllForExport()
      : processedData;

    // 🆕 v10.4 — نطاق التصدير: "المحدد فقط" يفلتر الصفوف حسب selectedKeys
    const selectedOnly =
      exportScope === 'selected' && selectable && selectedKeys.size > 0;
    const exportData = selectedOnly
      ? allExportData.filter((r, i) => selectedKeys.has(rowKey(r, i)))
      : allExportData;

    // ✅ تحويل aggregates من format الـ state إلى format التصدير
    const aggregatesForExport = showAggregates && aggregates
      ? Object.fromEntries(
          Object.entries(aggregates).map(([k, v]) => [
            k,
            { type: v.type, value: v.value ?? 0 },
          ]),
        )
      : {};

    const opts = {
      fileName,
      title,
      includeHiddenColumns,
      // ✅ documentInfo يصل الآن للملف
      documentInfo: documentInfo ?? {},
      // ✅ aggregates الجاهزة من الـ state
      includeAggregates: showAggregates && !!aggregates,
      aggregates: aggregatesForExport,
      // خيارات excel الأساسية
      ...cfg.excelOptions,
      // ✅ خيارات advanced (orientation، sheetName، onSave)
      ...excelExportAdvancedOptions,
    };

    setExportMenuOpen(false);
    switch (format) {
      case 'csv':   exportToCSV(exportData, visibleCols, fileName); break;
      case 'excel': exportToExcel(exportData, visibleCols, opts); break;
      case 'json':  exportToJSON(exportData, visibleCols, opts); break;
      case 'print': exportToPrint(exportData, visibleCols, opts); break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
  }, [
    exportConfig, excelExportOptions, exportName, processedData, visibleCols,
    documentInfo, excelExportAdvancedOptions,
    showAggregates, aggregates, isServerPaged, fetchAllForExport,
    exportScope, selectable, selectedKeys, rowKey,
  ]);

  return { handleExport };
}

export type ExportHandlerState<T> = ReturnType<typeof useExportHandler<T>>;
