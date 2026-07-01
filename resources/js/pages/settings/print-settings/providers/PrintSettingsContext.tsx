import React, { createContext, useContext } from 'react';
import type { HostDependencies } from '../contracts/HostContext';

const PrintSettingsContext = createContext<HostDependencies | null>(null);

export function PrintSettingsProvider({ value, children }: { value: HostDependencies; children: React.ReactNode }) {
  return (
    <PrintSettingsContext.Provider value={value}>
      {children}
    </PrintSettingsContext.Provider>
  );
}

export function useHost(): HostDependencies {
  const ctx = useContext(PrintSettingsContext);
  if (!ctx) throw new Error('PrintSettingsProvider missing — wrap <PrintSettingsPage> in <PrintSettingsProvider>');
  return ctx;
}

export function useApiClient() { return useHost().apiClient; }
export function useNotifier() { return useHost().notifier; }
export function usePrintTemplatesApi() { return useHost().printTemplatesApi; }
export function useCompany() { return useHost().company; }
export function useSlug() { return useHost().slug; }
