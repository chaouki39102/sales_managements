// components/layouts/DashboardLayout.tsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم',  href: '/dashboard',            icon: 'ti-layout-dashboard' },
      { name: 'نقطة البيع',   href: '/pos',                  icon: 'ti-shopping-cart'    },
    ],
  },
  {
    label: 'المبيعات',
    items: [
      { name: 'الفواتير',         href: '/dashboard/invoices',    icon: 'ti-file-text',        badge: 3    },
      { name: 'طلبيات الشراء',    href: '/dashboard/orders',      icon: 'ti-clipboard-list'              },
      { name: 'المرتجعات',        href: '/dashboard/returns',     icon: 'ti-corner-up-left'              },
      { name: 'عروض الأسعار',     href: '/dashboard/quotations',  icon: 'ti-file-check'                  },
      { name: 'وصل التسليم BL',   href: '/dashboard/bl',          icon: 'ti-truck'                       },
    ],
  },
  {
    label: 'المخزون',
    items: [
      { name: 'المنتجات',       href: '/dashboard/products',   icon: 'ti-package'                },
      { name: 'إدارة المخزون',  href: '/dashboard/inventory',  icon: 'ti-building-warehouse', badgeWarn: true },
      { name: 'الفئات',         href: '/dashboard/categories', icon: 'ti-folder-open'            },
      { name: 'الموردون',       href: '/dashboard/suppliers',  icon: 'ti-truck'                  },
    ],
  },
  {
    label: 'المحاسبة والمالية',
    items: [
      { name: 'العملاء',           href: '/dashboard/clients',     icon: 'ti-users'          },
      { name: 'الخزينة',           href: '/dashboard/finance',     icon: 'ti-building-bank'  },
      { name: 'المصروفات',         href: '/dashboard/expenses',    icon: 'ti-credit-card'    },
      { name: 'الديون',            href: '/dashboard/debts',       icon: 'ti-receipt'        },
      { name: 'إقرار TVA — G50',  href: '/dashboard/tva',         icon: 'ti-calculator'     },
      { name: 'الملف الجبائي',     href: '/dashboard/fiscal',      icon: 'ti-file-barcode'   },
      { name: 'السنوات المالية',   href: '/dashboard/fiscalyears', icon: 'ti-calendar'       },
      { name: 'العملات',           href: '/dashboard/currencies',  icon: 'ti-currency-dollar'},
      { name: 'مستويات الأسعار',   href: '/dashboard/pricelevels', icon: 'ti-tag'            },
    ],
  },
  {
    label: 'التقارير',
    items: [
      { name: 'التقارير والإحصائيات', href: '/dashboard/reports', icon: 'ti-chart-bar'  },
      { name: 'الميزانية التقديرية',   href: '/dashboard/balance', icon: 'ti-scale'      },
    ],
  },
  {
    label: 'النظام',
    items: [
      { name: 'الموظفون',    href: '/dashboard/employees', icon: 'ti-id-badge'  },
      { name: 'المستخدمون',  href: '/dashboard/users',     icon: 'ti-user'      },
      { name: 'الإعدادات',   href: '/dashboard/settings',  icon: 'ti-settings'  },
    ],
  },
];

// Label colors matching prototype's nth-child rules
const LABEL_COLORS = [
  'var(--em)',
  'var(--blue)',
  'var(--purple)',
  'var(--gold)',
  'var(--orange)',
  'var(--red)',
];

