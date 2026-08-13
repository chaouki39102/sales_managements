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

export function ImportTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();
    const { data: rawSettings = [] } = useSettingsByGroup("import");
    const allSettings = useMemo(() => rawSettings, [rawSettings]);
    const gs = makeGs(allSettings);
    const { mutateAsync: saveSettings, isPending: saving } = useUpdateSettings();

    const [familyId, setFamilyId] = useState("");
    const [brandId, setBrandId] = useState("");
    const [unitId, setUnitId] = useState("");
    const [tvaId, setTvaId] = useState("");
    const [productTypeId, setProductTypeId] = useState("");
    const [minMarginPct, setMinMarginPct] = useState("");
    const [active, setActive] = useState(true);
    const [managesStock, setManagesStock] = useState(true);

    const { data: families = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.families(slug), 'settings-tab'],
        queryFn: () => apiGet<any>("/families", { per_page: 100 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: brands = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.brands(slug), 'settings-tab'],
        queryFn: () => apiGet<any>("/brands", { per_page: 100 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: units = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.units(slug), 'settings-tab'],
        queryFn: () => apiGet<any>("/units", { per_page: 100 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: tvas = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.tvas(slug), 'settings-tab'],
        queryFn: () => apiGet<any>("/tvas", { per_page: 100 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: productTypes = [] } = useQuery({
        queryKey: ['tenant', slug, 'product-types', 'settings-tab'],
        queryFn: () => apiGet<any>("/product-types", { per_page: 100 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });

    const initialSettings = useMemo(
        () => ({
            import_default_family_id: Number(gs("import_default_family_id", "")),
            import_default_brand_id: Number(gs("import_default_brand_id", "")),
            import_default_unit_id: Number(gs("import_default_unit_id", "")),
            import_default_tva_id: Number(gs("import_default_tva_id", "")),
            import_default_product_type_id: Number(gs("import_default_product_type_id", "")),
            import_default_min_margin_percentage: Number(gs("import_default_min_margin_percentage", "")),
            import_default_active: gs<boolean>("import_default_active", true),
            import_default_manages_stock: gs<boolean>("import_default_manages_stock", true),
        }),
        [allSettings],
    );

    const getDiff = useSettingsDiff(initialSettings as Record<string, unknown>);

    useEffect(() => {
        if (!allSettings.length) return;
        setFamilyId(str(gs("import_default_family_id", "")));
        setBrandId(str(gs("import_default_brand_id", "")));
        setUnitId(str(gs("import_default_unit_id", "")));
        setTvaId(str(gs("import_default_tva_id", "")));
        setProductTypeId(str(gs("import_default_product_type_id", "")));
        setMinMarginPct(str(gs("import_default_min_margin_percentage", "")));
        setActive(gs<boolean>("import_default_active", true));
        setManagesStock(gs<boolean>("import_default_manages_stock", true));
    }, [allSettings]);

    const doSave = async () => {
        const current = {
            import_default_family_id: familyId ? Number(familyId) : "",
            import_default_brand_id: brandId ? Number(brandId) : "",
            import_default_unit_id: unitId ? Number(unitId) : "",
            import_default_tva_id: tvaId ? Number(tvaId) : "",
            import_default_product_type_id: productTypeId ? Number(productTypeId) : "",
            import_default_min_margin_percentage: minMarginPct !== "" ? Number(minMarginPct) : "",
            import_default_active: active,
            import_default_manages_stock: managesStock,
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
                <SecHead
                    icon="ti-file-import"
                    label="الافتراضيات عند استيراد المنتجات"
                    sub="تُطبَّق تلقائياً على أي عمود تركتَه فارغاً في ملف Excel أثناء الاستيراد"
                />
                <div className="fgrid c2">
                    <div className="fg">
                        <label>الفئة الافتراضية</label>
                        <select value={familyId} onChange={e => { setFamilyId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— بدون —</option>
                            {(families as any[]).map((f: any) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>الماركة الافتراضية</label>
                        <select value={brandId} onChange={e => { setBrandId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— بدون —</option>
                            {(brands as any[]).map((b: any) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>وحدة القياس الافتراضية</label>
                        <select value={unitId} onChange={e => { setUnitId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— بدون —</option>
                            {(units as any[]).map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>نسبة الضريبة (TVA) الافتراضية</label>
                        <select value={tvaId} onChange={e => { setTvaId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— بدون —</option>
                            {(tvas as any[]).map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>نوع المنتج الافتراضي</label>
                        <select value={productTypeId} onChange={e => { setProductTypeId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— بدون —</option>
                            {(productTypes as any[]).map((pt: any) => (
                                <option key={pt.id} value={pt.id}>{pt.label || pt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>الحد الأدنى لهامش الربح %</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="مثال: 10"
                            value={minMarginPct}
                            onChange={e => { setMinMarginPct(e.target.value); markDirty(); onDirty?.(); }}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                <SecHead icon="ti-toggle-left" label="حالة المنتج المستورد" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ToggleRow
                        label="المنتجات المستوردة نشطة افتراضياً"
                        hint="عند تفعيلها تُباع مباشرة من نقطة البيع؛ إن عطّلتَها تُستورد كمنتجات مخفية"
                        checked={active}
                        onChange={v => { setActive(v); markDirty(); onDirty?.(); }}
                    />
                    <ToggleRow
                        label="إدارة المخزون مفعّلة افتراضياً"
                        hint="عند تفعيلها يتبع المستورد نظام الكميات والمخزون"
                        checked={managesStock}
                        onChange={v => { setManagesStock(v); markDirty(); onDirty?.(); }}
                    />
                </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SettingsLastModified group="import" />
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
