// ════════════════════════════════════════════════════════════════════════════
// PrintRuntimeAdapter — the ONLY bridge between the host app and the runtime
// layer. This is the single place where global API functions and Zustand
// store are imported for the runtime module.
//
// Mount this at the app root (or inside RequireCompany) so that all printing
// consumers have access to the runtime context.
// ════════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '@/lib/api/core/client';
import { createPrintTemplatesApi } from '@/pages/settings/print-settings/api/printTemplatesApi';
import type { ApiClient } from '@/pages/settings/print-settings/contracts/ApiClient';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { RuntimeProvider } from './PrintRuntimeContext';

const __hostApiClient: ApiClient = {
  get:      <T,>(url: string, params?: Record<string, unknown>) => apiGet<T>(url, params),
  post:     <T,>(url: string, data?: unknown)                   => apiPost<T>(url, data),
  put:      <T,>(url: string, data?: unknown)                   => apiPut<T>(url, data),
  patch:    <T,>(url: string, data?: unknown)                   => apiPatch<T>(url, data),
  delete:   (url: string)                                      => apiDelete(url),
  upload:   <T,>(url: string, fd: FormData, onProgress?: (p: number) => void) => apiUpload<T>(url, fd, onProgress),
};

export function mapCompany(ac: ReturnType<typeof useActiveCompany>): CompanyData | null {
  if (!ac) return null;
  return {
    name:            ac.name            ?? '',
    commercialName:  (ac as any).commercial_name ?? '',
    address:         ac.address         ?? '',
    phone:           ac.phone           ?? '',
    mobile:          ac.mobile          ?? '',
    fax:             ac.fax             ?? '',
    email:           ac.email           ?? '',
    nif:             ac.nif             ?? '',
    rc:              ac.rc              ?? '',
    nis:             ac.nis             ?? '',
    article:         (ac as any).ai     ?? '',
    activity:        ac.activity        ?? '',
    capital:         (ac as any).capital_amount ?? '',
    bankName:        (ac as any).bank_name ?? '',
    rib:             ac.rib             ?? '',
    logoUrl:         ac.avatar          ?? null,
  };
}

export function PrintRuntimeAdapter({ children }: { children: React.ReactNode }) {
  const slug    = useActiveSlug();
  const company = useActiveCompany();
  const deps = useMemo(() => ({
    templateRepository: createPrintTemplatesApi(__hostApiClient),
    slug,
    company: mapCompany(company),
  }), [slug, company]);
  return <RuntimeProvider value={deps}>{children}</RuntimeProvider>;
}
