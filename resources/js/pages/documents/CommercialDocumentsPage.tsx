// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentsPage.tsx  —  v10.4
//
// ✅ جديد في v10.4:
//   • إزالة validateMut و deleteMut (المستند معتمد فور الإنشاء)
//   • إضافة unlockMut — فتح القفل متاح للمستندات غير المُصدَّرة
//   • cancelMut يرسل cancellation_reason
//   • getRowPermissions() — helper خارجي لحساب الصلاحيات
//   • عمود is_locked مرئي افتراضياً + نقر مزدوج للتبديل
//   • contextMenuItems: كتلة "table" للقفل/فتح الجماعي
//   • STATUS_CFG مُبسَّط: validated + cancelled فقط
//   • isExpandable: كل المستندات قابلة للتوسع
//
//   • v10.5: تقسيم الملف — components/list/ (الجدول، الخلايا، نافذة العرض، الأعمدة)،
//     hooks/useDocumentList* (الجلب، العمليات، قائمة السياق، الإجراءات، الرأس)،
//     utils/documentList.* (الثوابت، المساعدات، التنسيق الشرطي)
//
// ✅ محفوظ من v10.3:
//   • useColumnStatePersistence — مفتاح localStorage واحد
//   • smartFilterPatterns={ERP_FILTER_PATTERNS} مُفعَّل
//   • DataTableErrorBoundary يلف الجدول
// ════════════════════════════════════════════════════════════════════════════

import React, {
    Suspense,
    useState,
    useCallback,
    useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug, useActiveCompany } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import type { Column, ConditionalFormat } from "@/components/ui/DataTable";
import { useColumnStatePersistence } from "@/components/ui/DataTable";
import { useLookupOptions } from "./hooks/useLookupOptions";
import CommercialDocumentModal from "./CommercialDocumentModal";
import QuickSaleModal from "./QuickSaleModal";
import ConvertDocumentModal from "./components/ConvertDocumentModal";
import BatchPrintModal from "./components/BatchPrintModal";
const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));
const BarcodeScannerModal = React.lazy(() => import('@/components/BarcodeScannerModal'));
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import { useApprovalCheckBatch } from "@/lib/api/endpoints/approvals";
import { SendDocumentMailModal } from "./components/SendDocumentMailModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useConfirm } from "@/hooks/useConfirm";
import { useNotification } from '@/hooks/useNotification';
import type { CommercialDocument } from "@/lib/api/core/types";

import { SALE_CODES, PURCHASE_CODES } from "./utils/documentList.constants";
import { getDocStatus } from "./utils/documentList.helpers";
import { buildConditionalFormatting } from "./utils/documentList.conditionalFormatting";
import type { ModalMode, MailModalState } from "./components/list/documentList.types";
import SummaryCards from "./components/list/SummaryCards";
import ExpandedLines from "./components/list/ExpandedLines";
import CancelDocumentModal from "./components/list/CancelDocumentModal";
import DocumentsDataTable from "./components/list/DocumentsDataTable";
import DocumentViewModal from "./components/list/document-view/DocumentViewModal";
import { buildCoreColumns } from "./components/list/columns/coreColumns";
import { buildExtraColumns } from "./components/list/columns/extraColumns";
import { useCancelDocumentModal } from "./hooks/useCancelDocumentModal";
import { useDocumentListQuery } from "./hooks/useDocumentListQuery";
import { useDocumentListMutations } from "./hooks/useDocumentListMutations";
import { useDocumentContextMenu } from "./hooks/useDocumentContextMenu";
import { useDocumentRowActions } from "./hooks/useDocumentRowActions";
import { useDocumentListHeader } from "./hooks/useDocumentListHeader";
import { useDocumentQrScan } from "./hooks/useDocumentQrScan";
import { useHiddenColumns } from "./hooks/useHiddenColumns";
import { useDocumentSmartFilter } from "./hooks/useDocumentSmartFilter";

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — DataTable v10.1
// ════════════════════════════════════════════════════════════════════════════

