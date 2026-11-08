// Step 2 header: back button, company name and steps indicator
import type { Company } from "./types";

export default function StepFiscalYearHeader({
    onBack,
    company,
}: {
    onBack: () => void;
    company: Company;
}) {
    return (
        <div
            style={{
                background:
                    "linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)",
                padding: "22px 24px 18px",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: -50,
                    left: -50,
                    width: 160,
                    height: 160,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.06)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: -30,
                    right: 10,
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.04)",
                }}
            />

            <button
                onClick={onBack}
                style={{
                    position: "absolute",
                    top: 14,
                    left: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,.25)",
                    background: "rgba(255,255,255,.1)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "Tajawal, sans-serif",
                }}
            >
                <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
                رجوع
            </button>

            <div style={{ position: "relative" }}>
                <div
                    style={{
                        width: 46,
                        height: 46,
                        borderRadius: 13,
                        background: "rgba(255,255,255,.2)",
                        backdropFilter: "blur(8px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        marginBottom: 10,
                    }}
                >
                    🗓️
                </div>
                <div
                    style={{
                        fontSize: 17,
                        fontWeight: 900,
                        color: "#fff",
                        marginBottom: 3,
                    }}
                >
                    السنة المالية الأولى
                </div>
                <div
                    style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}
                >
                    لـ{" "}
                    <strong style={{ color: "#fff" }}>
                        {company.name}
                    </strong>
                </div>
            </div>

            {/* Steps */}
            <div
                style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 14,
                    position: "relative",
                }}
            >
                <div
                    style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 3,
                        background: "rgba(255,255,255,.4)",
                    }}
                />
                <div
                    style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 3,
                        background: "rgba(255,255,255,.9)",
                    }}
                />
            </div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 5,
                }}
            >
                <span
                    style={{ fontSize: 9, color: "rgba(255,255,255,.5)" }}
                >
                    معلومات الشركة ✓
                </span>
                <span
                    style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,.9)",
                        fontWeight: 700,
                    }}
                >
                    السنة المالية
                </span>
            </div>
        </div>
    );
}
