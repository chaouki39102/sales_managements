// pages/invoices/InvoicesPage.tsx
import React, { useState, useCallback, useMemo, useEffect, Suspense } from "react";

// التقسيم: components/ (الجدول، الفلاتر، النوافذ) + utils/invoiceStatus

// ✅ استيراد الـ Hooks الصحيحة للمستندات والفواتير
import {
    useDocuments as useInvoices,
    useDocumentMutations,
} from "@/lib/api/endpoints/documents";

// ✅ استيراد الـ Hooks الصحيحة للزبائن والزبائن
import { useParties as useCustomers } from "@/lib/api/endpoints/parties";
import { useFiscalYear } from "@/context/FiscalYearContext";

import { useModal } from "@/hooks/useModal";
import { useConfirm } from "@/hooks/useConfirm";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import SimpleTable from "@/components/ui/SimpleTable";
import type { CommercialDocument } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/core/client";
import { useActiveCompany } from "@/lib/store/appStore";
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));
import { ReturnDocumentModal } from '@/pages/documents/components/ReturnDocumentModal';
import { SendDocumentMailModal } from '@/pages/documents/components/SendDocumentMailModal';
import InvoicesKpis from "./components/InvoicesKpis";
import InvoicesFilters from "./components/InvoicesFilters";
import InvoicesBulkBar from "./components/InvoicesBulkBar";
import InvoicesPagination from "./components/InvoicesPagination";
import InvoiceDetailModal from "./components/InvoiceDetailModal";
import NewInvoiceModal from "./components/NewInvoiceModal";
import { buildInvoiceColumns } from "./components/invoiceColumns";

