// Step 3: Success
import type { Company, FiscalYear } from "./types";

export default function StepSuccess({
    company,
    fiscalYear,
}: {
    company: Company;
    fiscalYear: FiscalYear;
}) {
    return (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div
                style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    margin: "0 auto 16px",
                    background:
                        "linear-gradient(135deg, var(--em), var(--em3))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    boxShadow: "var(--emglow)",
                    animation: "popIn .5s cubic-bezier(.34,1.6,.64,1)",
                }}
            >
                ✓
            </div>
            <div
                style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: "var(--t1)",
                    marginBottom: 6,
                }}
            >
                تم إنشاء الشركة! 🎉
            </div>
            <div
                style={{
                    fontSize: 13,
                    color: "var(--t4)",
                    marginBottom: 20,
                    lineHeight: 1.7,
                }}
            >
                <strong style={{ color: "var(--em)" }}>{company.name}</strong>
                <br />
                السنة المالية{" "}
                <strong style={{ color: "var(--t2)" }}>
                    {fiscalYear.name}
                </strong>{" "}
                جاهزة
            </div>
            <div
                style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--emb)",
                    border: "1px solid var(--embo)",
                    color: "var(--em)",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <span
                    style={{
                        display: "inline-block",
                        animation: "spin .8s linear infinite",
                        fontSize: 16,
                    }}
                >
                    ⟳
                </span>
                جارٍ تحويلك...
            </div>
        </div>
    );
}
