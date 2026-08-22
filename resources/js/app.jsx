import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerOfflineInterceptor } from '@/lib/offline/offlineAwareApi';
import { onOtherTabMutation } from '@/lib/api/core/crossTab';
import { queryClient } from '@/lib/api/core/queryClient';
import { invalidatePosQueries } from '@/lib/api/core/queryKeys';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

registerOfflineInterceptor();

// مزامنة التبويبات: mutation في تبويب آخر → إبطال بيانات POS هنا فوراً
// (POS مفتوح في تبويب ثاني يُحدَّث مباشرة عند إضافة مخزون/منتج/مستند)
onOtherTabMutation((slug) => {
  invalidatePosQueries(queryClient, slug);
});

// تأجيل تسجيل الدوال المتقدمة للطباعة — لا تحتاج إلا عند أول طباعة
// يُحوِّل 526 سطر من المسار الحرج إلى chunk منفصل يُحمَّل عند الطلب
import('@/pages/settings/print-settings/engines/AdvancedFunctions')
  .then(({ registerAdvancedFunctions }) => registerAdvancedFunctions());

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
