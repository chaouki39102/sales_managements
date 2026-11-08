// Step 1 footer: cancel + next buttons
export default function StepCompanyFooter({
    onClose,
    handleSubmit,
    loading,
    name,
}: {
    onClose: () => void;
    handleSubmit: () => Promise<void>;
    loading: boolean;
    name: string;
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
                onClick={onClose}
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
                }}
            >
                إلغاء
            </button>
            <button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                style={{
                    flex: 2,
                    padding: "11px",
                    borderRadius: 12,
                    border: "none",
                    background: name.trim() ? "var(--em)" : "var(--b2)",
                    color: name.trim() ? "#fff" : "var(--t4)",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor:
                        loading || !name.trim() ? "not-allowed" : "pointer",
                    fontFamily: "Tajawal, sans-serif",
                    boxShadow: name.trim() ? "var(--emglow)" : "none",
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
                        <span>التالي: السنة المالية</span>
                        <i
                            className="ti ti-arrow-left"
                            style={{ fontSize: 14 }}
                        />
                    </>
                )}
            </button>
        </div>
    );
}
