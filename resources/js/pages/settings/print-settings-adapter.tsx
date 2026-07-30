import { useMemo } from 'react';
import { useNotification } from '@/hooks/useNotification';
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

export default function PrintSettingsPageAdapter() {
  const activeCompany = useActiveCompany();
  const slug          = useActiveSlug();
  const notify        = useNotification();

  const hostNotifier: Notifier = useMemo(() => ({
    success: (msg: string) => notify.success(msg),
    error:   (msg: string) => notify.error(msg),
  }), [notify]);

  const dependencies = useMemo(() => ({
    apiClient:         hostApiClient,
    notifier:          hostNotifier,
    printTemplatesApi: createPrintTemplatesApi(hostApiClient),
    company:           activeCompany ? {
      name:            activeCompany.name            ?? '',
      commercialName:  (activeCompany as any).commercial_name ?? '',
      address:         activeCompany.address         ?? '',
      phone:           activeCompany.phone           ?? '',
      mobile:          (activeCompany as any).mobile  ?? '',
      fax:             (activeCompany as any).fax     ?? '',
      email:           activeCompany.email           ?? '',
      nif:             activeCompany.nif             ?? '',
      rc:              activeCompany.rc              ?? '',
      nis:             activeCompany.nis             ?? '',
      article:         (activeCompany as any).ai     ?? '',
      capital:         (activeCompany as any).capital_amount ?? '',
      bankName:        (activeCompany as any).bank_name ?? '',
      rib:             (activeCompany as any).rib     ?? '',
      activity:        activeCompany.activity        ?? '',
      logoUrl:         activeCompany.avatar          ?? null,
    } : null,
    slug,
  }), [activeCompany, slug, hostNotifier]);

  return (
    <PrintSettingsProvider value={dependencies}>
      <PrintSettingsPage />
    </PrintSettingsProvider>
  );
}