export default function InvoicesPage() {
    const { selectedYear } = useFiscalYear();
  const [filters, setFilters] = useState<Record<string, any>>({ page: 1, per_page: 20, fiscal_year_id: selectedYear?.id });
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [viewingId, setViewingId] = useState<number | null>(null);

  const [mailModal, setMailModal] = useState<{
    id: number;
    documentNumber: string;
    partyName: string;
    partyEmail: string | null;
    docTypeCode?: string;
  } | null>(null);

  const detail   = useModal();
  const newInv   = useModal();

  // تزامن السنة المالية المحددة مع الفلاتر
  useEffect(() => {
    setFilters((prev: any) => ({ ...prev, page: 1, fiscal_year_id: selectedYear?.id }));
  }, [selectedYear?.id]);

  const STATUS_MAP: Record<string, string> = {
    paid:      'paid',
    validated: 'validated',
    partial:   'partially_paid',
    cancelled: 'cancelled',
  };

  // تحويل الفلاتر إلى format الباكند
  const apiFilters = useMemo(() => {
    const params: Record<string, unknown> = { ...filters };
    if (params.fiscal_year_id) {
      params['filter[fiscal_year_id]'] = params.fiscal_year_id;
      delete params.fiscal_year_id;
    }
    if (params.status) {
      params['filter[document_status.name]'] = STATUS_MAP[params.status as string] || params.status;
      delete params.status;
    } else {
      // استبعاد المرتجعات من القائمة الافتراضية
      params['filter[document_status.name]'] = 'draft,pending,validated,partially_paid,paid,overdue,cancelled';
    }
    return params;
  }, [filters]);

  const { data, isLoading, isFetching } = useInvoices(apiFilters as any);
  const { data: customers } = useCustomers({ per_page: 200, type: 'client' }); // ✅ تمرير النوع كزبون

  const invoices = data?.data ?? [];
  const meta     = data?.meta;

  // ✅ استخراج ميثود الحفظ والإلغاء والاعتماد من الميوتيشن المركزي للمستندات
  const documentMutations = useDocumentMutations();
  const validateMut = { mutate: (id: number) => documentMutations.validate?.mutate(id) };
  const _cancelMut   = { mutate: (id: number) => documentMutations.cancel?.mutate({ id, reason: "حذف من قائمة الفواتير" }) }; void _cancelMut;

  const activeCompany = useActiveCompany();
    const companyInfo = useMemo(() => mapCompany(activeCompany), [activeCompany]);
    const { data: printTemplates = [] } = usePrintTemplatesList();

    // ── Single-doc print preview ──────────────────────────────────
    const [printDocId, setPrintDocId] = useState<number | null>(null);
    const { data: printDoc } = useQuery({
        queryKey: ['print-doc-inv', printDocId],
        queryFn: () => apiGet<CommercialDocument>(`/documents/${printDocId}`, {
            include: 'party,documentType,documentStatus,warehouse,lines,lines.product,lines.product_variant,payments,payments.payment_mode,totals',
        }),
        enabled: printDocId !== null,
    });

    const { confirm, confirmDialogProps } = useConfirm();

    // ── Return (مرتجع) ─────────────────────────────────────────────
    const [showReturnModal, setShowReturnModal] = useState(false);
    const { data: returnDoc } = useQuery({
        queryKey: ['return-doc-inv', viewingId],
        queryFn: () => apiGet<CommercialDocument>(`/documents/${viewingId}`, {
            include: 'party,documentType,documentStatus,warehouse,lines,lines.product,lines.product_variant,payments,payments.payment_mode,totals',
        }),
        enabled: showReturnModal && viewingId !== null,
    });

    // ── Selection ──────────────────────────────────
    const toggleSelect = useCallback((id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(
        (checked: boolean) => {
            setSelected(
                checked ? new Set(invoices.map((i) => i.id)) : new Set(),
            );
        },
        [invoices],
    );

    // ── Open detail ────────────────────────────────
    const openDetail = (inv: CommercialDocument) => {
        setViewingId(inv.id);
        detail.openModal();
    };

    return (
        <div className="page on" id="p-invoices">
            <PageHeader
                title="الفواتير"
                subtitle={`إدارة فواتير البيع — ${meta?.total ?? "..."} فاتورة`}
                actions={
                    <>
                        <Button size="sm" icon={<i className="ti ti-table" />}>
                            Excel
                        </Button>
                        <Button
                            size="sm"
                            icon={<i className="ti ti-printer" />}
                        >
                            طباعة
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={<i className="ti ti-plus" />}
                            onClick={newInv.openModal}
                        >
                            فاتورة جديدة
                        </Button>
                    </>
                }
            />

            <InvoicesKpis />

            {/* Filters */}
            <InvoicesFilters setFilters={setFilters} customers={customers} />

            {/* Table */}
            <Card noHeader style={{ padding: 0 }}>
                {/* Bulk actions bar */}
                <InvoicesBulkBar
                    selected={selected}
                    invoices={invoices}
                    toggleAll={toggleAll}
                    isFetching={isFetching}
                />

                {isLoading ? (
                    <div className="tw">
                        <div className="empty">
                            <div className="empty-ic">
                                <i className="ti ti-loader" />
                            </div>
                            <div className="empty-tx">جاري التحميل...</div>
                        </div>
                    </div>
                ) : invoices.length === 0 ? (
                        <EmptyState
                            icon="ti-file-invoice"
                            text="لا توجد فواتير"
                            sub="أنشئ فاتورتك الأولى"
                            action={
                                <Button
                                    variant="primary"
                                    onClick={newInv.openModal}
                                >
                                    فاتورة جديدة
                                </Button>
                            }
                        />
                    ) : (
                        <SimpleTable
                            columns={buildInvoiceColumns({ selected, toggleSelect, openDetail, validateMut })}
                            data={invoices}
                            rowKey="id"
                            onRowClick={(row) =>
                                openDetail(row as unknown as CommercialDocument)
                            }
                        />
                    )}

                {/* Pagination */}
                {meta && meta.last_page > 1 && (
                    <InvoicesPagination meta={meta} filters={filters} setFilters={setFilters} />
                )}
            </Card>

            {/* Invoice Detail Modal */}
            <InvoiceDetailModal
                open={detail.open}
                invoiceId={viewingId}
                onClose={() => { detail.closeModal(); setViewingId(null); }}
                onValidate={() => viewingId && validateMut.mutate(viewingId)}
                onDelete={async () => {
                    if (viewingId && await confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
                        documentMutations.remove.mutate(viewingId);
                    }
                }}
                onPrint={() => viewingId && setPrintDocId(viewingId)}
                onReturn={() => setShowReturnModal(true)}
                onMail={(o) => setMailModal({ ...o, docTypeCode: 'FV' })}
            />{/* end InvoiceDetailModal */}

            {/* Single-doc print preview */}
            {printDocId !== null && companyInfo && (
                <Suspense fallback={null}>
                    <TemplatePrintModal
                        open={!!printDoc}
                        onClose={() => { setPrintDocId(null); }}
                        document={printDoc as any}
                        company={companyInfo as any}
                        templates={printTemplates}
                        docTypeCode={printDoc?.document_type?.code ?? 'FV'}
                        prevBalance={(printDoc as any)?.balance_data?.previous_balance}
                        newBalance={(printDoc as any)?.balance_data?.new_balance}
                    />
                </Suspense>
            )}

            {/* New Invoice Modal */}
            <NewInvoiceModal
                open={newInv.open}
                onClose={newInv.closeModal}
                customers={customers?.data ?? []}
            />

            {showReturnModal && returnDoc && (
                <ReturnDocumentModal
                    document={returnDoc as any}
                    onCreated={() => { setShowReturnModal(false); setViewingId(null); detail.closeModal(); }}
                    onClose={() => setShowReturnModal(false)}
                />
            )}

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
        </div>
    );
}
