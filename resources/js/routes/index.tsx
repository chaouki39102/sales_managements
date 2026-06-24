// ════════════════════════════════════════════════════════════════════════════
// routes/index.tsx — Routing الكامل للنظام
// ════════════════════════════════════════════════════════════════════════════
import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useActiveCompany } from '@/lib/store/appStore';

// ── Layouts ────────────────────────────────────────────────────────────────
const DashboardLayout = lazy(() => import('@/components/layouts/DashboardLayout'));
const AdminLayout     = lazy(() => import('@/components/layouts/AdminLayout'));

// ── Auth & Onboarding ──────────────────────────────────────────────────────
const LoginPage      = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage   = lazy(() => import('@/pages/auth/RegisterPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));

// ── Dashboard ──────────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));

// ── Documents / POS ────────────────────────────────────────────────────────
const CommercialDocumentsPage = lazy(() => import('@/pages/documents/CommercialDocumentsPage'));
const InvoicesPage            = lazy(() => import('@/pages/invoices/InvoicesPage'));
const POSPage                 = lazy(() => import('@/pages/pos/POSPage'));
const POSKioskPage            = lazy(() => import('@/pages/pos/POSKioskPage'));const PosSessionsPage         = lazy(() => import('@/pages/pos/PosSessionsPage'));

// ── Products / Inventory ───────────────────────────────────────────────────
const ProductsPage   = lazy(() => import('@/pages/products/ProductsPage'));
const InventoryPage  = lazy(() => import('@/pages/inventory/InventoryPage'));

// ── Parties ────────────────────────────────────────────────────────────────
const ClientsPage   = lazy(() => import('@/pages/clients/ClientsPage'));
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage'));

// ── Finance ────────────────────────────────────────────────────────────────
const FinancePage  = lazy(() => import('@/pages/finance/FinancePage'));
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage'));
const DebtsPage    = lazy(() => import('@/pages/debts/DebtsPage'));
const TvaPage      = lazy(() => import('@/pages/fiscal/TvaPage'));
const ChecksPage   = lazy(() => import('@/pages/checks/ChecksPage'));

// ── Fiscal / Reports ───────────────────────────────────────────────────────
const FiscalYearsPage = lazy(() => import('@/pages/fiscal/FiscalYearsPage'));
const ReportsPage     = lazy(() => import('@/pages/reports/ReportsPage'));

// ── Users / Roles / Employees ─────────────────────────────────────────────
const UsersPage     = lazy(() => import('@/pages/users/UsersPage'));
const RolesPage     = lazy(() => import('@/pages/users/RolesPage'));
const EmployeesPage = lazy(() => import('@/pages/users/EmployeesPage'));
const ProfilePage   = lazy(() => import('@/pages/profile/ProfilePage'));

// ── Settings ───────────────────────────────────────────────────────────────
const SettingsPage      = lazy(() => import('@/pages/settings/SettingsPage'));
const DocumentTypesPage = lazy(() => import('@/pages/settings/DocumentTypesPage'));

// ── Tenant Lookups ─────────────────────────────────────────────────────────
const FamiliesPage          = lazy(() => import('@/pages/lookups/FamiliesPage'));
const BrandsPage            = lazy(() => import('@/pages/lookups/BrandsPage'));
const UnitsPage             = lazy(() => import('@/pages/lookups/UnitsPage'));
const WarehousesPage        = lazy(() => import('@/pages/lookups/WarehousesPage'));
const PriceLevelsPage       = lazy(() => import('@/pages/lookups/PriceLevelsPage'));
const NumberingSeriesPage   = lazy(() => import('@/pages/lookups/NumberingSeriesPage'));
const ExpenseCategoriesPage = lazy(() => import('@/pages/lookups/ExpenseCategoriesPage'));

// ── Global Lookups ─────────────────────────────────────────────────────────
const CurrenciesPage = lazy(() => import('@/pages/lookups/CurrenciesPage'));
const TvasPage       = lazy(() => import('@/pages/lookups/TvasPage'));

// ── Admin Panel ────────────────────────────────────────────────────────────
const AdminBootPage      = lazy(() => import('@/pages/admin/AdminBootPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminCompaniesPage = lazy(() => import('@/pages/admin/AdminCompaniesPage'));
const AdminUsersPage     = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminActivityPage  = lazy(() => import('@/pages/admin/AdminActivityPage'));
const AdminSettingsPage  = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminPlansPage     = lazy(() => import('@/pages/admin/AdminPlansPage'));
const AdminReportsPage   = lazy(() => import('@/pages/admin/AdminReportsPage'));

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg0)',
    }}>
      <span className="ic ic-xl" style={{ color: 'var(--em)' }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────────────

/** يتطلب تسجيل دخول فقط */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** تسجيل دخول + لا شركة نشطة + ليس super-admin */
function RequireNoCompany({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const activeCompany = useActiveCompany();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // السوبر أدمن لا يمر من هنا أبداً — له داشبورده الخاص
  if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (activeCompany?.slug) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** تسجيل دخول + شركة نشطة (مستخدم عادي فقط) */
function RequireCompany({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const activeCompany = useActiveCompany();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // السوبر أدمن له مساره الخاص
  if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (!activeCompany?.slug) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** Super Admin فقط — يتحقق من Auth أولاً */
function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AppRoutes
// ─────────────────────────────────────────────────────────────────────────────
export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ① Auth */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ② Onboarding */}
        <Route
          path="/onboarding"
          element={
            <RequireNoCompany>
              <OnboardingPage />
            </RequireNoCompany>
          }
        />

        {/* ③ Admin Boot — إعداد النظام (يصل إليه السوبر أدمن يدوياً عند الحاجة) */}
        <Route
          path="/admin/boot"
          element={
            <RequireSuperAdmin>
              <Suspense fallback={<PageLoader />}>
                <AdminBootPage />
              </Suspense>
            </RequireSuperAdmin>
          }
        />

        {/* ④ App — يتطلب شركة نشطة */}
        <Route
          element={
            <RequireCompany>
              <Suspense fallback={<PageLoader />}>
                <DashboardLayout />
              </Suspense>
            </RequireCompany>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />

          {/* POS */}
          <Route path="pos"         element={<POSPage />} />
          <Route path="pos/kiosk"   element={<POSKioskPage />} />
          <Route path="pos/sessions" element={<PosSessionsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />

          {/* Documents */}
          <Route path="documents/:typeCode" element={<CommercialDocumentsPage />} />

          {/* Products */}
          <Route path="products"  element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />

          {/* Parties */}
          <Route path="clients"   element={<ClientsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />

          {/* Finance */}
          <Route path="finance"  element={<FinancePage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="debts"    element={<DebtsPage />} />
          <Route path="tva"      element={<TvaPage />} />
          <Route path="checks"  element={<ChecksPage />} />

          {/* Fiscal */}
          <Route path="fiscalyears" element={<FiscalYearsPage />} />

          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />

          {/* HR */}
          <Route path="employees" element={<EmployeesPage />} />

          {/* Users */}
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />

          {/* Settings */}
          <Route path="settings"                element={<SettingsPage />} />
          <Route path="settings/document-types" element={<DocumentTypesPage />} />
          <Route path="profile" element={<ProfilePage />} />



          {/* Tenant Lookups */}
          <Route path="categories"        element={<FamiliesPage />} />
          <Route path="brands"            element={<BrandsPage />} />
          <Route path="units"             element={<UnitsPage />} />
          <Route path="warehouses"        element={<WarehousesPage />} />
          <Route path="pricelevels"       element={<PriceLevelsPage />} />
          <Route path="numbering-series"  element={<NumberingSeriesPage />} />
          <Route path="expense-categories" element={<ExpenseCategoriesPage />} />

          {/* Global Lookups */}
          <Route path="currencies" element={<CurrenciesPage />} />
          <Route path="tvas"       element={<TvasPage />} />
        </Route>

        {/* ⑤ Admin Panel */}
        <Route
          path="/admin"
          element={
            <RequireSuperAdmin>
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            </RequireSuperAdmin>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="companies" element={<AdminCompaniesPage />} />
          <Route path="users"     element={<AdminUsersPage />} />
          <Route path="activity"  element={<AdminActivityPage />} />
          <Route path="settings"  element={<AdminSettingsPage />} />
                    <Route path="plans"     element={<AdminPlansPage />} />
                    <Route path="reports"   element={<AdminReportsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </Suspense>
  );
}
