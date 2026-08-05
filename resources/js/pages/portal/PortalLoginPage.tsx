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

        <form onSubmit={handleSubmit} className="portal-login-form">
          <div className="fg">
            <label className="portal-login-label">
              البريد الإلكتروني <span className="portal-red">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              autoComplete="email"
              autoFocus
              dir="ltr"
              className="portal-form-input portal-form-input--r"
            />
          </div>

          <div className="fg">
            <label className="portal-login-label">
              كلمة المرور <span className="portal-red">*</span>
            </label>
            <div className="portal-relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                className="portal-form-input portal-form-input--pass"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="portal-login-eye"
              >
                <i className={`ti ${showPass ? 'ti-eye-off' : 'ti-eye'}`} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="portal-btn portal-btn--em portal-login-submit"
            disabled={loading}
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

        <div className="portal-login-foot">
          حسابك مسجل لدى المؤسسة التي تتعامل معها.
          <br />
          إذا لم تملك حساباً، تواصل معها مباشرة.
        </div>
      </div>
    </div>
  );
}