// Page title + breadcrumb map
const PAGE_META: Record<string, { title: string; path: string }> = {
  '/dashboard':             { title: 'لوحة التحكم',          path: 'الرئيسية ← إحصائيات'       },
  '/pos':                   { title: 'نقطة البيع',            path: 'الرئيسية ← POS'             },
  '/dashboard/invoices':    { title: 'الفواتير',              path: 'مبيعات ← فواتير'            },
  '/dashboard/orders':      { title: 'طلبيات الشراء',         path: 'مبيعات ← طلبيات'           },
  '/dashboard/returns':     { title: 'المرتجعات',             path: 'مبيعات ← مرتجعات'          },
  '/dashboard/quotations':  { title: 'عروض الأسعار',          path: 'مبيعات ← عروض أسعار'       },
  '/dashboard/bl':          { title: 'وصل التسليم BL',        path: 'مبيعات ← وصل تسليم'        },
  '/dashboard/products':    { title: 'المنتجات',              path: 'مخزون ← منتجات'            },
  '/dashboard/inventory':   { title: 'إدارة المخزون',         path: 'مخزون ← جرد'               },
  '/dashboard/categories':  { title: 'الفئات',               path: 'مخزون ← فئات'              },
  '/dashboard/suppliers':   { title: 'الموردون',              path: 'مخزون ← موردون'            },
  '/dashboard/clients':     { title: 'العملاء',               path: 'محاسبة ← عملاء'            },
  '/dashboard/finance':     { title: 'الخزينة',               path: 'محاسبة ← خزينة'            },
  '/dashboard/expenses':    { title: 'المصروفات',             path: 'محاسبة ← مصروفات'          },
  '/dashboard/debts':       { title: 'الديون',                path: 'محاسبة ← ديون'             },
  '/dashboard/tva':         { title: 'إقرار TVA — G50',       path: 'محاسبة ← TVA'              },
  '/dashboard/fiscal':      { title: 'الملف الجبائي',         path: 'محاسبة ← جبايات'           },
  '/dashboard/fiscalyears': { title: 'السنوات المالية',        path: 'محاسبة ← سنوات مالية'      },
  '/dashboard/currencies':  { title: 'العملات',               path: 'محاسبة ← عملات'            },
  '/dashboard/pricelevels': { title: 'مستويات الأسعار',       path: 'محاسبة ← مستويات أسعار'    },
  '/dashboard/employees':   { title: 'الموظفون',              path: 'موارد بشرية ← موظفون'       },
  '/dashboard/reports':     { title: 'التقارير',              path: 'تقارير'                     },
  '/dashboard/balance':     { title: 'الميزانية التقديرية',   path: 'تقارير ← ميزانية'          },
  '/dashboard/users':       { title: 'المستخدمون',            path: 'نظام ← مستخدمون'           },
  '/dashboard/settings':    { title: 'الإعدادات',             path: 'نظام ← إعدادات'            },
};

