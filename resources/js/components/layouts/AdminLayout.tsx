// ════════════════════════════════════════════════
// components/layouts/AdminLayout.tsx
// Layout مستقل للسوبر أدمن — sidebar + topbar متطور
// ════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdminDashboard } from '@/hooks/useAdmin';
import { useTheme } from '@/hooks/useTheme';

const NAV = [
  {
    section: 'الرئيسية',
    color: 'var(--red)',
    items: [
      { to: '/admin',          icon: 'ti-layout-dashboard', label: 'لوحة التحكم',  end: true  },
    ],
  },
  {
    section: 'إدارة المحتوى',
    color: 'var(--blue)',
    items: [
      { to: '/admin/companies', icon: 'ti-building-store',   label: 'الشركات',      badge: 'companies' },
      { to: '/admin/users',     icon: 'ti-users',            label: 'المستخدمون',   badge: 'users'     },
      { to: '/admin/approvals', icon: 'ti-user-check',       label: 'طلبات التفعيل' },
    ],
  },
  {
    section: 'الاشتراكات والخطط',
    color: 'var(--gold)',
    items: [
      { to: '/admin/plans',     icon: 'ti-credit-card',      label: 'الخطط'        },
      { to: '/admin/activity',  icon: 'ti-activity',         label: 'سجل النشاط'   },
    ],
  },
  {
    section: 'النظام والإعدادات',
    color: 'var(--purple)',
    items: [
      { to: '/admin/settings',  icon: 'ti-settings',         label: 'الإعدادات'    },
      { to: '/admin/reports',   icon: 'ti-chart-bar',        label: 'التقارير'     },
    ],
  },
];

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/admin':           { title: 'لوحة تحكم النظام',  sub: 'نظرة شاملة على كامل المنصة' },
  '/admin/companies': { title: 'إدارة الشركات',      sub: 'كل الشركات المسجلة في المنصة' },
  '/admin/users':     { title: 'إدارة المستخدمين',   sub: 'كل المستخدمين عبر الشركات'  },
  '/admin/approvals': { title: 'طلبات التفعيل',       sub: 'المستخدمون بانتظار الموافقة' },
  '/admin/plans':     { title: 'الخطط والاشتراكات',  sub: 'إدارة خطط وحدود المنصة'     },
  '/admin/activity':  { title: 'سجل النشاط',         sub: 'تتبع كل الأحداث والعمليات' },
  '/admin/settings':  { title: 'إعدادات النظام',     sub: 'إعدادات البنية التحتية'     },
  '/admin/reports':   { title: 'تقارير النظام',      sub: 'إحصائيات الاستخدام والنمو'  },
};

export default function AdminLayout() {
  const { user, logout }   = useAuth();
  const _navigate           = useNavigate();
  const location            = useLocation();
  const { data: stats }     = useAdminDashboard();
  const { dark, toggle: toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta = PAGE_META[location.pathname] ?? { title: 'Super Admin', sub: '' };

  const badges: Record<string, number | undefined> = {
    companies: stats?.companies.total,
    users:     stats?.users.total,
  };

  return (
    <div
      style={{
        display: 'flex', minHeight: '100vh',
        background: 'var(--bg0)', direction: 'rtl',
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: collapsed ? 58 : 230,
          transition: 'width .22s cubic-bezier(.4,0,.2,1)',
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--b2)',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
          position: 'sticky', top: 0, height: '100vh',
        }}
      >
        <div style={{
          padding: '14px 12px 12px',
          borderBottom: '1px solid var(--b2)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#dc2626,#ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(220,38,38,.35)',
          }}>
            <i className="ti ti-shield-lock" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                لوحة الإدارة
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                Super Admin Panel
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div style={{
            margin: '10px 10px 2px',
            padding: '10px 12px',
            background: 'rgba(220,38,38,.06)',
            border: '1px solid rgba(220,38,38,.15)',
            borderRadius: 10,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            flexShrink: 0,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                {stats?.companies.total ?? '—'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--t4)', marginTop: 2 }}>شركة</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(220,38,38,.15)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                {stats?.users.total ?? '—'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--t4)', marginTop: 2 }}>مستخدم</div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(group => (
            <div key={group.section} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '1px',
                  color: group.color, padding: '8px 10px 4px',
                  textTransform: 'uppercase',
                }}>
                  {group.section}
                </div>
              )}
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={(item as any).end}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center',
                    gap: 10, padding: '8px 10px', borderRadius: 8,
                    color: isActive ? '#dc2626' : 'var(--t3)',
                    background: isActive ? 'rgba(220,38,38,.08)' : 'transparent',
                    borderRight: isActive ? '2px solid #dc2626' : '2px solid transparent',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none', marginBottom: 1,
                    transition: 'all .15s',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  })}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                      {(item as any).badge && badges[(item as any).badge] !== undefined && (
                        <span style={{
                          fontSize: 9.5, fontWeight: 800, padding: '2px 7px',
                          borderRadius: 20, background: '#dc2626', color: '#fff',
                          flexShrink: 0,
                        }}>
                          {badges[(item as any).badge]}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '10px 6px', borderTop: '1px solid var(--b2)', flexShrink: 0 }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'var(--t4)', fontSize: 12,
              cursor: 'pointer', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            <i className={`ti ${collapsed ? 'ti-layout-sidebar-right-expand' : 'ti-layout-sidebar-right-collapse'}`} style={{ fontSize: 16, flexShrink: 0 }} />
            {!collapsed && 'طي الشريط الجانبي'}
          </button>

          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 10,
              background: 'var(--bg3)', border: '1px solid var(--b2)',
              cursor: 'pointer', marginTop: 6,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg,#dc2626,#b45309)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {user?.name?.[0] ?? 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--t4)' }}>Super Admin</div>
              </div>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#10b981', flexShrink: 0,
                boxShadow: '0 0 5px rgba(16,185,129,.5)',
              }} />
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{
          height: 54, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'var(--bg2)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--b2)',
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 6px rgba(0,0,0,.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
              background: 'rgba(220,38,38,.1)', color: '#dc2626', letterSpacing: '.5px',
            }}>
              SUPER ADMIN
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
                {meta.title}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{meta.sub}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--t3)', fontSize: 15 }}>
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
            </button>

            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(v => !v)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--t3)', fontSize: 15, position: 'relative' }}>
                <i className="ti ti-bell" />
                {stats?.companies.suspended !== undefined && stats.companies.suspended > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg2)' }}>{stats.companies.suspended}</span>
                )}
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', top: 42, left: 0, width: 280, background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--b2)', fontSize: 12, fontWeight: 700, color: 'var(--t1)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>الإشعارات</span>
                    <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400 }}>وضع علامة مقروء</span>
                  </div>
                  {stats?.companies.suspended !== undefined && stats.companies.suspended > 0 && (
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--b2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(220,38,38,.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}><i className="ti ti-ban" /></div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{stats.companies.suspended} شركة موقوفة</div>
                        <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 2 }}>بحاجة للمراجعة والمتابعة</div>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', textAlign: 'center' }}><span style={{ fontSize: 11, color: 'var(--t4)' }}>لا توجد إشعارات إضافية</span></div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>{user?.name}</span>
              <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(220,38,38,.3)', background: 'transparent', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif' }}>
                <i className="ti ti-logout" /> خروج
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
