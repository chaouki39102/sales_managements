// pages/settings/tabs/MailTab.tsx — البريد (SMTP) على مستوى المؤسسة
//
// تُستخدم هذه الإعدادات عند إرسال المستندات (فقوائر/أوامر/كشوف...) بالبريد
// إلى الزبائن والموردين عبر DocumentMailService. أي قيمة تُترك فارغة تعني
// "الاعتماد على إعدادات النظام" (config/mail.php ← .env) — لن تُكتب فارغة فوقها.

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
    useSettingsByGroup,
    useUpdateSettings,
    makeGs,
    settingsApi,
} from "@/lib/api/endpoints/settings";
import { useNotification } from "@/hooks/useNotification";
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
    const notify = useNotification();

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
    const [pwdVisible, setPwdVisible] = useState(false);

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

    const [testTo, setTestTo] = useState("");
    const [testSubject, setTestSubject] = useState("");
    const [testSending, setTestSending] = useState(false);
    const [testResult, setTestResult] = useState<
        { ok: boolean; msg: string } | null
    >(null);

    const handleSendTest = async () => {
        if (!testTo.trim()) {
            notify.error(
                "أدخل بريداً صالحاً",
                "حدِّد عنوان المستلم قبل إرسال بريد الاختبار.",
            );
            return;
        }
        setTestSending(true);
        setTestResult(null);
        try {
            await doSave();
            const res = await settingsApi.testEmail(
                testTo.trim(),
                testSubject.trim() || undefined,
            );
            const detail = `وصل إلى ${res.to} · المُرسِل: ${
                res.from ?? "إعدادات النظام"
            } · الخادم: ${res.mailer}`;
            setTestResult({ ok: true, msg: detail });
            notify.success("تم إرسال بريد الاختبار", detail);
        } catch (e: unknown) {
            const msg = (e as Error).message || "تعذّر إرسال بريد الاختبار";
            setTestResult({ ok: false, msg });
            notify.error("فشل إرسال بريد الاختبار", msg);
        } finally {
            setTestSending(false);
        }
    };

    const fillGmailDefaults = () => {
        setMailMailer("smtp");
        setMailHost("smtp.gmail.com");
        setMailPort("587");
        setMailEncryption("tls");
        markDirty();
        onDirty?.();
        notify.info(
            "تمت تعبئة قيم خادم Gmail",
            "أدخل الآن بريدك الكامل في «اسم المستخدم» وكلمة مرور التطبيق في «كلمة المرور».",
        );
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
        autoComplete = "off",
    }: {
        label: string;
        val: string;
        set: (v: string) => void;
        placeholder?: string;
        type?: string;
        dir?: "ltr" | "rtl";
        hint?: string;
        autoComplete?: string;
    }) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--t4)" }}>{label}</label>
            <input
                type={type}
                value={val}
                dir={dir}
                autoComplete={autoComplete}
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
                    icon="ti-brand-google"
                    label="الإرسال عبر Gmail"
                    color="var(--red)"
                />
                <div
                    style={{
                        padding: "2px 14px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                    }}
                >
                    <p
                        style={{
                            fontSize: 12,
                            color: "var(--t3)",
                            margin: 0,
                            lineHeight: 1.7,
                        }}
                    >
                        لاستخدام Gmail كخادم إرسال تحتاج «كلمة مرور للتطبيقات»
                        (لا تطبق كلمة مرور حسابك المعتادة). اتبع الخطوات بالترتيب:
                    </p>
                    <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontSize: 12,
                            color: "var(--em)",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                        }}
                    >
                        <i className="ti ti-external-link" />
                        myaccount.google.com/apppasswords
                    </a>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        {[
                            "فعّل «التحقق بخطوتين» من إعدادات حساب Google — بدونها لا يظهر خيار «كلمة مرور التطبيقات».",
                            "افتح صفحة كلمات مرور التطبيقات من الرابط أعلاه وسجّل الدخول.",
                            "في «اسم التطبيق» اكتب اسماً تذكره (مثل POSDZ) ثم اضغط «إنشاء».",
                            "ستظهر كلمة مرور من 16 حرفاً (مثل «abcd efgh ijkl mnop») — انسخها الآن قبل إغلاق الصفحة.",
                            "ارجع إلى هذا التبويب واضغط «تعبئة قيم Gmail» بالأسفل (يملأ الخادم والمنفذ والتشفير تلقائياً).",
                            "ضع بريد Gmail كاملاً (you@gmail.com) في حقل «اسم المستخدم» ببطاقة «خادم البريد».",
                            "الصق كلمة مرور التطبيق من الخطوة 4 في حقل «كلمة المرور» أسفل «اسم المستخدم» مباشرة.",
                            "اضغط «إرسال بريد اختبار» للتحقق ثم «حفظ».",
                        ].map((s, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "flex-start",
                                    fontSize: 12,
                                    lineHeight: 1.7,
                                }}
                            >
                                <span
                                    style={{
                                        minWidth: 20,
                                        width: 20,
                                        height: 20,
                                        borderRadius: "50%",
                                        background: "var(--em)",
                                        color: "var(--bg)",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 11,
                                        fontWeight: 800,
                                        marginTop: 2,
                                        flexShrink: 0,
                                    }}
                                >
                                    {i + 1}
                                </span>
                                <span style={{ color: "var(--t2)" }}>{s}</span>
                            </div>
                        ))}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        <strong style={{ fontSize: 12, color: "var(--t4)" }}>
                            أين أضع كل قيمة من صفحة Google؟
                        </strong>
                        <div
                            style={{
                                border: "1px solid var(--b2)",
                                borderRadius: "var(--r2)",
                                background: "var(--bg3)",
                                overflow: "hidden",
                            }}
                        >
                            {(
                                [
                                    ["smtp", "الحقل «Mailer»"],
                                    ["smtp.gmail.com", "الحقل «المُضيف (Host)»"],
                                    ["587", "الحقل «المنفذ (Port)»"],
                                    ["tls", "الحقل «التشفير (Encryption)»"],
                                    ["you@gmail.com", "الحقل «اسم المستخدم»"],
                                    ["كلمة مرور التطبيق", "الحقل «كلمة المرور»"],
                                ] as const
                            ).map(([k, v]) => (
                                <div
                                    key={k}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                        padding: "7px 12px",
                                        borderBottom: "1px solid var(--b1)",
                                        fontSize: 11.5,
                                    }}
                                >
                                    <code
                                        dir="ltr"
                                        style={{
                                            color: "var(--t2)",
                                            fontSize: 11.5,
                                        }}
                                    >
                                        {k}
                                    </code>
                                    <span
                                        style={{
                                            color: "var(--t4)",
                                            fontWeight: 700,
                                            textAlign: "right",
                                        }}
                                    >
                                        {v}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                            background: "rgba(10, 138, 92, 0.08)",
                            border: "1px solid var(--b2)",
                            borderRadius: "var(--r2)",
                            padding: "10px 12px",
                        }}
                    >
                        <Button
                            onClick={fillGmailDefaults}
                            icon={<i className="ti ti-brand-google" />}
                        >
                            تعبئة قيم Gmail
                        </Button>
                        <span
                            style={{
                                fontSize: 11.5,
                                color: "var(--t3)",
                                flex: 1,
                                minWidth: 180,
                            }}
                        >
                            يملأ تلقائياً: Mailer = smtp · Host = smtp.gmail.com ·
                            Port = 587 · Encryption = tls. أدخل أنت فقط بريدك وكلمة
                            مرور التطبيق في بطاقة «خادم البريد».
                        </span>
                    </div>
                    <p
                        style={{
                            fontSize: 11,
                            color: "var(--t4)",
                            margin: 0,
                            lineHeight: 1.6,
                        }}
                    >
                        <i className="ti ti-shield-lock" style={{ marginLeft: 4 }} />
                        كلمة مرور التطبيق تُستعمل فقط داخل هذا النظام ولا تُفصح لأي
                        جهة. تُقبل مع المسافات أو بدونها (abcd efgh ijkl mnop ≡
                        abcdefghijklmnop).
                    </p>
                </div>
            </Card>

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
                        autoComplete="new-username"
                        hint="كامل: you@gmail.com"
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        <label style={{ fontSize: 12, color: "var(--t4)" }}>
                            كلمة المرور
                        </label>
                        <div style={{ position: "relative" }}>
                            <input
                                type={pwdVisible ? "text" : "password"}
                                value={mailPassword}
                                dir="ltr"
                                autoComplete="new-password"
                                onChange={(e) => {
                                    setMailPassword(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                placeholder={EMPTY_PLACEHOLDER}
                                style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    paddingLeft: 30,
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setPwdVisible((v) => !v)}
                                title={
                                    pwdVisible
                                        ? "إخفاء كلمة المرور"
                                        : "إظهار كلمة المرور"
                                }
                                aria-label={
                                    pwdVisible
                                        ? "إخفاء كلمة المرور"
                                        : "إظهار كلمة المرور"
                                }
                                style={{
                                    position: "absolute",
                                    left: 6,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    border: "none",
                                    background: "transparent",
                                    color: "var(--t4)",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: 2,
                                }}
                            >
                                <i
                                    className={`ti ${
                                        pwdVisible
                                            ? "ti-eye-off"
                                            : "ti-eye"
                                    }`}
                                />
                            </button>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--t4)" }}>
                            كلمة مرور التطبيق من Google (16 حرفاً) — تُقبل مع
                            المسافات أو بدونها.
                        </span>
                    </div>
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

            <Card>
                <SecHead
                    icon="ti-send"
                    label="إرسال بريد اختبار"
                    color="var(--gold)"
                />
                <div
                    style={{
                        padding: "2px 14px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        <label style={{ fontSize: 12, color: "var(--t4)" }}>
                            عنوان المستلم
                        </label>
                        <input
                            type="email"
                            value={testTo}
                            dir="ltr"
                            autoComplete="off"
                            onChange={(e) => setTestTo(e.target.value)}
                            placeholder="you@example.com"
                            style={{ width: "100%", boxSizing: "border-box" }}
                        />
                        <span style={{ fontSize: 11, color: "var(--t4)" }}>
                            بعث رسالة تجريبية للتأكد من عمل خادم البريد.
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        <label style={{ fontSize: 12, color: "var(--t4)" }}>
                            الموضوع (اختياري)
                        </label>
                        <input
                            type="text"
                            value={testSubject}
                            dir="ltr"
                            autoComplete="off"
                            onChange={(e) => setTestSubject(e.target.value)}
                            placeholder="بريد اختبار"
                            style={{ width: "100%", boxSizing: "border-box" }}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <Button
                            onClick={handleSendTest}
                            disabled={testSending}
                            icon={
                                testSending ? (
                                    <i
                                        className="ti ti-loader"
                                        style={{
                                            animation: "spin .7s linear infinite",
                                        }}
                                    />
                                ) : (
                                    <i className="ti ti-send" />
                                )
                            }
                        >
                            {testSending ? "جاري الإرسال..." : "إرسال بريد اختبار"}
                        </Button>
                        {testResult && (
                            <span
                                style={{
                                    fontSize: 12,
                                    color: testResult.ok
                                        ? "var(--em)"
                                        : "var(--red)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                }}
                            >
                                <i
                                    className={`ti ${
                                        testResult.ok
                                            ? "ti-circle-check"
                                            : "ti-alert-triangle"
                                    }`}
                                />
                                {testResult.msg}
                            </span>
                        )}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--t4)", margin: 0 }}>
                        <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
                        سيُحفظ كل ما في هذا التبويب أولاً، ثم يُرسل بريد الاختبار
                        عبر هذه الإعدادات.
                    </p>
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