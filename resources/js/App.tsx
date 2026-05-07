// ════════════════════════════════════════════════
// App.tsx — نقطة الدخول الرئيسية
// ════════════════════════════════════════════════
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FiscalYearProvider } from "@/context/FiscalYearContext";
import { AuthProvider } from "@/context/AuthContext";
import AppRoutes from "@/routes/index";

// CSS — الترتيب مهم جداً
import "../css/theme/tokens.css";
import "../css/theme/layout.css";
import "../css/theme/components.css";
import "../css/theme/pages.css";
import "../css/theme/utilities.css";
import "../css/theme/pos.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,          // ⭐ لا تُعد الجلب عند كل تنقل بين الصفحات
      retry: 1,
      staleTime: 10 * 60 * 1000,     // 10 دقائق بدلاً من 30 ثانية
      cacheTime: 30 * 60 * 1000,     // احتفظ بالبيانات في الكاش لمدة نصف ساعة
    },
  },
});

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
        </QueryClientProvider>
    );
}
