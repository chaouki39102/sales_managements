// ════════════════════════════════════════════════
// resources/js/components/layouts/DashboardLayout.tsx
// ════════════════════════════════════════════════
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FiscalYearSelector } from '@/context/FiscalYearContext';
import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

// ملاحظة مهمة: جميع الـ href هنا بدون /dashboard/ prefix
// لأن الـ routes معرّفة في routes/index.tsx كـ nested routes تحت "/"
const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', href: '/dashboard', icon: 'ti-layout-dashboard' },
      { name: 'نقطة البيع',  href: '/pos',        icon: 'ti-shopping-cart'   },
    ],
  },
  {
    label: 'المبيعات',
    items: [
      { name: 'عروض الأسعار',         href: '/documents/DEV', icon: 'ti-file-check'          },
      { name: 'طلبيات العملاء',        href: '/documents/BCC', icon: 'ti-clipboard-list'      },
      { name: 'وصل التسليم BL',        href: '/documents/BL',  icon: 'ti-truck'               },
      { name: 'فواتير البيع',          href: '/documents/FV',  icon: 'ti-file-invoice', badge: 3 },
      { name: 'مرتجعات البيع',         href: '/documents/AV',  icon: 'ti-corner-up-left'      },
    ],
  },
  {
    label: 'المشتريات',
    items: [
      { name: 'طلبات عروض الأسعار',   href: '/documents/DDP', icon: 'ti-file-search'        },
      { name: 'أوامر الشراء للموردين',  href: '/documents/BCF', icon: 'ti-clipboard-check'    },
      { name: 'وصل الاستلام',           href: '/documents/BR',  icon: 'ti-package-import'     },
      { name: 'فواتير الشراء',          href: '/documents/FA',  icon: 'ti-file-invoice'       },
      { name: 'مرتجعات الشراء',         href: '/documents/AA',  icon: 'ti-corner-up-left-double' },
    ],
  },
  {
    label: 'المخزون',
    items: [
      { name: 'المنتجات',       href: '/products',   icon: 'ti-package'                       },
      { name: 'إدارة المخزون',  href: '/inventory',  icon: 'ti-building-warehouse', badgeWarn: true },
      { name: 'الفئات',         href: '/categories', icon: 'ti-folder-open'                   },
      { name: 'العلامات',       href: '/brands',     icon: 'ti-award'                         },
      { name: 'الوحدات',        href: '/units',      icon: 'ti-ruler'                         },
      { name: 'الموردون',       href: '/suppliers',  icon: 'ti-truck'                         },
      { name: 'المستودعات',     href: '/warehouses', icon: 'ti-building-warehouse'             },
    ],
  },
  {
    label: 'المحاسبة والمالية',
    items: [
      { name: 'العملاء',           href: '/clients',     icon: 'ti-users'           },
      { name: 'الخزينة',           href: '/finance',     icon: 'ti-building-bank'   },
      { name: 'المصروفات',         href: '/expenses',    icon: 'ti-credit-card'     },
      { name: 'الديون',            href: '/debts',       icon: 'ti-receipt'         },
      { name: 'إقرار TVA — G50',  href: '/tva',         icon: 'ti-calculator'      },
      { name: 'الملف الجبائي',     href: '/fiscal',      icon: 'ti-file-barcode'    },
      { name: 'السنوات المالية',   href: '/fiscalyears', icon: 'ti-calendar'        },
      { name: 'العملات',           href: '/currencies',  icon: 'ti-currency-dollar' },
      { name: 'مستويات الأسعار',   href: '/pricelevels', icon: 'ti-tag'             },
    ],
  },
  {
    label: 'التقارير',
    items: [
      { name: 'التقارير والإحصائيات', href: '/reports', icon: 'ti-chart-bar' },
      { name: 'الميزانية التقديرية',   href: '/balance', icon: 'ti-scale'     },
    ],
  },
  {
    label: 'النظام',
    items: [
      { name: 'الموظفون',   href: '/employees', icon: 'ti-id-badge' },
      { name: 'المستخدمون', href: '/users',     icon: 'ti-user'     },
      { name: 'الإعدادات',  href: '/settings',  icon: 'ti-settings' },
      { name: 'أنواع المستندات', href: '/settings/document-types', icon: 'ti-file' },
      { name: 'سلاسل الترقيم',  href: '/numbering-series', icon: 'ti-list-numbers' },
      { name: 'طرق الدفع',  href: '/payment-methods', icon: 'ti-credit-card' },
      { name: 'فئات المصروفات', href: '/expense-categories', icon: 'ti-category' },

    ],
  },
];

