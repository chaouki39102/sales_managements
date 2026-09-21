// ════════════════════════════════════════════════════════════════════════════
// print-settings/runtime/silentPrint.ts — طباعة صامتة لمستندات A4/A5
// ════════════════════════════════════════════════════════════════════════════
// مسار "صامت أولاً" لطباعة فواتير ومستندات بحجم ورق فعلي: اختيار طابعة
// ويندوز تلقائياً ← توليد HTML بنفس عملة المعاينة ← POST /system/printers/html
// (Edge headless ← PNG ← GDI — الصمت مضمون، لا نافذة معاينة ولا اختيار طابعة).
// لا يُحوَّل هنا أبداً إلى نافذة المتصفح: المتصل (TemplatePrintModal) يفتح
// المعاينة فقط عند فشل أي مسار أحيل إليه من أحد الأسباب أدناه.
// ════════════════════════════════════════════════════════════════════════════

import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { systemPrintersApi } from '@/lib/api/endpoints/systemPrinters';
import {
  resolveWindowsTarget,
  writeRememberedTarget,
  utf8Base64,
} from '@/lib/api/endpoints/windowsPrintTarget';
import { renderPreviewToHtml } from './renderPreviewToHtml';
import type { PipelineSource } from './UniversalPrintPipeline';

export type SilentPrintResult =
  | { ok: true; printer: string }
  | { ok: false; reason: 'unsupported-paper' | 'no-target' | 'error'; message: string };

export interface SilentPrintInput {
  template: PrintTemplate;
  company: CompanyData | null;
  source: PipelineSource;
  slug?: string | null;
  copies?: number;
}

/**
 * طباعة صامتة لمستند A4/A5 على طابعة ويندوز (المسار الصامت الوحيد للناسخ).
 * - ورق غير فعلي (حراري/ملصق) → unsupported-paper (المتصل يفتح نافذة الحوار).
 * - لا توجد طابعة ويندوز → no-target مع رسالة عربية واضحة.
 * - فشل التوليد/الإرسال → error مع رسالة الحالة.
 * النجاح يحفظ الطابعة كهدف محفوظ للشركة ويُرجع ok + اسمها.
 */
export async function trySilentPrintDocument(
  input: SilentPrintInput,
): Promise<SilentPrintResult> {
  const { template, company, source, slug, copies = 1 } = input;

  if (template.paper_size !== 'A4' && template.paper_size !== 'A5') {
    return {
      ok: false,
      reason: 'unsupported-paper',
      message: 'الطباعة الصامتة مدعومة فقط لأحجام A4/A5',
    };
  }

  const target = await resolveWindowsTarget(slug);
  if (!target) {
    return {
      ok: false,
      reason: 'no-target',
      message:
        'لا توجد طابعة ويندوز — ثبّت الطابعة في النظام ثم أضفها من الإعدادات ← الطابعات',
    };
  }

  try {
    const html = await renderPreviewToHtml({ template, company, source });
    await systemPrintersApi.html(
      target,
      utf8Base64(html),
      copies > 1 ? copies : 1,
    );
    writeRememberedTarget(slug, target);
    return { ok: true, printer: target };
  } catch (err: any) {
    const msg: string =
      err?.response?.data?.message ??
      err?.message ??
      'فشلت الطباعة الصامتة عبر ويندوز';
    return { ok: false, reason: 'error', message: msg };
  }
}