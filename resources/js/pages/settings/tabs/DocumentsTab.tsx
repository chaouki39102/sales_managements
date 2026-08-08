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

export function DocumentsTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();
    const { data: rawSettings = [] } = useSettingsByGroup("documents");
    const { data: rawInvSettings = [] } = useSettingsByGroup("inventory");
    const allSettings = useMemo(() => [...rawSettings, ...rawInvSettings], [rawSettings, rawInvSettings]);
    const gs = makeGs(allSettings);
    const { mutateAsync: saveSettings, isPending: saving } = useUpdateSettings();

    const [warehouseId, setWarehouseId] = useState("");
    const [currencyId, setCurrencyId] = useState("1");
    const [priceLevelId, setPriceLevelId] = useState("");
    const [paymentModeId, setPaymentModeId] = useState("");
    const [treasuryAccountId, setTreasuryAccountId] = useState("");
    const [fyBehavior, setFyBehavior] = useState("current");
    const [lineMode, setLineMode] = useState("table");
    const [visibleCols, setVisibleCols] = useState("");
    const [allowNegativeOnSale, setAllowNegativeOnSale] = useState(false);
    const [autoCreateLot, setAutoCreateLot] = useState(true);

    const { data: warehouses = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.warehouses(slug), 'settings-tab'],
        queryFn: () => apiGet<any>("/warehouses", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: currencies = [] } = useQuery({
        queryKey: [slug, "currencies", "settings-tab"],
        queryFn: () => apiGet<any>("/currencies", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: priceLevels = [] } = useQuery({
        queryKey: [slug, "price-levels", "settings-tab"],
        queryFn: () => apiGet<any>("/price-levels", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: paymentModes = [] } = useQuery({
        queryKey: [slug, "payment-modes", "settings-tab"],
        queryFn: () => apiGet<any>("/payment-modes", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: treasuryAccounts = [] } = useQuery({
        queryKey: [slug, "treasury-accounts", "settings-tab"],
        queryFn: () => apiGet<any>("/treasury-accounts", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });

    const initialSettings = useMemo(
        () => ({
            default_warehouse_id: Number(gs("default_warehouse_id", "")),
            default_currency_id: Number(gs("default_currency_id", 1)),
            default_price_level_id: Number(gs("default_price_level_id", "")),
            default_payment_mode_id: Number(gs("default_payment_mode_id", "")),
            default_treasury_account_id: Number(gs("default_treasury_account_id", "")),
            default_fiscal_year_behavior: gs<string>("default_fiscal_year_behavior", "current"),
            documents_default_line_mode: gs<string>("documents_default_line_mode", "table"),
            documents_default_visible_cols: gs<string[]>("documents_default_visible_cols", []),
            allow_negative_stock_on_sale: gs<boolean>("allow_negative_stock_on_sale", false),
            auto_create_lot_on_purchase: gs<boolean>("auto_create_lot_on_purchase", true),
        }),
        [allSettings],
    );

    const getDiff = useSettingsDiff(initialSettings as Record<string, unknown>);

    useEffect(() => {
        if (!allSettings.length) return;
        setWarehouseId(str(gs("default_warehouse_id", "")));
        setCurrencyId(str(gs("default_currency_id", 1)));
        setPriceLevelId(str(gs("default_price_level_id", "")));
        setPaymentModeId(str(gs("default_payment_mode_id", "")));
        setTreasuryAccountId(str(gs("default_treasury_account_id", "")));
        setFyBehavior(gs<string>("default_fiscal_year_behavior", "current"));
        setLineMode(gs<string>("documents_default_line_mode", "table"));
        const cols = gs<string[]>("documents_default_visible_cols", []);
        setVisibleCols(Array.isArray(cols) ? cols.join(", ") : "");
        setAllowNegativeOnSale(gs<boolean>("allow_negative_stock_on_sale", false));
        setAutoCreateLot(gs<boolean>("auto_create_lot_on_purchase", true));
    }, [allSettings]);

    const doSave = async () => {
        const current = {
            default_warehouse_id: warehouseId ? Number(warehouseId) : null,
            default_currency_id: Number(currencyId),
            default_price_level_id: priceLevelId ? Number(priceLevelId) : null,
            default_payment_mode_id: paymentModeId ? Number(paymentModeId) : null,
            default_treasury_account_id: treasuryAccountId ? Number(treasuryAccountId) : null,
            default_fiscal_year_behavior: fyBehavior,
            documents_default_line_mode: lineMode,
            documents_default_visible_cols: visibleCols.split(",").map(s => s.trim()).filter(Boolean),
            allow_negative_stock_on_sale: allowNegativeOnSale,
            auto_create_lot_on_purchase: autoCreateLot,
        };
        const diff = getDiff(current as Record<string, unknown>);
        if (Object.keys(diff).length === 0) return;
        await saveSettings(diff);
        await qc.invalidateQueries({ queryKey: tenantKeys.settings.current(slug) });
        markClean();
        onClean?.();
    };

    return (
        <div>
            <Card>
                <SecHead icon="ti-archive" label="الافتراضيات الأساسية" />
                <div className="fgrid c2">
                    <div className="fg">
                        <label>المستودع الافتراضي</label>
                        <select value={warehouseId} onChange={e => { setWarehouseId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— اختر —</option>
                            {(warehouses as any[]).map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>العملة الافتراضية</label>
                        <select value={currencyId} onChange={e => { setCurrencyId(e.target.value); markDirty(); onDirty?.(); }}>
                            {(currencies as any[]).map((c: any) => (
                                <option key={c.id} value={c.id}>{c.code ?? c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>فئة السعر الافتراضية</label>
                        <select value={priceLevelId} onChange={e => { setPriceLevelId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— بدون —</option>
                            {(priceLevels as any[]).map((pl: any) => (
                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>طريقة الدفع الافتراضية</label>
                        <select value={paymentModeId} onChange={e => { setPaymentModeId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— اختر —</option>
                            {(paymentModes as any[]).map((pm: any) => (
                                <option key={pm.id} value={pm.id}>{pm.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>حساب الخزينة الافتراضي</label>
                        <select value={treasuryAccountId} onChange={e => { setTreasuryAccountId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— اختر —</option>
                            {(treasuryAccounts as any[]).map((ta: any) => (
                                <option key={ta.id} value={ta.id}>{ta.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                <SecHead icon="ti-settings" label="سلوك المستندات" />
                <div className="fgrid c2">
                    <div className="fg">
                        <label>سلوك السنة المالية</label>
                        <select value={fyBehavior} onChange={e => { setFyBehavior(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="current">تلقائي (current)</option>
                            <option value="prompt">طلب من المستخدم (prompt)</option>
                        </select>
                    </div>
                    <div className="fg">
                        <label>وضع عرض الأسطر الافتراضي</label>
                        <select value={lineMode} onChange={e => { setLineMode(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="table">جدول (table)</option>
                            <option value="card">بطاقات (card)</option>
                        </select>
                    </div>
                </div>
                <div style={{ marginTop: 12 }}>
                    <label>الأعمدة الظاهرة في جدول الأسطر (مفصولة بفاصلة)</label>
                    <input
                        type="text"
                        value={visibleCols}
                        onChange={e => { setVisibleCols(e.target.value); markDirty(); onDirty?.(); }}
                        placeholder="idx, product, packaging, quantity, ..."
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
                    />
                </div>
            </Card>

            <Card>
                <SecHead icon="ti-toggle-left" label="خيارات التبديل" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ToggleRow
                        label="منع البيع بدون مخزون كافٍ"
                        hint="تجاوز إعداد المنتج الفردي ومنع البيع نهائياً"
                        checked={!allowNegativeOnSale}
                        onChange={v => { setAllowNegativeOnSale(!v); markDirty(); onDirty?.(); }}
                    />
                    <ToggleRow
                        label="إنشاء دفعة (Lot) تلقائياً"
                        hint="عند شراء منتج يدير اللوطات"
                        checked={autoCreateLot}
                        onChange={v => { setAutoCreateLot(v); markDirty(); onDirty?.(); }}
                    />
                </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SettingsLastModified group="documents" />
                <SaveButton
                    onClick={doSave}
                    loading={saving}
                    isDirty={isDirty}
                    onClean={() => { markClean(); onClean?.(); }}
                />
            </div>
        </div>
    );
}
