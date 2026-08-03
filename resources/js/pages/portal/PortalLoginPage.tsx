// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalLoginPage.tsx — تسجيل دخول الزبون إلى البوابة
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { portalApi } from '@/lib/api/portal/portal';
import { usePortalStore } from '@/lib/store/portalStore';
import { portalTokenStorage } from '@/lib/api/portal/client';
import { PortalError } from './portalUtils';

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnPath = params.get('return') || '/portal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await portalApi.login(email, password);
      portalTokenStorage.set(res.token);
      usePortalStore.getState().setPortalUser(res.portal_user);
      navigate(returnPath.startsWith('/portal') ? returnPath : '/portal', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'بيانات الدخول غير صحيحة';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login">
      <div className="portal-login-box">
        <div className="portal-login-logo"><i className="ti ti-building-store" /></div>
        <div className="portal-login-title">بوابة الزبائن</div>
        <div className="portal-login-sub">تابع فواتيرك ودفعاتك وكشف حسابك</div>

        {error && <PortalError message={error} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fg">
            <label className="req">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              autoComplete="email"
              autoFocus
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>

          <div className="fg">
            <label className="req">كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                style={{ textAlign: 'right', paddingLeft: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 0, fontSize: 15,
                }}
              >
                <i className={`ti ${showPass ? 'ti-eye-off' : 'ti-eye'}`} />
              </button>
            </div>
          </div>

          <button type="submit" className="portal-btn portal-btn--em" disabled={loading} style={{ justifyContent: 'center', padding: '11px 14px' }}>
            {loading ? (
              <>
                <i className="ti ti-loader animate-spin" />
                جاري الدخول...
              </>
            ) : (
              <>
                <i className="ti ti-login" />
                دخول
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--b1)', fontSize: 12, color: 'var(--t4)', textAlign: 'center' }}>
          حسابك مسجل لدى المؤسسة التي تتعامل معها. إذا لم تملك حساباً، تواصل معها.
        </div>
      </div>
    </div>
  );
}
