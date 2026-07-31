// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// routes/index.tsx â€” Routing ط§ظ„ظƒط§ظ…ظ„ ظ„ظ„ظ†ط¸ط§ظ…
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useActiveCompany } from '@/lib/store/appStore';

// â”€â”€ Layouts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DashboardLayout = lazy(() => import('@/components/layouts/DashboardLayout'));
const AdminLayout     = lazy(() => import('@/components/layouts/AdminLayout'));

// â”€â”€ Auth & Onboarding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LoginPage      = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage   = lazy(() => import('@/pages/auth/RegisterPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));

// â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));

// â”€â”€ Documents / POS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CommercialDocumentsPage = lazy(() => import('@/pages/documents/CommercialDocumentsPage'));
const CommercialDocumentPage  = lazy(() => import('@/pages/documents/CommercialDocumentPage'));
const InvoicesPage            = lazy(() => import('@/pages/invoices/InvoicesPage'));
const POSPage                 = lazy(() => import('@/pages/pos/POSPage'));
const POSKioskPage            = lazy(() => import('@/pages/pos/POSKioskPage'));const PosSessionsPage         = lazy(() => import('@/pages/pos/PosSessionsPage'));

// â”€â”€ Products / Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ProductsPage   = lazy(() => import('@/pages/products/ProductsPage'));
const InventoryPage  = lazy(() => import('@/pages/inventory/InventoryPage'));

// â”€â”€ Parties â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ClientsPage   = lazy(() => import('@/pages/clients/ClientsPage'));
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage'));

// â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FinancePage  = lazy(() => import('@/pages/finance/FinancePage'));
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage'));
const DebtsPage    = lazy(() => import('@/pages/debts/DebtsPage'));
const TvaPage      = lazy(() => import('@/pages/fiscal/TvaPage'));
const ChecksPage   = lazy(() => import('@/pages/checks/ChecksPage'));

// ─── Finance (bank reconciliation) ──────────────────────────────────────────
const BankReconciliationPage = lazy(() => import('@/pages/finance/BankReconciliationPage'));

// â”€â”€ Fiscal / Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FiscalYearsPage       = lazy(() => import('@/pages/fiscal/FiscalYearsPage'));
const TaxSettingsPage       = lazy(() => import('@/pages/fiscal/TaxSettingsPage'));
const RegulatedProductsPage = lazy(() => import('@/pages/fiscal/RegulatedProductsPage'));
const SubsidizedProductsPage = lazy(() => import('@/pages/fiscal/SubsidizedProductsPage'));
const G50DeclarationPage    = lazy(() => import('@/pages/fiscal/G50DeclarationPage'));
const IFUDeclarationPage    = lazy(() => import('@/pages/fiscal/IFUDeclarationPage'));
const ReportsPage           = lazy(() => import('@/pages/reports/ReportsPage'));
const SalesReportPage       = lazy(() => import('@/pages/reports/SalesReportPage'));
const PurchasesReportPage   = lazy(() => import('@/pages/reports/PurchasesReportPage'));
const CustomersReportPage   = lazy(() => import('@/pages/reports/CustomersReportPage'));
const SuppliersReportPage   = lazy(() => import('@/pages/reports/SuppliersReportPage'));
const ProductsReportPage    = lazy(() => import('@/pages/reports/ProductsReportPage'));
const InventoryReportPage   = lazy(() => import('@/pages/reports/InventoryReportPage'));
const PaymentsReportPage    = lazy(() => import('@/pages/reports/PaymentsReportPage'));
const TaxesReportPage       = lazy(() => import('@/pages/reports/TaxesReportPage'));
const VelocityReportPage    = lazy(() => import('@/pages/reports/VelocityReportPage'));
const MarginReportPage      = lazy(() => import('@/pages/reports/MarginReportPage'));
const AgingReportPage       = lazy(() => import('@/pages/reports/AgingReportPage'));
const CreativeReportPage    = lazy(() => import('@/pages/reports/CreativeReportPage'));
const DailyReportPage       = lazy(() => import('@/pages/reports/DailyReportPage'));
const ProductMovementPage   = lazy(() => import('@/pages/reports/ProductMovementPage'));
const ProfitLossPage        = lazy(() => import('@/pages/reports/ProfitLossPage'));
const ReturnsReportPage     = lazy(() => import('@/pages/reports/ReturnsReportPage'));
const CashFlowReportPage    = lazy(() => import('@/pages/reports/CashFlowReportPage'));
const ExpensesReportPage    = lazy(() => import('@/pages/reports/ExpensesReportPage'));
const SalesTrendReportPage  = lazy(() => import('@/pages/reports/SalesTrendReportPage'));
const StockMovementsReportPage = lazy(() => import('@/pages/reports/StockMovementsReportPage'));

