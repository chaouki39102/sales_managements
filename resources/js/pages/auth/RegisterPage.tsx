// pages/auth/RegisterPage.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient, { setAuthToken } from "@/lib/api/core/client";
import type { User } from "@/types";

// ── Password strength helper ──────────────────────────────────────────────────
function calcStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { score, label: "ضعيفة جداً", color: "#ef4444" };
    if (score === 2) return { score, label: "ضعيفة",     color: "#f97316" };
    if (score === 3) return { score, label: "متوسطة",    color: "#eab308" };
    if (score === 4) return { score, label: "قوية",      color: "#22c55e" };
    return             { score, label: "قوية جداً",      color: "var(--em)" };
}

export default function RegisterPage() {
    const navigate = useNavigate();

    const [name,            setName]            = useState("");
    const [email,           setEmail]           = useState("");
    const [password,        setPassword]        = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [showPass,        setShowPass]        = useState(false);
    const [showPassC,       setShowPassC]       = useState(false);
    const [error,           setError]           = useState("");
    const [fieldErrors,     setFieldErrors]     = useState<Record<string, string>>({});
    const [loading,         setLoading]         = useState(false);

    const strength = calcStrength(password);

    // ── client-side validation ────────────────────────────────────────────────
    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!name.trim())                          errs.name     = "الاسم مطلوب";
        if (!email)                                errs.email    = "البريد الإلكتروني مطلوب";
        else if (!/\S+@\S+\.\S+/.test(email))     errs.email    = "البريد الإلكتروني غير صحيح";
        if (!password)                             errs.password = "كلمة المرور مطلوبة";
        else if (password.length < 8)              errs.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
        else if (!/[A-Z]/.test(password))         errs.password = "يجب أن تحتوي على حرف كبير";
        else if (!/[a-z]/.test(password))         errs.password = "يجب أن تحتوي على حرف صغير";
        else if (!/[0-9]/.test(password))         errs.password = "يجب أن تحتوي على رقم";
        if (!passwordConfirm)                      errs.password_confirmation = "تأكيد كلمة المرور مطلوب";
        else if (password !== passwordConfirm)     errs.password_confirmation = "كلمة المرور غير متطابقة";
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    }

    // ── submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!validate()) return;

        setLoading(true);
        try {
            const res = await apiClient.post<{
                data: { user: User; token: string; token_type: string };
                message: string;
            }>("/auth/register", {
                name,
                email,
                password,
                password_confirmation: passwordConfirm,
            });

            setAuthToken(res.data.data.token);
            navigate("/onboarding", { replace: true });
        } catch (err: any) {
            if (err.response) {
                // Laravel validation errors (422)
                const validationErrors = err.response.data?.errors;
                if (validationErrors) {
                    const mapped: Record<string, string> = {};
                    for (const [key, msgs] of Object.entries(validationErrors)) {
                        mapped[key] = (msgs as string[])[0];
                    }
                    setFieldErrors(mapped);
                } else {
                    setError(err.response.data?.message || `خطأ ${err.response.status}`);
                }
            } else if (err.request) {
                setError("لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم وإعدادات CORS.");
            } else {
                setError(err.message || "حدث خطأ غير متوقع");
            }
        } finally {
            setLoading(false);
        }
    };

    // ── field helper ─────────────────────────────────────────────────────────
    const FieldError = ({ field }: { field: string }) =>
        fieldErrors[field] ? (
            <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />
                {fieldErrors[field]}
            </div>
        ) : null;

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                background: "var(--bg0)",
                direction: "rtl",
            }}
        >
            {/* ── Left decorative panel (same as LoginPage) ── */}
            <div
                style={{
                    flex: 1,
                    background: "linear-gradient(145deg, var(--em) 0%, #065f46 100%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 48,
                    position: "relative",
                    overflow: "hidden",
                }}
                className="login-panel"
            >
                {/* decorative circles */}
                {[
                    { size: 300, top: -80,  left: -80,  opacity: 0.08 },
                    { size: 200, bottom: -40, right: -40, opacity: 0.06 },
                    { size: 150, top: "40%", left: "60%", opacity: 0.05 },
                ].map((c, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            width: c.size,
                            height: c.size,
                            borderRadius: "50%",
                            background: "#fff",
                            opacity: c.opacity,
                            top: (c as any).top,
                            left: (c as any).left,
                            bottom: (c as any).bottom,
                            right: (c as any).right,
                            pointerEvents: "none",
                        }}
                    />
                ))}

                <div style={{ position: "relative", textAlign: "center", color: "#fff", maxWidth: 360 }}>
                    {/* logo */}
                    <div
                        style={{
                            width: 140, height: 80, borderRadius: 24,
                            background: "rgba(255,255,255,.15)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,.25)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 24px",
                            fontSize: 36, fontWeight: 900,
                        }}
                    >
                        POS Dz
                    </div>

                    <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, lineHeight: 1.3 }}>
                        انضم إلى المنصة
                    </h1>
                    <p style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.7, marginBottom: 32 }}>
                        سجّل حسابك الآن وابدأ رحلتك مع نظام إدارة الأعمال الأول في الجزائر.
                    </p>

                    {/* steps */}
                    {[
                        { icon: "ti-user-plus",     text: "أنشئ حسابك في أقل من دقيقة" },
                        { icon: "ti-building",       text: "أضف بيانات مؤسستك وفريقك" },
                        { icon: "ti-receipt-2",      text: "ابدأ الفوترة والمبيعات فوراً" },
                        { icon: "ti-chart-pie",      text: "تابع أداءك من لوحة تحكم ذكية" },
                        { icon: "ti-shield-check",   text: "بياناتك محمية بتشفير عالي المستوى" },
                        { icon: "ti-headset",        text: "دعم فني متخصص 24/7" },
                    ].map(({ icon, text }) => (
                        <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.95, textAlign: "right", marginBottom: 14 }}>
                            <div
                                style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: "rgba(255,255,255,.15)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0, fontSize: 16,
                                }}
                            >
                                <i className={`ti ${icon}`} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{text}</span>
                        </div>
                    ))}

                    <div style={{ marginTop: 32, padding: 16, background: "rgba(0,0,0,0.2)", borderRadius: 12 }}>
                        <p style={{ fontSize: 13, margin: 0, opacity: 0.9 }}>
                            <i className="ti ti-gift" style={{ marginLeft: 8 }} />
                            جرّب المنصة مجاناً لمدة 14 يوم — بدون بطاقة بنكية
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Right register form ── */}
            <div
                style={{
                    width: 480,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "32px 40px",
                    background: "var(--bg2)",
                    flexShrink: 0,
                    overflowY: "auto",
                }}
                className="login-form-panel"
            >
                <div style={{ width: "100%", maxWidth: 400 }}>
                    {/* header */}
                    <div style={{ marginBottom: 28 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div
                                style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    background: "var(--grad-em)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#fff", fontWeight: 900, fontSize: 18,
                                    boxShadow: "var(--emglow)",
                                }}
                            >
                                ب
                            </div>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: 16, color: "var(--t1)" }}>بيزنس بلاس</div>
                                <div style={{ fontSize: 11, color: "var(--t4)" }}>نظام إدارة الأعمال</div>
                            </div>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--t1)", margin: "20px 0 6px" }}>
                            إنشاء حساب جديد 🚀
                        </h2>
                        <p style={{ fontSize: 13, color: "var(--t4)" }}>
                            أدخل بياناتك لإنشاء حساب والبدء مجاناً
                        </p>
                    </div>

                    {/* form */}
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                        {/* Name */}
                        <div className="fg">
                            <label className="req">الاسم الكامل</label>
                            <div className="inp-row">
                                <div className="inp-pre" style={iconStyle}>
                                    <i className="ti ti-user" />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => { setName(e.target.value); clearFieldError("name"); }}
                                    placeholder="محمد أمين"
                                    autoComplete="name"
                                    autoFocus
                                    style={inputRight(!!fieldErrors.name)}
                                />
                            </div>
                            <FieldError field="name" />
                        </div>

                        {/* Email */}
                        <div className="fg">
                            <label className="req">البريد الإلكتروني</label>
                            <div className="inp-row">
                                <div className="inp-pre" style={iconStyle}>
                                    <i className="ti ti-mail" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); clearFieldError("email"); }}
                                    placeholder="admin@mail.com"
                                    autoComplete="email"
                                    style={inputRight(!!fieldErrors.email)}
                                />
                            </div>
                            <FieldError field="email" />
                        </div>

                        {/* Password */}
                        <div className="fg">
                            <label className="req">كلمة المرور</label>
                            <div className="inp-row" style={{ position: "relative" }}>
                                <div className="inp-pre" style={iconStyle}>
                                    <i className="ti ti-lock" />
                                </div>
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); clearFieldError("password"); }}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    style={{ ...inputRight(!!fieldErrors.password), paddingLeft: 36 }}
                                />
                                <button type="button" onClick={() => setShowPass(v => !v)} style={eyeBtn}>
                                    <i className={`ti ${showPass ? "ti-eye-off" : "ti-eye"}`} />
                                </button>
                            </div>

                            {/* Strength bar */}
                            {password.length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div
                                                key={i}
                                                style={{
                                                    flex: 1, height: 3, borderRadius: 4,
                                                    background: i <= strength.score ? strength.color : "var(--bg4)",
                                                    transition: "background .3s",
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>
                                        قوة كلمة المرور: {strength.label}
                                    </div>
                                </div>
                            )}

                            <FieldError field="password" />

                            {/* hints */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
                                {[
                                    { ok: password.length >= 8,   text: "8 أحرف على الأقل" },
                                    { ok: /[A-Z]/.test(password), text: "حرف كبير" },
                                    { ok: /[a-z]/.test(password), text: "حرف صغير" },
                                    { ok: /[0-9]/.test(password), text: "رقم" },
                                ].map(({ ok, text }) => (
                                    <span
                                        key={text}
                                        style={{
                                            fontSize: 11,
                                            color: ok ? "var(--em)" : "var(--t4)",
                                            display: "flex", alignItems: "center", gap: 3,
                                            transition: "color .2s",
                                        }}
                                    >
                                        <i className={`ti ${ok ? "ti-circle-check" : "ti-circle-x"}`} />
                                        {text}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="fg">
                            <label className="req">تأكيد كلمة المرور</label>
                            <div className="inp-row" style={{ position: "relative" }}>
                                <div className="inp-pre" style={iconStyle}>
                                    <i className={`ti ${passwordConfirm && password === passwordConfirm ? "ti-lock-check" : "ti-lock"}`}
                                       style={{ color: passwordConfirm && password === passwordConfirm ? "var(--em)" : undefined }}
                                    />
                                </div>
                                <input
                                    type={showPassC ? "text" : "password"}
                                    value={passwordConfirm}
                                    onChange={e => { setPasswordConfirm(e.target.value); clearFieldError("password_confirmation"); }}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    style={{ ...inputRight(!!fieldErrors.password_confirmation), paddingLeft: 36 }}
                                />
                                <button type="button" onClick={() => setShowPassC(v => !v)} style={eyeBtn}>
                                    <i className={`ti ${showPassC ? "ti-eye-off" : "ti-eye"}`} />
                                </button>
                            </div>
                            <FieldError field="password_confirmation" />
                        </div>

                        {/* Global error */}
                        {error && (
                            <div className="al al-r" style={{ borderRadius: "var(--r2)", padding: "10px 14px" }}>
                                <span className="ic ic-xs" style={{ flexShrink: 0 }}>
                                    <i className="ti ti-alert-circle" />
                                </span>
                                <div style={{ fontSize: 13 }}>{error}</div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "12px 20px",
                                borderRadius: "var(--r2)",
                                border: "none",
                                background: loading ? "var(--bg4)" : "var(--em)",
                                color: loading ? "var(--t4)" : "#fff",
                                fontSize: 14,
                                fontWeight: 800,
                                cursor: loading ? "not-allowed" : "pointer",
                                fontFamily: "Tajawal, sans-serif",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                boxShadow: loading ? "none" : "var(--emglow)",
                                transition: ".2s",
                                marginTop: 4,
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: 16, height: 16, borderRadius: "50%",
                                        border: "2px solid rgba(255,255,255,.3)",
                                        borderTopColor: "#fff",
                                        animation: "spin .7s linear infinite",
                                    }} />
                                    جاري إنشاء الحساب...
                                </>
                            ) : (
                                <>
                                    <i className="ti ti-user-plus" />
                                    إنشاء الحساب
                                </>
                            )}
                        </button>

                        {/* Terms notice */}
                        <p style={{ fontSize: 11, color: "var(--t4)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                            بإنشاء الحساب، أنت توافق على{" "}
                            <span style={{ color: "var(--em)", cursor: "pointer", fontWeight: 600 }}>شروط الاستخدام</span>
                            {" "}و{" "}
                            <span style={{ color: "var(--em)", cursor: "pointer", fontWeight: 600 }}>سياسة الخصوصية</span>
                        </p>
                    </form>

                    {/* Link to login */}
                    <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--b1)", textAlign: "center" }}>
                        <p style={{ fontSize: 13, color: "var(--t4)", margin: 0 }}>
                            لديك حساب بالفعل؟{" "}
                            <Link
                                to="/login"
                                style={{
                                    color: "var(--em)",
                                    fontWeight: 700,
                                    textDecoration: "none",
                                }}
                            >
                                تسجيل الدخول
                                <i className="ti ti-arrow-left" style={{ marginRight: 4, fontSize: 13 }} />
                            </Link>
                        </p>
                    </div>
                </div>
            </div>


        </div>
    );

    // ── helpers ───────────────────────────────────────────────────────────────
    function clearFieldError(field: string) {
        setFieldErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }
}

// ── shared inline styles ──────────────────────────────────────────────────────
const iconStyle: React.CSSProperties = {
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    color: "var(--t4)",
    fontSize: 15,
    borderLeft: "1px solid var(--b3)",
};

function inputRight(hasError: boolean): React.CSSProperties {
    return {
        borderRight: "none",
        borderRadius: "0 var(--r2) var(--r2) 0",
        borderColor: hasError ? "#ef4444" : undefined,
    };
}

const eyeBtn: React.CSSProperties = {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--t4)",
    fontSize: 15,
    padding: 0,
};
