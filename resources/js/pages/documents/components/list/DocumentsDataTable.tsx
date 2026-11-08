// pages/documents/components/list/DocumentsDataTable.tsx
// DataTable v10.2 لقائمة المستندات — محاطة بـ ErrorBoundary
import type React from "react";
import { DataTable, DataTableErrorBoundary } from "@/components/ui/DataTable";
import type {
    Column,
    MultiSortState,
    ConditionalFormat,
    ContextMenuItem,
    ContextMenuContext,
} from "@/components/ui/DataTable";
import { apiGet } from "@/lib/api/core/client";
import type { DocumentType, CommercialDocument, PaginatedResponse } from "@/lib/api/core/types";
// أنماط SmartFilter الخاصة بالمشروع (مفصولة عن library)
import { ERP_FILTER_PATTERNS } from "@/lib/datatable-patterns";
import type { ModalMode } from "./documentList.types";

interface DocumentsDataTableProps {
    items: CommercialDocument[];
    allColumns: Column<CommercialDocument>[];
    hiddenColumnKeys: string[];
    handleHiddenColumnsChange: (key: string, willBeHidden: boolean, allHidden: string[]) => void;
    isLoading: boolean;
    columnOrder: string[] | undefined;
    handleColumnOrderChange: (order: string[]) => void;
    handleMultiSortChange: (sorts: MultiSortState) => void;
    typeCode: string | undefined;
    conditionalFormatting: ConditionalFormat<CommercialDocument>[];
    meta: { total: number; last_page: number; current_page: number; per_page: number };
    perPage: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    setPerPage: React.Dispatch<React.SetStateAction<number>>;
    handleFilterChange: (filters: Record<string, string>) => void;
    setServerFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setBatchDocs: React.Dispatch<React.SetStateAction<CommercialDocument[]>>;
    setBatchPrintOpen: React.Dispatch<React.SetStateAction<boolean>>;
    renderExpanded: (row: CommercialDocument) => React.ReactNode;
    isExpandable: (row: CommercialDocument) => boolean;
    rowActions: (row: CommercialDocument) => React.ReactNode;
    headerActions: React.ReactNode;
    tableTitle: React.ReactNode;
    selectedYear: { id: number; name: string } | undefined;
    setViewDocId: React.Dispatch<React.SetStateAction<number | null>>;
    setModal: React.Dispatch<React.SetStateAction<ModalMode>>;
    rowClassName: (row: CommercialDocument) => string | undefined;
    docType: DocumentType | null | undefined;
    queryParams: Record<string, unknown>;
    handleSmartFilterApply: (query: string, result: { success: boolean; filters: Record<string, string> }) => void;
    slug: string | null | undefined;
    contextMenuItems: (ctx: ContextMenuContext) => ContextMenuItem[];
}

