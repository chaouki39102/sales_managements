// pages/invoices/components/NewInvoiceTotals.tsx
export default function NewInvoiceTotals({ totals }: { totals: { ht: number; tva: number; ttc: number } }) {
    return (
        <div
            style={{
                width: 270,
                background: "var(--bg3)",
                borderRadius: "var(--r2)",
                padding: 14,
                border: "1px solid var(--b2)",
            }}
        >
            {[
                { label: "المجموع HT", val: totals.ht },
                { label: "TVA", val: totals.tva },
            ].map(({ label, val }) => (
                <div
                    key={label}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                        fontSize: 13,
                    }}
                >
                    <span style={{ color: "var(--t4)" }}>{label}</span>
                    <span>
                        {val.toLocaleString("fr-DZ", {
                            maximumFractionDigits: 0,
                        })}{" "}
                        دج
                    </span>
                </div>
            ))}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: "1px solid var(--b3)",
                    fontSize: 16,
                    fontWeight: 900,
                }}
            >
                <span>الإجمالي TTC</span>
                <span style={{ color: "var(--em)" }}>
                    {totals.ttc.toLocaleString("fr-DZ", {
                        maximumFractionDigits: 0,
                    })}{" "}
                    دج
                </span>
            </div>
        </div>
    );
}
