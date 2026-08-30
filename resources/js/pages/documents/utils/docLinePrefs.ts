// ════════════════════════════════════════════════════════════════════════════
// pages/documents/utils/docLinePrefs.ts
//
// تفضيلات إدخال الأسطر (Line-Entry Preferences) — مخزنة محلياً (localStorage).
// تُقرأ بشكل متزامن داخل سلوكيات الإدخال (إضافة منتج، التنقل بلوحة المفاتيح،
// بحث المنتجات) دون الحاجة لتمريرها عبر كل المكوّنات، وتُعرض كأزرار تبديل
// في تبويب «الإدخال السريع» داخل نافذة «خيارات إضافية».
// ════════════════════════════════════════════════════════════════════════════

export interface DocLinePrefs {
  /** ملء كمية السطر من إجمالي المخزون تلقائياً عند إضافة منتج. */
  fillFullStock:        boolean;
  /** عند الضغط Enter على كمية السطر: تجاوز حقل المبلغ وإضافة سطر جديد مباشرة. */
  skipAmountField:      boolean;
  /** مسح نص البحث بعد اختيار المنتج (مفعّل افتراضياً). */
  clearProductSearch:   boolean;
  /** فتح منتقي المنتج تلقائياً عند التركيز على سطر فارغ. */
  autoOpenProductOnEmpty: boolean;
  /** إعادة تعيين كمية السطر (إلى المخزون الكامل) عند تغيير المنتج. */
  resetQtyOnChange:     boolean;
}

export const DOC_LINE_PREFS_DEFAULTS: DocLinePrefs = {
  fillFullStock:          false,
  skipAmountField:        false,
  clearProductSearch:     true,
  autoOpenProductOnEmpty: false,
  resetQtyOnChange:       false,
};

const PREFS_KEY = 'doc_line_prefs';

function safeParse(raw: string | null): Partial<DocLinePrefs> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Partial<DocLinePrefs>;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export function loadDocLinePrefs(): DocLinePrefs {
  let parsed: Partial<DocLinePrefs> = {};
  try { parsed = safeParse(localStorage.getItem(PREFS_KEY)); } catch {}
  return { ...DOC_LINE_PREFS_DEFAULTS, ...parsed };
}

export function saveDocLinePrefs(prefs: DocLinePrefs): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

/** قراءة متزامنة لمفتاح واحد (بلا حالة React) — تُستخدم داخل سلوكيات الإدخال. */
export function getDocLinePref<K extends keyof DocLinePrefs>(key: K): DocLinePrefs[K] {
  return loadDocLinePrefs()[key];
}
