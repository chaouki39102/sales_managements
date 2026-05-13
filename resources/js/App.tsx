// ════════════════════════════════════════════════
// App.tsx — نقطة الدخول الرئيسية (الهيكل الجديد)
// ════════════════════════════════════════════════
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

// ربط Zustand بالـ Interceptor مرة واحدة عند بدء التطبيق
connectSlugToInterceptor(() => appActions.getActiveSlug());

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FiscalYearProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </FiscalYearProvider>
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
