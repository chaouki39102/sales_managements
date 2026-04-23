// ════════════════════════════════════════════════
// config/navigation.ts — تهيئة التنقل المركزي
// ════════════════════════════════════════════════

export interface NavItem {
  id:        string;
  label:     string;
  href:      string;
  icon:      string;
  badge?:    number;
  badgeWarn?: boolean;
}

export interface NavGroup {
  label:     string;
  color:     string;        // CSS var
  items:     NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'الرئيسية',
    color: 'var(--em)',
    items: [
      { id:'dashboard', label:'لوحة التحكم', href:'/dashboard',     icon:'ti-layout-dashboard' },
      { id:'pos',       label:'نقطة البيع',  href:'/pos',           icon:'ti-shopping-cart'    },
    ],
  },
  {
    label: 'المبيعات',
    color: 'var(--blue)',
    items: [
      { id:'invoices',   label:'الفواتير',        href:'/invoices',    icon:'ti-file-text',     badge: 3  },
      { id:'orders',     label:'طلبيات الشراء',   href:'/orders',      icon:'ti-clipboard-list'           },
      { id:'returns',    label:'المرتجعات',        href:'/returns',     icon:'ti-corner-up-left'           },
      { id:'quotations', label:'عروض الأسعار',     href:'/quotations',  icon:'ti-file-check'               },
      { id:'bl',         label:'وصل التسليم BL',   href:'/bl',          icon:'ti-truck'                    },
    ],
  },
  {
    label: 'المخزون',
    color: 'var(--purple)',
    items: [
      { id:'products',   label:'المنتجات',       href:'/products',    icon:'ti-package'                       },
      { id:'inventory',  label:'إدارة المخزون',  href:'/inventory',   icon:'ti-building-warehouse', badgeWarn:true },
      { id:'categories', label:'الفئات',          href:'/categories',  icon:'ti-folder-open'                   },
      { id:'brands',     label:'العلامات',        href:'/brands',      icon:'ti-award'                         },
      { id:'units',      label:'الوحدات',         href:'/units',       icon:'ti-ruler'                         },
      { id:'suppliers',  label:'الموردون',        href:'/suppliers',   icon:'ti-truck'                         },
      { id:'warehouses', label:'المستودعات',      href:'/warehouses',  icon:'ti-building-warehouse'            },
    ],
  },
  {
    label: 'المحاسبة والمالية',
    color: 'var(--gold)',
    items: [
      { id:'clients',     label:'العملاء',            href:'/clients',     icon:'ti-users'           },
      { id:'finance',     label:'الخزينة',             href:'/finance',     icon:'ti-building-bank'   },
      { id:'expenses',    label:'المصروفات',           href:'/expenses',    icon:'ti-credit-card'     },
      { id:'debts',       label:'الديون',              href:'/debts',       icon:'ti-receipt'         },
      { id:'tva',         label:'إقرار TVA — G50',    href:'/tva',         icon:'ti-calculator'      },
      { id:'fiscal',      label:'الملف الجبائي',       href:'/fiscal',      icon:'ti-file-barcode'    },
      { id:'fiscalyears', label:'السنوات المالية',     href:'/fiscalyears', icon:'ti-calendar'        },
      { id:'currencies',  label:'العملات',             href:'/currencies',  icon:'ti-currency-dollar' },
      { id:'pricelevels', label:'مستويات الأسعار',     href:'/pricelevels', icon:'ti-tag'             },
    ],
  },
  {
    label: 'التقارير',
    color: 'var(--orange)',
    items: [
      { id:'reports', label:'التقارير والإحصائيات', href:'/reports', icon:'ti-chart-bar' },
      { id:'balance', label:'الميزانية التقديرية',   href:'/balance', icon:'ti-scale'     },
    ],
  },
  {
    label: 'النظام',
    color: 'var(--teal)',
    items: [
      { id:'employees', label:'الموظفون',   href:'/employees', icon:'ti-id-badge' },
      { id:'users',     label:'المستخدمون', href:'/users',     icon:'ti-user'     },
      { id:'settings',  label:'الإعدادات',  href:'/settings',  icon:'ti-settings' },
    ],
  },
];

// ── Flat map for title/breadcrumb lookup ──────────
export const PAGE_META = Object.fromEntries(
  NAV_GROUPS.flatMap(g => g.items.map(item => [
    item.href,
    { title: item.label, path: `${g.label} ← ${item.label}` }
  ]))
);
PAGE_META['/dashboard'] = { title: 'لوحة التحكم', path: 'الرئيسية ← إحصائيات' };
PAGE_META['/pos']       = { title: 'نقطة البيع',  path: 'الرئيسية ← POS'       };


// ════════════════════════════════════════════════
// routes/index.tsx — تعريف الروابط المركزي
// ════════════════════════════════════════════════
import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Lazy load pages for code splitting
const LoginPage     = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
// TODO: add as you build them
// const ProductsPage  = lazy(() => import('@/pages/products/ProductsPage'));
// const POSPage       = lazy(() => import('@/pages/pos/POSPage'));
// const InvoicesPage  = lazy(() => import('@/pages/invoices/InvoicesPage'));

function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg0)' }}>
      <span className="ic ic-xl" style={{ color:'var(--em)' }}>
        <i className="ti ti-loader" style={{ animation:'spin 1s linear infinite' }} />
      </span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Placeholder for unbuilt pages
function ComingSoon() {
  return (
    <div className="page on">
      <div className="empty" style={{ paddingTop: 80 }}>
        <div className="empty-ic"><i className="ti ti-hammer" /></div>
        <div className="empty-tx">هذه الصفحة قيد الإنشاء</div>
        <div className="empty-sub">سيتم إضافتها قريباً</div>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          {/* Add real pages as you build them */}
          <Route path="pos"         element={<ComingSoon />} />
          <Route path="invoices"    element={<ComingSoon />} />
          <Route path="products"    element={<ComingSoon />} />
          <Route path="inventory"   element={<ComingSoon />} />
          <Route path="clients"     element={<ComingSoon />} />
          <Route path="suppliers"   element={<ComingSoon />} />
          <Route path="finance"     element={<ComingSoon />} />
          <Route path="expenses"    element={<ComingSoon />} />
          <Route path="debts"       element={<ComingSoon />} />
          <Route path="tva"         element={<ComingSoon />} />
          <Route path="fiscal"      element={<ComingSoon />} />
          <Route path="fiscalyears" element={<ComingSoon />} />
          <Route path="reports"     element={<ComingSoon />} />
          <Route path="balance"     element={<ComingSoon />} />
          <Route path="users"       element={<ComingSoon />} />
          <Route path="settings"    element={<ComingSoon />} />
          <Route path="employees"   element={<ComingSoon />} />
          <Route path="categories"  element={<ComingSoon />} />
          <Route path="brands"      element={<ComingSoon />} />
          <Route path="units"       element={<ComingSoon />} />
          <Route path="warehouses"  element={<ComingSoon />} />
          <Route path="currencies"  element={<ComingSoon />} />
          <Route path="pricelevels" element={<ComingSoon />} />
          <Route path="orders"      element={<ComingSoon />} />
          <Route path="returns"     element={<ComingSoon />} />
          <Route path="quotations"  element={<ComingSoon />} />
          <Route path="bl"          element={<ComingSoon />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
