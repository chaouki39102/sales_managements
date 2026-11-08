// Step 1: collapsible legal / tax documents section
import Field from "./Field";
import SectionTitle from "./SectionTitle";

export default function LegalDocsSection({
    showDocs,
    setShowDocs,
    nif,
    setNif,
    nis,
    setNis,
    rc,
    setRc,
    ai,
    setAi,
}: {
    showDocs: boolean;
    setShowDocs: React.Dispatch<React.SetStateAction<boolean>>;
    nif: string;
    setNif: React.Dispatch<React.SetStateAction<string>>;
    nis: string;
    setNis: React.Dispatch<React.SetStateAction<string>>;
    rc: string;
    setRc: React.Dispatch<React.SetStateAction<string>>;
    ai: string;
    setAi: React.Dispatch<React.SetStateAction<string>>;
}) {
    return (
        <>
            {/* ── الوثائق القانونية (قابلة للطي) */}
            <button
                onClick={() => setShowDocs((v) => !v)}
                style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1px dashed var(--b3)",
                    background: "transparent",
                    color: "var(--t4)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "Tajawal, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: showDocs ? 14 : 4,
                    transition: "all .15s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg3)";
                    e.currentTarget.style.color = "var(--t2)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--t4)";
                }}
            >
                <span
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                    }}
                >
                    <i
                        className="ti ti-file-text"
                        style={{ fontSize: 13 }}
                    />
                    الوثائق القانونية والجبائية
                    <span
                        style={{
                            fontSize: 9,
                            padding: "1px 6px",
                            borderRadius: 10,
                            background: "var(--bg4)",
                            color: "var(--t4)",
                        }}
                    >
                        اختياري
                    </span>
                </span>
                <i
                    className={`ti ti-chevron-${showDocs ? "up" : "down"}`}
                    style={{ fontSize: 12 }}
                />
            </button>

            {showDocs && (
                <div
                    style={{
                        background: "var(--bg3)",
                        borderRadius: 12,
                        border: "1px solid var(--b1)",
                        padding: "14px 14px 4px",
                        marginBottom: 14,
                        animation: "slidedown .2s ease",
                    }}
                >
                    <SectionTitle
                        icon="ti-license"
                        label="الأرقام الجبائية"
                    />
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0 12px",
                        }}
                    >
                        <Field
                            label="رقم NIF"
                            icon="ti-hash"
                            value={nif}
                            onChange={setNif}
                            placeholder="NIF"
                            dir="ltr"
                            hint="رقم التعريف الجبائي"
                        />
                        <Field
                            label="رقم NIS"
                            icon="ti-hash"
                            value={nis}
                            onChange={setNis}
                            placeholder="NIS"
                            dir="ltr"
                            hint="رقم التعريف الإحصائي"
                        />
                        <Field
                            label="رقم RC"
                            icon="ti-building-community"
                            value={rc}
                            onChange={setRc}
                            placeholder="السجل التجاري"
                            dir="ltr"
                        />
                        <Field
                            label="رقم AI"
                            icon="ti-receipt-2"
                            value={ai}
                            onChange={setAi}
                            placeholder="مقالة الضريبة"
                            dir="ltr"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
