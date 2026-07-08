import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerOfflineInterceptor } from '@/lib/offline/offlineAwareApi';
import { registerAdvancedFunctions } from '@/pages/settings/print-settings/engines/AdvancedFunctions';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

registerOfflineInterceptor();
registerAdvancedFunctions();

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
