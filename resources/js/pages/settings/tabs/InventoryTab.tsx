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
import {
    useDirtyState,
    useSettingsDiff,
    extractList,
    str,
    SecHead,
    ToggleRow,
    SaveButton,
    SettingsLastModified,
} from "./_shared";

export function InventoryTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();

    const { data: rawSettings = [] } = useSettingsByGroup("inventory");
    const gs = makeGs(rawSettings);
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    const [valuationMethod, setValuationMethod] = useState<
        "fifo" | "lifo" | "weighted_average"
    >("weighted_average");
    const [allowNegativeStock, setAllowNegativeStock] = useState(false);
    const [manageLots, setManageLots] = useState(false);
    const [manageExpiry, setManageExpiry] = useState(false);
    const [lowStockDefault, setLowStockDefault] = useState("10");
    const [autoAdjust, setAutoAdjust] = useState(true);

    const { data: warehouses = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.warehouses(slug), 'inventory-tab'],
        queryFn: () => apiGet<any>("/warehouses", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });

    const initialSettings = useMemo(
        () => ({
            default_valuation_method: gs<string>(
                "default_valuation_method",
                "weighted_average",
            ),
            allow_negative_stock: gs<boolean>("allow_negative_stock", false),
            manage_lots: gs<boolean>("manage_lots", false),
            manage_expiry: gs<boolean>("manage_expiry", false),
            low_stock_default_threshold: Number(
                gs("low_stock_default_threshold", 10),
            ),
            auto_adjust_on_document: gs<boolean>(
                "auto_adjust_on_document",
                true,
            ),
        }),
        [rawSettings],
    );

    const getDiff = useSettingsDiff(initialSettings as Record<string, unknown>);

    useEffect(() => {
        if (!rawSettings.length) return;
        setValuationMethod(
            gs<"fifo" | "lifo" | "weighted_average">(
                "default_valuation_method",
                "weighted_average",
            ),
        );
        setAllowNegativeStock(gs<boolean>("allow_negative_stock", false));
        setManageLots(gs<boolean>("manage_lots", false));
        setManageExpiry(gs<boolean>("manage_expiry", false));
        setLowStockDefault(str(gs("low_stock_default_threshold", 10)));
        setAutoAdjust(gs<boolean>("auto_adjust_on_document", true));
    }, [rawSettings]);

    const doSave = async () => {
        const current = {
            default_valuation_method: valuationMethod,
            allow_negative_stock: allowNegativeStock,
            manage_lots: manageLots,
            manage_expiry: manageExpiry,
            low_stock_default_threshold: Number(lowStockDefault),
            auto_adjust_on_document: autoAdjust,
        };
        const diff = getDiff(current as Record<string, unknown>);
        if (Object.keys(diff).length === 0) {
            markClean();
            onClean?.();
            return;
        }
        await saveSettings(diff as Record<string, unknown>);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "inventory"],
        });
        // Sync POS negative-stock cache in localStorage
        if ("allow_negative_stock" in diff) {
            try {
                localStorage.setItem(
                    `pos-neg-stock-${slug}`,
                    allowNegativeStock ? "true" : "false",
                );
            } catch { /* ignore */ }
        }
        markClean();
        onClean?.();
    };

    const methods = [
        {
            id: "weighted_average",
            label: "PMP — المتوسط المرجح",
            desc: "Coût Moyen Pondéré — الأكثر شيوعاً في الجزائر",
            recommended: true,
        },
        {
            id: "fifo",
            label: "FIFO — الوارد أولاً يصدر أولاً",
            desc: "Premier Entré - Premier Sorti",
            recommended: false,
        },
        {
            id: "lifo",
            label: "LIFO — الوارد أخيراً يصدر أولاً",
            desc: "Dernier Entré - Premier Sorti",
            recommended: false,
        },
    ];

    const tr = (
        label: string,
        hint: string | undefined,
        checked: boolean,
        setter: (v: boolean) => void,
    ) => (
        <ToggleRow
            label={label}
            hint={hint}
            checked={checked}
            onChange={(v) => {
                setter(v);
                markDirty();
                onDirty?.();
            }}
        />
    );

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 760,
            }}
        >
            <Card>
                <SecHead
                    icon="ti-calculator"
                    label="طريقة تقييم المخزون الافتراضية"
                    color="var(--blue)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {methods.map((m) => (
                        <div
                            key={m.id}
                            onClick={() => {
                                setValuationMethod(m.id as any);
                                markDirty();
                                onDirty?.();
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "12px 16px",
                                borderRadius: 10,
                                cursor: "pointer",
                                border:
                                    valuationMethod === m.id
                                        ? "2px solid var(--em)"
                                        : "1px solid var(--b2)",
                                background:
                                    valuationMethod === m.id
                                        ? "var(--emb)"
                                        : "var(--bg3)",
                                transition: ".15s",
                            }}
                        >
                            <div
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: "50%",
                                    border: `2px solid ${valuationMethod === m.id ? "var(--em)" : "var(--b3)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                {valuationMethod === m.id && (
                                    <div
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            background: "var(--em)",
                                        }}
                                    />
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color:
                                                valuationMethod === m.id
                                                    ? "var(--em)"
                                                    : "var(--t1)",
                                        }}
                                    >
                                        {m.label}
                                    </span>
                                    {m.recommended && (
                                        <span
                                            style={{
                                                fontSize: 9.5,
                                                padding: "2px 7px",
                                                borderRadius: 10,
                                                background:
                                                    "color-mix(in srgb, var(--em) 15%, transparent)",
                                                color: "var(--em)",
                                                fontWeight: 700,
                                            }}
                                        >
                                            مُوصى به
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--t4)",
                                        marginTop: 2,
                                    }}
                                >
                                    {m.desc}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {warehouses.length > 0 && (
                    <div
                        style={{
                            marginTop: 10,
                            padding: "8px 12px",
                            background:
                                "color-mix(in srgb, var(--blue) 8%, transparent)",
                            borderRadius: 8,
                            border: "1px solid color-mix(in srgb, var(--blue) 20%, transparent)",
                            fontSize: 11,
                            color: "var(--t2)",
                        }}
                    >
                        <i
                            className="ti ti-info-circle"
                            style={{ color: "var(--blue)", marginLeft: 4 }}
                        />
                        المستودعات:{" "}
                        {(warehouses as any[])
                            .map((w: any) => w.name)
                            .join(" — ")}
                    </div>
                )}
            </Card>

            <Card>
                <SecHead icon="ti-settings-2" label="إعدادات المخزون العامة" />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "السماح بالمخزون السالب",
                        "يسمح بالبيع حتى لو لا يوجد رصيد",
                        allowNegativeStock,
                        setAllowNegativeStock,
                    )}
                    {tr(
                        "إدارة اللوطات",
                        "تتبع دفعات الشراء وأرقام السلاسل",
                        manageLots,
                        setManageLots,
                    )}
                    {tr(
                        "إدارة تواريخ انتهاء الصلاحية",
                        "تنبيه عند اقتراب انتهاء صلاحية اللوط",
                        manageExpiry,
                        setManageExpiry,
                    )}
                    {tr(
                        "تحديث المخزون تلقائياً",
                        "يُحدِّث الرصيد لحظة التحقق من الوثيقة",
                        autoAdjust,
                        setAutoAdjust,
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-alert-triangle"
                    label="حد تنبيه المخزون الافتراضي"
                    color="var(--red)"
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "var(--t2)" }}>
                        التنبيه عند وصول الكمية إلى أقل من
                    </span>
                    <input
                        type="number"
                        value={lowStockDefault}
                        onChange={(e) => {
                            setLowStockDefault(e.target.value);
                            markDirty();
                            onDirty?.();
                        }}
                        style={{
                            width: 90,
                            fontFamily: "monospace",
                            textAlign: "center",
                        }}
                        min={0}
                    />
                    <span style={{ fontSize: 13, color: "var(--t2)" }}>
                        وحدة
                    </span>
                </div>
            </Card>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <SettingsLastModified group="inventory" />
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
