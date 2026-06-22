import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerOfflineInterceptor } from '@/lib/offline/offlineAwareApi';

registerOfflineInterceptor();

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
