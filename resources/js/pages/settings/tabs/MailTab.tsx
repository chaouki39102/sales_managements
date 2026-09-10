// pages/settings/tabs/MailTab.tsx — البريد (SMTP) على مستوى المؤسسة
//
// تُستخدم هذه الإعدادات عند إرسال المستندات (فقوائر/أوامر/كشوف...) بالبريد
// إلى الزبائن والموردين عبر DocumentMailService. أي قيمة تُترك فارغة تعني
// "الاعتماد على إعدادات النظام" (config/mail.php ← .env) — لن تُكتب فارغة فوقها.

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
    useAutoSave,
    str,
    SecHead,
    SaveButton,
    SettingsLastModified,
} from "./_shared";

const EMPTY_PLACEHOLDER = "فارغ = استخدام إعدادات النظام";

export function MailTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();

    const { data: rawSettings = [] } = useSettingsByGroup("mail");
    const gs = makeGs(rawSettings);
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    const [mailMailer, setMailMailer] = useState("");
    const [mailHost, setMailHost] = useState("");
    const [mailPort, setMailPort] = useState("");
    const [mailUsername, setMailUsername] = useState("");
    const [mailPassword, setMailPassword] = useState("");
    const [mailEncryption, setMailEncryption] = useState("");
    const [mailFromAddress, setMailFromAddress] = useState("");
    const [mailFromName, setMailFromName] = useState("");

    useEffect(() => {
        if (!rawSettings.length) return;
        setMailMailer(str(gs("mail_mailer", "")));
        setMailHost(str(gs("mail_host", "")));
        setMailPort(str(gs("mail_port", "")));
        setMailUsername(str(gs("mail_username", "")));
        setMailPassword(str(gs("mail_password", "")));
        setMailEncryption(str(gs("mail_encryption", "")));
        setMailFromAddress(str(gs("mail_from_address", "")));
        setMailFromName(str(gs("mail_from_name", "")));
    }, [rawSettings]);

    const doSave = async () => {
        const payload: Record<string, unknown> = {
            mail_mailer: mailMailer,
            mail_host: mailHost,
            mail_port: mailPort,
            mail_username: mailUsername,
            mail_password: mailPassword,
            mail_encryption: mailEncryption,
            mail_from_address: mailFromAddress,
            mail_from_name: mailFromName,
        };
        await saveSettings(payload);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "mail"],
        });
        markClean();
        onClean?.();
    };

    useAutoSave(isDirty, doSave, true, 2000);

    const F = ({
        label,
        val,
        set: setFn,
        placeholder = EMPTY_PLACEHOLDER,
        type = "text",
        dir,
        hint,
    }: {
        label: string;
        val: string;
        set: (v: string) => void;
        placeholder?: string;
        type?: string;
        dir?: "ltr" | "rtl";
        hint?: string;
    }) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--t4)" }}>{label}</label>
            <input
                type={type}
                value={val}
                dir={dir}
                autoComplete="off"
                onChange={(e) => {
                    setFn(e.target.value);
                    markDirty();
                    onDirty?.();
                }}
                placeholder={placeholder}
                style={{ width: "100%", boxSizing: "border-box" }}
            />
            {hint && (
                <span style={{ fontSize: 11, color: "var(--t4)" }}>{hint}</span>
            )}
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
            <p style={{ fontSize: 12.5, color: "var(--t4)", margin: 0 }}>
                تُستخدم هذه الإعدادات عند إرسال المستندات بالبريد (فواتير، أوامر
                زبائن، كشوف حساب...) إلى الزبائن والموردين. كل قيمة تُترك فارغة
                تعني أن المؤسسة تعتمد على إعدادات النظام المحدَّدة في ملف{" "}
                <code dir="ltr">.env</code>.
            </p>

            <Card>
                <SecHead
                    icon="ti-server"
                    label="خادم البريد (SMTP)"
                    color="var(--em)"
                />
                <div
                    style={{
                        padding: "2px 14px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <F
                        label="Mailer"
                        val={mailMailer}
                        set={setMailMailer}
                        dir="ltr"
                        hint="smtp / sendmail / log / array…"
                    />
                    <F
                        label="المُضيف (Host)"
                        val={mailHost}
                        set={setMailHost}
                        dir="ltr"
                    />
                    <F
                        label="المنفذ (Port)"
                        val={mailPort}
                        set={setMailPort}
                        dir="ltr"
                        type="number"
                        hint="غالباً 587 (TLS) أو 465 (SSL)"
                    />
                    <F
                        label="اسم المستخدم"
                        val={mailUsername}
                        set={setMailUsername}
                        dir="ltr"
                    />
                    <F
                        label="كلمة المرور"
                        val={mailPassword}
                        set={setMailPassword}
                        dir="ltr"
                        type="password"
                    />
                    <F
                        label="التشفير (Encryption)"
                        val={mailEncryption}
                        set={setMailEncryption}
                        dir="ltr"
                        hint="tls / ssl / فارغ"
                    />
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-mail-forward"
                    label="المُرسِل الافتراضي"
                    color="var(--blue)"
                />
                <div
                    style={{
                        padding: "2px 14px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <F
                        label="البريد المُرسِل"
                        val={mailFromAddress}
                        set={setMailFromAddress}
                        dir="ltr"
                        hint="no-reply@example.com"
                    />
                    <F
                        label="اسم المُرسِل"
                        val={mailFromName}
                        set={setMailFromName}
                        hint="اسم المؤسسة كما يظهر للمستلم"
                    />
                </div>
            </Card>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <SettingsLastModified group="mail" />
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