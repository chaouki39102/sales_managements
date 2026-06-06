// ════════════════════════════════════════════════════════════════════════════
// App.tsx
//
// ترتيب Providers الصحيح:
//   QueryClientProvider
//     └── BrowserRouter
//           └── AuthProvider
//                 └── FiscalYearProvider
//                       └── AppRoutes
// ════════════════════════════════════════════════════════════════════════════
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient }               from '@/lib/api/core/queryClient';
import { connectSlugToInterceptor }  from '@/lib/api/core/client';
import { appActions }                from '@/lib/store/appStore';
import { AuthProvider }              from '@/context/AuthContext';
import { FiscalYearProvider }        from '@/context/FiscalYearContext';
import { AppRoutes }                 from '@/routes/index';

// CSS — ملف واحد فقط، يستورد theme.css تلقائياً
import '../css/app.css';

// ربط Zustand بالـ interceptor
connectSlugToInterceptor(() => appActions.getActiveSlug());

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
