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

/**
 * إعدادات RAW TCP كما يقرؤها الخادم.
 *
 * `printer_id` هو اسم طابعة ويندوز الإجبارية التي تُستخدم كمسار احتياطي
 * بعد فشل الشبكة (طابعة لاسلكية/USB) — فارغ يعني «اكتشفها تلقائياً».
 */
export interface RawTcpConfig {
  enabled: boolean;
  host: string;
  port: number;
  timeout: number;
  printer_id: string | null;
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
  /**
   * طباعة HTML بدقة كاملة (Edge headless ← لقطة PNG ← GDI PrintDocument) —
   * للطابعات العادية حيث يُريد الإيصال بنفس تنسيق المعاينة.
   */
  html: (name: string, htmlBase64: string, copies = 1) =>
    apiPost<{ printed: boolean }>('/system/printers/html', {
      name,
      data: htmlBase64,
      copies,
    }),
  /**
   * قراءة إعدادات RAW TCP المحفوظة للمؤسسة.
   *
   * الواجهة تستدعيها مرة كل 30 ثانية (أو قبل أول طباعة) لتعرف هل تُحاول
   * الطابعة الشبكية قبل spooler ويندوز. `enabled=false` يعني «لا تحاول إطلاقاً».
   */
  rawTcpConfig: () => apiGet<RawTcpConfig>('/system/printers/raw-tcp'),
  /**
   * إرسال بايتات ESC/POS مباشرة عبر منفذ RAW TCP (9100 افتراضياً).
   * لا تمرّ بـ spooler ولا تحتاج تعريفاً في ويندوز.
   */
  rawTcp: (dataBase64: string, opts: { host?: string; port?: number; timeout?: number } = {}) =>
    apiPost<{ printed: boolean; method: string; host: string; port: number; bytes: number }>(
      '/system/printers/raw-tcp',
      {
        data: dataBase64,
        ...(opts.host ? { host: opts.host } : {}),
        ...(opts.port ? { port: opts.port } : {}),
        ...(opts.timeout ? { timeout: opts.timeout } : {}),
      },
    ),
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

/**
 * إعدادات RAW TCP، مع «مفتاح» 30 ثانية لكل مؤسسة.
 *
 * مسار الطباعة الحرارية يُستدعى لكل إيصال، وبدون هذا المفتاح يصبح كل إيصال
 * طلب GET إضافياً. 30 ثانية توازن بين الاستجابة الفورية لأحدّث إعداد وقلة الطلبات.
 */
const RAW_TCP_TTL_MS = 30_000;
const rawTcpCache = new Map<string, { at: number; config: RawTcpConfig }>();

export async function readRawTcpConfig(
  slug: string,
  force = false,
): Promise<RawTcpConfig | null> {
  if (!slug) return null;
  if (!force) {
    const hit = rawTcpCache.get(slug);
    if (hit && Date.now() - hit.at < RAW_TCP_TTL_MS) return hit.config;
  }
  try {
    const config = await systemPrintersApi.rawTcpConfig();
    rawTcpCache.set(slug, { at: Date.now(), config });
    return config;
  } catch {
    return null;
  }
}

export function clearRawTcpConfigCache(slug?: string) {
  if (slug) rawTcpCache.delete(slug);
  else rawTcpCache.clear();
}
