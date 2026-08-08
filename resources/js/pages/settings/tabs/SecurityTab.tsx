// pages/settings/tabs/SecurityTab.tsx — التحقق بخطوتين (2FA) من الإعدادات
//
// ════════════════════════════════════════════════════════════════════════════
// يوفّر تبويب "الأمان" في الإعدادات إدارة التحقق بخطوتين:
//   - الحالة الحالية (مفعّل/معطّل) من UserResource.two_factor_enabled
//   - خطوات التفعيل: setup → رمز QR + المفتاح السري → إدخال رمز 6 أرقام → enable
//   - رموز الاسترداد (10 رموز × XXXX-XXXX-XXXX) تظهر مرة واحدة فقط
//   - إعادة توليد الرموز + تعطيل الحماية (يتطلب رمزاً سارياً)
// كل العمليات عبر lib/api/endpoints/auth.ts → TwoFactorAuthController.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
    useCurrentUser,
    useTwoFactorSetup,
    useTwoFactorEnable,
    useTwoFactorDisable,
    useTwoFactorRecoveryCodes,
} from "@/lib/api/endpoints/auth";
import { authKeys } from "@/lib/api/core/queryKeys";
import { useNotification } from "@/hooks/useNotification";
import { ConfirmModal } from "./_shared";
import type { TwoFactorSetupResponse } from "@/lib/api/core/types";

const CODE_RE = /^\d{6}$/;

