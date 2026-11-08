// pages/invoices/components/InvoiceDetailModal.tsx
import { useDocument } from "@/lib/api/endpoints/documents";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import SimpleTable from "@/components/ui/SimpleTable";
import type { SimpleColumn } from "@/components/ui/SimpleTable";
import { STATUS_BADGE } from "../utils/invoiceStatus";
import { buildInvoiceLineColumns } from "./invoiceLineColumns";
import InvoiceDetailTotals from "./InvoiceDetailTotals";

// ── Invoice Detail Modal ───────────────────────────
export default function InvoiceDetailModal({
    open,
    invoiceId,
    onClose,
    onValidate,
    onDelete,
    onPrint,
    onReturn,
    onMail,
}: {
    open: boolean;
    invoiceId: number | null;
    onClose: () => void;
    onValidate: () => void;
    onDelete?: () => void;
    onPrint?: () => void;
    onReturn?: () => void;
    onMail?: (opts: { id: number; documentNumber: string; partyName: string; partyEmail: string | null }) => void;
}) {
    const { data: invoice, isLoading } = useDocument(invoiceId);

    const fmt = (n: number) => n.toLocaleString("fr-DZ", { maximumFractionDigits: 2 });
    const dtf = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString("ar-DZ") : "—";

    if (isLoading || !invoice) {
        return (
            <Modal open={open} onClose={onClose} size="xl" title="تفاصيل الفاتورة">
                {isLoading && <div className="p-20 text-center text-t4">جار التحميل...</div>}
            </Modal>
        );
    }

    const sb = STATUS_BADGE[invoice.status] ?? STATUS_BADGE.draft;
    const lines = invoice.lines ?? [];
    const payments = invoice.payments ?? [];
    const bal = invoice.balance_data;
    const inv = invoice as any;

    const lineColumns: SimpleColumn[] = buildInvoiceLineColumns(fmt);

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="xl"
            title={invoice.document_number}
            subtitle={`${dtf(invoice.document_date)} • ${invoice.party?.name ?? "عابر"}`}
            footer={
                <>
                    <div className="m-foot-l flex gap-6">
                        <Button variant="danger" size="sm" icon={<i className="ti ti-trash" />} onClick={onDelete || onClose}>
                            حذف
                        </Button>
                        <Button size="sm" icon={<i className="ti ti-corner-up-left" />} onClick={onReturn || onClose}>
                            مرتجع
                        </Button>
                    </div>
                    {invoice.status === "draft" && (
                        <Button variant="primary" size="sm" icon={<i className="ti ti-check" />} onClick={onValidate}>
                            اعتماد
                        </Button>
                    )}
                    <Button size="sm" variant="info" icon={<i className="ti ti-mail" />} onClick={() => onMail?.({
                        id: invoice.id as number,
                        documentNumber: String(invoice.document_number ?? `#${invoice.id}`),
                        partyName: invoice.party?.name ?? "",
                        partyEmail: ((invoice.party as Record<string, unknown> | undefined)?.email as string) ?? null,
                    })}>
                        إرسال
                    </Button>
                    <Button size="sm" variant="primary" icon={<i className="ti ti-printer" />} onClick={onPrint || onClose}>
                        طباعة
                    </Button>
                </>
            }
        >
            {/* ── Colored header icon + status ── */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-6">
                    <div className="ic ic-md rounded-lg" style={{ background: 'var(--em)', color: '#fff' }}>
                        <i className="ti ti-receipt" />
                    </div>
                    <div className="flex items-center gap-6">
                        <Badge variant={sb.variant}>{sb.label}</Badge>
                        {invoice.is_locked && <Badge variant="purple">مقفل</Badge>}
                        {invoice.remaining_amount > 0 && (
                            <span className="text-red font-bold text-sm">متبقي: {fmt(invoice.remaining_amount)} دج</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-t4">
                    <span>{invoice.warehouse?.name ?? "—"}</span>
                    <span>•</span>
                    <span>{invoice.fiscal_year?.name ?? "—"}</span>
                </div>
            </div>

            {/* ── Compact 4‑card info grid ── */}
            <div className="g4 mb-12">
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">الزبون</div>
                    <div className="font-bold truncate">{invoice.party?.name ?? "عابر"}</div>
                    {invoice.party?.phone && <div className="text-xs text-t4 mt-2 ltr">{invoice.party.phone}</div>}
                    {invoice.party?.nif && <div className="text-xs text-t4">NIF: {invoice.party.nif}</div>}
                    {invoice.party?.rc && <div className="text-xs text-t4">RC: {invoice.party.rc}</div>}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">التواريخ</div>
                    <div className="font-bold text-sm">{dtf(invoice.document_date)}</div>
                    {invoice.due_date && <div className="text-xs text-t4 mt-2">استحقاق: {dtf(invoice.due_date)}</div>}
                    {inv.delivery_date && <div className="text-xs text-t4 mt-1">تسليم: {dtf(inv.delivery_date)}</div>}
                    {inv.currency && <div className="text-xs text-t4 mt-2">{inv.currency.name}</div>}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">الحالة</div>
                    <Badge variant={sb.variant} noDot>{sb.label}</Badge>
                    <div className="text-xs text-t4 mt-2">{invoice.user?.name ?? "—"}</div>
                    {invoice.validatedBy && <div className="text-xs text-t4">اعتمد: {invoice.validatedBy.name}</div>}
                    {invoice.notes && <div className="text-xs text-t4 mt-1 truncate">{invoice.notes}</div>}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">الرصيد</div>
                    {bal ? (
                        <>
                            <div className="text-sm font-bold">
                                {fmt(bal.previous_balance)} <span className="text-xs text-t4 font-normal">→</span> {fmt(bal.new_balance)} <span className="text-xs text-t4">دج</span>
                            </div>
                            {invoice.remaining_amount > 0 && (
                                <div className="text-xs text-red mt-2">متبقي: {fmt(invoice.remaining_amount)} دج</div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm font-bold">{fmt(invoice.total_ttc)} <span className="text-xs text-t4">دج</span></div>
                    )}
                </div>
            </div>

            {/* Lines Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <span className="font-bold text-base">بنود الفاتورة</span>
                        <span className="text-xs text-t4 bg-3 px-8 py-2 rounded-md">{lines.length} بند</span>
                    </div>
                </div>
                <SimpleTable
                    columns={lineColumns}
                    data={lines.map((line, i) => ({ ...line, _key: `l-${i}`, _idx: i })) as unknown as Record<string, unknown>[]}
                    rowKey="_key"
                    className="border border-b1 rounded-lg"
                />
            </div>

            {/* Payments Section */}
            {payments.length > 0 && (
                <div className="mb-12">
                    <div className="flex items-center gap-6 mb-8">
                        <span className="font-bold text-base">المدفوعات</span>
                        <span className="text-xs text-t4 bg-3 px-8 py-2 rounded-md">{payments.length} دفعة</span>
                    </div>
                    {payments.map((p, i) => {
                        const pm = p as any;
                        const iconMap: Record<string, string> = { cash: "ti-cash", bank: "ti-building-bank", ccp: "ti-mail", cib: "ti-credit-card", check: "ti-checks" };
                        const icon = iconMap[pm.payment_mode?.code] ?? "ti-cash";
                        return (
                            <div key={p.id ?? i} className="flex items-center justify-between p-10 mb-4 rounded-md bg-3">
                                <div className="flex items-center gap-8">
                                    <div className="ic ic-sm text-t4">
                                        <i className={`ti ${icon}`} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{pm.payment_mode?.name ?? "—"}</div>
                                        <div className="text-xs text-t4">{p.reference ?? ""} {p.payment_date ? `• ${dtf(p.payment_date)}` : ""}</div>
                                    </div>
                                </div>
                                <div className="font-extrabold font-mono">{fmt(p.amount)} <span className="text-t4">دج</span></div>
                            </div>
                        );
                    })}
                </div>
            )}

            <InvoiceDetailTotals invoice={invoice} bal={bal} fmt={fmt} />
        </Modal>
    );
}