const LABEL_COLORS = [
  'var(--em)',
  'var(--blue)',
  'var(--purple)',
  'var(--gold)',
  'var(--orange)',
  'var(--teal)',
];

// PAGE_META يطابق الـ hrefs الجديدة
const PAGE_META: Record<string, { title: string; path: string }> = {
  '/dashboard':   { title: 'لوحة التحكم',          path: 'الرئيسية ← إحصائيات'     },
  '/pos':         { title: 'نقطة البيع',            path: 'الرئيسية ← POS'           },
  // مبيعات
  '/documents/DEV':  { title: 'عروض الأسعار',         path: 'مبيعات ← عروض أسعار'     },
  '/documents/BCC':  { title: 'طلبيات العملاء',       path: 'مبيعات ← طلبيات العملاء'  },
  '/documents/BL':   { title: 'وصل التسليم BL',       path: 'مبيعات ← وصل تسليم'      },
  '/documents/FV':   { title: 'فواتير البيع',         path: 'مبيعات ← فواتير البيع'    },
  '/documents/AV':   { title: 'مرتجعات البيع',        path: 'مبيعات ← مرتجعات البيع'   },
  // مشتريات
  '/documents/DDP':  { title: 'طلبات عروض الأسعار',   path: 'مشتريات ← طلبات عروض'    },
  '/documents/BCF':  { title: 'أوامر الشراء',         path: 'مشتريات ← أوامر شراء'    },
  '/documents/BR':   { title: 'وصل الاستلام',         path: 'مشتريات ← وصل استلام'    },
  '/documents/FA':   { title: 'فواتير الشراء',        path: 'مشتريات ← فواتير شراء'   },
  '/documents/AA':   { title: 'مرتجعات الشراء',       path: 'مشتريات ← مرتجعات شراء'  },
  // مخزون
  '/products':    { title: 'المنتجات',              path: 'مخزون ← منتجات'          },
  '/inventory':   { title: 'إدارة المخزون',         path: 'مخزون ← جرد'             },
  '/categories':  { title: 'الفئات',               path: 'مخزون ← فئات'            },
  '/brands':      { title: 'العلامات التجارية',     path: 'مخزون ← علامات'          },
  '/units':       { title: 'وحدات القياس',          path: 'مخزون ← وحدات'           },
  '/suppliers':   { title: 'الموردون',              path: 'مخزون ← موردون'          },
  '/warehouses':  { title: 'المستودعات',            path: 'مخزون ← مستودعات'        },
  // محاسبة
  '/clients':     { title: 'العملاء',               path: 'محاسبة ← عملاء'          },
  '/finance':     { title: 'الخزينة',               path: 'محاسبة ← خزينة'          },
  '/expenses':    { title: 'المصروفات',             path: 'محاسبة ← مصروفات'        },
  '/debts':       { title: 'الديون',                path: 'محاسبة ← ديون'           },
  '/tva':         { title: 'إقرار TVA — G50',       path: 'محاسبة ← TVA'            },
  '/fiscal':      { title: 'الملف الجبائي',         path: 'محاسبة ← جبايات'         },
  '/fiscalyears': { title: 'السنوات المالية',       path: 'محاسبة ← سنوات مالية'    },
  '/currencies':  { title: 'العملات',               path: 'محاسبة ← عملات'          },
  '/pricelevels': { title: 'مستويات الأسعار',       path: 'محاسبة ← مستويات أسعار'  },
  '/tva-rates':   { title: 'معدلات TVA',            path: 'محاسبة ← TVA'            },
  // نظام
  '/employees':   { title: 'الموظفون',              path: 'موارد بشرية ← موظفون'     },
  '/reports':     { title: 'التقارير',              path: 'تقارير'                   },
  '/balance':     { title: 'الميزانية التقديرية',   path: 'تقارير ← ميزانية'        },
  '/users':       { title: 'المستخدمون',            path: 'نظام ← مستخدمون'         },
  '/settings':    { title: 'الإعدادات',             path: 'نظام ← إعدادات'          },
  '/settings/document-types': { title: 'أنواع المستندات', path: 'نظام ← أنواع المستندات' },
  '/numbering-series': { title: 'سلاسل الترقيم', path: 'نظام ← سلاسل الترقيم' },
  '/payment-methods': { title: 'طرق الدفع', path: 'نظام ← طرق الدفع' },
  '/expense-categories': { title: 'فئات المصروفات', path: 'نظام ← فئات المصروفات' },
};

