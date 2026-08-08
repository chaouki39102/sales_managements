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
import { useFiscalYear } from "@/context/FiscalYearContext";
import {
    useDirtyState,
    useAutoSave,
    str,
    SecHead,
    ToggleRow,
    SaveButton,
    SettingsLastModified,
} from "./_shared";

export function AlertsTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();

    const { data: rawSettings = [] } = useSettingsByGroup("alerts");
    const gs = makeGs(rawSettings);
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    // ✅ نستخدم fiscalSettings للحصول على النظام الضريبي
    const { data: fiscalSettings = [] } = useSettingsByGroup("fiscal");
    const gsFiscal = makeGs(fiscalSettings);
    const { selectedYear } = useFiscalYear();
    const yearRegimes = gsFiscal<Record<number, "forfaitaire" | "reel">>(
        "year_regimes",
        {},
    );
    const defaultRegime = gsFiscal<"forfaitaire" | "reel">(
        "tax_regime",
        "reel",
    );
    const currentYearRegime = selectedYear
        ? (yearRegimes[selectedYear.id] ?? defaultRegime)
        : defaultRegime;

    const [alertLowStock, setAlertLowStock] = useState(true);
    const [alertOutOfStock, setAlertOutOfStock] = useState(true);
    const [lowStockThres, setLowStockThres] = useState("10");
    const [alertDebtDue, setAlertDebtDue] = useState(true);
    const [debtDueDays, setDebtDueDays] = useState("7");
    const [alertOverdue, setAlertOverdue] = useState(true);
    const [alertFiscalClose, setAlertFiscalClose] = useState(true);
    const [fiscalCloseDays, setFiscalCloseDays] = useState("30");
    const [alertG50, setAlertG50] = useState(true);
    const [g50Days, setG50Days] = useState("5");
    const [alertG12, setAlertG12] = useState(true);
    const [alertG12bis, setAlertG12bis] = useState(true);
    const [alertDraftDocs, setAlertDraftDocs] = useState(false);
    const [draftDocsDays, setDraftDocsDays] = useState("3");
    const [emailNotif, setEmailNotif] = useState(false);
    const [notifEmail, setNotifEmail] = useState("");

    useEffect(() => {
        if (!rawSettings.length) return;
        setAlertLowStock(gs<boolean>("alert_low_stock", true));
        setAlertOutOfStock(gs<boolean>("alert_out_of_stock", true));
        setLowStockThres(str(gs("low_stock_threshold", 10)));
        setAlertDebtDue(gs<boolean>("alert_debt_due", true));
        setDebtDueDays(str(gs("debt_due_days", 7)));
        setAlertOverdue(gs<boolean>("alert_overdue_debts", true));
        setAlertFiscalClose(gs<boolean>("alert_fiscal_close", true));
        setFiscalCloseDays(str(gs("fiscal_close_days", 30)));
        setAlertG50(gs<boolean>("alert_g50", true));
        setG50Days(str(gs("g50_days_before", 5)));
        setAlertG12(gs<boolean>("alert_g12", true));
        setAlertG12bis(gs<boolean>("alert_g12bis", true));
        setAlertDraftDocs(gs<boolean>("alert_draft_docs", false));
        setDraftDocsDays(str(gs("draft_docs_days", 3)));
        setEmailNotif(gs<boolean>("email_notifications", false));
        setNotifEmail(gs<string>("notif_email", ""));
    }, [rawSettings]);

    const doSave = async () => {
        const payload: Record<string, unknown> = {
            alert_low_stock: alertLowStock,
            alert_out_of_stock: alertOutOfStock,
            low_stock_threshold: Number(lowStockThres),
            alert_debt_due: alertDebtDue,
            debt_due_days: Number(debtDueDays),
            alert_overdue_debts: alertOverdue,
            alert_fiscal_close: alertFiscalClose,
            fiscal_close_days: Number(fiscalCloseDays),
            alert_g50: alertG50,
            g50_days_before: Number(g50Days),
            alert_g12: alertG12,
            alert_g12bis: alertG12bis,
            alert_draft_docs: alertDraftDocs,
            draft_docs_days: Number(draftDocsDays),
            email_notifications: emailNotif,
            notif_email: notifEmail,
        };
        await saveSettings(payload);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "alerts"],
        });
        markClean();
        onClean?.();
    };

    useAutoSave(isDirty, doSave, true, 2000);

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

    const DInput = ({
        val,
        set: setFn,
        pre = "التنبيه قبل",
        suf = "يوم",
    }: {
        val: string;
        set: (v: string) => void;
        pre?: string;
        suf?: string;
    }) => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "2px 14px 8px",
            }}
        >
            <span style={{ fontSize: 12, color: "var(--t4)" }}>{pre}</span>
            <input
                type="number"
                value={val}
                onChange={(e) => {
                    setFn(e.target.value);
                    markDirty();
                    onDirty?.();
                }}
                style={{ width: 65 }}
                min={1}
                max={90}
            />
            <span style={{ fontSize: 12, color: "var(--t4)" }}>{suf}</span>
        </div>
    );

    return (
        <div
            style={{
                maxWidth: 680,
                display: "flex",
                flexDirection: "column",
                gap: 14,
            }}
        >
            <Card>
                <SecHead
                    icon="ti-box"
                    label="تنبيهات المخزون"
                    color="var(--blue)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تنبيه عند انخفاض المخزون",
                        "عند الوصول للحد الأدنى",
                        alertLowStock,
                        setAlertLowStock,
                    )}
                    {alertLowStock && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "2px 14px 8px",
                            }}
                        >
                            <span style={{ fontSize: 12, color: "var(--t4)" }}>
                                الحد الأدنى
                            </span>
                            <input
                                type="number"
                                value={lowStockThres}
                                onChange={(e) => {
                                    setLowStockThres(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                style={{ width: 80 }}
                                min={1}
                            />
                            <span style={{ fontSize: 12, color: "var(--t4)" }}>
                                وحدة
                            </span>
                        </div>
                    )}
                    {tr(
                        "تنبيه عند نفاذ المخزون",
                        "عند الوصول إلى صفر",
                        alertOutOfStock,
                        setAlertOutOfStock,
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-coins"
                    label="تنبيهات الديون"
                    color="var(--red)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تنبيه قبل استحقاق فاتورة",
                        "قبل تاريخ الاستحقاق",
                        alertDebtDue,
                        setAlertDebtDue,
                    )}
                    {alertDebtDue && (
                        <DInput val={debtDueDays} set={setDebtDueDays} />
                    )}
                    {tr(
                        "تنبيه عند الديون المتأخرة",
                        "الفواتير التي تجاوزت تاريخ استحقاقها",
                        alertOverdue,
                        setAlertOverdue,
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-calendar-event"
                    label="التنبيهات الجبائية"
                    color="var(--gold)"
                    sub={`النظام الضريبي الحالي: ${currentYearRegime === "reel" ? "حقيقي" : "جزافي"}`}
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تنبيه قبل إقفال السنة المالية",
                        "لإتمام التسويات المحاسبية",
                        alertFiscalClose,
                        setAlertFiscalClose,
                    )}
                    {alertFiscalClose && (
                        <DInput
                            val={fiscalCloseDays}
                            set={setFiscalCloseDays}
                        />
                    )}
                    {currentYearRegime === "reel" && (
                        <>
                            {tr(
                                "تنبيه موعد G50 الشهري",
                                "قبل الـ 20 من كل شهر",
                                alertG50,
                                setAlertG50,
                            )}
                            {alertG50 && (
                                <DInput
                                    val={g50Days}
                                    set={setG50Days}
                                    suf="يوم من الاستحقاق"
                                />
                            )}
                        </>
                    )}
                    {currentYearRegime === "forfaitaire" && (
                        <>
                            {tr(
                                "تنبيه موعد G12 السنوي",
                                "الإقرار النهائي — قبل 20 يناير",
                                alertG12,
                                setAlertG12,
                            )}
                            {tr(
                                "تنبيه موعد G12bis",
                                "الدفع المجزأ — قبل 30 يونيو",
                                alertG12bis,
                                setAlertG12bis,
                            )}
                        </>
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-file-description"
                    label="تنبيهات المستندات"
                    color="var(--teal)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تنبيه عند وجود مسودات قديمة",
                        "مستندات بقيت بدون معالجة",
                        alertDraftDocs,
                        setAlertDraftDocs,
                    )}
                    {alertDraftDocs && (
                        <DInput
                            val={draftDocsDays}
                            set={setDraftDocsDays}
                            pre="بعد"
                            suf="أيام بدون تحديث"
                        />
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-mail"
                    label="إشعارات البريد"
                    color="var(--em)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "إرسال ملخص يومي بالبريد",
                        "يُرسَل كل صباح عند وجود تنبيهات",
                        emailNotif,
                        setEmailNotif,
                    )}
                    {emailNotif && (
                        <div style={{ padding: "2px 14px 8px" }}>
                            <label style={{ fontSize: 12, color: "var(--t4)" }}>
                                البريد المستقبِل
                            </label>
                            <input
                                type="email"
                                value={notifEmail}
                                onChange={(e) => {
                                    setNotifEmail(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                placeholder="alerts@example.com"
                                style={{ marginTop: 4, width: "100%" }}
                            />
                        </div>
                    )}
                </div>
            </Card>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <SettingsLastModified group="alerts" />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--t4)" }}>
                        <i className="ti ti-robot" style={{ marginLeft: 4 }} />
                        حفظ تلقائي
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
    );
}