// â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'));

// ─── Audit ──────────────────────────────────────────────────────────────────
const AuditLogPage = lazy(() => import('@/pages/audit/AuditLogPage'));

// ─── Alerts ──────────────────────────────────────────────────────────────────
const AlertsPage = lazy(() => import('@/pages/alerts/AlertsPage'));

// â”€â”€ Users / Roles / Employees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UsersPage     = lazy(() => import('@/pages/users/UsersPage'));
const RolesPage     = lazy(() => import('@/pages/users/RolesPage'));
const EmployeesPage = lazy(() => import('@/pages/users/EmployeesPage'));
const ProfilePage   = lazy(() => import('@/pages/profile/ProfilePage'));

// â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SettingsPage       = lazy(() => import('@/pages/settings/SettingsPage'));
const DocumentTypesPage  = lazy(() => import('@/pages/settings/DocumentTypesPage'));
const PrintSettingsPage  = lazy(() => import('@/pages/settings/print-settings-adapter'));
const ReportDesignerPage = lazy(() => import('@/pages/settings/report-designer/ReportDesignerPage'));
const StickerDesignerPage = lazy(() => import('@/pages/settings/sticker-designer/StickerDesignerAdapter'));

// â”€â”€ Tenant Lookups â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FamiliesPage          = lazy(() => import('@/pages/lookups/FamiliesPage'));
const BrandsPage            = lazy(() => import('@/pages/lookups/BrandsPage'));
const UnitsPage             = lazy(() => import('@/pages/lookups/UnitsPage'));
const WarehousesPage        = lazy(() => import('@/pages/lookups/WarehousesPage'));
const PriceLevelsPage       = lazy(() => import('@/pages/lookups/PriceLevelsPage'));
const NumberingSeriesPage   = lazy(() => import('@/pages/lookups/NumberingSeriesPage'));
const ExpenseCategoriesPage = lazy(() => import('@/pages/lookups/ExpenseCategoriesPage'));

// â”€â”€ Global Lookups â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CurrenciesPage = lazy(() => import('@/pages/lookups/CurrenciesPage'));
const TvasPage       = lazy(() => import('@/pages/lookups/TvasPage'));

