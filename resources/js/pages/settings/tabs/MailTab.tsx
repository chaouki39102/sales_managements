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
import {
    useEmailTemplates,
    useEmailTemplateMutations,
    usePlaceholders,
    type EmailTemplate,
} from "@/lib/api/endpoints/emailTemplates";
import { useNotification } from "@/hooks/useNotification";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
import { DOC_TYPE_LIST } from "../print-settings/types/domain";
import { usePermissions, PERMISSION } from "@/lib/permissions";

const EMPTY_PLACEHOLDER = "فارغ = استخدام إعدادات النظام";

interface TplDraft {
    name: string;
    doc_type_code: string | null;
    subject: string;
    body: string;
    is_default: boolean;
    is_active: boolean;
}

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

    // ─── قوالب البريد (التوثيق/القوائم/الأوامر… تُرسل بعنوان وموضوع جاهزين) ─────
    const { confirm, confirmDialogProps } = useConfirm();
    const { can } = usePermissions();
    const manageTemplates = can(PERMISSION.MANAGE_SETTINGS);

    const { data: templates = [], isLoading: tplLoading } = useEmailTemplates();
    const tplMutations = useEmailTemplateMutations();
    const { data: placeholders = [] } = usePlaceholders();

    const [tplFilter, setTplFilter] = useState<string>("");
    const [draft, setDraft] = useState<TplDraft | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [savingTpl, setSavingTpl] = useState(false);
    const [tplField, setTplField] = useState<"subject" | "body">("body");

    const up = (patch: Partial<TplDraft>) =>
        setDraft((d) => (d ? { ...d, ...patch } : d));

    const docTypeLabel = (code: string | null) => {
        if (code === null) return "عام (كل الأنواع)";
        return DOC_TYPE_LIST.find((t) => t.code === code)?.name ?? code;
    };

    const filteredTemplates = templates.filter((t) => {
        if (tplFilter === "") return true;
        if (tplFilter === "generic") return t.doc_type_code === null;
        return t.doc_type_code === tplFilter;
    });

    const openCreate = () => {
        setDraft({
            name: "",
            doc_type_code: null,
            subject: "",
            body: "",
            is_default: false,
            is_active: true,
        });
        setEditingId(null);
        setTplField("body");
    };

    const openEdit = (t: EmailTemplate) => {
        setDraft({
            name: t.name,
            doc_type_code: t.doc_type_code,
            subject: t.subject ?? "",
            body: t.body ?? "",
            is_default: t.is_default,
            is_active: t.is_active,
        });
        setEditingId(t.id);
        setTplField("body");
    };

    const handleSaveTpl = async () => {
        if (!draft) return;
        if (!draft.name.trim()) {
            notify.error("الاسم مطلوب", "أدخل اسماً للقالب قبل الحفظ.");
            return;
        }
        setSavingTpl(true);
        try {
            const payload = {
                name: draft.name.trim(),
                doc_type_code: draft.doc_type_code,
                subject: draft.subject,
                body: draft.body,
                is_default: draft.is_default,
                is_active: draft.is_active,
            };
            if (editingId !== null) {
                await tplMutations.update.mutateAsync({ id: editingId, ...payload });
                notify.success("تم تحديث القالب", `«${draft.name.trim()}»`);
            } else {
                await tplMutations.create.mutateAsync(payload);
                notify.success("تم إنشاء القالب", `«${draft.name.trim()}»`);
            }
            setDraft(null);
            setEditingId(null);
        } catch (e: unknown) {
            const msg = (e as Error).message || "تعذّر حفظ القالب";
            notify.error("تعذّر حفظ القالب", msg);
        } finally {
            setSavingTpl(false);
        }
    };

    const handleDeleteTpl = async (t: EmailTemplate) => {
        const ok = await confirm(`حذف القالب «${t.name}» نهائياً مع تنسيقه؟`, {
            title: "حذف قالب البريد",
            confirmText: "حذف",
            cancelText: "إلغاء",
            variant: "danger",
        });
        if (!ok) return;
        try {
            await tplMutations.delete.mutateAsync(t.id);
            notify.success("تم حذف القالب", `«${t.name}»`);
        } catch (e: unknown) {
            notify.error("تعذّر حذف القالب", (e as Error).message);
        }
    };

    const handleSetDefault = async (t: EmailTemplate) => {
        if (t.is_default || !manageTemplates) return;
        try {
            await tplMutations.setDefault.mutateAsync(t.id);
            notify.success("قالب افتراضي", `«${t.name}» أصبح الافتراضي.`);
        } catch (e: unknown) {
            notify.error("تعذّر التحديد", (e as Error).message);
        }
    };

    const handleToggleActive = async (t: EmailTemplate) => {
        if (!manageTemplates) return;
        try {
            await tplMutations.update.mutateAsync({
                id: t.id,
                is_active: !t.is_active,
            });
        } catch (e: unknown) {
            notify.error("تعذّر التحديث", (e as Error).message);
        }
    };

    const insertPlaceholder = (key: string) => {
        if (!draft || !manageTemplates) return;
        const token = `{{${key}}}`;
        if (tplField === "subject") {
            up({ subject: `${draft.subject} ${token}`.trim() });
        } else {
            up({ body: `${draft.body}\n${token}`.trim() });
        }
        markDirty();
        onDirty?.();
    };

    const TplToggle = ({
        checked,
        disabled,
        onChange,
    }: {
        checked: boolean;
        disabled?: boolean;
        onChange: () => void;
    }) => (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                onChange();
            }}
            style={{
                position: "relative",
                width: 34,
                height: 20,
                borderRadius: 10,
                border: "1px solid var(--b2)",
                background: checked ? "var(--em)" : "var(--b3)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                padding: 0,
            }}
        >
            <span
                style={{
                    position: "absolute",
                    top: 2,
                    left: checked ? 16 : 2,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: "#fff",
                    transition: "left .15s ease",
                }}
            />
        </button>
    );

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

            <Card>
                <SecHead
                    icon="ti-mail-opened"
                    label="قوالب البريد"
                    sub="قوالب الموضوع والنص تُستبدل عند إرسال مستند بالبريد (يُملأ {{الاسم}} والمستحقات تلقائياً)."
                />
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                    }}
                >
                    <select
                        value={tplFilter}
                        onChange={(e) => setTplFilter(e.target.value)}
                        style={{ width: "auto", minWidth: 180 }}
                    >
                        <option value="">كل القوالب</option>
                        <option value="generic">عام (كل الأنواع)</option>
                        {DOC_TYPE_LIST.map((t) => (
                            <option key={t.code} value={t.code}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                    {manageTemplates && (
                        <Button
                            onClick={openCreate}
                            icon={<i className="ti ti-plus" />}
                        >
                            قالب جديد
                        </Button>
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        alignItems: "center",
                    }}
                >
                    <span style={{ fontSize: 11, color: "var(--t4)" }}>
                        العناصر النائبة:
                    </span>
                    {placeholders.length === 0 && (
                        <span style={{ fontSize: 11, color: "var(--t4)" }}>
                            جارٍ تحميل…
                        </span>
                    )}
                    {placeholders.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            disabled={!manageTemplates || !draft}
                            title={p.label}
                            onClick={() => insertPlaceholder(p.key)}
                            style={{
                                fontSize: 11,
                                direction: "ltr",
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: "1px dashed var(--b2)",
                                background: "var(--bg2)",
                                color: "var(--t2)",
                                cursor:
                                    !manageTemplates || !draft
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            {"{{" + p.key + "}}"}
                        </button>
                    ))}
                </div>

                {tplLoading ? (
                    <p style={{ fontSize: 12, color: "var(--t4)", margin: 0 }}>
                        جارٍ تحميل القوالب…
                    </p>
                ) : filteredTemplates.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--t4)", margin: 0 }}>
                        لا توجد قوالب مطابقة.
                    </p>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                        }}
                    >
                        {filteredTemplates.map((t) => (
                            <div
                                key={t.id}
                                style={{
                                    border: "1px solid var(--b1)",
                                    borderRadius: 8,
                                    padding: 8,
                                    background: "var(--bg2)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                <button
                                    type="button"
                                    disabled={t.is_default || !manageTemplates}
                                    title="تعيين كقالب افتراضي لهذا النوع"
                                    onClick={() => handleSetDefault(t)}
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        cursor:
                                            t.is_default || !manageTemplates
                                                ? "default"
                                                : "pointer",
                                        color: t.is_default ? "var(--gold)" : "var(--t4)",
                                        fontSize: 18,
                                        padding: 0,
                                        display: "inline-flex",
                                    }}
                                >
                                    <i
                                        className={`ti ${
                                            t.is_default
                                                ? "ti-star-filled"
                                                : "ti-star"
                                        }`}
                                    />
                                </button>
                                <div
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 13,
                                            }}
                                        >
                                            {t.name}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                padding: "1px 6px",
                                                borderRadius: 4,
                                                background: "var(--bg3)",
                                                color: "var(--t4)",
                                            }}
                                        >
                                            {docTypeLabel(t.doc_type_code)}
                                        </span>
                                        {!t.is_active && (
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    padding: "1px 6px",
                                                    borderRadius: 4,
                                                    background: "var(--red-soft, #fde)",
                                                    color: "var(--red)",
                                                }}
                                            >
                                                معطّل
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            color: "var(--t4)",
                                            direction: "ltr",
                                            textAlign: "left",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {(t.subject || "—")}
                                    </span>
                                </div>
                                <TplToggle
                                    checked={t.is_active}
                                    disabled={!manageTemplates}
                                    onChange={() => handleToggleActive(t)}
                                />
                                {manageTemplates && (
                                    <>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => openEdit(t)}
                                            icon={<i className="ti ti-pencil" />}
                                        >
                                            تعديل
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="danger"
                                            onClick={() => handleDeleteTpl(t)}
                                            icon={<i className="ti ti-trash" />}
                                        >
                                            حذف
                                        </Button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {draft && manageTemplates && (
                    <div
                        style={{
                            marginTop: 12,
                            border: "1px solid var(--b1)",
                            borderRadius: 8,
                            padding: 12,
                            background: "var(--bg2)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}
                    >
                        <div style={{ display: "flex", overflow: "hidden", borderRadius: 6, border: "1px solid var(--b2)", width: "max-content" }}>
                            {(["body", "subject"] as const).map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setTplField(f)}
                                    style={{
                                        padding: "4px 14px",
                                        fontSize: 12,
                                        border: "none",
                                        background:
                                            tplField === f ? "var(--em)" : "transparent",
                                        color: tplField === f ? "#fff" : "var(--t2)",
                                        cursor: "pointer",
                                    }}
                                >
                                    {f === "subject" ? "الموضوع" : "المحتوى"}
                                </button>
                            ))}
                        </div>
                        <F
                            label="اسم القالب"
                            val={draft.name}
                            set={(v) => up({ name: v })}
                            placeholder="مثال: فاتورة — تذكير"
                            hint={`النوع: ${docTypeLabel(draft.doc_type_code)}`}
                        />
                        <select
                            value={draft.doc_type_code ?? "generic"}
                            onChange={(e) =>
                                up({
                                    doc_type_code:
                                        e.target.value === "generic"
                                            ? null
                                            : e.target.value,
                                })
                            }
                        >
                            <option value="generic">عام (كل الأنواع)</option>
                            {DOC_TYPE_LIST.map((t) => (
                                <option key={t.code} value={t.code}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                        <F
                            label="الموضوع"
                            val={draft.subject}
                            set={(v) => {
                                setTplField("subject");
                                up({ subject: v });
                            }}
                            placeholder="مثال: فاتورة {{document_number}}"
                            dir="rtl"
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <label style={{ fontSize: 12, color: "var(--t4)" }}>
                                نص الرسالة (محتوى)
                            </label>
                            <textarea
                                rows={6}
                                value={draft.body}
                                dir="auto"
                                onFocus={() => setTplField("body")}
                                onChange={(e) => {
                                    setTplField("body");
                                    up({ body: e.target.value });
                                }}
                                placeholder={
                                    "مثال:\nمرحباً {{party_name}}،\nنرفق لكم فاتورة {{document_number}} بمبلغ {{net_to_pay}}."
                                }
                                style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    resize: "vertical",
                                }}
                            />
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 16,
                                flexWrap: "wrap",
                            }}
                        >
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontSize: 12,
                                }}
                            >
                                <TplToggle
                                    checked={draft.is_default}
                                    onChange={() =>
                                        up({ is_default: !draft.is_default })
                                    }
                                />
                                <span>
                                    افتراضي
                                </span>
                            </label>
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontSize: 12,
                                }}
                            >
                                <TplToggle
                                    checked={draft.is_active}
                                    onChange={() =>
                                        up({ is_active: !draft.is_active })
                                    }
                                />
                                <span>
                                    مفعّل
                                </span>
                            </label>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <Button
                                onClick={handleSaveTpl}
                                loading={savingTpl}
                                disabled={!draft.name.trim()}
                                icon={<i className="ti ti-device-floppy" />}
                            >
                                {editingId !== null ? "حفظ التعديلات" : "إنشاء القالب"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setDraft(null)}
                            >
                                إلغاء
                            </Button>
                        </div>
                    </div>
                )}

                {!manageTemplates && (
                    <p
                        style={{
                            fontSize: 11,
                            color: "var(--t4)",
                            margin: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <i className="ti ti-lock" />
                        تحتاج صلاحية «إدارة الإعدادات» لإنشاء أو تعديل قوالب البريد.
                    </p>
                )}
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
            <ConfirmDialog {...confirmDialogProps} />
        </div>
    );
}