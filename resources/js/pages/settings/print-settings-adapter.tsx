import React, { useMemo } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '@/lib/api/core/client';
import { useActiveCompany, useActiveSlug } from '@/lib/store/appStore';
import type { ApiClient } from '@/pages/settings/print-settings/contracts/ApiClient';
import type { Notifier } from '@/pages/settings/print-settings/contracts/Notifier';
import { PrintSettingsProvider } from '@/pages/settings/print-settings/providers/PrintSettingsContext';
import { createPrintTemplatesApi } from '@/pages/settings/print-settings/api/printTemplatesApi';
import { PrintSettingsPage } from '@/pages/settings/print-settings';

const hostApiClient: ApiClient = {
  get:      <T,>(url: string, params?: Record<string, unknown>) => apiGet<T>(url, params),
  post:     <T,>(url: string, data?: unknown)                   => apiPost<T>(url, data),
  put:      <T,>(url: string, data?: unknown)                   => apiPut<T>(url, data),
  patch:    <T,>(url: string, data?: unknown)                   => apiPatch<T>(url, data),
  delete:   (url: string)                                      => apiDelete(url),
  upload:   <T,>(url: string, fd: FormData, onProgress?: (p: number) => void) => apiUpload<T>(url, fd, onProgress),
};

const hostNotifier: Notifier = {
  success: (msg: string) => toast.success(msg),
  error:   (msg: string) => toast.error(msg),
};

export default function PrintSettingsPageAdapter() {
  const activeCompany = useActiveCompany();
  const slug          = useActiveSlug();

  const dependencies = useMemo(() => ({
    apiClient:         hostApiClient,
    notifier:          hostNotifier,
    printTemplatesApi: createPrintTemplatesApi(hostApiClient),
    company:           activeCompany ? {
      name:    activeCompany.name    ?? '',
      address: activeCompany.address ?? '',
      phone:   activeCompany.phone   ?? '',
      nif:     activeCompany.nif     ?? '',
      rc:      activeCompany.rc      ?? '',
      nis:     activeCompany.nis     ?? '',
      ice:     (activeCompany as any).ice ?? '',
      article: (activeCompany as any).ai ?? '',
      logoUrl: (activeCompany as any).avatar ?? null,
    } : null,
    slug,
  }), [activeCompany, slug]);

  return (
    <PrintSettingsProvider value={dependencies}>
      <PrintSettingsPage />
    </PrintSettingsProvider>
  );
}
