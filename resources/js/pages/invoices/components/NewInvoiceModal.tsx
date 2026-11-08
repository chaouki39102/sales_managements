// pages/invoices/components/NewInvoiceModal.tsx
import { useState, useMemo, useEffect } from "react";
import { useDocumentMutations } from "@/lib/api/endpoints/documents";
import { useWarehouses, useDocumentTypes } from "@/lib/api/endpoints/lookups";
import { useFiscalYear } from "@/context/FiscalYearContext";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { CommercialDocumentLine, Party } from "@/types";
import NewInvoiceLineRow from "./NewInvoiceLineRow";
import NewInvoiceTotals from "./NewInvoiceTotals";

// ── New Invoice Modal ──────────────────────────────
export default function NewInvoiceModal({
    open,
    onClose,
    customers,
}: {
    open: boolean;
    onClose: () => void;
    customers: Party[];
}) {
    const createMut = useDocumentMutations();
    const { data: warehouses } = useWarehouses();
    const { selectedYear: fiscalYear } = useFiscalYear();
    const { data: docTypes } = useDocumentTypes();


    const defaultDate = (): string => {
        const d = new Date().toISOString().split("T")[0];
        if (fiscalYear?.start_date && fiscalYear?.end_date) {
            const s = fiscalYear.start_date.substring(0, 10);
            const e = fiscalYear.end_date.substring(0, 10);
            if (d >= s && d <= e) return d;
            return e;
        }
        return d;
    };

    const [clientId, setClientId] = useState("");
    const [docDate, setDocDate] = useState(defaultDate());
    const [lines, setLines] = useState([
        {
            description: "",
            quantity: 1,
            unit_price_ht: 0,
            tva_rate: 19,
            discount_percentage: 0,
        },
    ]);
    const [note, setNote] = useState("");

    useEffect(() => {
        if (open) setDocDate(defaultDate());
    }, [open, fiscalYear?.id]);

    const addLine = () =>
        setLines((l) => [
            ...l,
            {
                description: "",
                quantity: 1,
                unit_price_ht: 0,
                tva_rate: 19,
                discount_percentage: 0,
            },
        ]);
    const removeLine = (i: number) =>
        setLines((l) => l.filter((_, idx) => idx !== i));

    const totals = useMemo(() => {
        let ht = 0,
            tva = 0;
        lines.forEach((l) => {
            const lineHt =
                l.unit_price_ht *
                l.quantity *
                (1 - l.discount_percentage / 100);
            ht += lineHt;
            tva += lineHt * (l.tva_rate / 100);
        });
        return { ht, tva, ttc: ht + tva };
    }, [lines]);

    const handleSave = async (_draft = false) => {
        const invType = docTypes?.find(
            (t) => t.code === "FAC" || t.name_latin?.includes("Invoice"),
        );
        const wh = warehouses?.[0];
        if (!invType || !wh || !fiscalYear) return;

        await (createMut.create.mutateAsync as any)({
            document_type_id: invType.id,
            party_id: clientId ? Number(clientId) : null,
            warehouse_id: wh.id,
            fiscal_year_id: fiscalYear.id,
            document_date: docDate,
            notes: note || null,
            lines: lines.map((l, i) => ({
                ...l,
                line_order: i + 1,
            })) as unknown as CommercialDocumentLine[],
        });
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title="فاتورة جديدة"
            footer={
                <>
                    <div className="m-foot-l">
                        <Button onClick={onClose}>إلغاء</Button>
                    </div>
                    <Button
                        icon={<i className="ti ti-file-minus" />}
                        onClick={() => handleSave(true)}
                    >
                        مسودة
                    </Button>
                    <Button
                        variant="primary"
                        icon={<i className="ti ti-circle-check" />}
                        onClick={() => handleSave(false)}
                        disabled={createMut.create.isPending}
                    >
                        {createMut.create.isPending ? "جاري الحفظ..." : "حفظ وطباعة"}
                    </Button>
                </>
            }
        >
            {/* Client + Date */}
            <div className="fgrid" style={{ marginBottom: 16 }}>
                <div className="fg">
                    <label>الزبون</label>
                    <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                    >
                        <option value="">👤 زبون الصندوق (Client Cash)</option>
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>التاريخ</label>
                    <input
                        type="date"
                        value={docDate}
                        onChange={e => setDocDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Lines */}
            <div
                style={{
                    border: "1px solid var(--b2)",
                    borderRadius: "var(--r2)",
                    overflow: "hidden",
                    marginBottom: 14,
                }}
            >
                <div style={{ overflowX: "auto" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 13,
                        }}
                    >
                        <thead>
                            <tr>
                                {[
                                    "#",
                                    "المنتج / الخدمة",
                                    "الكمية",
                                    "سعر HT",
                                    "TVA",
                                    "خصم %",
                                    "TTC",
                                    "",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "6px 10px",
                                            textAlign: "right",
                                            fontSize: 11,
                                            color: "var(--t4)",
                                            background: "var(--bg3)",
                                            borderBottom: "1px solid var(--b2)",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line, i) => {
                                const ttc =
                                    line.unit_price_ht *
                                    line.quantity *
                                    (1 - line.discount_percentage / 100) *
                                    (1 + line.tva_rate / 100);
                                return (
                                    <NewInvoiceLineRow
                                        key={i}
                                        line={line}
                                        i={i}
                                        ttc={ttc}
                                        setLines={setLines}
                                        removeLine={removeLine}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div
                    style={{
                        padding: "8px 14px",
                        borderTop: "1px solid var(--b1)",
                        background: "var(--bg3)",
                    }}
                >
                    <Button
                        size="xs"
                        icon={<i className="ti ti-plus" />}
                        onClick={addLine}
                    >
                        إضافة سطر
                    </Button>
                </div>
            </div>

            {/* Totals + Notes */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <div className="fg" style={{ flex: 1, minWidth: 200 }}>
                    <label>ملاحظات</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="ملاحظات اختيارية..."
                        style={{ minHeight: 60 }}
                    />
                </div>
                <NewInvoiceTotals totals={totals} />
            </div>
        </Modal>
    );
}
