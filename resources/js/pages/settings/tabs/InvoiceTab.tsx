import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import {
    useSettingsByGroup,
    useUpdateSettings,
    makeGs,
} from "@/lib/api/endpoints/settings";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import { useAuth } from "@/context/AuthContext";
import {
    useDirtyState,
    useSettingsDiff,
    useAutoSave,
    SecHead,
    ToggleRow,
    SaveButton,
    SettingsLastModified,
} from "./_shared";

const DESIGNS = [
    {
        id: "classic",
        label: "Classic",
        icon: "ti-template",
        desc: "ترويسة ملونة كاملة + جدول بسيط",
    },
    {
        id: "modern",
        label: "Modern",
        icon: "ti-layout-sidebar",
        desc: "خط جانبي ملون + بيانات منفصلة",
    },
    {
        id: "minimal",
        label: "Minimal",
        icon: "ti-minus",
        desc: "بدون ألوان — نص نظيف فقط",
    },
    {
        id: "professional",
        label: "Professional",
        icon: "ti-briefcase",
        desc: "ترويسة مزدوجة شركة + زبون",
    },
] as const;
type DesignId = (typeof DESIGNS)[number]["id"];

export function InvoiceTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    // ✅ activeCompany من AuthContext بدل useCurrentCompany (يمنع 404)
    const { activeCompany: company } = useAuth();

    // ✅ useSettingsByGroup يُرجع Setting[] مباشرة
    const { data: rawSettings = [] } = useSettingsByGroup("invoice");
    const gs = makeGs(rawSettings);

    const { isDirty, markDirty, markClean } = useDirtyState();
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    const [design, setDesign] = useState<DesignId>("classic");
    const [headerColor, setHeaderColor] = useState("#0a7c52");
    const [paperSize, setPaperSize] = useState("A4");
    const [fontSz, setFontSz] = useState("medium");
    const [priceMode, setPriceMode] = useState<"ht" | "ttc">("ttc");
    const [showLogo, setShowLogo] = useState(true);
    const [showStamp, setShowStamp] = useState(true);
    const [showSign, setShowSign] = useState(true);
    const [showWatermark, setShowWatermark] = useState(false);
    const [footerText, setFooterText] = useState("");
    const [legalText, setLegalText] = useState("");

    // ✅ initial state للـ diff
    const initialSettings = useMemo(
        () => ({
            invoice_design: gs<DesignId>("invoice_design", "classic"),
            invoice_header_color: gs<string>("invoice_header_color", "#0a7c52"),
            invoice_paper_size: gs<string>("invoice_paper_size", "A4"),
            invoice_font_size: gs<string>("invoice_font_size", "medium"),
            price_mode: gs<string>("price_mode", "ttc"),
            invoice_show_logo: gs<boolean>("invoice_show_logo", true),
            invoice_show_stamp: gs<boolean>("invoice_show_stamp", true),
            invoice_show_sign: gs<boolean>("invoice_show_sign", true),
            invoice_show_watermark: gs<boolean>(
                "invoice_show_watermark",
                false,
            ),
            invoice_footer_text: gs<string>("invoice_footer_text", ""),
            invoice_legal_text: gs<string>("invoice_legal_text", ""),
        }),
        [rawSettings],
    );

    const getDiff = useSettingsDiff(initialSettings);

    useEffect(() => {
        if (!rawSettings.length) return;
        setDesign(gs<DesignId>("invoice_design", "classic"));
        setHeaderColor(gs<string>("invoice_header_color", "#0a7c52"));
        setPaperSize(gs<string>("invoice_paper_size", "A4"));
        setFontSz(gs<string>("invoice_font_size", "medium"));
        setPriceMode(gs<"ht" | "ttc">("price_mode", "ttc"));
        setShowLogo(gs<boolean>("invoice_show_logo", true));
        setShowStamp(gs<boolean>("invoice_show_stamp", true));
        setShowSign(gs<boolean>("invoice_show_sign", true));
        setShowWatermark(gs<boolean>("invoice_show_watermark", false));
        setFooterText(gs<string>("invoice_footer_text", ""));
        setLegalText(gs<string>("invoice_legal_text", ""));
    }, [rawSettings]);

    const sd =
        <T,>(setter: (v: T) => void) =>
        (v: T) => {
            setter(v);
            markDirty();
            onDirty?.();
        };

    const doSave = async () => {
        const current = {
            invoice_design: design,
            invoice_header_color: headerColor,
            invoice_paper_size: paperSize,
            invoice_font_size: fontSz,
            price_mode: priceMode,
            invoice_show_logo: showLogo,
            invoice_show_stamp: showStamp,
            invoice_show_sign: showSign,
            invoice_show_watermark: showWatermark,
            invoice_footer_text: footerText,
            invoice_legal_text: legalText,
        };
        const diff = getDiff(current as any);
        if (Object.keys(diff).length === 0) {
            markClean();
            onClean?.();
            return;
        }
        await saveSettings(diff as Record<string, unknown>);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "invoice"],
        });
        markClean();
        onClean?.();
    };

    useAutoSave(isDirty, doSave, true, 2000);

    const fMap: Record<string, number> = {
        small: 10.5,
        medium: 12,
        large: 13.5,
    };
    const fontSize = fMap[fontSz] ?? 12;
    const companyName =
        (company as any)?.commercial_name ||
        (company as any)?.name ||
        "اسم المؤسسة";
    const companyLogo = (company as any)?.avatar ?? undefined;

    return (
        <div className="g65">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Card>
                    <SecHead icon="ti-template" label="اختيار تصميم الفاتورة" />
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                        }}
                    >
                        {DESIGNS.map((d) => (
                            <button
                                key={d.id}
                                onClick={() => {
                                    setDesign(d.id);
                                    markDirty();
                                    onDirty?.();
                                }}
                                style={{
                                    padding: "14px 16px",
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    textAlign: "right",
                                    border:
                                        design === d.id
                                            ? "2px solid var(--em)"
                                            : "1px solid var(--b2)",
                                    background:
                                        design === d.id
                                            ? "var(--emb)"
                                            : "var(--bg3)",
                                    fontFamily: "Tajawal, sans-serif",
                                    transition: ".15s",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 4,
                                    }}
                                >
                                    <i
                                        className={`ti ${d.icon}`}
                                        style={{
                                            fontSize: 18,
                                            color:
                                                design === d.id
                                                    ? "var(--em)"
                                                    : "var(--t3)",
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 13,
                                            color:
                                                design === d.id
                                                    ? "var(--em)"
                                                    : "var(--t1)",
                                        }}
                                    >
                                        {d.label}
                                    </span>
                                    {design === d.id && (
                                        <i
                                            className="ti ti-check"
                                            style={{
                                                color: "var(--em)",
                                                fontSize: 13,
                                                marginRight: "auto",
                                            }}
                                        />
                                    )}
                                </div>
                                <div
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    {d.desc}
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-percentage"
                        label="وضع الأسعار الافتراضي"
                        color="var(--gold)"
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                        {[
                            {
                                v: "ht",
                                l: "HT — بدون TVA",
                                h: "أسعار خارج الضريبة",
                            },
                            {
                                v: "ttc",
                                l: "TTC — شامل TVA",
                                h: "أسعار شاملة الضريبة",
                            },
                        ].map(({ v, l, h }) => (
                            <button
                                key={v}
                                onClick={() => sd(setPriceMode)(v as any)}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    border:
                                        priceMode === v
                                            ? "2px solid var(--em)"
                                            : "1px solid var(--b2)",
                                    background:
                                        priceMode === v
                                            ? "var(--emb)"
                                            : "var(--bg3)",
                                    fontFamily: "Tajawal, sans-serif",
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 13,
                                        color:
                                            priceMode === v
                                                ? "var(--em)"
                                                : "var(--t1)",
                                    }}
                                >
                                    {l}
                                </div>
                                <div
                                    style={{
                                        fontSize: 10.5,
                                        color: "var(--t4)",
                                        marginTop: 2,
                                    }}
                                >
                                    {h}
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <Card>
                    <SecHead icon="ti-printer" label="خيارات الطباعة" />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        <ToggleRow
                            label="إظهار الشعار"
                            hint="في رأس كل مطبوع"
                            checked={showLogo}
                            onChange={sd(setShowLogo)}
                        />
                        <ToggleRow
                            label="خانة الختم والإمضاء"
                            hint="للمطبوعات الرسمية"
                            checked={showStamp}
                            onChange={sd(setShowStamp)}
                        />
                        <ToggleRow
                            label="التوقيع الرقمي"
                            hint="توقيع إلكتروني آلي"
                            checked={showSign}
                            onChange={sd(setShowSign)}
                        />
                        <ToggleRow
                            label="علامة مائية «نسخة»"
                            hint="على نسخ الأرشفة"
                            checked={showWatermark}
                            onChange={sd(setShowWatermark)}
                        />
                    </div>
                    <div
                        className="fgrid c2"
                        style={{ gap: 12, marginTop: 14 }}
                    >
                        <div className="fg">
                            <label>حجم الورق</label>
                            <select
                                value={paperSize}
                                onChange={(e) =>
                                    sd(setPaperSize)(e.target.value)
                                }
                            >
                                <option value="A4">A4 — قياسي</option>
                                <option value="A5">A5</option>
                                <option value="thermal">حراري 80mm</option>
                            </select>
                        </div>
                        <div className="fg">
                            <label>حجم الخط</label>
                            <select
                                value={fontSz}
                                onChange={(e) => sd(setFontSz)(e.target.value)}
                            >
                                <option value="small">صغير</option>
                                <option value="medium">متوسط</option>
                                <option value="large">كبير</option>
                            </select>
                        </div>
                        <div className="fg">
                            <label>لون الترويسة</label>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                }}
                            >
                                <input
                                    type="color"
                                    value={headerColor}
                                    onChange={(e) =>
                                        sd(setHeaderColor)(e.target.value)
                                    }
                                    style={{
                                        width: 40,
                                        height: 34,
                                        border: "1px solid var(--b2)",
                                        borderRadius: 6,
                                        padding: 2,
                                        cursor: "pointer",
                                    }}
                                />
                                <input
                                    value={headerColor}
                                    onChange={(e) =>
                                        sd(setHeaderColor)(e.target.value)
                                    }
                                    style={{ fontFamily: "monospace", flex: 1 }}
                                    maxLength={7}
                                />
                            </div>
                        </div>
                        <div className="fg" />
                        <div className="fg s2">
                            <label>نص التذييل</label>
                            <input
                                value={footerText}
                                onChange={(e) =>
                                    sd(setFooterText)(e.target.value)
                                }
                                placeholder="شكراً لثقتكم..."
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-gavel"
                        label="النص القانوني الإلزامي"
                        color="var(--red)"
                        sub="إلزامي قانونياً في كل فاتورة — يُطبع في أسفل المستند"
                    />
                    <textarea
                        value={legalText}
                        onChange={(e) => sd(setLegalText)(e.target.value)}
                        rows={4}
                        style={{
                            width: "100%",
                            fontFamily: "Tajawal, sans-serif",
                            fontSize: 12,
                            resize: "vertical",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--b2)",
                            background: "var(--bg3)",
                            color: "var(--t1)",
                        }}
                    />
                </Card>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <SettingsLastModified group="invoice" />
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <span style={{ fontSize: 11, color: "var(--t4)" }}>
                            <i
                                className="ti ti-robot"
                                style={{ marginLeft: 4 }}
                            />
                            حفظ تلقائي مفعّل
                        </span>
                        <SaveButton
                            onClick={doSave}
                            loading={saving}
                            isDirty={isDirty}
                            onClean={() => {
                                markClean();
                                onClean?.();
                            }}
                        />
                    </div>
                </div>
            </div>

            <div>
                <Card>
                    <SecHead
                        icon="ti-eye"
                        label={`معاينة — ${DESIGNS.find((d) => d.id === design)?.label}`}
                        color="var(--teal)"
                    />
                    <InvoiceLivePreview
                        design={design}
                        color={headerColor}
                        fontSize={fontSize}
                        showLogo={showLogo}
                        showStamp={showStamp}
                        showWatermark={showWatermark}
                        priceMode={priceMode}
                        footerText={footerText}
                        legalText={legalText}
                        companyName={companyName}
                        logo={companyLogo}
                    />
                </Card>
            </div>
        </div>
    );
}

