// Step 2 footer: back + create buttons
export default function StepFiscalYearFooter({
    onBack,
    handleCreate,
    loading,
    validYear,
}: {
    onBack: () => void;
    handleCreate: () => Promise<void>;
    loading: boolean;
    validYear: boolean;
}) {
    return (
        <div
            style={{
                padding: "12px 22px 20px",
                borderTop: "1px solid var(--b1)",
                display: "flex",
                gap: 10,
            }}
        >
            <button
                onClick={onBack}
                style={{
                    flex: 1,
                    padding: "11px",
                    borderRadius: 12,
                    border: "1px solid var(--b3)",
                    background: "var(--bg3)",
                    color: "var(--t3)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "Tajawal, sans-serif",
                    transition: ".13s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                }}
            >
                <i className="ti ti-arrow-right" style={{ fontSize: 13 }} />
                رجوع
            </button>
            <button
                onClick={handleCreate}
                disabled={loading || !validYear}
                style={{
                    flex: 2,
                    padding: "11px",
                    borderRadius: 12,
                    border: "none",
                    background: validYear ? "var(--em)" : "var(--b2)",
                    color: validYear ? "#fff" : "var(--t4)",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor:
                        loading || !validYear ? "not-allowed" : "pointer",
                    fontFamily: "Tajawal, sans-serif",
                    boxShadow: validYear ? "var(--emglow)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all .15s",
                }}
            >
                {loading ? (
                    <>
                        <span
                            style={{
                                display: "inline-block",
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                border: "2px solid rgba(255,255,255,.3)",
                                borderTopColor: "#fff",
                                animation: "spin .7s linear infinite",
                            }}
                        />
                        جارٍ الإنشاء...
                    </>
                ) : (
                    <>
                        <i
                            className="ti ti-check"
                            style={{ fontSize: 15 }}
                        />
                        إنشاء والدخول
                    </>
                )}
            </button>
        </div>
    );
}
