// resources/js/routes/index.tsx
import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layouts/DashboardLayout";

// Lazy load pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const OnboardingPage = lazy(() => import("@/pages/onboarding/OnboardingPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const POSPage = lazy(() => import("@/pages/pos/POSPage"));
const InvoicesPage = lazy(() => import("@/pages/invoices/InvoicesPage"));
const ProductsPage = lazy(() => import("@/pages/products/ProductsPage"));
const InventoryPage = lazy(() => import("@/pages/inventory/InventoryPage"));
const ClientsPage = lazy(() => import("@/pages/clients/ClientsPage"));
const SuppliersPage = lazy(() => import("@/pages/suppliers/SuppliersPage"));
const FinancePage = lazy(() => import("@/pages/finance/FinancePage"));
const ExpensesPage = lazy(() => import("@/pages/expenses/ExpensesPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const UsersPage = lazy(() => import("@/pages/users/UsersPage"));
const EmployeesPage = lazy(() => import("@/pages/users/EmployeesPage"));
const FiscalYearsPage = lazy(() => import("@/pages/fiscal/FiscalYearsPage"));
const TvaPage = lazy(() => import("@/pages/fiscal/TvaPage"));
const DebtsPage = lazy(() => import("@/pages/debts/DebtsPage"));
const DocumentTypesPage = lazy(
    () => import("@/pages/settings/DocumentTypesPage"),
);
const CommercialDocumentsPage = lazy(
    () => import("@/pages/documents/CommercialDocumentsPage"),
);
const NumberingSeriesPage = lazy(
    () => import("@/pages/lookups/NumberingSeriesPage"),
);
const PaymentMethodsPage = lazy(
    () => import("@/pages/settings/PaymentMethodsPage"),
);

// Lookup pages
const BrandsPage = lazy(() => import("@/pages/lookups/BrandsPage"));
const FamiliesPage = lazy(() => import("@/pages/lookups/FamiliesPage"));
const UnitsPage = lazy(() => import("@/pages/lookups/UnitsPage"));
const CurrenciesPage = lazy(() => import("@/pages/lookups/CurrenciesPage"));
const WarehousesPage = lazy(() => import("@/pages/lookups/WarehousesPage"));
const PriceLevelsPage = lazy(() => import("@/pages/lookups/PriceLevelsPage"));
const TvasPage = lazy(() => import("@/pages/lookups/TvasPage"));
const ExpenseCategoriesPage = lazy(
    () => import("@/pages/lookups/ExpenseCategoriesPage"),
);

const RolesPage = lazy(() => import("@/pages/users/RolesPage"));

function Loader() {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                background: "var(--bg0)",
            }}
        >
            <span className="ic ic-xl" style={{ color: "var(--em)" }}>
                <i
                    className="ti ti-loader"
                    style={{ animation: "spin 1s linear infinite" }}
                />
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

function ComingSoon() {
    return (
        <div className="page on">
            <div className="empty" style={{ paddingTop: 80 }}>
                <div className="empty-ic">
                    <i className="ti ti-hammer" />
                </div>
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
                <Route path="/login" element={<LoginPage />} />

                {/* 🆕 الإعداد الأولي (محمي، مستقل عن DashboardLayout) */}
                <Route
                    path="/onboarding"
                    element={
                        <ProtectedRoute>
                            <OnboardingPage />
                        </ProtectedRoute>
                    }
                />

                {/* مسارات التطبيق (DashboardLayout) */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        index
                        element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="pos" element={<POSPage />} />
                    <Route path="invoices" element={<InvoicesPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route
                        path="documents/:typeCode"
                        element={<CommercialDocumentsPage />}
                    />
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
                    <Route
                        path="settings/document-types"
                        element={<DocumentTypesPage />}
                    />

                    {/* Lookups */}
                    <Route path="categories" element={<FamiliesPage />} />
                    <Route path="brands" element={<BrandsPage />} />
                    <Route path="units" element={<UnitsPage />} />
                    <Route path="warehouses" element={<WarehousesPage />} />
                    <Route path="currencies" element={<CurrenciesPage />} />
                    <Route path="pricelevels" element={<PriceLevelsPage />} />
                    <Route path="tvas" element={<TvasPage />} />
                    <Route
                        path="payment-methods"
                        element={<PaymentMethodsPage />}
                    />
                    <Route
                        path="numbering-series"
                        element={<NumberingSeriesPage />}
                    />
                    <Route
                        path="expense-categories"
                        element={<ExpenseCategoriesPage />}
                    />
                </Route>

                <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                />
            </Routes>
        </Suspense>
    );
}
