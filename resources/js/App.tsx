// ════════════════════════════════════════════════════════════════════════════
// App.tsx — FIXED
// ترتيب Providers الصحيح:
//   QueryClientProvider → BrowserRouter → AuthProvider → FiscalYearProvider
//
// المشاكل في النسخة القديمة:
//   1. FiscalYearProvider خارج BrowserRouter → useNavigate يفشل
//   2. AuthProvider خارج BrowserRouter → Navigate يفشل
//   3. connectSlugToInterceptor خارج React → لا مشكلة لكن يجب قبل أي طلب
// ════════════════════════════════════════════════════════════════════════════

import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/api/core/queryClient';
import { connectSlugToInterceptor } from '@/lib/api/core/client';
import { appActions } from '@/lib/store/appStore';
import { AuthProvider } from '@/context/AuthContext';
import { FiscalYearProvider } from '@/context/FiscalYearContext';
import { AppRoutes } from '@/routes/index';

// CSS — الترتيب مهم
import '../css/theme/tokens.css';
import '../css/theme/layout.css';
import '../css/theme/components.css';
import '../css/theme/pages.css';
import '../css/theme/utilities.css';
import '../css/theme/pos.css';

// ✅ ربط Zustand بالـ Interceptor مرة واحدة عند تحميل الـ module
// يجب أن يكون قبل أي طلب API
connectSlugToInterceptor(() => appActions.getActiveSlug());

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/*
        ✅ BrowserRouter أولاً — كل ما بداخله يمكنه استخدام useNavigate/Navigate
        ✅ AuthProvider داخل BrowserRouter لأنه يستخدم navigation عند logout
        ✅ FiscalYearProvider داخل AuthProvider لأنه يحتاج isAuthenticated
      */}
      <BrowserRouter>
        <AuthProvider>
          <FiscalYearProvider>
            <AppRoutes />
          </FiscalYearProvider>
        </AuthProvider>
      </BrowserRouter>

      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
