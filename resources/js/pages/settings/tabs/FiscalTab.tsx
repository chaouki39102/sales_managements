import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import {
    useSettingsByGroup,
    useUpdateSettings,
    makeGs,
} from "@/lib/api/endpoints/settings";
import { apiGet } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import {
    useDirtyState,
    useSettingsDiff,
    extractList,
    str,
    SecHead,
    ToggleRow,
    SaveButton,
    SettingsLastModified,
    ConfirmModal,
} from "./_shared";

export function FiscalTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { years, selectedYear, setSelectedYear } = useFiscalYear();
    const { isDirty, markDirty, markClean } = useDirtyState();
    const [confirmRegime, setConfirmRegime] = useState<{
        yearId: number;
        yearName: string;
    } | null>(null);

    // ✅ useSettingsByGroup يُرجع Setting[]
    const { data: rawSettings = [] } = useSettingsByGroup("fiscal");
    const gs = makeGs(rawSettings);
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    const [regime, setRegime] = useState<"forfaitaire" | "reel">("reel");
    const [entityType, setEntityType] = useState<
        "pers_morale" | "pers_physique"
    >("pers_morale");
    const [ifuRate, setIfuRate] = useState<"5" | "12">("12");
    const [tvaRate, setTvaRate] = useState<"19" | "9">("19");
    const [fiscalStamp, setFiscalStamp] = useState(true);
    const [stampThreshold, setStampThreshold] = useState("30000");
    const [defaultCurrency, setDefaultCurrency] = useState("DZD");
    const [yearRegimes, setYearRegimes] = useState<
        Record<number, "forfaitaire" | "reel">
    >({});

    const { data: currencies = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.currencies(slug), 'settings-fiscal-tab'],
        queryFn: () => apiGet<any>("/currencies", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 60 * 60_000,
        placeholderData: [],
    });

    const initialSettings = useMemo(
        () => ({
            tax_regime: gs<string>("tax_regime", "reel"),
            entity_type: gs<string>("entity_type", "pers_morale"),
            ifu_rate: gs<string>("ifu_rate", "12"),
            default_tva_rate: gs<string>("default_tva_rate", "19"),
            fiscal_stamp_enabled: gs<boolean>("fiscal_stamp_enabled", true),
            fiscal_stamp_threshold: Number(gs("fiscal_stamp_threshold", 30000)),
            default_currency: gs<string>("default_currency", "DZD"),
            year_regimes: gs<Record<number, "forfaitaire" | "reel">>(
                "year_regimes",
                {},
            ),
        }),
        [rawSettings],
    );

    const getDiff = useSettingsDiff(initialSettings as Record<string, unknown>);

    useEffect(() => {
        if (!rawSettings.length) return;
        setRegime(gs<"forfaitaire" | "reel">("tax_regime", "reel"));
        setEntityType(
            gs<"pers_morale" | "pers_physique">("entity_type", "pers_morale"),
        );
        setIfuRate(gs<"5" | "12">("ifu_rate", "12"));
        setTvaRate(gs<"19" | "9">("default_tva_rate", "19"));
        setFiscalStamp(gs<boolean>("fiscal_stamp_enabled", true));
        setStampThreshold(str(gs("fiscal_stamp_threshold", 30000)));
        setDefaultCurrency(gs<string>("default_currency", "DZD"));
        setYearRegimes(
            gs<Record<number, "forfaitaire" | "reel">>("year_regimes", {}),
        );
    }, [rawSettings]);

    const currentYearRegime = selectedYear
        ? (yearRegimes[selectedYear.id] ?? regime)
        : regime;

    const setCurrentYearRegime = (r: "forfaitaire" | "reel") => {
        if (!selectedYear) return;
        const prev = yearRegimes[selectedYear.id] ?? regime;
        if (prev === "forfaitaire" && r === "reel") {
            setConfirmRegime({
                yearId: selectedYear.id,
                yearName: selectedYear.name,
            });
            return;
        }
        setYearRegimes((p) => ({ ...p, [selectedYear.id]: r }));
        markDirty();
        onDirty?.();
    };

    const doSave = async () => {
        const current = {
            tax_regime: regime,
            entity_type: entityType,
            ifu_rate: ifuRate,
            default_tva_rate: tvaRate,
            fiscal_stamp_enabled: fiscalStamp,
            fiscal_stamp_threshold: Number(stampThreshold),
            default_currency: defaultCurrency,
            year_regimes: yearRegimes as unknown,
        };
        const diff = getDiff(current as Record<string, unknown>);
        if (Object.keys(diff).length === 0) {
            markClean();
            onClean?.();
            return;
        }
        await saveSettings(diff as Record<string, unknown>);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "fiscal"],
        });
        markClean();
        onClean?.();
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 760,
            }}
        >
            <ConfirmModal
                open={!!confirmRegime}
                title="تأكيد التحول إلى النظام الحقيقي"
                message={`هل تريد تحويل السنة "${confirmRegime?.yearName}" من الجزافي إلى الحقيقي؟`}
                confirmLabel="نعم، تحويل"
                confirmColor="#0a7c52"
                warning="التغيير مهم ولا يمكن التراجع تلقائياً. يُنصح بمراجعة المحاسب."
                onConfirm={() => {
                    if (confirmRegime) {
                        setYearRegimes((p) => ({
                            ...p,
                            [confirmRegime.yearId]: "reel",
                        }));
                        setConfirmRegime(null);
                        markDirty();
                        onDirty?.();
                    }
                }}
                onCancel={() => setConfirmRegime(null)}
            />

            {/* باقي محتوى FiscalTab بالكامل — مطابق للنسخة الأصلية لكن بـ gs() الصحيح */}
            <Card>
                <SecHead
                    icon="ti-calendar"
                    label="النظام الضريبي حسب السنة المالية"
                    color="var(--blue)"
                    sub="كل سنة مالية يمكن أن تخضع لنظام مختلف"
                />
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 14,
                        flexWrap: "wrap",
                    }}
                >
                    {years.map((y) => (
                        <button
                            key={y.id}
                            onClick={() => setSelectedYear(y)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: 20,
                                cursor: "pointer",
                                fontSize: 12,
                                fontFamily: "Tajawal, sans-serif",
                                border:
                                    selectedYear?.id === y.id
                                        ? "2px solid var(--em)"
                                        : "1px solid var(--b2)",
                                background:
                                    selectedYear?.id === y.id
                                        ? "var(--emb)"
                                        : "var(--bg3)",
                                color:
                                    selectedYear?.id === y.id
                                        ? "var(--em)"
                                        : "var(--t2)",
                                fontWeight:
                                    selectedYear?.id === y.id ? 700 : 400,
                            }}
                        >
                            {y.name}
                            {(y as any).is_current && (
                                <i
                                    className="ti ti-star-filled"
                                    style={{
                                        color: "var(--gold)",
                                        fontSize: 9,
                                        marginRight: 4,
                                    }}
                                />
                            )}
                            {(y as any).is_closed && (
                                <i
                                    className="ti ti-lock"
                                    style={{
                                        color: "var(--t4)",
                                        fontSize: 9,
                                        marginRight: 4,
                                    }}
                                />
                            )}
                            {yearRegimes[y.id] && (
                                <span
                                    style={{
                                        marginRight: 6,
                                        fontSize: 10,
                                        padding: "1px 6px",
                                        borderRadius: 10,
                                        background:
                                            yearRegimes[y.id] === "reel"
                                                ? "color-mix(in srgb, var(--teal) 20%, transparent)"
                                                : "color-mix(in srgb, var(--gold) 20%, transparent)",
                                        color:
                                            yearRegimes[y.id] === "reel"
                                                ? "var(--teal)"
                                                : "var(--gold)",
                                    }}
                                >
                                    {yearRegimes[y.id] === "reel"
                                        ? "حقيقي"
                                        : "جزافي"}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {selectedYear && (
                    <div
                        style={{
                            padding: "14px 16px",
                            background: "var(--bg3)",
                            borderRadius: 10,
                            border: "1px solid var(--b2)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "var(--t2)",
                                marginBottom: 10,
                            }}
                        >
                            النظام الضريبي لـ{" "}
                            <span style={{ color: "var(--em)" }}>
                                {selectedYear.name}
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            {[
                                {
                                    v: "forfaitaire",
                                    l: "جزافي IFU",
                                    icon: "ti-leaf",
                                    color: "#d97706",
                                    desc: "رقم أعمال ≤ 8 مليون دج",
                                },
                                {
                                    v: "reel",
                                    l: "حقيقي Réel",
                                    icon: "ti-building",
                                    color: "#0a7c52",
                                    desc: "TVA + IBS/IRG + G50",
                                },
                            ].map(({ v, l, icon, color, desc }) => (
                                <button
                                    key={v}
                                    onClick={() =>
                                        !(selectedYear as any).is_closed &&
                                        setCurrentYearRegime(v as any)
                                    }
                                    disabled={(selectedYear as any).is_closed}
                                    style={{
                                        flex: 1,
                                        padding: "12px 16px",
                                        borderRadius: 10,
                                        cursor: (selectedYear as any).is_closed
                                            ? "not-allowed"
                                            : "pointer",
                                        border:
                                            currentYearRegime === v
                                                ? `2px solid ${color}`
                                                : "1px solid var(--b2)",
                                        background:
                                            currentYearRegime === v
                                                ? `${color}10`
                                                : "var(--bg2)",
                                        fontFamily: "Tajawal, sans-serif",
                                        opacity: (selectedYear as any).is_closed
                                            ? 0.6
                                            : 1,
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
                                            className={`ti ${icon}`}
                                            style={{ fontSize: 18, color }}
                                        />
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                fontSize: 13,
                                                color:
                                                    currentYearRegime === v
                                                        ? color
                                                        : "var(--t1)",
                                            }}
                                        >
                                            {l}
                                        </span>
                                        {currentYearRegime === v && (
                                            <i
                                                className="ti ti-check"
                                                style={{
                                                    color,
                                                    fontSize: 12,
                                                    marginRight: "auto",
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "var(--t4)",
                                        }}
                                    >
                                        {desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            <Card>
                <SecHead
                    icon="ti-stamp"
                    label="الطابع الجبائي"
                    color="var(--purple)"
                    sub="Art. 2 du Code du Timbre / LF 2024"
                />
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                    }}
                >
                    <ToggleRow
                        label="تفعيل الطابع الجبائي"
                        hint="يُطبَّق على الفواتير التي تتجاوز الحد الأدنى"
                        checked={fiscalStamp}
                        onChange={(v) => {
                            setFiscalStamp(v);
                            markDirty();
                            onDirty?.();
                        }}
                    />
                    {fiscalStamp && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "4px 14px",
                            }}
                        >
                            <span style={{ fontSize: 12, color: "var(--t3)" }}>
                                الحد الأدنى
                            </span>
                            <input
                                type="number"
                                value={stampThreshold}
                                onChange={(e) => {
                                    setStampThreshold(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                style={{ width: 120, fontFamily: "monospace" }}
                            />
                            <span style={{ fontSize: 12, color: "var(--t3)" }}>
                                دج
                            </span>
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-currency-dollar"
                    label="العملة الافتراضية"
                    color="var(--gold)"
                />
                <div className="fg" style={{ maxWidth: 300 }}>
                    <select
                        value={defaultCurrency}
                        onChange={(e) => {
                            setDefaultCurrency(e.target.value);
                            markDirty();
                            onDirty?.();
                        }}
                    >
                        <option value="DZD">DZD — الدينار الجزائري</option>
                        {(currencies as any[])
                            .filter((c: any) => c.code !== "DZD")
                            .map((c: any) => (
                                <option key={c.id} value={c.code}>
                                    {c.code} — {c.name}
                                </option>
                            ))}
                    </select>
                </div>
            </Card>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <SettingsLastModified group="fiscal" />
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
    );
}