export function SecurityTab() {
    const notify = useNotification();
    const qc = useQueryClient();
    const { data: user } = useCurrentUser();
    const enabled = !!user?.two_factor_enabled;

    const setupMut    = useTwoFactorSetup();
    const enableMut   = useTwoFactorEnable();
    const disableMut  = useTwoFactorDisable();
    const recoveryMut = useTwoFactorRecoveryCodes();

    const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [newCodes, setNewCodes] = useState<string[] | null>(null);
    const [disableOpen, setDisableOpen] = useState(false);
    const [disableCode, setDisableCode] = useState("");
    const [copied, setCopied] = useState(false);

    // بعد تفعيل/تعطيل 2FA نُعيد جلب المستخدم حتى تحدَّث الحالة في كل الشاشات
    const refreshUser = () => qc.invalidateQueries({ queryKey: authKeys.me });

    const handleStartSetup = async () => {
        try {
            const res = await setupMut.mutateAsync();
            setSetup(res);
            setVerifyCode("");
        } catch (e: unknown) {
            const err = e as Error;
            notify.error("تعذر بدء الإعداد", err?.message ?? "حدث خطأ");
        }
    };

    const handleVerify = async () => {
        const code = verifyCode.trim();
        if (!CODE_RE.test(code)) {
            notify.warning("رمز غير صالح", "أدخل رمز التحقق المكوّن من 6 أرقام.");
            return;
        }
        try {
            const res = await enableMut.mutateAsync(code);
            setNewCodes(res.recovery_codes ?? []);
            setSetup(null);
            setVerifyCode("");
            refreshUser();
            notify.success(
                "تم تفعيل التحقق بخطوتين",
                "احفظ رموز الاسترداد في مكان آمن.",
            );
        } catch (e: unknown) {
            const err = e as Error;
            notify.error(
                "تعذر تفعيل التحقق",
                err?.message ?? "تحقق من الرمز وحاول مجدداً",
            );
        }
    };

    const handleAckCodes = () => {
        setNewCodes(null);
    };

    const handleRegenerate = async () => {
        try {
            const res = await recoveryMut.mutateAsync();
            setNewCodes(res.recovery_codes ?? []);
            notify.success(
                "تم توليد رموز جديدة",
                "الرموز القديمة لم تعد صالحة بعد الآن.",
            );
        } catch (e: unknown) {
            const err = e as Error;
            notify.error("تعذر توليد الرموز", err?.message ?? "حدث خطأ");
        }
    };

    const handleDisable = async () => {
        const code = disableCode.trim();
        if (!CODE_RE.test(code)) {
            notify.warning("رمز غير صالح", "أدخل رمز التحقق الحالي.");
            return;
        }
        try {
            await disableMut.mutateAsync(code);
            setDisableOpen(false);
            setDisableCode("");
            setSetup(null);
            refreshUser();
            notify.success("تم تعطيل التحقق بخطوتين");
        } catch (e: unknown) {
            const err = e as Error;
            notify.error(
                "تعذر التعطيل",
                err?.message ?? "تحقق من الرمز وحاول مجدداً",
            );
        }
    };

    const handleCopySecret = async () => {
        if (!setup?.secret) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(setup.secret);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            }
        } catch {
            // clipboard غير متاح (سياق غير آمن) — ينسخ المستخدم يدوياً
        }
    };

    if (!user) {
        return (
            <div className="sec-stack">
                <div className="sec-loading">جارٍ تحميل حالة الأمان...</div>
            </div>
        );
    }

    return (
        <div className="sec-stack">
            {/* ─── الحالة ─────────────────────────────────────────────────── */}
            <Card title="التحقق بخطوتين (2FA)" titleIcon="ti-shield-lock">
                <div className="sec-status">
                    <div className={`sec-status-badge${enabled ? " on" : ""}`}>
                        <i
                            className={`ti ${enabled ? "ti-shield-check" : "ti-shield-off"}`}
                        />
                        {enabled ? "مفعّل" : "معطّل"}
                    </div>
                    <p className="sec-hint">
                        {enabled
                            ? "عند تسجيل الدخول يُطلب رمز تحقق من تطبيق المصادقة بالإضافة إلى كلمة المرور."
                            : "عند التفعيل يُطلب رمز تحقق إضافي مع كل تسجيل دخول جديد — حماية إضافية لحسابك."}
                    </p>
                </div>
            </Card>

            {!enabled && !setup && (
                <Card title="تفعيل الحماية" titleIcon="ti-shield-lock-plus">
                    <p className="sec-hint">
                        سنعرض لك رمز QR لمسحه ضوئياً بتطبيق مصادقة (Google
                        Authenticator، Aegis، ...) ثم تُدخل رمزاً لتأكيد التفعيل.
                    </p>
                    <div className="sec-actions">
                        <Button
                            variant="primary"
                            onClick={handleStartSetup}
                            loading={setupMut.isPending}
                            icon={<i className="ti ti-qrcode" />}
                        >
                            البدء في الإعداد
                        </Button>
                    </div>
                </Card>
            )}

            {!enabled && setup && (
                <Card title="الخطوة 1: امسح رمز QR" titleIcon="ti-qrcode">
                    <div className="sec-enroll">
                        <div
                            className="sec-qr"
                            dangerouslySetInnerHTML={{ __html: setup.qr_svg }}
                        />
                        <div className="sec-secret-box">
                            <div className="sec-secret-lbl">
                                المفتاح السري (أدخله يدوياً إذا تعذّر المسح)
                            </div>
                            <div className="sec-secret-row">
                                <code className="sec-secret" dir="ltr">
                                    {setup.secret}
                                </code>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleCopySecret}
                                    icon={
                                        <i
                                            className={`ti ${copied ? "ti-check" : "ti-copy"}`}
                                        />
                                    }
                                >
                                    {copied ? "نُسخ" : "نسخ"}
                                </Button>
                            </div>
                        </div>
                        <p className="sec-uri" dir="ltr">
                            {setup.otpauth_uri}
                        </p>
                    </div>
                </Card>
            )}

            {!enabled && setup && (
                <Card title="الخطوة 2: أدخل رمز التحقق" titleIcon="ti-shield-check">
                    <p className="sec-hint">
                        أدخل الرمز المكوّن من 6 أرقام المعروض في تطبيق المصادقة
                        لتفعيل الحماية.
                    </p>
                    <div className="sec-verify-row">
                        <input
                            className="sec-code-inp"
                            value={verifyCode}
                            onChange={(e) =>
                                setVerifyCode(
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 6),
                                )
                            }
                            placeholder="••••••"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                        />
                        <Button
                            variant="primary"
                            onClick={handleVerify}
                            loading={enableMut.isPending}
                            disabled={!CODE_RE.test(verifyCode.trim())}
                            icon={<i className="ti ti-shield-lock" />}
                        >
                            تأكيد التفعيل
                        </Button>
                    </div>
                </Card>
            )}

            {enabled && (
                <Card title="رموز الاسترداد" titleIcon="ti-key">
                    <p className="sec-hint">
                        استخدم رموز الاسترداد إذا فقدت هاتفك أو تعذّرت قراءة رمز
                        التحقق. كل رمز يُستعمل مرة واحدة فقط.
                    </p>
                    <div className="sec-actions">
                        <Button
                            variant="secondary"
                            onClick={handleRegenerate}
                            loading={recoveryMut.isPending}
                            icon={<i className="ti ti-refresh" />}
                        >
                            إعادة إنشاء الرموز
                        </Button>
                    </div>
                </Card>
            )}

            {enabled && (
                <Card title="تعطيل التحقق بخطوتين" titleIcon="ti-shield-off">
                    <p className="sec-hint">
                        لتعطيل الحماية أدخل رمز التحقق الحالي ثم اضغط
                        «تعطيل». ستُحذف رموز الاسترداد أيضاً.
                    </p>
                    <div className="sec-verify-row">
                        <input
                            className="sec-code-inp"
                            value={disableCode}
                            onChange={(e) =>
                                setDisableCode(
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 6),
                                )
                            }
                            placeholder="••••••"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                        />
                        <Button
                            variant="danger"
                            onClick={() => setDisableOpen(true)}
                            disabled={!CODE_RE.test(disableCode.trim())}
                            icon={<i className="ti ti-shield-off" />}
                        >
                            تعطيل
                        </Button>
                    </div>
                </Card>
            )}

            {/* ─── رموز الاسترداد تظهر مرة واحدة ─────────────────────────── */}
            {newCodes && newCodes.length > 0 && (
                <Card title="رموز الاسترداد الجديدة" titleIcon="ti-key">
                    <div className="sec-warn">
                        <i className="ti ti-alert-triangle" />
                        <span>
                            احفظ هذه الرموز الآن في مكان آمن — لن تظهر مجدداً
                            بعد إغلاق هذه البطاقة.
                        </span>
                    </div>
                    <div className="sec-codes">
                        {newCodes.map((c) => (
                            <code key={c} className="sec-code-chip" dir="ltr">
                                {c}
                            </code>
                        ))}
                    </div>
                    <div className="sec-actions">
                        <Button
                            variant="primary"
                            onClick={handleAckCodes}
                            icon={<i className="ti ti-check" />}
                        >
                            لقد حفظت الرموز
                        </Button>
                    </div>
                </Card>
            )}

            <ConfirmModal
                open={disableOpen}
                title="تعطيل التحقق بخطوتين"
                message={
                    disableCode.trim()
                        ? `سيتم تعطيل الحماية باستخدام الرمز ${disableCode.trim()}.`
                        : ""
                }
                confirmLabel="تعطيل الآن"
                confirmColor="var(--red)"
                warning="بعد التعطيل لن يُطلب رمز تحقق عند تسجيل الدخول، وتُحذف رموز الاسترداد."
                onConfirm={handleDisable}
                onCancel={() => setDisableOpen(false)}
            />
        </div>
    );
}
