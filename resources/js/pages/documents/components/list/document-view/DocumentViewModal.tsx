// pages/documents/components/list/document-view/DocumentViewModal.tsx
// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT VIEW MODAL (مُحسَّن — كل التفاصيل، كل الأعمدة، كل الوظائف)
// ════════════════════════════════════════════════════════════════════════════
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/core/client";
import { useActiveSlug } from "@/lib/store/appStore";
import Modal from "@/components/ui/Modal";
import type { SimpleColumn } from "@/components/ui/SimpleTable";
import type { DocumentType, CommercialDocument } from "@/lib/api/core/types";
import DocumentAuditPanel from "../../DocumentAuditPanel";
import { PURCHASE_CODES } from "../../../utils/documentList.constants";
import { getDocStatus, getPartyName } from "../../../utils/documentList.helpers";
import { buildDocumentViewLineColumns } from "./documentViewLineColumns";
import DocumentViewFooter from "./DocumentViewFooter";
import DocumentViewDocTab from "./DocumentViewDocTab";

export default function DocumentViewModal({
    docId, docType, onClose, onEdit, isReadOnly, onDeleteDoc, onPrint, onMail,
}: { docId: number; docType: DocumentType | null; onClose: () => void; onEdit: () => void; isReadOnly: boolean; onDeleteDoc?: () => void; onPrint?: () => void; onMail?: (opts: { id: number; documentNumber: string; partyName: string; partyEmail: string | null }) => void }) {
    const slug    = useActiveSlug();
    const isPurch = PURCHASE_CODES.has(docType?.code ?? "");

    const { data, isLoading } = useQuery({
        queryKey: [slug, "doc-detail-full", docId],
        queryFn: () =>
            apiGet<CommercialDocument>(`/documents/${docId}`, {
                include: ["party","documentStatus","warehouse","fiscalYear","currency","documentType","lines.product","lines.product.unit","lines.productVariant","lines.packaging","lines.stockLot","validatedBy","user","createdBy","updatedBy","payments","payments.paymentMode"].join(","),
            }),
        staleTime: 2 * 60_000,
    });

    const fmt = (n: number) => n.toLocaleString("fr-DZ", { maximumFractionDigits: 2 });
    const dtf = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ar-DZ") : "—";

    type DocTab = 'doc' | 'audit';
    const [activeTab, setActiveTab] = React.useState<DocTab>('doc');

    if (isLoading || !data) {
        return (
            <Modal open={!!docId} onClose={onClose} size="xl" title={docType?.name ?? "المستند"}>
                {isLoading && <div className="p-20 text-center text-t4">جارٍ تحميل التفاصيل…</div>}
                {!isLoading && !data && <div className="p-20 text-center text-t4">المستند غير موجود</div>}
            </Modal>
        );
    }

    const d = data as unknown as Record<string, unknown>;
    const status = getDocStatus(data);
    const lines = (d.lines as Record<string, unknown>[] | undefined) ?? [];
    const payments = (d.payments as Record<string, unknown>[] | undefined) ?? [];
    const bal = d.balance_data as Record<string, unknown> | undefined;

    const lineColumns: SimpleColumn[] = buildDocumentViewLineColumns(fmt);

    return (
        <Modal
            open={!!docId}
            onClose={onClose}
            size="xl"
            title={`${docType?.name ?? ""} #${d.document_number ?? `#${docId}`}`}
            subtitle={`${dtf(d.document_date as string)} • ${getPartyName(data)}`}
            footer={
                <DocumentViewFooter
                    d={d}
                    data={data}
                    docType={docType}
                    lines={lines}
                    isReadOnly={isReadOnly}
                    onClose={onClose}
                    onEdit={onEdit}
                    onDeleteDoc={onDeleteDoc}
                    onPrint={onPrint}
                    onMail={onMail}
                />
            }
        >
            {/* ── Tabs ── */}
            {(() => {
                const tabs: { key: DocTab; label: string; icon: string; color?: string }[] = [
                    { key: 'doc',   label: 'المستند',      icon: 'ti-file-text' },
                    { key: 'audit', label: 'سجل التدقيق',  icon: 'ti-history',      color: '#7c3aed' },
                ];

                return (
                    <>
                        {/* Tab navigation */}
                        <div className="doc-view-tabs flex items-center gap-2 mb-10 p-2 rounded-xl bg-3 border border-b3">
                            {tabs.map((t) => {
                                const isActive = activeTab === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => setActiveTab(t.key)}
                                        className={`doc-view-tab flex items-center gap-4 px-10 py-6 rounded-lg text-sm font-semibold transition-all duration-150 ${isActive ? 'doc-view-tab--active' : 'doc-view-tab--inactive'}`}
                                    >
                                        <i className={`ti ${t.icon}`} style={{ fontSize: 14, color: isActive ? (t.color ?? 'var(--em)') : undefined }} />
                                        <span>{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab content */}
                        <div style={{ minHeight: 400, maxHeight: 'calc(85vh - 200px)', overflowY: 'auto' }}>
                            {activeTab === 'doc' && (
                                <DocumentViewDocTab
                                    d={d}
                                    data={data}
                                    isPurch={isPurch}
                                    status={status}
                                    lines={lines}
                                    payments={payments}
                                    bal={bal}
                                    lineColumns={lineColumns}
                                    fmt={fmt}
                                    dtf={dtf}
                                />
                            )}

                            

                            {activeTab === 'audit' && (
                                <div className="doc-view-tab-content animate-in">
                                    <DocumentAuditPanel docId={docId} />
                                </div>
                            )}
                        </div>
                    </>
                );
            })()}
        </Modal>
    );
}