export default function CommercialDocumentsPage() {
    const { typeCode }                       = useParams<{ typeCode: string }>();
    const navigate                           = useNavigate();
    const qc                                 = useQueryClient();
    const slug                               = useActiveSlug();
    const activeCompany                      = useActiveCompany();
    const companyInfo                        = useMemo(() => mapCompany(activeCompany), [activeCompany]);
    const { data: printTemplates = [] }      = usePrintTemplatesList();
    const { selectedYear, isReadOnly }       = useFiscalYear() as { selectedYear?: { id: number; name: string }; isReadOnly?: boolean };
    const notify = useNotification();
    const { confirm, confirmDialogProps } = useConfirm();

    // ── Modal state ───────────────────────────────────────────────────────────
    const [modal, setModal]           = useState<ModalMode>(null);
    const [viewDocId, setViewDocId]   = useState<number | null>(null);
    const [convertDocId, setConvertDocId]     = useState<number | null>(null);
    const [convertSourceCode, setConvertSourceCode] = useState('');
    const [editDocFull, setEditDocFull] = useState<CommercialDocument | null>(null);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // ── Cancel modal state ────────────────────────────────────────────────────
    const { cancelModal, setCancelModal, openCancelModal } = useCancelDocumentModal();

    // ── Send email modal state ────────────────────────────────────────────────
    const [mailModal, setMailModal] = useState<MailModalState | null>(null);

    // ── Batch print ───────────────────────────────────────────────────────────
    const [batchPrintOpen, setBatchPrintOpen] = useState(false);
    const [batchDocs, setBatchDocs] = useState<CommercialDocument[]>([]);

    // ── Single-doc print preview ────────────────────────────────────────────
    const [printDocId, setPrintDocId] = useState<number | null>(null);
    const { data: printDoc } = useQuery({
        queryKey: ['print-doc', printDocId],
        queryFn: () => apiGet<CommercialDocument>(`/documents/${printDocId}`, {
            include: 'party,documentType,documentStatus,warehouse,lines,lines.product,lines.product_variant,payments,payments.payment_mode,totals',
        }),
        enabled: printDocId !== null,
    });

    const isPurch   = PURCHASE_CODES.has(typeCode ?? "");
    const isSalable = SALE_CODES.has(typeCode ?? "");
    const opColor   = isPurch ? "var(--purple)" : "var(--em)";

    // ── Column State Persistence — مفتاح واحد يحفظ: ترتيب + عرض + مخفي + مثبت + فلاتر ──
    const COL_STATE_KEY = `cdp-cols-state-${typeCode}-${slug ?? "default"}`;
    const { save: saveColState, reset: resetColState, initialSnapshot } = useColumnStatePersistence(COL_STATE_KEY);

    // columnOrder: يُقرأ من الـ snapshot المحفوظة
    const [columnOrder, setColumnOrder] = useState<string[] | undefined>(
        () => initialSnapshot?.columnOrder,
    );

    const handleColumnOrderChange = useCallback((order: string[]) => {
        setColumnOrder(order);
        saveColState({ columnOrder: order });
    }, [saveColState]);

    // ── Server-side state + fetch (sort, filters, document type, documents) ──
    const {
        perPage, setPerPage,
        setPage,
        setServerFilters,
        handleFilterChange,
        handleMultiSortChange,
        docType,
        queryParams,
        isLoading,
        isFetching,
        items,
        meta,
    } = useDocumentListQuery({ slug, typeCode, selectedYear, saveColState });

    const invalidateDocs = useCallback(() => {
        if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }, [qc, slug]);

    // ── Approval batch check — single request for all visible rows ────────────
    const docIds = useMemo(() => items.map(d => d.id), [items]);
    const { data: approvalBatch } = useApprovalCheckBatch(docIds);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { lockMut, unlockMut, cancelMut, deleteMut } = useDocumentListMutations(notify, invalidateDocs);

    // ── Edit modal ────────────────────────────────────────────────────────────
    const openEditModal = useCallback(async (doc: CommercialDocument) => {
        setLoadingEdit(true);
        try {
            const res  = await apiGet<CommercialDocument>(`/documents/${doc.id}`, {
                include: ["party","warehouse","documentType","fiscalYear","lines.product","lines.productVariant","payments.paymentMode"].join(","),
            });
            const full = ((res as unknown as Record<string,unknown>).data as CommercialDocument) ?? res;
            setEditDocFull(full);
            setModal("edit");
        } catch {
            notify.error("فشل تحميل بيانات المستند");
        } finally {
            setLoadingEdit(false);
        }
    }, []);

    const closeModal = useCallback(() => { setModal(null); setViewDocId(null); setEditDocFull(null); }, []);

    // ── B.3 — مسح QR الفاتورة المطبوعة → فتح المستند المعني ──────────────────
    const docScan = useDocumentQrScan({ setViewDocId, setModal, notify });

    const partyOptions       = useLookupOptions('/parties');
    const warehouseOptions   = useLookupOptions('/warehouses');
    const userOptions        = useLookupOptions('/users');

    // ════════════════════════════════════════════════════════════════════════
    // COLUMN DEFINITIONS
    // ════════════════════════════════════════════════════════════════════════

    const allColumns = useMemo((): Column<CommercialDocument>[] => [
        ...buildCoreColumns({
            isPurch, opColor, isReadOnly, notify, confirm, lockMut, unlockMut,
            partyOptions, warehouseOptions, approvalBatch,
        }),
        ...buildExtraColumns({ userOptions }),
    ], [isPurch, opColor, approvalBatch]);

    // ── إدارة الأعمدة المخفية — مُفوَّضة بالكامل لـ DataTable الداخلي ──────────
    const { hiddenColumnKeys, handleHiddenColumnsChange, hiddenColumnsSet } = useHiddenColumns({ allColumns, initialSnapshot, saveColState });

    // ════════════════════════════════════════════════════════════════════════
    // CONDITIONAL FORMATTING
    // ════════════════════════════════════════════════════════════════════════

    const conditionalFormatting = useMemo<ConditionalFormat<CommercialDocument>[]>(() => buildConditionalFormatting(), []);

    // ════════════════════════════════════════════════════════════════════════
    // CONTEXT MENU ITEMS
    // ════════════════════════════════════════════════════════════════════════

    const contextMenuItems = useDocumentContextMenu({
        hiddenColumnsSet, hiddenColumnKeys, handleHiddenColumnsChange, isReadOnly,
        lockMut, unlockMut, cancelMut, items, navigate, typeCode, notify, confirm,
        setServerFilters, setPage, setViewDocId, setModal, setConvertSourceCode,
        setConvertDocId, setMailModal, openCancelModal,
    });

    // ── Smart filter callback ─────────────────────────────────────────────────
    const handleSmartFilterApply = useDocumentSmartFilter({ setServerFilters, setPage, notify });

    // ════════════════════════════════════════════════════════════════════════
    // ROW ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    const rowActions = useDocumentRowActions({
        isReadOnly, loadingEdit, lockMut, unlockMut, cancelMut, navigate, typeCode,
        confirm, approvalBatch, openCancelModal, setViewDocId, setModal, setPrintDocId, setMailModal,
    });

    // ════════════════════════════════════════════════════════════════════════
    // HEADER ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    const { headerActions, tableTitle } = useDocumentListHeader({
        isFetching, isLoading, isReadOnly, isSalable, isPurch, opColor, hiddenColumnKeys,
        initialSnapshot, resetColState, navigate, typeCode, openScanner: docScan.openScanner,
        confirm, setModal, docType, selectedYear,
    });

    // ── Callbacks ─────────────────────────────────────────────────────────────
    const isExpandable  = useCallback((_row: CommercialDocument) => true, []);
    const renderExpanded = useCallback((row: CommercialDocument) => <ExpandedLines doc={row} />, []);
    const rowClassName = useCallback((row: CommercialDocument): string | undefined => {
        const status = getDocStatus(row);
        // cdp-row-overdue يُطبَّق عبر conditionalFormatting فقط (لا ازدواج)
        if (status === "cancelled") return "cdp-row-cancelled";
        return undefined;
    }, []);

    // ════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════

    return (
        <>


            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0, flex: 1, direction: "rtl", fontFamily: "Tajawal, sans-serif" }}>

                {/* Summary cards */}
                {items.length > 0 && <SummaryCards items={items} opColor={opColor} />}

                {/* DataTable v10.2 — محاطة بـ ErrorBoundary لمنع أي خطأ من إسقاط الصفحة */}
                <DocumentsDataTable
                    items={items}
                    allColumns={allColumns}
                    hiddenColumnKeys={hiddenColumnKeys}
                    handleHiddenColumnsChange={handleHiddenColumnsChange}
                    isLoading={isLoading}
                    columnOrder={columnOrder}
                    handleColumnOrderChange={handleColumnOrderChange}
                    handleMultiSortChange={handleMultiSortChange}
                    typeCode={typeCode}
                    conditionalFormatting={conditionalFormatting}
                    meta={meta}
                    perPage={perPage}
                    setPage={setPage}
                    setPerPage={setPerPage}
                    handleFilterChange={handleFilterChange}
                    setServerFilters={setServerFilters}
                    setBatchDocs={setBatchDocs}
                    setBatchPrintOpen={setBatchPrintOpen}
                    renderExpanded={renderExpanded}
                    isExpandable={isExpandable}
                    rowActions={rowActions}
                    headerActions={headerActions}
                    tableTitle={tableTitle}
                    selectedYear={selectedYear}
                    setViewDocId={setViewDocId}
                    setModal={setModal}
                    rowClassName={rowClassName}
                    docType={docType}
                    queryParams={queryParams}
                    handleSmartFilterApply={handleSmartFilterApply}
                    slug={slug}
                    contextMenuItems={contextMenuItems}
                />
            </div>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            {(modal === "add" || modal === "edit") && (
                <CommercialDocumentModal
                    open
                    documentType={docType ?? null}
                    existingDocument={modal === "edit" ? (editDocFull as unknown as Record<string, unknown> ?? undefined) : undefined}
                    onClose={closeModal}
                    onSaved={() => {
                        closeModal();
                        invalidateDocs();
                        notify.success(modal === "add" ? "تم إنشاء المستند بنجاح" : "تم تحديث المستند بنجاح");
                    }}
                />
            )}

            {modal === "quick" && (
                <QuickSaleModal
                    open
                    onClose={closeModal}
                    onSaved={(doc) => {
                        closeModal();
                        invalidateDocs();
                        if ((doc as any)?.offline) {
                            notify.success(`أُضيفت الفاتورة إلى قائمة الانتظار — سيُحفظ عند توفر الاتصال (${String((doc as any).document_number ?? '')})`);
                        } else {
                            notify.success(`تم إنشاء ${String((doc as any).document_number ?? "المستند")} بنجاح`);
                        }
                    }}
                />
            )}

            {modal === "view" && viewDocId != null && (
                <DocumentViewModal
                    docId={viewDocId}
                    docType={docType ?? null}
                    onClose={closeModal}
                    onEdit={() => {
                        const doc = items.find(d => d.id === viewDocId);
                        if (doc) {
                          if (typeCode === 'POS') { closeModal(); navigate(`/pos?edit=${viewDocId}`); }
                          else { closeModal(); openEditModal(doc); }
                        }
                    }}
                    isReadOnly={!!isReadOnly}
                    onDeleteDoc={async () => {
                        closeModal();
                        if (await confirm('حذف هذا المستند نهائياً؟ للمستندات المُصدَّقة ستُعكس حركات المخزون تلقائياً، والمستندات التي عليها دفعات (مدفوعة جزئياً أو كلياً) لا يمكن حذفها.')) {
                            deleteMut.mutate(viewDocId);
                        }
                    }}
                    onPrint={() => { closeModal(); setPrintDocId(viewDocId); }}
                    onMail={(o) => { closeModal(); setMailModal({ ...o, docTypeCode: typeCode ?? '' }); }}
                />
            )}

            {/* B.3 — ماسح QR الكاميرا (يُحمَّل كود المفكك فقط عند فتحه) */}
            {docScan.open && (
                <Suspense fallback={null}>
                    <BarcodeScannerModal
                        open={docScan.open}
                        onScan={docScan.handleScan}
                        onClose={docScan.closeScanner}
                        title="مسح QR المستند لفتحه"
                        hint="صوّب الكاميرا على رمز QR المطبوع على الفاتورة لفتح المستند مباشرة"
                    />
                </Suspense>
            )}

            {convertDocId != null && (
                <ConvertDocumentModal
                    isOpen
                    onClose={() => setConvertDocId(null)}
                    onDone={() => { invalidateDocs(); notify.success('تم تحويل المستند بنجاح'); }}
                    documentId={convertDocId}
                    sourceCode={convertSourceCode}
                />
            )}

            {/* إلغاء المستند — مودال مع textarea */}
            {cancelModal && (
                <CancelDocumentModal cancelModal={cancelModal} setCancelModal={setCancelModal} cancelMut={cancelMut} />
            )}

            <BatchPrintModal
                open={batchPrintOpen}
                onClose={() => setBatchPrintOpen(false)}
                documents={batchDocs}
            />

            {/* Single-doc print preview */}
            {printDocId !== null && companyInfo && (
                <Suspense fallback={null}>
                    <TemplatePrintModal
                        open={!!printDoc}
                        onClose={() => { setPrintDocId(null); }}
                        document={printDoc as any}
                        company={companyInfo as any}
                        templates={printTemplates}
                        docTypeCode={printDoc?.document_type?.code ?? typeCode ?? 'FV'}
                        prevBalance={(printDoc as any)?.balance_data?.previous_balance}
                        newBalance={(printDoc as any)?.balance_data?.new_balance}
                    />
                </Suspense>
            )}

            {/* Send email modal */}
            {mailModal && (
                <SendDocumentMailModal
                    documentId={mailModal.id}
                    documentNumber={mailModal.documentNumber}
                    partyName={mailModal.partyName}
                    partyEmail={mailModal.partyEmail}
                    docTypeCode={mailModal.docTypeCode}
                    onClose={() => setMailModal(null)}
                />
            )}

            <ConfirmDialog {...confirmDialogProps} />
        </>
    );
}
