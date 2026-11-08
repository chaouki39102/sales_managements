// Step 2: preview card of the fiscal year to be created
import { fmtDate } from "./helpers";

export default function FiscalYearPreview({
    validYear,
    yearNum,
    startDate,
    endDate,
}: {
    validYear: boolean;
    yearNum: string;
    startDate: string;
    endDate: string;
}) {
    return (
        <>
            {validYear && (
                <div
                    style={{
                        marginTop: 14,
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "var(--bg3)",
                        border: "1px solid var(--b1)",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        animation: "fadeup .2s ease",
                    }}
                >
                    <div
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 11,
                            flexShrink: 0,
                            background:
                                "linear-gradient(135deg, var(--em), var(--em3))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            boxShadow: "var(--emglow)",
                        }}
                    >
                        📅
                    </div>
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: "var(--em)",
                            }}
                        >
                            السنة المالية {yearNum}
                            <span
                                style={{
                                    fontSize: 9,
                                    marginRight: 8,
                                    padding: "2px 8px",
                                    borderRadius: 20,
                                    background: "var(--em)",
                                    color: "#fff",
                                    fontWeight: 700,
                                }}
                            >
                                الحالية
                            </span>
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: "var(--t4)",
                                marginTop: 2,
                            }}
                        >
                            {fmtDate(startDate)} — {fmtDate(endDate)}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