// InvoiceLivePreview — لم يتغير منطقياً، مُبسَّط هنا
function InvoiceLivePreview({
    design,
    color,
    fontSize,
    showLogo,
    showStamp,
    showWatermark,
    priceMode,
    footerText,
    legalText,
    companyName,
    logo,
}: any) {
    const base: CSSProperties = {
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        overflow: "hidden",
        fontFamily: "Tajawal, sans-serif",
        fontSize,
        direction: "rtl",
        boxShadow: "0 2px 8px rgba(0,0,0,.06)",
        position: "relative",
    };
    const tableBody = (
        <table
            style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: fontSize - 1,
            }}
        >
            <thead>
                <tr style={{ background: "#f1f5f9" }}>
                    {[
                        "المنتج",
                        "الكمية",
                        priceMode === "ht" ? "HT" : "TTC",
                        "TVA",
                        "الإجمالي",
                    ].map((h) => (
                        <th
                            key={h}
                            style={{
                                padding: "3px 6px",
                                borderBottom: "1px solid #e2e8f0",
                                textAlign: h === "المنتج" ? "right" : "center",
                                fontWeight: 600,
                            }}
                        >
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style={{ padding: "4px 6px" }}>منتج تجريبي</td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        5
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        1,000
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        19%
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        5,950
                    </td>
                </tr>
            </tbody>
        </table>
    );
    const stampBox = showStamp && (
        <div
            style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
            }}
        >
            <div
                style={{
                    textAlign: "center",
                    fontSize: fontSize - 2,
                    color: "#94a3b8",
                }}
            >
                <div
                    style={{
                        border: "1px dashed #cbd5e1",
                        width: 64,
                        height: 44,
                        borderRadius: 4,
                        marginBottom: 3,
                    }}
                />
                الختم والإمضاء
            </div>
        </div>
    );
    const watermark = showWatermark && (
        <div
            style={{
                position: "absolute",
                top: "40%",
                left: "50%",
                transform: "translate(-50%,-50%) rotate(-35deg)",
                fontSize: 32,
                color: "rgba(0,0,0,.06)",
                fontWeight: 900,
                pointerEvents: "none",
                whiteSpace: "nowrap",
            }}
        >
            نسخة
        </div>
    );
    const footer = (footerText || legalText) && (
        <div
            style={{
                background: "#f8fafc",
                padding: "6px 14px",
                fontSize: fontSize - 2,
                color: "#94a3b8",
                borderTop: "1px solid #e2e8f0",
            }}
        >
            {footerText && <div>{footerText}</div>}
            {legalText && (
                <div style={{ marginTop: 2, fontStyle: "italic" }}>
                    {legalText.slice(0, 80)}
                    {legalText.length > 80 ? "..." : ""}
                </div>
            )}
        </div>
    );

    if (design === "minimal")
        return (
            <div style={{ ...base, padding: "14px 16px" }}>
                {watermark}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "2px solid #1e293b",
                        paddingBottom: 8,
                        marginBottom: 10,
                    }}
                >
                    <div
                        style={{
                            fontWeight: 900,
                            fontSize: fontSize + 2,
                            color: "#1e293b",
                        }}
                    >
                        {companyName}
                    </div>
                    <div
                        style={{
                            fontSize: fontSize - 1,
                            color: "#64748b",
                            textAlign: "left",
                        }}
                    >
                        <div>FAC-2026-000001</div>
                        <div>{new Date().toLocaleDateString("fr-DZ")}</div>
                    </div>
                </div>
                <div
                    style={{
                        fontSize: fontSize - 1,
                        color: "#64748b",
                        marginBottom: 8,
                    }}
                >
                    الزبون: محمد بن علي
                </div>
                {tableBody}
                {stampBox}
            </div>
        );

    return (
        <div style={base}>
            {watermark}
            <div
                style={{
                    background: color,
                    color: "#fff",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {showLogo && logo ? (
                    <img
                        src={logo}
                        alt=""
                        style={{ height: 32, objectFit: "contain" }}
                    />
                ) : (
                    <span style={{ fontWeight: 900, fontSize: fontSize + 2 }}>
                        {companyName}
                    </span>
                )}
                <span style={{ fontSize: fontSize - 1, opacity: 0.85 }}>
                    FAC-2026-000001
                </span>
            </div>
            <div style={{ padding: "10px 14px" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: fontSize - 1,
                        color: "#64748b",
                        marginBottom: 8,
                    }}
                >
                    <span>الزبون: محمد بن علي</span>
                    <span>{new Date().toLocaleDateString("fr-DZ")}</span>
                </div>
                {tableBody}
                {stampBox}
            </div>
            {footer}
        </div>
    );
}
