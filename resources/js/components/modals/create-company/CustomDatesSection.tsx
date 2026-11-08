// Step 2: custom start/end dates toggle and inputs
export default function CustomDatesSection({
    useCustom,
    setUseCustom,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
}: {
    useCustom: boolean;
    setUseCustom: React.Dispatch<React.SetStateAction<boolean>>;
    startDate: string;
    setStartDate: React.Dispatch<React.SetStateAction<string>>;
    endDate: string;
    setEndDate: React.Dispatch<React.SetStateAction<string>>;
}) {
    return (
        <>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--bg3)",
                    border: "1px solid var(--b1)",
                    marginBottom: useCustom ? 14 : 0,
                    cursor: "pointer",
                }}
                onClick={() => setUseCustom((v) => !v)}
            >
                <span
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--t2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                    }}
                >
                    <i
                        className="ti ti-calendar-event"
                        style={{ color: "var(--em)", fontSize: 13 }}
                    />
                    تواريخ مخصصة
                </span>
                <div
                    style={{
                        width: 36,
                        height: 20,
                        borderRadius: 20,
                        position: "relative",
                        background: useCustom ? "var(--em)" : "var(--b3)",
                        transition: "all .2s",
                        boxShadow: useCustom ? "var(--emglow)" : "none",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#fff",
                            transition: "all .2s",
                            left: useCustom ? 18 : 2,
                            boxShadow: "0 1px 4px rgba(0,0,0,.2)",
                        }}
                    />
                </div>
            </div>

            {useCustom && (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0 12px",
                        animation: "slidedown .2s ease",
                    }}
                >
                    <div style={{ marginBottom: 12 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--t3)",
                                marginBottom: 5,
                            }}
                        >
                            <i
                                className="ti ti-calendar-plus"
                                style={{
                                    color: "var(--em)",
                                    fontSize: 11,
                                    marginLeft: 4,
                                }}
                            />
                            تاريخ البداية
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "9px 12px",
                                borderRadius: 10,
                                outline: "none",
                                border: "1.5px solid var(--b2)",
                                background: "var(--bg3)",
                                color: "var(--t1)",
                                fontFamily: "Tajawal, sans-serif",
                                fontSize: 12,
                            }}
                            onFocus={(e) =>
                                (e.target.style.borderColor = "var(--em)")
                            }
                            onBlur={(e) =>
                                (e.target.style.borderColor = "var(--b2)")
                            }
                        />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--t3)",
                                marginBottom: 5,
                            }}
                        >
                            <i
                                className="ti ti-calendar-minus"
                                style={{
                                    color: "var(--em)",
                                    fontSize: 11,
                                    marginLeft: 4,
                                }}
                            />
                            تاريخ النهاية
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "9px 12px",
                                borderRadius: 10,
                                outline: "none",
                                border: "1.5px solid var(--b2)",
                                background: "var(--bg3)",
                                color: "var(--t1)",
                                fontFamily: "Tajawal, sans-serif",
                                fontSize: 12,
                            }}
                            onFocus={(e) =>
                                (e.target.style.borderColor = "var(--em)")
                            }
                            onBlur={(e) =>
                                (e.target.style.borderColor = "var(--b2)")
                            }
                        />
                    </div>
                </div>
            )}
        </>
    );
}
