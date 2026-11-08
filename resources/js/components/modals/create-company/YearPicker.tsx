// Step 2: quick year picker + custom year input
import { currentYear } from "./helpers";

export default function YearPicker({
    yearNum,
    setYearNum,
    setError,
    validYear,
}: {
    yearNum: string;
    setYearNum: React.Dispatch<React.SetStateAction<string>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    validYear: boolean;
}) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--t3)",
                    marginBottom: 6,
                }}
            >
                <i
                    className="ti ti-calendar"
                    style={{ color: "var(--em)", fontSize: 12 }}
                />
                السنة
                <span style={{ color: "var(--red)", fontSize: 13 }}>
                    *
                </span>
            </label>

            {/* Quick year picker */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 8,
                    flexWrap: "wrap",
                }}
            >
                {[currentYear - 1, currentYear, currentYear + 1].map(
                    (y) => (
                        <button
                            key={y}
                            onClick={() => {
                                setYearNum(String(y));
                                setError(null);
                            }}
                            style={{
                                padding: "7px 16px",
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 800,
                                border: `2px solid ${yearNum === String(y) ? "var(--em)" : "var(--b2)"}`,
                                background:
                                    yearNum === String(y)
                                        ? "var(--em)"
                                        : "var(--bg3)",
                                color:
                                    yearNum === String(y)
                                        ? "#fff"
                                        : "var(--t2)",
                                cursor: "pointer",
                                fontFamily: "Tajawal, sans-serif",
                                transition: "all .13s",
                                boxShadow:
                                    yearNum === String(y)
                                        ? "var(--emglow)"
                                        : "none",
                            }}
                        >
                            {y}
                            {y === currentYear && (
                                <span
                                    style={{
                                        fontSize: 8,
                                        marginRight: 4,
                                        opacity: 0.8,
                                    }}
                                >
                                    الحالية
                                </span>
                            )}
                        </button>
                    ),
                )}
                <input
                    type="number"
                    value={yearNum}
                    onChange={(e) => {
                        setYearNum(e.target.value);
                        setError(null);
                    }}
                    min={2000}
                    max={2100}
                    dir="ltr"
                    style={{
                        width: 90,
                        padding: "7px 10px",
                        borderRadius: 20,
                        border: `2px solid ${![String(currentYear - 1), String(currentYear), String(currentYear + 1)].includes(yearNum) && validYear ? "var(--em)" : "var(--b2)"}`,
                        background: "var(--bg3)",
                        color: "var(--t1)",
                        fontFamily: "Tajawal, sans-serif",
                        fontSize: 13,
                        fontWeight: 700,
                        outline: "none",
                        textAlign: "center",
                    }}
                    placeholder="أخرى"
                    onFocus={(e) =>
                        (e.target.style.borderColor = "var(--em)")
                    }
                    onBlur={(e) => {
                        if (!validYear)
                            e.target.style.borderColor = "var(--red)";
                    }}
                />
            </div>
        </div>
    );
}
