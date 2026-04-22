// ════════════════════════════════════════════════
// App.tsx — نقطة الدخول الرئيسية
// ════════════════════════════════════════════════
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { AppRoutes }   from '@/config/navigation';

// CSS — الترتيب مهم جداً
import '../css/theme/tokens.css';
import '../css/theme/layout.css';
import '../css/theme/components.css';
import '../css/theme/pages.css';
import '../css/theme/utilities.css';
import '../css/theme/pos.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
