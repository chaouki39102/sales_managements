// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalLayout.tsx — هيكل بوابة الزبائن (هيدر + تنقل + خروج)
// ════════════════════════════════════════════════════════════════════════════
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { usePortalStore } from '@/lib/store/portalStore';
import { portalTokenStorage } from '@/lib/api/portal/client';

export default function PortalLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { slug } = useParams<{ slug: string }>();
  const portalUser = usePortalStore((s) => s.portalUser) as { name?: string; email?: string } | null;
  const setPortalUser = usePortalStore((s) => s.setPortalUser);

  const base = `/portal/${slug}`;
  const ALL_NAV_ITEMS = [
    { to: base, label: 'الرئيسية', icon: 'ti-layout-dashboard', end: true },
    { to: `${base}/documents`, label: 'المستندات', icon: 'ti-file-text', end: false },
    { to: `${base}/myorders`, label: 'طلباتي', icon: 'ti-clipboard-list', end: false },
    { to: `${base}/orders`, label: 'اطلب سلعة', icon: 'ti-building-store', end: false },
    { to: `${base}/payments`, label: 'الدفعات', icon: 'ti-wallet', end: false },
    { to: `${base}/statement`, label: 'كشف الحساب', icon: 'ti-report-money', end: false },
    { to: `${base}/profile`, label: 'الملف الشخصي', icon: 'ti-user-circle', end: false },
  ];

  // عندما تُعطّل الإدارة البوابة كاملةً، يختفي «اطلب سلعة» من شريط التنقل —
  // «طلباتي» يبقى للمتابعة فقط (متجر الطلب يعرض لافتة التعطيل لو دُخل إليه مباشرة).
  const storeEnabledQuery = useQuery({
    queryKey: ['portal', slug, 'config'],
    queryFn: () => portalApi.config(),
    staleTime: 60_000,
    retry: false,
  });
  const NAV_ITEMS = (storeEnabledQuery.data?.enabled === false)
    ? ALL_NAV_ITEMS.filter((i) => !i.to.endsWith('/orders'))
    : ALL_NAV_ITEMS;

  useQuery({
    queryKey: ['portal', slug, 'me'],
    queryFn: async () => {
      const me = await portalApi.me();
      setPortalUser(me);
      return me;
    },
    enabled: !!portalTokenStorage.get(),
    staleTime: Infinity,
    retry: false,
  });

  const handleLogout = async () => {
    try { await portalApi.logout(); } catch { /* تجاهل */ }
    portalTokenStorage.clear();
    usePortalStore.getState().clearSession();
    qc.clear();
    navigate(`/portal/${slug}/login`, { replace: true });
  };

  const userName = portalUser?.name;
  const initials = userName ? userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '؟';

  return (
    <div className="portal-page">
      <header className="portal-hd">
        <div className="portal-hd-in">
          <div className="portal-brand">
            <div className="portal-logo"><i className="ti ti-building-store" /></div>
            <div className="portal-brand-tx">
              <div className="portal-brand-nm">بوابة الزبائن</div>
              <div className="portal-brand-sub">فضاء التتبع والمتابعة</div>
            </div>
          </div>

          <nav className="portal-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'on' : '')}
              >
                <i className={`ti ${item.icon}`} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="portal-hd-user">
            {userName && (
              <div className="portal-user-pill">
                <span>{userName}</span>
                <div className="portal-user-avatar">{initials}</div>
              </div>
            )}
            <button className="portal-btn portal-btn--ghost" onClick={handleLogout} title="خروج">
              <i className="ti ti-logout" />
            </button>
          </div>
        </div>
      </header>

      <main className="portal-body">
        <Outlet />
      </main>

      {/* ─── شريط تنقل موبايل سفلي ─── */}
      <nav className="portal-mobile-bar">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'on' : '')}
          >
            <i className={`ti ${item.icon}`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
