// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePOSSettings.ts
//
// إعدادات POS الكاملة — محفوظة في localStorage بـ slug منفصل لكل شركة
//
// يُستخدَم في:
//   - POSPage:    قراءة defaultWarehouseId, defaultDocTypeCode, priceMode...
//   - CartStore:  maxDiscountPct لمنع تجاوز الكاشير حد الخصم
//   - Receipt:    companyHeader, footerMessage
//   - PaymentModal: defaultPaymentModeCode, openCashDrawer
//   - ProductCard:  priceDisplayMode (ht | ttc)
//
// للتعديل: <POSSettingsModal /> يستدعي setSettings()
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PriceDisplayMode = 'ttc' | 'ht';
export type GridDefaultSize  = 'xs' | 'sm' | 'md' | 'lg';

export interface POSSettings {
  // ── مستودع وفاتورة ──────────────────────────────────────────────────────
  /** ID المستودع الافتراضي — null يعني يُقرأ من warehouses[is_default] */
  defaultWarehouseId:   number | null;
  /** كود نوع الفاتورة الافتراضي عند الإنهاء — FV, BL, FAC */
  defaultDocTypeCode:   string;

  // ── أسعار وخصومات ───────────────────────────────────────────────────────
  /** عرض الأسعار في بطاقات المنتجات — HT أو TTC */
  priceDisplayMode:     PriceDisplayMode;
  /** الحد الأقصى للخصم الذي يستطيع الكاشير تطبيقه — 0 = لا حد */
  maxDiscountPct:       number;
  /** هل يحتاج الخصم فوق X% تأكيد مدير (PIN) */
  discountRequirePin:   boolean;
  /** النسبة التي فوقها يُطلب PIN */
  discountPinThreshold: number;
  /** PIN رقمي 4 أرقام للمدير */
  managerPin:           string;

  // ── طباعة ───────────────────────────────────────────────────────────────
  /** فتح درج النقود تلقائياً عند الدفع نقداً */
  openCashDrawer:       boolean;
  /** طباعة تلقائية بعد كل بيع */
  autoPrint:            boolean;
  /** عدد نسخ الطباعة */
  printCopies:          1 | 2 | 3;
  /** طريقة الطباعة */
  printMode:            'thermal' | 'browser';

  // ── رأس وتذييل الإيصال ─────────────────────────────────────────────────
  /** اسم المؤسسة في رأس الإيصال — null يعني يُقرأ من activeCompany */
  receiptCompanyName:   string | null;
  /** سطر إضافي في رأس الإيصال (العنوان، الهاتف...) */
  receiptHeader2:       string;
  /** رسالة في تذييل الإيصال */
  receiptFooter:        string;
  /** إظهار QR code في الإيصال */
  receiptShowQr:        boolean;

  // ── واجهة المستخدم ───────────────────────────────────────────────────────
  /** حجم شبكة المنتجات الافتراضي */
  defaultGridSize:      GridDefaultSize;
  /** عرض الشبكة أو القائمة الافتراضي */
  defaultView:          'grid' | 'list';
  /** إظهار شريط Quick Items عند فتح الصفحة */
  showQuickbarOnStart:  boolean;
  /** تشغيل صوت عند إضافة منتج */
  playSoundOnAdd:       boolean;
  /** تشغيل صوت عند إتمام البيع */
  playSoundOnSale:      boolean;
  /** إغلاق نافذة الدفع تلقائياً بعد النجاح (بدلاً من الانتظار للطباعة) */
  autoClosePayment:     boolean;
  /** طلب تأكيد قبل مسح السلة */
  confirmOnClear:       boolean;
  /** الوضع الافتراضي لطريقة الدفع */
  defaultPaymentCode:   string;

  // ── بطاقة المنتج ────────────────────────────────────────────────────────
  /** إظهار المخزون في بطاقة المنتج */
  showStockOnCard:      boolean;
  /** إخفاء المنتجات النافذة من الشبكة */
  hideOutOfStock:       boolean;
  /** تفريغ حقل البحث بعد إضافة منتج */
  clearSearchOnAdd:     boolean;
  /** التنقل عبر نتائج البحث بلوحة المفاتيح */
  keyboardNav:          boolean;

