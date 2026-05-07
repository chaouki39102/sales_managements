// ════════════════════════════════════════════════
// components/layouts/AdminLayout.tsx
// Layout مستقل للسوبر أدمن — بدون slug وبدون DashboardLayout
// ════════════════════════════════════════════════
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { to: '/admin',          icon: 'ti-layout-dashboard', label: 'لوحة التحكم', end: true },
  { to: '/admin/companies', icon: 'ti-building-store',  label: 'الشركات' },
  { to: '/admin/users',    icon: 'ti-users',            label: 'المستخدمون' },
  { to: '/admin/plans',    icon: 'ti-credit-card',      label: 'الخطط' },
  { to: '/admin/activity', icon: 'ti-activity',         label: 'سجل النشاط' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="admin-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg0)', direction: 'rtl' }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 60 : 220,
        transition: 'width .2s',
        background: 'var(--bg1)',
        borderLeft: '1px solid var(--bd0)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
      }}>

        {/* Brand */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--bd0)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--em)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 15, flexShrink: 0,
          }}>
            <i className="ti ti-shield-lock" />
          </span>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx0)', lineHeight: 1.2 }}>لوحة الإدارة</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)' }}>Super Admin</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                color: isActive ? 'var(--em)' : 'var(--tx1)',
                background: isActive ? 'var(--em-bg)' : 'transparent',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
                transition: 'all .15s',
              })}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 17, flexShrink: 0 }} />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--bd0)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* رابط للتطبيق العادي */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--tx2)', fontSize: 13, width: '100%',
            }}
          >
            <i className="ti ti-arrow-back-up" style={{ fontSize: 17, flexShrink: 0 }} />
            {!collapsed && 'العودة للتطبيق'}
          </button>

          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--tx2)', fontSize: 13, width: '100%',
            }}
          >
            <i className={`ti ${collapsed ? 'ti-layout-sidebar-right-expand' : 'ti-layout-sidebar-right-collapse'}`} style={{ fontSize: 17, flexShrink: 0 }} />
            {!collapsed && 'طي الشريط'}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{
          height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: 'var(--bg1)', borderBottom: '1px solid var(--bd0)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              background: 'rgba(239,68,68,.12)', color: '#ef4444', letterSpacing: '.5px'
            }}>SUPER ADMIN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--tx1)' }}>{user?.name}</span>
            <button
              onClick={logout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--bd0)',
                background: 'transparent', cursor: 'pointer', color: 'var(--tx2)', fontSize: 13,
              }}
            >
              <i className="ti ti-logout" />
              خروج
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
