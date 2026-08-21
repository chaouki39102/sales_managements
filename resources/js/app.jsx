import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerOfflineInterceptor } from '@/lib/offline/offlineAwareApi';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

registerOfflineInterceptor();

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
