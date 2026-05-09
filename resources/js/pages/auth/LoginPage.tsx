// pages/auth/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
            return;
        }
        if (password.length < 8) {
            setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await login({ email, password });        // يخزّن المستخدم الكامل
            navigate("/onboarding", { replace: true }); // الجميع يذهب إلى onboarding
        } catch (err: any) {
            if (err.response) {
                const msg =
                    err.response.data?.message || err.response.statusText;
                setError(`خطأ ${err.response.status}: ${msg}`);
            } else if (err.request) {
                setError(
                    "لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم وإعدادات CORS."
                );
                console.error(err);
            } else {
                setError(err.message || "بيانات الدخول غير صحيحة");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                background: "var(--bg0)",
                direction: "rtl",
            }}
        >
            {/* ── Left decorative panel ── */}
            <div
                style={{
                    flex: 1,
                    background:
                        "linear-gradient(145deg, var(--em) 0%, #065f46 100%)",
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
                {[
                    { size: 300, top: -80, left: -80, opacity: 0.08 },
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
                            top: c.top,
                            left: c.left,
                            bottom: (c as any).bottom,
                            right: (c as any).right,
                            pointerEvents: "none",
                        }}
                    />
                ))}

                <div
                    style={{
                        position: "relative",
                        textAlign: "center",
                        color: "#fff",
                        maxWidth: 360,
                    }}
                >
                    <div
                        style={{
                            width: 140,
                            height: 80,
                            borderRadius: 24,
                            background: "rgba(255,255,255,.15)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 24px",
                            fontSize: 36,
                            fontWeight: 900,
                        }}
                    >
                        POS Dz
                    </div>
                    <h1
                        style={{
                            fontSize: 28,
                            fontWeight: 900,
                            marginBottom: 12,
                            lineHeight: 1.3,
                        }}
                    >
                        نظام إدارة المبيعات
                    </h1>
                    <p
                        style={{
                            fontSize: 15,
                            opacity: 0.85,
                            lineHeight: 1.7,
                            marginBottom: 32,
                        }}
                    >
                        المنصة الأولى الموجهة للمؤسسات الجزائرية، تجمع بين قوة
                        الأداء، دقة الحسابات، والامتثال الكامل للتشريعات
                        الوطنية.
                    </p>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                            textAlign: "right",
                        }}
                    >
                        {[
                            { icon: "ti-receipt-2", text: "فوترة إلكترونية متوافقة مع النظام الجبائي" },
                            { icon: "ti-building-warehouse", text: "إدارة مخزون احترافية ومتعددة المستودعات" },
                            { icon: "ti-calculator", text: "حسابات TVA دقيقة مع إصدار تلقائي لـ G50/G12" },
                            { icon: "ti-chart-pie", text: "لوحات تحكم تفاعلية لتقارير الأداء اللحظية" },
                            { icon: "ti-shield-check", text: "أمان بيانات متطور مع نسخ احتياطي دوري" },
                            { icon: "ti-users", text: "إدارة متكاملة لبيانات العملاء والموردين" },
                        ].map(({ icon, text }) => (
                            <div
                                key={text}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    opacity: 0.95,
                                }}
                            >
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: "rgba(255,255,255,.15)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        fontSize: 16,
                                    }}
                                >
                                    <i className={`ti ${icon}`} />
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>
                                    {text}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            marginTop: 48,
                            padding: "16px",
                            background: "rgba(0,0,0,0.2)",
                            borderRadius: 12,
                        }}
                    >
                        <p style={{ fontSize: 13, margin: 0, opacity: 0.9 }}>
                            <i className="ti ti-headset" style={{ marginLeft: 8 }} />
                            دعم فني متخصص لمساعدتك 24/7
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Right login form ── */}
            <div
                style={{
                    width: 440,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                    background: "var(--bg2)",
                    flexShrink: 0,
                }}
                className="login-form-panel"
            >
                <div style={{ width: "100%", maxWidth: 360 }}>
                    <div style={{ marginBottom: 32 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 8,
                            }}
                        >
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: "var(--grad-em)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    fontWeight: 900,
                                    fontSize: 18,
                                    boxShadow: "var(--emglow)",
                                }}
                            >
                                ب
                            </div>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: 16, color: "var(--t1)" }}>
                                    بيزنس بلاس
                                </div>
                                <div style={{ fontSize: 11, color: "var(--t4)" }}>
                                    نظام إدارة الأعمال
                                </div>
                            </div>
                        </div>
                        <h2
                            style={{
                                fontSize: 22,
                                fontWeight: 900,
                                color: "var(--t1)",
                                margin: "20px 0 6px",
                            }}
                        >
                            مرحباً بعودتك 👋
                        </h2>
                        <p style={{ fontSize: 13, color: "var(--t4)" }}>
                            أدخل بياناتك للدخول إلى لوحة التحكم
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                        }}
                    >
                        <div className="fg">
                            <label className="req">البريد الإلكتروني</label>
                            <div className="inp-row">
                                <div
                                    className="inp-pre"
                                    style={{
                                        padding: "0 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        color: "var(--t4)",
                                        fontSize: 15,
                                        borderLeft: "1px solid var(--b3)",
                                    }}
                                >
                                    <i className="ti ti-mail" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@mail.com"
                                    autoComplete="email"
                                    autoFocus
                                    style={{
                                        borderRight: "none",
                                        borderRadius: "0 var(--r2) var(--r2) 0",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="fg">
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <label className="req">كلمة المرور</label>
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: "var(--em)",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                    }}
                                >
                                    نسيت كلمة المرور؟
                                </span>
                            </div>
                            <div
                                className="inp-row"
                                style={{ position: "relative" }}
                            >
                                <div
                                    className="inp-pre"
                                    style={{
                                        padding: "0 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        color: "var(--t4)",
                                        fontSize: 15,
                                        borderLeft: "1px solid var(--b3)",
                                    }}
                                >
                                    <i className="ti ti-lock" />
                                </div>
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    style={{
                                        borderRight: "none",
                                        borderRadius: "0 var(--r2) var(--r2) 0",
                                        paddingLeft: 36,
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass((v) => !v)}
                                    style={{
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
                                    }}
                                >
                                    <i className={`ti ${showPass ? "ti-eye-off" : "ti-eye"}`} />
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div
                                className="al al-r"
                                style={{
                                    borderRadius: "var(--r2)",
                                    padding: "10px 14px",
                                }}
                            >
                                <span className="ic ic-xs" style={{ flexShrink: 0 }}>
                                    <i className="ti ti-alert-circle" />
                                </span>
                                <div style={{ fontSize: 13 }}>{error}</div>
                            </div>
                        )}

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
                                    <div
                                        style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            border: "2px solid rgba(255,255,255,.3)",
                                            borderTopColor: "#fff",
                                            animation: "spin .7s linear infinite",
                                        }}
                                    />
                                    جاري الدخول...
                                </>
                            ) : (
                                <>
                                    <i className="ti ti-login" />
                                    تسجيل الدخول
                                </>
                            )}
                        </button>
                    </form>

                    <div
                        style={{
                            marginTop: 32,
                            paddingTop: 20,
                            borderTop: "1px solid var(--b1)",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                color: "var(--t4)",
                                lineHeight: 1.6,
                            }}
                        >
                            بيانات تجريبية:{" "}
                            <code
                                style={{
                                    background: "var(--bg3)",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                }}
                            >
                                admin@mail.com
                            </code>
                            {" / "}
                            <code
                                style={{
                                    background: "var(--bg3)",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                }}
                            >
                                password
                            </code>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (max-width: 768px) {
                    .login-panel { display: none !important; }
                    .login-form-panel { width: 100% !important; }
                }
            `}</style>
        </div>
    );
}