export default function DashboardLayout() {
  const { user, logout }               = useAuth();
  const location                       = useLocation();
  const navigate                       = useNavigate();
  const { dark, toggle: toggleTheme }  = useTheme();
  const [drawerOpen, setDrawerOpen]    = useState(false);

  const meta = PAGE_META[location.pathname] ?? { title: 'لوحة التحكم', path: 'الرئيسية' };
  const userInitial = user?.name ? user.name[0] : 'م';

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <>
      {/* ════════════ SIDEBAR ════════════ */}
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

        {/* Nav */}
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
                  className={`sbi${isActive ? ' on' : ''}`}
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
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      </svg>
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
              <div className="sb-uname">{user?.name || 'المستخدم'}</div>
              <div className="sb-urole">{(user as any)?.role || 'مدير النظام'}</div>
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
            <FiscalYearSelector />
            <div className="srch">
              <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
              <input type="text" placeholder="بحث سريع..." />
            </div>
            <div className="ib" title="الإشعارات">
              <span className="ic ic-sm"><i className="ti ti-bell" /></span>
              <div className="ib-n">5</div>
            </div>
            <button
              className="ib"
              onClick={toggleTheme}
              title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              <span className="ic ic-sm">
                <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
              </span>
            </button>
            <button className="tb-btn p" onClick={() => navigate('/pos')}>
              <span className="ic ic-xs"><i className="ti ti-plus" /></span>
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </main>

      {/* ════════════ MOBILE NAV ════════════ */}
      <div id="mob-nav">
        <div className="mob-tabs">
          <Link to="/dashboard" className={`mt${location.pathname === '/dashboard' ? ' on' : ''}`}>
            <div className="mt-ic-wrap">
              <span className="ic mt-ic"><i className="ti ti-home" /></span>
            </div>
            <div className="mt-lbl">الرئيسية</div>
          </Link>
          <Link to="/documents/FV" className={`mt${location.pathname === '/documents/FV' ? ' on' : ''}`}>
            <div className="mt-ic-wrap">
              <span className="ic mt-ic"><i className="ti ti-file-text" /></span>
            </div>
            <div className="mt-lbl">فواتير</div>
            <div className="mt-n">3</div>
          </Link>
          <div className="mt-fab" onClick={() => navigate('/pos')}>
            <div className="fab-btn">
              <span className="ic"><i className="ti ti-shopping-cart" /></span>
            </div>
            <div className="mt-lbl" style={{ fontSize: 9, marginTop: 2 }}>بيع</div>
          </div>
          <Link to="/inventory" className={`mt${location.pathname === '/inventory' ? ' on' : ''}`}>
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
              { href: '/pos',        icon: 'ti-shopping-cart', label: 'بيع'    },
              { href: '/inventory',  icon: 'ti-package',       label: 'مخزون'  },
              { href: '/finance',    icon: 'ti-building-bank', label: 'خزينة'  },
              { href: '/clients',    icon: 'ti-users',         label: 'عملاء'  },
              { href: '/documents/FV', icon: 'ti-file-text',   label: 'فواتير' },
              { href: '/expenses',   icon: 'ti-credit-card',   label: 'مصاريف' },
              { href: '/products',   icon: 'ti-list',          label: 'منتجات' },
              { href: '/reports',    icon: 'ti-chart-bar',     label: 'تقارير' },
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