  // ── تخطيط الشاشة ──────────────────────────────────────────────────────
  /** عرض السلة (بالـ px) — قابل للسحب */
  cartWidth:            number;

  // ── الإشعارات ─────────────────────────────────────────────────────────
  /** تفعيل/تعطيل الإشعارات (toast) */
  toastEnabled:         boolean;
  /** مدة عرض الإشعارات (toast) بالميللي ثانية — 0 = حتى يُضغط عليها */
  toastDuration:        number;
  /** مكان ظهور الإشعارات (toast) */
  toastPosition:        'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

// ─── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_POS_SETTINGS: POSSettings = {
  defaultWarehouseId:   null,
  defaultDocTypeCode:   'FV',
  priceDisplayMode:     'ttc',
  maxDiscountPct:       0,
  discountRequirePin:   false,
  discountPinThreshold: 20,
  managerPin:           '',
  openCashDrawer:       false,
  autoPrint:            false,
  printCopies:          1,
  printMode:            'browser',
  receiptCompanyName:   null,
  receiptHeader2:       '',
  receiptFooter:        'شكراً لتعاملكم معنا',
  receiptShowQr:        false,
  defaultGridSize:      'md',
  defaultView:          'grid',
  showQuickbarOnStart:  true,
  playSoundOnAdd:       false,
  playSoundOnSale:      false,
  autoClosePayment:     false,
  confirmOnClear:       true,
  defaultPaymentCode:   'cash',
  showStockOnCard:      true,
  hideOutOfStock:       false,
  clearSearchOnAdd:     false,
  keyboardNav:          true,
  cartWidth:            390,
  toastEnabled:         true,
  toastDuration:        3000,
  toastPosition:        'top-left',
};

// ─── Storage key ──────────────────────────────────────────────────────────────

const settingsKey = (slug: string | null) =>
  slug ? `pos-settings-${slug}` : 'pos-settings-global';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePOSSettings(slug: string | null) {
  const [settings, setSettingsState] = useState<POSSettings>(() => {
    try {
      const stored = localStorage.getItem(settingsKey(slug));
      if (!stored) return DEFAULT_POS_SETTINGS;
      // merge: القيم الجديدة المضافة في DEFAULT تُرث قيمتها الافتراضية
      return { ...DEFAULT_POS_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_POS_SETTINGS;
    }
  });

  // تحديث عند تغيير الـ slug (تبديل الشركة)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(settingsKey(slug));
      if (stored) {
        setSettingsState({ ...DEFAULT_POS_SETTINGS, ...JSON.parse(stored) });
      } else {
        setSettingsState(DEFAULT_POS_SETTINGS);
      }
    } catch {
      setSettingsState(DEFAULT_POS_SETTINGS);
    }
  }, [slug]);

  const setSettings = useCallback((patch: Partial<POSSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(settingsKey(slug), JSON.stringify(next)); }
      catch { /* storage full */ }
      return next;
    });
  }, [slug]);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_POS_SETTINGS);
    try { localStorage.removeItem(settingsKey(slug)); } catch {}
  }, [slug]);

  return { settings, setSettings, resetSettings };
}

// ─── Discount gate ────────────────────────────────────────────────────────────

/**
 * يتحقق هل يستطيع الكاشير تطبيق الخصم المطلوب
 * Returns: { allowed: true } | { allowed: false, reason: 'max_exceeded' | 'pin_required' }
 */
export function checkDiscountAllowed(
  discountPct: number,
  settings:    POSSettings,
): { allowed: boolean; reason?: 'max_exceeded' | 'pin_required' } {
  const max = settings.maxDiscountPct;
  if (max > 0 && discountPct > max) {
    return { allowed: false, reason: 'max_exceeded' };
  }
  if (
    settings.discountRequirePin &&
    settings.managerPin &&
    discountPct > settings.discountPinThreshold
  ) {
    return { allowed: false, reason: 'pin_required' };
  }
  return { allowed: true };
}
