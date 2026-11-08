// Step 1 header: title, close button and steps indicator
export default function StepCompanyHeader({
    onClose,
}: {
    onClose: () => void;
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
            {/* Decorative circles */}
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
                onClick={onClose}
                style={{
                    position: "absolute",
                    top: 14,
                    left: 16,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(255,255,255,.15)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)",
                }}
            >
                ×
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
                    🏢
                </div>
                <div
                    style={{
                        fontSize: 17,
                        fontWeight: 900,
                        color: "#fff",
                        marginBottom: 3,
                    }}
                >
                    إنشاء شركة جديدة
                </div>
                <div
                    style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}
                >
                    أدخل بيانات شركتك — حقل الاسم إلزامي فقط
                </div>
            </div>

            {/* Steps indicator */}
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
                        background: "rgba(255,255,255,.9)",
                    }}
                />
                <div
                    style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 3,
                        background: "rgba(255,255,255,.3)",
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
                    style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,.9)",
                        fontWeight: 700,
                    }}
                >
                    معلومات الشركة
                </span>
                <span
                    style={{ fontSize: 9, color: "rgba(255,255,255,.5)" }}
                >
                    السنة المالية
                </span>
            </div>
        </div>
    );
}
