// ════════════════════════════════════════════════════════════════════════════
// App.tsx — النسخة النهائية المُصلحة
//
// ترتيب Providers الصحيح:
//   QueryClientProvider
//     └── BrowserRouter          ← أولاً لأن AuthProvider يستخدم navigate
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
import { RememberMeBoot }            from '@/context/RememberMeBoot';
import { FiscalYearProvider }        from '@/context/FiscalYearContext';
import { PrintRuntimeAdapter }       from '@/pages/settings/print-settings/runtime';
import { DocumentQuickCreateProvider } from '@/lib/store/documentQuickCreateStore';
import { GlobalDocumentFAB }         from '@/components/global/GlobalDocumentFAB';
import { PwaInstallBanner }          from '@/components/global/PwaInstallBanner';
import { AppRoutes }                 from '@/routes/index';
import NotificationContainer        from '@/components/notifications/NotificationContainer';

// CSS
import '../css/theme/tokens.css';
import '../css/theme/layout.css';
import '../css/theme/components.css';
import '../css/theme/pages.css';
import '../css/theme/utilities.css';
import '../css/theme/pos.css';
import '../css/theme/pos-search-enhanced.css';
import '../css/theme/portal.css';

// ربط Zustand بالـ interceptor — مرة واحدة عند تحميل الـ module
connectSlugToInterceptor(() => appActions.getActiveSlug());

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RememberMeBoot>
            <FiscalYearProvider>
              <PrintRuntimeAdapter>
                <DocumentQuickCreateProvider>
                  <AppRoutes />
                  <GlobalDocumentFAB />
                  <PwaInstallBanner />
                </DocumentQuickCreateProvider>
                <NotificationContainer />
              </PrintRuntimeAdapter>
            </FiscalYearProvider>
          </RememberMeBoot>
        </AuthProvider>
      </BrowserRouter>

      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
