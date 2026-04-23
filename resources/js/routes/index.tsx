// ════════════════════════════════════════════════
// routes/index.tsx — مسارات التطبيق الكاملة
// ════════════════════════════════════════════════
import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// ── Lazy-loaded pages ─────────────────────────────
const LoginPage       = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage   = lazy(() => import('@/pages/dashboard/DashboardPage'));
const POSPage         = lazy(() => import('@/pages/pos/POSPage'));
const ProductsPage    = lazy(() => import('@/pages/products/ProductsPage'));
const InvoicesPage    = lazy(() => import('@/pages/invoices/InvoicesPage'));
const InventoryPage   = lazy(() => import('@/pages/inventory/InventoryPage'));
const ClientsPage     = lazy(() => import('@/pages/clients/ClientsPage'));
const UsersPage       = lazy(() => import('@/pages/users/UsersPage'));
const SettingsPage    = lazy(() => import('@/pages/settings/SettingsPage'));

// ── Page loader ───────────────────────────────────
export function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ position: 'relative', width: 40, height: 40 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '3px solid var(--emb)',
          borderTopColor: 'var(--em)',
          animation: 'spin .8s linear infinite',
        }}/>
      </div>
      <span style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600 }}>جاري التحميل...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Full-screen loader (auth check) ──────────────
function FullLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg0)', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid var(--emb)', borderTopColor: 'var(--em)',
        animation: 'spin .8s linear infinite',
      }}/>
      <span style={{ fontSize: 13, color: 'var(--t4)' }}>جاري التحقق من الجلسة...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Coming Soon placeholder ───────────────────────
function ComingSoon() {
  const loc = useLocation();
  return (
    <div className="page on">
      <div className="empty" style={{ paddingTop: 80 }}>
        <div className="empty-ic"><i className="ti ti-hammer"/></div>
        <div className="empty-tx">قيد الإنشاء</div>
        <div className="empty-sub" style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {loc.pathname}
        </div>
      </div>
    </div>
  );
}

// ── Protected route wrapper ───────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── Main router ───────────────────────────────────
export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Protected layout ── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Core */}
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="pos"        element={<POSPage />} />

          {/* Sales */}
          <Route path="invoices"   element={<InvoicesPage />} />
          <Route path="orders"     element={<ComingSoon />} />
          <Route path="returns"    element={<ComingSoon />} />
          <Route path="quotations" element={<ComingSoon />} />
          <Route path="bl"         element={<ComingSoon />} />

          {/* Inventory */}
          <Route path="products"   element={<ProductsPage />} />
          <Route path="inventory"  element={<InventoryPage />} />
          <Route path="categories" element={<ComingSoon />} />
          <Route path="brands"     element={<ComingSoon />} />
          <Route path="units"      element={<ComingSoon />} />
          <Route path="suppliers"  element={<ComingSoon />} />
          <Route path="warehouses" element={<ComingSoon />} />

          {/* Accounting */}
          <Route path="clients"     element={<ClientsPage />} />
          <Route path="finance"     element={<ComingSoon />} />
          <Route path="expenses"    element={<ComingSoon />} />
          <Route path="debts"       element={<ComingSoon />} />
          <Route path="tva"         element={<ComingSoon />} />
          <Route path="fiscal"      element={<ComingSoon />} />
          <Route path="fiscalyears" element={<ComingSoon />} />
          <Route path="currencies"  element={<ComingSoon />} />
          <Route path="pricelevels" element={<ComingSoon />} />

          {/* Reports */}
          <Route path="reports"  element={<ComingSoon />} />
          <Route path="balance"  element={<ComingSoon />} />

          {/* System */}
          <Route path="employees" element={<ComingSoon />} />
          <Route path="users"     element={<UsersPage />} />
          <Route path="settings"  element={<SettingsPage />} />
        </Route>

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
