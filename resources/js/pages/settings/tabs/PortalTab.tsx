import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import {
    useSettingsByGroup,
    useUpdateSettings,
    makeGs,
} from "@/lib/api/endpoints/settings";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import {
    useDirtyState,
    str,
    SecHead,
    ToggleRow,
    SaveButton,
    SettingsLastModified,
} from "./_shared";

export function PortalTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();

    const { data: rawSettings = [] } = useSettingsByGroup("portal");
    const gs = makeGs(rawSettings);
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    const [portalEnabled, setPortalEnabled] = useState(true);
    const [allowGuest, setAllowGuest] = useState(true);
    const [allowRegistered, setAllowRegistered] = useState(true);
    const [minOrderAmount, setMinOrderAmount] = useState("0");
    const [maxOrderAmount, setMaxOrderAmount] = useState("0");
    const [confirmationMessage, setConfirmationMessage] = useState("");
    const [showStock, setShowStock] = useState(true);
    const [showPrice, setShowPrice] = useState(true);
    const [showRef, setShowRef] = useState(true);
    const [showUnit, setShowUnit] = useState(true);
    const [showPackaging, setShowPackaging] = useState(true);
    const [allowChangePackaging, setAllowChangePackaging] = useState(true);
    const [showDiscounts, setShowDiscounts] = useState(true);
    const [showTva, setShowTva] = useState(true);
    const [showSearch, setShowSearch] = useState(true);
    const [hideOutOfStock, setHideOutOfStock] = useState(false);
    const [showIncartBadge, setShowIncartBadge] = useState(true);
    const [showNotes, setShowNotes] = useState(true);

    useEffect(() => {
        if (!rawSettings.length) return;
        setPortalEnabled(gs<boolean>("portal_enabled", true));
        setAllowGuest(gs<boolean>("portal_allow_guest_orders", true));
        setAllowRegistered(gs<boolean>("portal_allow_registered_orders", true));
        setMinOrderAmount(str(gs("portal_min_order_amount", 0)));
        setMaxOrderAmount(str(gs("portal_max_order_amount", 0)));
        setConfirmationMessage(str(gs("portal_order_confirmation_message", "")));
        setShowStock(gs<boolean>("portal_show_stock", true));
        setShowPrice(gs<boolean>("portal_show_price", true));
        setShowRef(gs<boolean>("portal_show_ref", true));
        setShowUnit(gs<boolean>("portal_show_unit", true));
        setShowPackaging(gs<boolean>("portal_show_packaging", true));
        setAllowChangePackaging(gs<boolean>("portal_allow_change_packaging", true));
        setShowDiscounts(gs<boolean>("portal_show_discounts", true));
        setShowTva(gs<boolean>("portal_show_tva", true));
        setShowSearch(gs<boolean>("portal_show_search", true));
        setHideOutOfStock(gs<boolean>("portal_hide_out_of_stock", false));
        setShowIncartBadge(gs<boolean>("portal_show_incart_badge", true));
        setShowNotes(gs<boolean>("portal_show_notes", true));
    }, [rawSettings]);

    const doSave = async () => {
        const payload: Record<string, unknown> = {
            portal_enabled: portalEnabled,
            portal_allow_guest_orders: allowGuest,
            portal_allow_registered_orders: allowRegistered,
            portal_min_order_amount: Number(minOrderAmount) || 0,
            portal_max_order_amount: Number(maxOrderAmount) || 0,
            portal_order_confirmation_message: confirmationMessage,
            portal_show_stock: showStock,
            portal_show_price: showPrice,
            portal_show_ref: showRef,
            portal_show_unit: showUnit,
            portal_show_packaging: showPackaging,
            portal_allow_change_packaging: allowChangePackaging,
            portal_show_discounts: showDiscounts,
            portal_show_tva: showTva,
            portal_show_search: showSearch,
            portal_hide_out_of_stock: hideOutOfStock,
            portal_show_incart_badge: showIncartBadge,
            portal_show_notes: showNotes,
        };
        await saveSettings(payload);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "portal"],
        });
        markClean();
        onClean?.();
    };

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
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
                <SecHead
                    icon="ti-world"
                    label="بوابة الزبائن (اطلب سلعة)"
                    color="var(--em)"
                    sub="تحكم في كتالوج «اطلب سلعة» وإرسال الطلبات من بوابة الزبائن"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تفعيل بوابة الزبائن",
                        "إيقاف البوابة يمنع عرض الكتالوج وإرسال الطلبات من الزبائن",
                        portalEnabled,
                        setPortalEnabled,
                    )}
                    {portalEnabled && (
                        <>
                            {tr(
                                "السماح للزوار بإرسال الطلبات",
                                "الزائر بدون حساب يرسل اسمه وهاتفه مباشرة",
                                allowGuest,
                                setAllowGuest,
                            )}
                            {tr(
                                "السماح لأصحاب الحسابات بإرسال الطلبات",
                                "زبون لديه حساب بوابة معتمد",
                                allowRegistered,
                                setAllowRegistered,
                            )}
                        </>
                    )}
                </div>
            </Card>

            {portalEnabled && (
                <Card>
                    <SecHead
                        icon="ti-adjustments-horizontal"
                        label="شروط الطلب"
                        color="var(--blue)"
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <span style={{ fontSize: 13, color: "var(--t2)" }}>
                                الحد الأدنى لقيمة الطلب (دج) — 0 يعني بدون حد
                            </span>
                            <input
                                type="number"
                                value={minOrderAmount}
                                onChange={(e) => {
                                    setMinOrderAmount(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                style={{
                                    width: 110,
                                    fontFamily: "monospace",
                                    textAlign: "center",
                                }}
                                min={0}
                                step={100}
                            />
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <span style={{ fontSize: 13, color: "var(--t2)" }}>
                                الحد الأقصى لقيمة الطلب (دج) — 0 يعني بدون حد
                            </span>
                            <input
                                type="number"
                                value={maxOrderAmount}
                                onChange={(e) => {
                                    setMaxOrderAmount(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                style={{
                                    width: 110,
                                    fontFamily: "monospace",
                                    textAlign: "center",
                                }}
                                min={0}
                                step={100}
                            />
                        </div>
                    </div>
                </Card>
            )}

            {portalEnabled && (
                <Card>
                    <SecHead
                        icon="ti-message-circle-check"
                        label="رسالة تأكيد الطلب"
                        color="var(--green)"
                        sub="تُعرض للزبون بعد إرسال الطلب — إن تُركت فارغة تظهر الرسالة الافتراضية"
                    />
                    <textarea
                        value={confirmationMessage}
                        onChange={(e) => {
                            setConfirmationMessage(e.target.value);
                            markDirty();
                            onDirty?.();
                        }}
                        placeholder="مثال: شكراً لطلبك! سنتصل بك خلال 24 ساعة لتأكيد التسليم."
                        rows={3}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontFamily: "inherit",
                            fontSize: 13,
                            lineHeight: 1.7,
                            color: "var(--t1)",
                            background: "var(--bg1)",
                            border: "1px solid var(--b2)",
                            borderRadius: 10,
                            resize: "vertical",
                        }}
                    />
                </Card>
            )}

            {portalEnabled && (
                <Card>
                    <SecHead
                        icon="ti-layout-grid"
                        label="إعدادات عرض الكتالوج"
                        color="var(--gold)"
                        sub="تحكم في ما يظهر للزبون على بطاقات «اطلب سلعة» وفي سلة الطلب"
                    />
                    <div
                        style={{ display: "flex", flexDirection: "column", gap: 8 }}
                    >
                        {tr(
                            "إظهار حالة المخزون",
                            "نفد المخزون / متوفر / كمية محدودة على بطاقات الكتالوج",
                            showStock,
                            setShowStock,
                        )}
                        {tr(
                            "إظهار السعر",
                            "إخفاء السعر يخفي كل المبالغ (البطاقة والسلة والمجموع) — يُحتسب السعر من الخادم عند التأكيد",
                            showPrice,
                            setShowPrice,
                        )}
                        {tr(
                            "إظهار مرجع المنتج",
                            "إظهار ref بجانب اسم المنتج",
                            showRef,
                            setShowRef,
                        )}
                        {tr(
                            "إظهار وحدة القياس",
                            "إظهار الوحدة (قطعة، كغ...) بجانب السعر",
                            showUnit,
                            setShowUnit,
                        )}
                        {tr(
                            "إظهار قائمة التعبئة",
                            "إظهار اختيار التعبئة (كوليسة، كرتونة...) للزبون",
                            showPackaging,
                            setShowPackaging,
                        )}
                        {tr(
                            "السماح بتغيير التعبئة",
                            "عند إيقافها تبقى التعبئة الافتراضية فقط ولا يستطيع الزبون تبديلها",
                            allowChangePackaging,
                            setAllowChangePackaging,
                        )}
                        {tr(
                            "إظهار شرائح خصم الكميات",
                            "شرائح الخصم تبقى تُطبَّق في الخادم دائماً — هذا يتحكم في إظهارها فقط",
                            showDiscounts,
                            setShowDiscounts,
                        )}
                        {tr(
                            "إظهار TVA",
                            "نسبة TVA أو شارة الإعفاء على البطاقات",
                            showTva,
                            setShowTva,
                        )}
                        {tr(
                            "إظهار البحث",
                            "حقل البحث عن منتج في الكتالوج",
                            showSearch,
                            setShowSearch,
                        )}
                        {tr(
                            "إخفاء المنتجات النافدة",
                            "إخفاء المنتجات غير المتوفرة نهائياً من كتالوج الزبائن",
                            hideOutOfStock,
                            setHideOutOfStock,
                        )}
                        {tr(
                            "إظهار شارة «في السلة»",
                            "علامة المنتجات المضافة إلى سلة الطلب",
                            showIncartBadge,
                            setShowIncartBadge,
                        )}
                        {tr(
                            "السماح بملاحظة الطلب",
                            "السماح للزبون بإضافة ملاحظة مع الطلب",
                            showNotes,
                            setShowNotes,
                        )}
                    </div>
                </Card>
            )}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <SettingsLastModified group="portal" />
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
