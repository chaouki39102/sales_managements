// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalLoginPage.tsx — تسجيل دخول الزبون إلى البوابة (لكل مؤسسة)
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { usePortalStore } from '@/lib/store/portalStore';
import { portalTokenStorage } from '@/lib/api/portal/client';
import { PortalError } from './portalUtils';

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const base = `/portal/${slug}`;
  const returnPath = params.get('return');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: company } = useQuery({
    queryKey: ['portal', slug, 'info'],
    queryFn: () => portalApi.company(),
    enabled: !!slug,
    staleTime: Infinity,
    retry: false,
  });

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
      const target = returnPath?.startsWith(base) ? returnPath : base;
      navigate(target, { replace: true });
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
        <div className="portal-login-title">{company?.commercial_name || company?.name || 'بوابة الزبائن'}</div>
        <div className="portal-login-sub">تابع فواتيرك ودفعاتك وكشف حسابك</div>

        {error && <PortalError message={error} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fg">
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--t3)', marginBottom: 6 }}>
              البريد الإلكتروني <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              autoComplete="email"
              autoFocus
              dir="ltr"
              style={{ textAlign: 'right' }}
              className="portal-form-input"
            />
          </div>

          <div className="fg">
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--t3)', marginBottom: 6 }}>
              كلمة المرور <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                style={{ textAlign: 'right', paddingLeft: 40 }}
                className="portal-form-input"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, fontSize: 16,
                  borderRadius: 6, transition: 'color .2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t1)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t4)')}
              >
                <i className={`ti ${showPass ? 'ti-eye-off' : 'ti-eye'}`} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="portal-btn portal-btn--em"
            disabled={loading}
            style={{
              justifyContent: 'center', padding: '13px 14px', fontSize: 14, borderRadius: 12,
              marginTop: 4,
            }}
          >
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

        <div style={{
          marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--b1)',
          fontSize: 12, color: 'var(--t4)', textAlign: 'center', lineHeight: 1.6,
        }}>
          حسابك مسجل لدى المؤسسة التي تتعامل معها.
          <br />
          إذا لم تملك حساباً، تواصل معها مباشرة.
        </div>
      </div>
    </div>
  );
}
