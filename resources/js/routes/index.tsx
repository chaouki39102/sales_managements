// routes/index.tsx
import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import AdminActivityPage from "@/pages/admin/AdminActivityPage";

// Admin pages
const AdminLayout         = lazy(() => import("@/components/layouts/AdminLayout"));
const AdminDashboardPage  = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminCompaniesPage  = lazy(() => import("@/pages/admin/AdminCompaniesPage"));
const AdminUsersPage      = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminPlansPage      = lazy(() => import("@/pages/admin/AdminPlansPage"));

// Lazy pages
const LoginPage                = lazy(() => import("@/pages/auth/LoginPage"));
const OnboardingPage           = lazy(() => import("@/pages/onboarding/OnboardingPage"));
const DashboardPage            = lazy(() => import("@/pages/dashboard/DashboardPage"));
const POSPage                  = lazy(() => import("@/pages/pos/POSPage"));
const InvoicesPage             = lazy(() => import("@/pages/invoices/InvoicesPage"));
const ProductsPage             = lazy(() => import("@/pages/products/ProductsPage"));
const InventoryPage            = lazy(() => import("@/pages/inventory/InventoryPage"));
const ClientsPage              = lazy(() => import("@/pages/clients/ClientsPage"));
const SuppliersPage            = lazy(() => import("@/pages/suppliers/SuppliersPage"));
const FinancePage              = lazy(() => import("@/pages/finance/FinancePage"));
const ExpensesPage             = lazy(() => import("@/pages/expenses/ExpensesPage"));
const ReportsPage              = lazy(() => import("@/pages/reports/ReportsPage"));
const SettingsPage             = lazy(() => import("@/pages/settings/SettingsPage"));
const UsersPage                = lazy(() => import("@/pages/users/UsersPage"));
const EmployeesPage            = lazy(() => import("@/pages/users/EmployeesPage"));
const FiscalYearsPage          = lazy(() => import("@/pages/fiscal/FiscalYearsPage"));
const TvaPage                  = lazy(() => import("@/pages/fiscal/TvaPage"));
const DebtsPage                = lazy(() => import("@/pages/debts/DebtsPage"));
const DocumentTypesPage        = lazy(() => import("@/pages/settings/DocumentTypesPage"));
const CommercialDocumentsPage  = lazy(() => import("@/pages/documents/CommercialDocumentsPage"));
const NumberingSeriesPage      = lazy(() => import("@/pages/lookups/NumberingSeriesPage"));
const PaymentMethodsPage       = lazy(() => import("@/pages/settings/PaymentMethodsPage"));
const BrandsPage               = lazy(() => import("@/pages/lookups/BrandsPage"));
const FamiliesPage             = lazy(() => import("@/pages/lookups/FamiliesPage"));
const UnitsPage                = lazy(() => import("@/pages/lookups/UnitsPage"));
const CurrenciesPage           = lazy(() => import("@/pages/lookups/CurrenciesPage"));
const WarehousesPage           = lazy(() => import("@/pages/lookups/WarehousesPage"));
const PriceLevelsPage          = lazy(() => import("@/pages/lookups/PriceLevelsPage"));
const TvasPage                 = lazy(() => import("@/pages/lookups/TvasPage"));
const ExpenseCategoriesPage    = lazy(() => import("@/pages/lookups/ExpenseCategoriesPage"));
const RolesPage                = lazy(() => import("@/pages/users/RolesPage"));

// Loader
function PageLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg0)" }}>
      <i className="ti ti-loader" style={{ fontSize: 28, color: "var(--em)", animation: "spin 1s linear infinite" }} />
    </div>
  );
}

// Coming Soon fallback
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

// ═════════════════════════════════════════════════════
// 1. OnboardingRoute – العقل المدبّر للتوجيه بعد الدخول
// ═════════════════════════════════════════════════════
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, activeCompany, user } = useAuth();

  const isSuperAdmin =
    (user as any)?.roles?.some((r: any) => r.name === 'super-admin') ?? false;

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Super Admin → لوحة الإدارة فوراً
  if (isSuperAdmin) return <Navigate to="/admin" replace />;

  // مستخدم عادي لديه شركة نشطة → لوحة التحكم
  if (activeCompany?.slug) return <Navigate to="/dashboard" replace />;

  // غير ذلك → أظهر واجهة الاختيار (Onboarding)
  return <>{children}</>;
}

// ═════════════════════════════════════════════════════
// 2. AppRoute – يضمن وجود شركة نشطة (لغير السوبر أدمن)
// ═════════════════════════════════════════════════════
function AppRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, activeCompany, user } = useAuth();

  const isSuperAdmin = (user as any)?.roles?.some((r: any) => r.name === 'super-admin') ?? false;

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Super Admin يمكنه المرور بدون شركة نشطة
  if (isSuperAdmin && !activeCompany?.slug) return <>{children}</>;

  // مستخدم عادي بدون شركة → Onboarding
  if (!activeCompany?.slug) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

// ═════════════════════════════════════════════════════
// 3. AdminRoute – يحمي لوحة الإدارة للمشرف العام فقط
// ═════════════════════════════════════════════════════
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isSuperAdmin = (user as any)?.roles?.some((r: any) => r.name === 'super-admin') ?? false;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

// ═════════════════════════════════════════════════════
// 4. التوجيهات الرئيسية
// ═════════════════════════════════════════════════════
export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Onboarding – يحوي التوجيه الذكي */}
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute>
              <OnboardingPage />
            </OnboardingRoute>
          }
        />

        {/* لوحة الإدارة للمشرف العام */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="companies" element={<AdminCompaniesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="activity" element={<ComingSoon />} />
          <Route path="activity" element={<AdminActivityPage />} />

        </Route>

        {/* التطبيق الرئيسي (يتطلب شركة نشطة) */}
        <Route
          element={
            <AppRoute>
              <DashboardLayout />
            </AppRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="documents/:typeCode" element={<CommercialDocumentsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="debts" element={<DebtsPage />} />
          <Route path="tva" element={<TvaPage />} />
          <Route path="fiscal" element={<ComingSoon />} />
          <Route path="fiscalyears" element={<FiscalYearsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="balance" element={<ComingSoon />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/document-types" element={<DocumentTypesPage />} />
          <Route path="categories" element={<FamiliesPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="currencies" element={<CurrenciesPage />} />
          <Route path="pricelevels" element={<PriceLevelsPage />} />
          <Route path="tvas" element={<TvasPage />} />
          <Route path="payment-methods" element={<PaymentMethodsPage />} />
          <Route path="numbering-series" element={<NumberingSeriesPage />} />
          <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