export default function DocumentsDataTable({
    items, allColumns, hiddenColumnKeys, handleHiddenColumnsChange, isLoading,
    columnOrder, handleColumnOrderChange, handleMultiSortChange, typeCode,
    conditionalFormatting, meta, perPage, setPage, setPerPage, handleFilterChange,
    setServerFilters, setBatchDocs, setBatchPrintOpen, renderExpanded, isExpandable,
    rowActions, headerActions, tableTitle, selectedYear, setViewDocId, setModal,
    rowClassName, docType, queryParams, handleSmartFilterApply, slug, contextMenuItems,
}: DocumentsDataTableProps) {
    return (
        <div style={{ background: "var(--bg1)", border: "1px solid var(--b1)", borderRadius: "var(--r3)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)", flex: 1 }}>
            <DataTableErrorBoundary>
            <DataTable<CommercialDocument>
                data={items}
                columns={allColumns}
                columnDefs={allColumns}
                hiddenColumnKeys={hiddenColumnKeys}         // الأعمدة المخفية الأولية
                onHiddenColumnsChange={handleHiddenColumnsChange}  // callback لحفظ التغييرات
                rowKey={r => r.id}
                loading={isLoading}

                // ── Reorder + Sort + URL ────────────────────────
                columnReorder={true}
                initialColumnOrder={columnOrder}
                onColumnOrderChange={handleColumnOrderChange}
                multiSort={true}
                onMultiSortChange={handleMultiSortChange}
                urlState={{
                    enabled: true,
                    prefix: `commercial_${typeCode}`,
                    filters: true, sort: true, page: true, search: true,
                }}

                // ── Virtual scroll: فقط عند تعطيل pagination وتحميل كمية كبيرة ──
                virtual={items.length > 100 ? { rowHeight: 40, containerHeight: 600, overscan: 8 } : undefined}

                // ── تنسيق شرطي ─────────────────────────────────
                conditionalFormatting={conditionalFormatting}

                // ── لوحة المفاتيح ✅ مُفعَّل الآن مع RTL fix ──
                keyboardNav={true}

                // ── Batch edit: معطل (no-server-side mutations) ─
                batchEdit={false}

                // ── Column pinning ─────────────────────────────
                pinnedColumns={{ start: ["document_number"] }}

                // ── Pagination server-side ─────────────────────
                pagination={{
                    page: Number(meta.current_page ?? 1),
                    perPage,
                    total:    Number(meta.total    ?? 0),
                    lastPage: Number(meta.last_page ?? 1),
                    onPage:    setPage,
                    onPerPage: n => { setPerPage(n); setPage(1); },
                }}
                onFilterChange={handleFilterChange}
                onSearchChange={q => {
                    setServerFilters(prev => { const n = { ...prev }; if (q) n.search = q; else delete n.search; return n; });
                    setPage(1);
                }}
                allData={items}

                // ── Selection + Batch Print ──────────────────────
                selectable
                bulkActions={(selectedRows: CommercialDocument[], _clearSelection: () => void) => (
                    <button
                        onClick={() => { setBatchDocs(selectedRows as CommercialDocument[]); setBatchPrintOpen(true); }}
                        className="dt-bulk-btn"
                        type="button"
                    >
                        <i className="ti ti-printer" />
                        طباعة بالجملة ({selectedRows.length})
                    </button>
                )}

                // ── الميزات الأساسية ────────────────────────────
                searchable
                searchPlaceholder="بحث برقم المستند أو اسم المتعامل…"
                showAggregates
                aggregateLabel="إجمالي الصفحة"
                expandable
                renderExpanded={renderExpanded}
                isExpandable={isExpandable}
                rowActions={rowActions}
                headerActions={headerActions}
                title={tableTitle}
                exportable
                exportName={`${typeCode}_${selectedYear?.name ?? ""}`}
                onRowClick={row => { setViewDocId(row.id); setModal("view"); }}
                rowClassName={rowClassName}
                emptyText={
                    !selectedYear  ? "الرجاء اختيار سنة مالية" :
                    !docType       ? "جارٍ تحميل نوع المستند…" :
                                    "لا توجد مستندات"
                }

                // ── 🆕 Excel Export ─────────────────────────────
                enableExcelExport={true}
                excelExportOptions={{
                    fileName: `${typeCode}_${selectedYear?.name ?? ""}_export`,
                    includeAggregates:    true,
                    includeHiddenColumns: false,
                    title: docType?.name ?? typeCode,
                }}
                fetchAllForExport={async () => {
                    const total = Number(meta.total ?? 0);
                    if (total === 0) return [];
                    const { page: _p, per_page: _pp, ...params } = queryParams;
                    const res = await apiGet<PaginatedResponse<CommercialDocument>>("/documents", {
                        ...params,
                        per_page: Math.min(total, 10000),
                        page: 1,
                    });
                    return res?.data ?? [];
                }}

                // ── 🆕 Smart Filter عربي — مع أنماط ERP الجزائري ──
                enableSmartFilter={true}
                smartFilterPatterns={ERP_FILTER_PATTERNS}
                onSmartFilterApply={handleSmartFilterApply}

                // ── 🆕 Saved Views ──────────────────────────────
                enableSavedViews={true}
                savedViewsConfig={{
                    tableKey: `commercial_${typeCode}_${slug ?? "default"}`,
                    maxViews: 10,
                }}

                // ── 🆕 Context Menu — يستخدم ctx.row المُصلح ────
                enableContextMenu={true}
                contextMenuItems={contextMenuItems}
            />
            </DataTableErrorBoundary>
        </div>
    );
}
