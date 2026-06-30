import { createContext, useContext } from 'react';
import type { PrintTemplatesApi } from '@/pages/settings/print-settings/contracts/TemplateRepository';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

export interface RuntimeDependencies {
  templateRepository: PrintTemplatesApi;
  slug: string | null;
  company: CompanyData | null;
}

const RuntimeContext = createContext<RuntimeDependencies | null>(null);

export function RuntimeProvider({ value, children }: { value: RuntimeDependencies; children: React.ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeDependencies {
  const ctx = useContext(RuntimeContext);
  if (!ctx) throw new Error('RuntimeProvider missing — mount <PrintRuntimeAdapter> at app root');
  return ctx;
}
