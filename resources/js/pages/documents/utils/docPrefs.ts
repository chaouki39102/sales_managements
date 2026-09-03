// ════════════════════════════════════════════════════════════════════════════
// pages/documents/utils/docPrefs.ts
//
// تفضيلات محرر المستندات (Document-Editor Preferences) — مخزنة محلياً
// (localStorage) لكل شركة (slug). هذه تفضيلات سطح المحرر على هذا الجهاز،
// لا تُحفظ مع المستند نفسه ولا تُشارك عموم الشركة.
//
// مستوحاة من "خيارات CLASSIC POS" (POSSettingsModal) ولكن مُكيَّفة مع بنية
// محرر المستندات وقيودها: لا تتم إضافة خيارات تتعارض مع مصدر الحقيقة
// (SSOT) لقوالب الطباعة في إعدادات الطباعة، ولا خيارات لا تنطبق فعلياً
// على مسار الطباعة (المتصفح فقط) في هذا المحرر.
// ════════════════════════════════════════════════════════════════════════════

import type { ShippingInfo } from '../types/document.types';

export type DocPriceDisplayMode = 'ht' | 'ttc';

export type DocPrintMode = 'browser';

export interface DocPrefs {
  /**
   * طريقة عرض الأسعار في السطور ومنتقي المنتج: HT (سعر خالص الضريبة)
   * أو TTC (شامل الضريبة). الافتراضي HT.
   */
  priceDisplayMode: DocPriceDisplayMode;

  /**
   * عدد النسخ عند الطباعة من المحرر (1–3). يُمرَّر كأفضل جهد إلى الطباعة
   * عبر المتصفح (تُعرض نافذة طباعة المتصفح وقد تُستخدم كنسخ حسب دعم المتصفح).
   */
  printCopies: number;

  /**
   * الشحن/التسليم الافتراضية لأي مستند جديد (لا تُحفظ مع المستند تتم إعادة
   * تعبئتها في الحقول الافتراضية عند فتح مستند جديد).
   */
  defaultShippingInfo: Partial<ShippingInfo>;

  /** أحد أجل الدفع الافتراضية (بالأيام) لأي مستند جديد — 0 = لا شيء (حالاً). */
  defaultPaymentTermsDays: number;
  /** ملاحظة افتراضية لسطر شروط الدفع الافتراضي. */
  defaultPaymentTermsNotes: string;
}

export const DOC_PREFS_DEFAULTS: DocPrefs = {
  priceDisplayMode: 'ht',
  printCopies: 1,
  defaultShippingInfo: {},
  defaultPaymentTermsDays: 0,
  defaultPaymentTermsNotes: '',
};

type SlugLike = string | null | undefined;

function prefsKey(slug: SlugLike): string {
  return `doc_prefs:${slug ?? 'default'}`;
}

function safeParse(raw: string | null): Partial<DocPrefs> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Partial<DocPrefs>;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export function loadDocPrefs(slug?: SlugLike): DocPrefs {
  let parsed: Partial<DocPrefs> = {};
  try { parsed = safeParse(localStorage.getItem(prefsKey(slug))); } catch {}
  return { ...DOC_PREFS_DEFAULTS, ...parsed };
}

export function saveDocPrefs(prefs: DocPrefs, slug?: SlugLike): void {
  try { localStorage.setItem(prefsKey(slug), JSON.stringify(prefs)); } catch {}
}

/** قراءة متزامنة لمفتاح واحد (بلا حالة React) — داخل سلوكيات المحرر. */
export function getDocPref<K extends keyof DocPrefs>(key: K, slug?: SlugLike): DocPrefs[K] {
  return loadDocPrefs(slug)[key];
}