export default function DashboardLayout() {
  const { user, logout }     = useAuth();
  const location             = useLocation();
  const navigate             = useNavigate();
  const { dark, toggle: toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen]   = useState(false);

  const meta = PAGE_META[location.pathname] ?? { title: 'لوحة التحكم', path: 'الرئيسية' };

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Get first letter of user name for avatar
  const userInitial = user?.name ? user.name[0] : 'م';

  return (
    <>
      {/* ════════════ DESKTOP SIDEBAR ════════════ */}
      <nav id="sidebar">

        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-mark">ب</div>
          <div>
            <div className="sb-name">نظام المبيعات</div>
            <div className="sb-sub">إدارة متكاملة • الجزائر</div>
          </div>
        </div>

        {/* Company badge */}
        <div className="sb-co">
          <div className="sb-co-name">مؤسسة النور للتجارة</div>
          <div className="sb-co-info">NIF: 001234567890123 • ورقلة</div>
        </div>

        {/* Nav sections */}
        {NAV_GROUPS.map((group, idx) => (
          <div className="sb-sec" key={group.label}>
            <div className="sb-lbl" style={{ color: LABEL_COLORS[idx] }}>
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`sbi ${isActive ? 'on' : ''}`}
                >
                  <span className="sbi-ic ic">
                    <i className={`ti ${item.icon}`} />
                  </span>
                  {item.name}
                  {'badge' in item && item.badge && (
                    <span className="sbi-badge">{item.badge}</span>
                  )}
                  {'badgeWarn' in item && item.badgeWarn && (
                    <span className="sbi-badge w ic-badge">
                      <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* User footer */}
        <div className="sb-foot">
          <div className="sb-user" onClick={logout} title="تسجيل الخروج">
            <div className="sb-av">{userInitial}</div>
            <div>
              <div className="sb-uname">{user?.name || 'محمد أمين بودن'}</div>
              <div className="sb-urole">{user?.role || 'مدير النظام'}</div>
            </div>
            <div className="sb-dot" title="متصل" />
          </div>
        </div>
      </nav>

      {/* ════════════ MAIN ════════════ */}
      <main id="main">

        {/* Topbar */}
        <div id="topbar">
          <div className="tb-info">
            <div className="tb-title">{meta.title}</div>
            <div className="tb-path">{meta.path}</div>
          </div>
          <div className="tb-actions">
            <div className="srch">
              <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
              <input type="text" placeholder="بحث سريع... Ctrl+K" id="gsearch" />
            </div>
            <div className="ib" title="الإشعارات">
              <span className="ic ic-sm"><i className="ti ti-bell" /></span>
              <div className="ib-n">5</div>
            </div>
            <button
              id="theme-btn"
              onClick={toggleTheme}
              title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              <span className="ic ic-sm">
                <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
              </span>
            </button>
            <button className="tb-btn p" onClick={() => navigate('/pos')}>
              <span className="ic ic-xs"><i className="ti ti-plus" /></span>
              <span className="tb-txt">فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </main>

      {/* ════════════ MOBILE BOTTOM NAV ════════════ */}
      <div id="mob-nav">
        <div className="mob-tabs">
          <Link
            to="/dashboard"
            className={`mt ${location.pathname === '/dashboard' ? 'on' : ''}`}
          >
            <div className="mt-ic-wrap">
              <span className="ic mt-ic"><i className="ti ti-home" /></span>
            </div>
            <div className="mt-lbl">الرئيسية</div>
          </Link>

          <Link
            to="/dashboard/invoices"
            className={`mt ${location.pathname === '/dashboard/invoices' ? 'on' : ''}`}
          >
            <div className="mt-ic-wrap">
              <span className="ic mt-ic"><i className="ti ti-file-text" /></span>
            </div>
            <div className="mt-lbl">فواتير</div>
            <div className="mt-n">3</div>
          </Link>

          {/* FAB — POS */}
          <div className="mt-fab" onClick={() => navigate('/pos')}>
            <div className="fab-btn">
              <span className="ic"><i className="ti ti-shopping-cart" /></span>
            </div>
            <div className="mt-lbl" style={{ fontSize: 9, marginTop: 2 }}>بيع</div>
          </div>

          <Link
            to="/dashboard/inventory"
            className={`mt ${location.pathname === '/dashboard/inventory' ? 'on' : ''}`}
          >
            <div className="mt-ic-wrap">
              <span className="ic mt-ic"><i className="ti ti-package" /></span>
            </div>
            <div className="mt-lbl">مخزون</div>
          </Link>

          <div className="mt" onClick={() => setDrawerOpen(true)}>
            <div className="mt-ic-wrap">
              <span className="ic mt-ic"><i className="ti ti-dots" /></span>
            </div>
            <div className="mt-lbl">المزيد</div>
          </div>
        </div>
      </div>

      {/* ════════════ MOBILE DRAWER ════════════ */}
      <div
        id="mob-drawer"
        className={drawerOpen ? 'on' : ''}
        onClick={() => setDrawerOpen(false)}
      >
        <div className="mdb-bg" />
        <div className="mdb-panel" onClick={(e) => e.stopPropagation()}>
          <div className="mdb-handle" />
          <div className="mdb-title">التنقل السريع</div>
          <div className="mdb-grid">
            {[
              { href:'/pos',                  icon:'ti-shopping-cart',  label:'بيع'     },
              { href:'/dashboard/inventory',  icon:'ti-package',        label:'مخزون'   },
              { href:'/dashboard/finance',    icon:'ti-building-bank',  label:'خزينة'   },
              { href:'/dashboard/clients',    icon:'ti-users',          label:'عملاء'   },
              { href:'/dashboard/invoices',   icon:'ti-file-text',      label:'فواتير'  },
              { href:'/dashboard/expenses',   icon:'ti-credit-card',    label:'مصاريف'  },
              { href:'/dashboard/products',   icon:'ti-list',           label:'منتجات'  },
              { href:'/dashboard/reports',    icon:'ti-chart-bar',      label:'تقارير'  },
            ].map(({ href, icon, label }) => (
              <div
                key={href}
                className="mdb-item"
                onClick={() => { navigate(href); setDrawerOpen(false); }}
              >
                <div className="mdb-ic">
                  <span className="ic"><i className={`ti ${icon}`} /></span>
                </div>
                <div className="mdb-lbl">{label}</div>
              </div>
            ))}
          </div>
          <div className="mdb-title" style={{ marginTop: 8 }}>الحساب</div>
          <div className="mdb-row" onClick={() => { logout(); setDrawerOpen(false); }}>
            <span className="ic ic-sm"><i className="ti ti-logout" /></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>تسجيل الخروج</span>
          </div>
        </div>
      </div>
    </>
  );
}