// â”€â”€ Admin Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AdminBootPage      = lazy(() => import('@/pages/admin/AdminBootPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminCompaniesPage = lazy(() => import('@/pages/admin/AdminCompaniesPage'));
const AdminUsersPage     = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminApprovalsPage = lazy(() => import('@/pages/admin/AdminApprovalsPage'));
const AdminActivityPage  = lazy(() => import('@/pages/admin/AdminActivityPage'));
const AdminSettingsPage  = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminPlansPage     = lazy(() => import('@/pages/admin/AdminPlansPage'));
const AdminReportsPage   = lazy(() => import('@/pages/admin/AdminReportsPage'));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Loader
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PageLoader() {
  return (
    <div className="page-loader">
      <span className="ic ic-xl text-em">
        <i className="ti ti-loader animate-spin" />
      </span>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Guards
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** ظٹطھط·ظ„ط¨ طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظپظ‚ط· */
/** طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ + ظ„ط§ ط´ط±ظƒط© ظ†ط´ط·ط© + ظ„ظٹط³ super-admin */
function RequireNoCompany({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const _activeCompany = useActiveCompany();
  void _activeCompany;
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // ط§ظ„ط³ظˆط¨ط± ط£ط¯ظ…ظ† ظ„ط§ ظٹظ…ط± ظ…ظ† ظ‡ظ†ط§ ط£ط¨ط¯ط§ظ‹ â€” ظ„ظ‡ ط¯ط§ط´ط¨ظˆط±ط¯ظ‡ ط§ظ„ط®ط§طµ
  if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;

  return <>{children}</>;
}

/** طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ + ط´ط±ظƒط© ظ†ط´ط·ط© (ظ…ط³طھط®ط¯ظ… ط¹ط§ط¯ظٹ ظپظ‚ط·) */
function RequireCompany({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const activeCompany = useActiveCompany();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // ط§ظ„ط³ظˆط¨ط± ط£ط¯ظ…ظ† ظ„ظ‡ ظ…ط³ط§ط±ظ‡ ط§ظ„ط®ط§طµ
  if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (!activeCompany?.slug) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** Super Admin ظپظ‚ط· â€” ظٹطھط­ظ‚ظ‚ ظ…ظ† Auth ط£ظˆظ„ط§ظ‹ */
function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AppRoutes
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* â‘  Auth */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* â‘، Onboarding */}
        <Route
          path="/onboarding"
          element={
            <RequireNoCompany>
              <OnboardingPage />
            </RequireNoCompany>
          }
        />

        {/* â‘¢ Admin Boot â€” ط¥ط¹ط¯ط§ط¯ ط§ظ„ظ†ط¸ط§ظ… (ظٹطµظ„ ط¥ظ„ظٹظ‡ ط§ظ„ط³ظˆط¨ط± ط£ط¯ظ…ظ† ظٹط¯ظˆظٹط§ظ‹ ط¹ظ†ط¯ ط§ظ„ط­ط§ط¬ط©) */}
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

        {/* â‘£ App â€” ظٹطھط·ظ„ط¨ ط´ط±ظƒط© ظ†ط´ط·ط© */}
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
          <Route path="documents/:typeCode/new" element={<CommercialDocumentPage />} />
          <Route path="documents/:typeCode/:id/edit" element={<CommercialDocumentPage />} />
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
          <Route path="bank-reconciliation" element={<BankReconciliationPage />} />

          {/* Fiscal */}
          <Route path="fiscalyears"     element={<FiscalYearsPage />} />
          <Route path="fiscal/tax-settings"    element={<TaxSettingsPage />} />
          <Route path="fiscal/regulated-products" element={<RegulatedProductsPage />} />
          <Route path="fiscal/subsidized-products" element={<SubsidizedProductsPage />} />
          <Route path="fiscal/g50"       element={<G50DeclarationPage />} />
          <Route path="fiscal/ifu"       element={<IFUDeclarationPage />} />

          {/* Reports */}
          <Route path="reports">
            <Route index element={<ReportsPage />} />
            <Route path="sales" element={<SalesReportPage />} />
            <Route path="purchases" element={<PurchasesReportPage />} />
            <Route path="customers" element={<CustomersReportPage />} />
            <Route path="suppliers" element={<SuppliersReportPage />} />
            <Route path="products" element={<ProductsReportPage />} />
            <Route path="inventory" element={<InventoryReportPage />} />
            <Route path="payments" element={<PaymentsReportPage />} />
            <Route path="taxes" element={<TaxesReportPage />} />
            <Route path="velocity" element={<VelocityReportPage />} />
            <Route path="margin" element={<MarginReportPage />} />
            <Route path="aging" element={<AgingReportPage />} />
            <Route path="creative" element={<CreativeReportPage />} />
            <Route path="daily" element={<DailyReportPage />} />
            <Route path="product-movement" element={<ProductMovementPage />} />
            <Route path="profit-loss" element={<ProfitLossPage />} />
            <Route path="returns" element={<ReturnsReportPage />} />
            <Route path="cash-flow" element={<CashFlowReportPage />} />
            <Route path="expenses" element={<ExpensesReportPage />} />
            <Route path="sales-trend" element={<SalesTrendReportPage />} />
            <Route path="stock-movements" element={<StockMovementsReportPage />} />
          </Route>

          {/* HR */}
          <Route path="employees" element={<EmployeesPage />} />

          {/* Users */}
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />

          {/* Notifications */}
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Audit Log */}
          <Route path="audit-log" element={<AuditLogPage />} />

          {/* Alerts */}
          <Route path="alerts" element={<AlertsPage />} />

          {/* Settings */}
          <Route path="settings"                 element={<SettingsPage />} />
          <Route path="settings/document-types"  element={<DocumentTypesPage />} />
          <Route path="settings/print"           element={<PrintSettingsPage />} />
          <Route path="settings/print/designer" element={<ReportDesignerPage />} />
          <Route path="settings/stickers" element={<StickerDesignerPage />} />
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

        {/* â‘¤ Admin Panel */}
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
          <Route path="approvals" element={<AdminApprovalsPage />} />
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
