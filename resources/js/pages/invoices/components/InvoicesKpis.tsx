// pages/invoices/components/InvoicesKpis.tsx
import KpiCard from "@/components/ui/KpiCard";

export default function InvoicesKpis() {
    return (
        <div
            className="kpis"
            style={{
                gridTemplateColumns: "repeat(4,1fr)",
                marginBottom: 16,
            }}
        >
            <KpiCard
                variant="green"
                icon="ti-circle-check"
                label="مدفوعة"
                value="1,248,400"
                unit="دج"
                sub="318 فاتورة"
            />
            <KpiCard
                variant="gold"
                icon="ti-clock"
                label="معلقة وجزئية"
                value="384,700"
                unit="دج"
                sub="16 فاتورة"
            />
            <KpiCard
                variant="red"
                icon="ti-ban"
                label="ملغاة"
                value="8"
                sub="قيمة: 24,500 دج"
            />
            <KpiCard
                variant="blue"
                icon="ti-calculator"
                label="TVA محصّلة"
                value="237,196"
                unit="دج"
                sub="G50 — 20 ماي"
            />
        </div>
    );
}
