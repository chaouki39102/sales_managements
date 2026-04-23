// pages/auth/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  // redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg0)',
      direction: 'rtl',
    }}>
      {/* ── Left decorative panel ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(145deg, var(--em) 0%, #065f46 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        position: 'relative',
        overflow: 'hidden',
      }}
        className="login-panel"
      >
        {/* Background circles */}
        {[
          { size: 300, top: -80,  left: -80,  opacity: 0.08 },
          { size: 200, bottom: -40, right: -40, opacity: 0.06 },
          { size: 150, top: '40%', left: '60%', opacity: 0.05 },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: c.size, height: c.size,
            borderRadius: '50%',
            background: '#fff',
            opacity: c.opacity,
            top: c.top, left: c.left,
            bottom: (c as { bottom?: number }).bottom,
            right: (c as { right?: number }).right,
            pointerEvents: 'none',
          }}/>
        ))}

        <div style={{ position: 'relative', textAlign: 'center', color: '#fff', maxWidth: 360 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: 'rgba(255,255,255,.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 36, fontWeight: 900,
          }}>
            ب
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, lineHeight: 1.3 }}>
            نظام إدارة المبيعات
          </h1>
          <p style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.7, marginBottom: 32 }}>
            منصة متكاملة لإدارة المبيعات والمخزون والمحاسبة مطابقة للتشريع الجزائري
          </p>

          {/* Features list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'right' }}>
            {[
              { icon: 'ti-receipt-2',   text: 'فواتير وفق النظام الجبائي الجزائري' },
              { icon: 'ti-building-warehouse', text: 'إدارة مخزون متعدد المستودعات' },
              { icon: 'ti-calculator',  text: 'حسابات TVA وإقرار G50 تلقائي'      },
              { icon: 'ti-device-mobile', text: 'واجهة محمولة بالكامل'            },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.9 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,255,255,.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 15,
                }}>
                  <i className={`ti ${icon}`}/>
                </div>
                <span style={{ fontSize: 13 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right login form ── */}
      <div style={{
        width: 440,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: 'var(--bg2)',
        flexShrink: 0,
      }}
        className="login-form-panel"
      >
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--grad-em)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: 18,
                boxShadow: 'var(--emglow)',
              }}>ب</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--t1)' }}>بيزنس بلاس</div>
                <div style={{ fontSize: 11, color: 'var(--t4)' }}>نظام إدارة الأعمال</div>
              </div>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--t1)', margin: '20px 0 6px' }}>
              مرحباً بعودتك 👋
            </h2>
            <p style={{ fontSize: 13, color: 'var(--t4)' }}>أدخل بياناتك للدخول إلى لوحة التحكم</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div className="fg">
              <label className="req">البريد الإلكتروني</label>
              <div className="inp-row">
                <div className="inp-pre" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', color: 'var(--t4)', fontSize: 15, borderLeft: '1px solid var(--b3)' }}>
                  <i className="ti ti-mail"/>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  autoFocus
                  style={{ borderRight: 'none', borderRadius: '0 var(--r2) var(--r2) 0' }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="fg">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="req">كلمة المرور</label>
                <span style={{ fontSize: 12, color: 'var(--em)', cursor: 'pointer', fontWeight: 600 }}>
                  نسيت كلمة المرور؟
                </span>
              </div>
              <div className="inp-row" style={{ position: 'relative' }}>
                <div className="inp-pre" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', color: 'var(--t4)', fontSize: 15, borderLeft: '1px solid var(--b3)' }}>
                  <i className="ti ti-lock"/>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ borderRight: 'none', borderRadius: '0 var(--r2) var(--r2) 0', paddingLeft: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--t4)', fontSize: 15, padding: 0,
                  }}
                >
                  <i className={`ti ${showPass ? 'ti-eye-off' : 'ti-eye'}`}/>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="al al-r" style={{ borderRadius: 'var(--r2)', padding: '10px 14px' }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-alert-circle"/></span>
                <div style={{ fontSize: 13 }}>{error}</div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px 20px',
                borderRadius: 'var(--r2)', border: 'none',
                background: loading ? 'var(--bg4)' : 'var(--em)',
                color: loading ? 'var(--t4)' : '#fff',
                fontSize: 14, fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Tajawal, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : 'var(--emglow)',
                transition: '.2s',
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff',
                    animation: 'spin .7s linear infinite',
                  }}/>
                  جاري الدخول...
                </>
              ) : (
                <>
                  <i className="ti ti-login"/>
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--b1)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--t4)', lineHeight: 1.6 }}>
              بيانات تجريبية: <code style={{ background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>admin@example.com</code>
              {' / '}
              <code style={{ background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>password</code>
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
