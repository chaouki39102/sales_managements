// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/systemPrinters.ts — اكتشاف الطابعات المثبتة على ويندوز
// ════════════════════════════════════════════════════════════════════════════
// يقرأ قائمة الطابعات من نظام التشغيل عبر PowerShell (Get-CimInstance
// Win32_Printer) — نفس القائمة في إعدادات ويندوز ← الطابعات والماسحات.
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '../core/client';
import { useActiveSlug } from '../../store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────
export type SystemPrinterStatus = 'ready' | 'printing' | 'offline' | 'unknown';

export interface SystemPrinter {
  name: string;
  driver: string;
  port: string;
  is_default: boolean;
  work_offline: boolean;
  shared: boolean;
  local: boolean;
  status: SystemPrinterStatus;
  status_label: string;
}

export interface SystemPrintersPayload {
  printers: SystemPrinter[];
  platform: string;
  error: string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const systemPrintersApi = {
  list: () => apiGet<SystemPrintersPayload>('/system/printers'),
  testPrint: (name: string) =>
    apiPost<{ sent: boolean }>('/system/printers/test', { name }),
  /** إرسال بايتات خام (base64) عبر spooler ويندوز — مسار احتياطي لـ WebUSB */
  rawPrint: (name: string, dataBase64: string, copies = 1) =>
    apiPost<{ printed: boolean }>('/system/printers/raw', {
      name,
      data: dataBase64,
      copies,
    }),
  /** طباعة نص عادي (GDI صامتة) على أي طابعة ويندوز — للطابعات غير الحرارية */
  rawText: (name: string, textBase64: string, copies = 1) =>
    apiPost<{ printed: boolean }>('/system/printers/raw-text', {
      name,
      data: textBase64,
      copies,
    }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useSystemPrinters() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: ['system-printers', slug],
    queryFn: () => systemPrintersApi.list(),
    enabled: !!slug,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useTestSystemPrint() {
  return useMutation({
    mutationFn: (name: string) => systemPrintersApi.testPrint(name),
  });
}
