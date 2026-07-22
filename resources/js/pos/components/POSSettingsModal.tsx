// ════════════════════════════════════════════════════════════════════════════
// pos/components/POSSettingsModal.tsx
//
// واجهة إعدادات POS — يُعدِّل usePOSSettings مباشرة (يُحفظ في localStorage)
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import type { POSSettings, PriceDisplayMode, GridDefaultSize, QuickCashAction, AfterSaleAction } from '@/pos/hooks/usePOSSettings';
import { isWebUsbSupported } from '@/pos/utils/printService';
import { SOUND_PRESETS, previewSound } from '@/pos/utils/posSounds';
import type { Warehouse, DocumentType, PaymentMode } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { ConfirmDialog } from '@/components/ui';

interface POSSettingsModalProps {
  settings:      POSSettings;
  onSave:        (patch: Partial<POSSettings>) => void;
  onReset:       () => void;
  onClose:       () => void;
  warehouses:    Warehouse[];
  documentTypes: DocumentType[];
  paymentModes:  PaymentMode[];
  /** System-level fiscal stamp setting (from DB) */
  systemFiscalStampEnabled: boolean;
  /** Toggle fiscal stamp in system settings DB */
  onToggleFiscalStamp: (val: boolean) => Promise<void>;
  /** System-level allow negative stock setting (from DB) */
  systemAllowNegativeStock: boolean;
  /** Toggle allow negative stock in system settings DB */
  onToggleAllowNegative: (val: boolean) => Promise<void>;
}

type Tab = 'general' | 'pricing' | 'print' | 'receipt' | 'security';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'general',  label: 'عام',       icon: 'ti-settings' },
  { key: 'pricing',  label: 'الأسعار',   icon: 'ti-tag' },
  { key: 'print',    label: 'الطباعة',   icon: 'ti-printer' },
  { key: 'receipt',  label: 'الإيصال',   icon: 'ti-receipt' },
  { key: 'security', label: 'الأمان',    icon: 'ti-lock' },
];

const DEFAULT_PAYMENT_OPTIONS = [
  { value: 'cash',   label: 'نقداً' },
  { value: 'cib',    label: 'CIB' },
  { value: 'ccp',    label: 'CCP' },
  { value: 'credit', label: 'آجل' },
];

const GRID_OPTIONS: { value: GridDefaultSize; label: string }[] = [
  { value: 'xs', label: 'XS — كثيف جداً' },
  { value: 'sm', label: 'SM — كثيف' },
  { value: 'md', label: 'MD — متوسط' },
  { value: 'lg', label: 'LG — كبير' },
];

const PRINT_COPIES: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: 'نسخة واحدة' },
  { value: 2, label: 'نسختان' },
  { value: 3, label: '3 نسخ' },
];

const TOAST_DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 1500, label: 'سريع (1.5 ثانية)' },
  { value: 3000, label: 'عادي (3 ثواني)' },
  { value: 5000, label: 'بطيء (5 ثواني)' },
  { value: 8000, label: 'بطيء جداً (8 ثواني)' },
  { value: 0,    label: 'حتى يُضغط عليها' },
];

const TOAST_POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'top-left',     label: 'أعلى يسار' },
  { value: 'top-center',   label: 'أعلى وسط' },
  { value: 'top-right',    label: 'أعلى يمين' },
  { value: 'bottom-left',  label: 'أسفل يسار' },
  { value: 'bottom-center',label: 'أسفل وسط' },
  { value: 'bottom-right', label: 'أسفل يمين' },
];

const toggleSettings: { key: keyof POSSettings; label: string; triState?: boolean }[] = [
  { key: 'showQuickbarOnStart', label: 'إظهار شريط المنتجات السريعة عند الفتح' },
  { key: 'confirmOnClear',      label: 'طلب تأكيد قبل مسح السلة' },
  { key: 'autoClosePayment',    label: 'إغلاق نافذة الدفع تلقائياً بعد النجاح' },
  { key: 'playSoundOnAdd',      label: 'صوت عند إضافة منتج' },
  { key: 'playSoundOnSale',     label: 'صوت عند إتمام البيع' },
  { key: 'showStockOnCard',     label: 'إظهار الرصيد في بطاقة المنتج' },
  { key: 'hideOutOfStock',      label: 'إخفاء المنتجات النافذة من الشبكة' },
  { key: 'clearSearchOnAdd',    label: 'تفريغ البحث بعد إضافة منتج' },
  { key: 'keyboardNav',         label: 'التنقل عبر النتائج بلوحة المفاتيح (↑↓)' },
  { key: 'advanceOnAdd',        label: 'الانتقال للمنتج التالي بعد الإضافة' },
];

export default function POSSettingsModal({
  settings, onSave, onReset, onClose, warehouses, documentTypes, paymentModes,
  systemFiscalStampEnabled, onToggleFiscalStamp,
  systemAllowNegativeStock, onToggleAllowNegative,
}: POSSettingsModalProps) {
  const [local,     setLocal]     = useState<POSSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [dirty,     setDirty]     = useState(false);
  const [showPin,   setShowPin]   = useState(false);
  const [stampSaving, setStampSaving]   = useState(false);
  const [negSaving,   setNegSaving]     = useState(false);
  const deleteConfirm = useConfirm();
  const notify = useNotification();

  const patch = (p: Partial<POSSettings>) => {
    setLocal(prev => ({ ...prev, ...p }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(local);
    setDirty(false);
    onClose();
  };

  const handleReset = async () => {
    if (!await deleteConfirm.confirm('هل تريد إعادة ضبط كل الإعدادات للقيم الافتراضية؟')) return;
    onReset();
    onClose();
    notify.success('تم إعادة الضبط');
  };

  const invoiceTypes = documentTypes.filter(t =>
    ['POS', 'FV', 'BL', 'FAC', 'PRO', 'DEV'].includes(t.code),
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <label>المستودع الافتراضي</label>
              <select
                value={local.defaultWarehouseId ?? ''}
                onChange={e => patch({ defaultWarehouseId: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">— تلقائي —</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="fg s2">
              <label>نوع الفاتورة الافتراضي</label>
              <select
                value={local.defaultDocTypeCode}
                onChange={e => patch({ defaultDocTypeCode: e.target.value })}
              >
                {invoiceTypes.map(t => (
                  <option key={t.id} value={t.code}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>

            <div className="fg s2">
              <label>طريقة الدفع الافتراضية</label>
              <select
                value={local.defaultPaymentCode}
                onChange={e => patch({ defaultPaymentCode: e.target.value })}
              >
                {(paymentModes?.length ? paymentModes : DEFAULT_PAYMENT_OPTIONS.map(o => ({ id: 0, code: o.value, name: o.label } as any))).map((m: any) => (
                  <option key={m.code} value={m.code?.toLowerCase()}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="fg s2">
              <label>حجم شبكة المنتجات الافتراضي</label>
              <select
                value={local.defaultGridSize}
                onChange={e => patch({ defaultGridSize: e.target.value as GridDefaultSize })}
              >
                {GRID_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {toggleSettings.map(({ key, label }) => (
              <div className="fg s2" key={key}>
                <Switch
                  checked={local[key] as boolean}
                  onChange={v => patch({ [key]: v } as Partial<POSSettings>)}
                  label={label}
                />
              </div>
            ))}

            {/* ── السماح بالمخزون السالب — يكتب مباشرة في إعدادات النظام ── */}
            <div className="fg s2">
              <Switch
                checked={systemAllowNegativeStock}
                onChange={async (v) => {
                  setNegSaving(true);
                  try { await onToggleAllowNegative(v); }
                  finally { setNegSaving(false); }
                }}
                label={negSaving ? 'جاري الحفظ...' : 'السماح بالمخزون السالب'}
              />
              <div className="fg-hint">نفس إعداد &quot;السماح بالمخزون السالب&quot; في إعدادات النظام</div>
            </div>

            {/* ── الطابع المالي — يكتب مباشرة في إعدادات النظام ── */}
            <div className="fg s2">
              <Switch
                checked={systemFiscalStampEnabled}
                onChange={async (v) => {
                  setStampSaving(true);
                  try { await onToggleFiscalStamp(v); }
                  finally { setStampSaving(false); }
                }}
                label={stampSaving ? 'جاري الحفظ...' : 'الطابع المالي (Timbre Fiscal)'}
              />
              <div className="fg-hint">نفس إعداد &quot;الطابع المالي&quot; في إعدادات النظام — تغييره هنا يُحدّث النظام بالكامل</div>
            </div>

            {(local.playSoundOnAdd || local.playSoundOnSale) && (
              <>
                <div className="fg s2">
                  <label>مستوى الصوت — {local.soundVolume}%</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <i className="ti ti-volume" style={{ color: 'var(--t4)', fontSize: 16 }} />
                    <input
                      type="range" min={0} max={100} step={5}
                      value={local.soundVolume}
                      onChange={e => patch({ soundVolume: parseInt(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--em)' }}
                    />
                    <i className="ti ti-volume-2" style={{ color: 'var(--t4)', fontSize: 16 }} />
                  </div>
                </div>

                <div className="fg s2">
                  <label>النغمة</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginTop: 6 }}>
                    {SOUND_PRESETS.map(p => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '10px 6px', borderRadius: 8, cursor: 'pointer',
                          background: local.soundPreset === p.id ? 'var(--emb)' : 'var(--bg2)',
                          border: `1.5px solid ${local.soundPreset === p.id ? 'var(--embo)' : 'var(--b2)'}`,
                          color: local.soundPreset === p.id ? 'var(--em)' : 'var(--t2)',
                          fontWeight: local.soundPreset === p.id ? 700 : 400,
                          transition: 'all .15s',
                        }}
                        onClick={() => patch({ soundPreset: p.id })}
                      >
                        <i className={`ti ${p.icon}`} style={{ fontSize: 18 }} />
                        <span style={{ fontSize: 12 }}>{p.label}</span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); previewSound(p.id, local.soundVolume); }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--t4)', fontSize: 14, padding: 2,
                          }}
                          title="استمع"
                        >
                          <i className="ti ti-player-play" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="fg s2">
              <Switch
                checked={local.toastEnabled}
                onChange={v => patch({ toastEnabled: v })}
                label="إشعارات toast"
              />
            </div>

            {local.toastEnabled && (
              <>
                <div className="fg s2">
                  <label>مدة عرض الإشعارات</label>
                  <select
                    value={local.toastDuration}
                    onChange={e => patch({ toastDuration: parseInt(e.target.value) })}
                  >
                    {TOAST_DURATION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="fg-hint">مدة ظهور إشعارات النجاح والخطأ أعلى الشاشة</div>
                </div>

                <div className="fg s2">
                  <label>مكان ظهور الإشعارات</label>
                  <select
                    value={local.toastPosition}
                    onChange={e => patch({ toastPosition: e.target.value as POSSettings['toastPosition'] })}
                  >
                    {TOAST_POSITION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        );

      case 'pricing':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <label>طريقة عرض الأسعار</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {([
                  { value: 'ttc', label: 'TTC شامل الضريبة' },
                  { value: 'ht',  label: 'HT قبل الضريبة' },
                ] as { value: PriceDisplayMode; label: string }[]).map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      background: local.priceDisplayMode === opt.value ? 'var(--emb)' : 'var(--bg2)',
                      border: `1px solid ${local.priceDisplayMode === opt.value ? 'var(--embo)' : 'var(--b2)'}`,
                      color: local.priceDisplayMode === opt.value ? 'var(--em)' : 'var(--t2)',
                      fontWeight: local.priceDisplayMode === opt.value ? 700 : 400,
                      fontSize: 13, transition: 'all .15s',
                    }}
                  >
                    <input
                      type="radio" name="priceDisplayMode"
                      value={opt.value} style={{ display: 'none' }}
                      checked={local.priceDisplayMode === opt.value}
                      onChange={() => patch({ priceDisplayMode: opt.value })}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="fg">
              <label>الحد الأقصى للخصم (%)</label>
              <div className="inp-row">
                <input
                  type="number" min={0} max={100} step={1}
                  value={local.maxDiscountPct}
                  onChange={e => patch({ maxDiscountPct: parseInt(e.target.value) || 0 })}
                />
                <div className="inp-suf">%</div>
              </div>
              <div className="fg-hint">0 = بدون حد أقصى</div>
            </div>

            <div className="fg">
              <label>عتبة طلب PIN الخصم (%)</label>
              <div className="inp-row">
                <input
                  type="number" min={0} max={100} step={1}
                  value={local.discountPinThreshold}
                  onChange={e => patch({ discountPinThreshold: parseInt(e.target.value) || 0 })}
                />
                <div className="inp-suf">%</div>
              </div>
              <div className="fg-hint">فوق هذه النسبة يُطلب PIN المدير</div>
            </div>
          </div>
        );

      case 'print':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <label>طريقة الطباعة</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {[
                  { value: 'browser', label: 'المتصفح', desc: 'يفتح dialog الطباعة العادي' },
                  { value: 'thermal', label: 'حرارية ESC/POS', desc: `WebUSB — ${isWebUsbSupported() ? 'مدعوم' : 'يحتاج Chrome/Edge'}` },
                ].map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      flex: 1, padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      background: local.printMode === opt.value ? 'var(--emb)' : 'var(--bg2)',
                      border: `1px solid ${local.printMode === opt.value ? 'var(--embo)' : 'var(--b2)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    <input
                      type="radio" name="printMode" value={opt.value}
                      style={{ display: 'none' }}
                      checked={local.printMode === opt.value}
                      onChange={() => patch({ printMode: opt.value as POSSettings['printMode'] })}
                    />
                    <div style={{ fontWeight: local.printMode === opt.value ? 700 : 400, fontSize: 13, color: local.printMode === opt.value ? 'var(--em)' : 'var(--t2)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="fg">
              <label>عدد النسخ</label>
              <select
                value={local.printCopies}
                onChange={e => patch({ printCopies: parseInt(e.target.value) as 1 | 2 | 3 })}
              >
                {PRINT_COPIES.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="fg s2">
              <label>بعد إتمام البيع</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                {[
                  { value: 'preview', label: 'معاينة الإيصال', desc: 'فتح نافذة المعاينة' },
                  { value: 'print', label: 'طباعة مباشرة', desc: 'إرسال للطابعة فوراً' },
                  { value: 'none', label: 'إغلاق فقط', desc: 'بدون معاينة أو طباعة' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: local.afterSaleAction === opt.value ? 'var(--emb)' : 'var(--bg2)',
                      border: `1px solid ${local.afterSaleAction === opt.value ? 'var(--embo)' : 'var(--b2)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    <input
                      type="radio" name="afterSaleAction" value={opt.value}
                      style={{ display: 'none' }}
                      checked={local.afterSaleAction === opt.value}
                      onChange={() => patch({ afterSaleAction: opt.value as AfterSaleAction })}
                    />
                    <div style={{ fontWeight: local.afterSaleAction === opt.value ? 700 : 400, fontSize: 12, color: local.afterSaleAction === opt.value ? 'var(--em)' : 'var(--t2)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="fg s2">
              <label>سلوك الدفع السريع (نقدي كامل)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                {[
                  { value: 'silent', label: 'طباعة مباشرة', desc: 'حرارية فقط — بدون أي نافذة' },
                  { value: 'preview', label: 'معاينة الإيصال', desc: 'فتح نافذة المعاينة أولاً' },
                  { value: 'print', label: 'طباعة المتصفح', desc: 'فتح نافذة الطباعة العادية' },
                  { value: 'none', label: 'بدون طباعة', desc: 'إتمام البيع فقط' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: local.quickCashAction === opt.value ? 'var(--emb)' : 'var(--bg2)',
                      border: `1px solid ${local.quickCashAction === opt.value ? 'var(--embo)' : 'var(--b2)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    <input
                      type="radio" name="quickCashAction" value={opt.value}
                      style={{ display: 'none' }}
                      checked={local.quickCashAction === opt.value}
                      onChange={() => patch({ quickCashAction: opt.value as QuickCashAction })}
                    />
                    <div style={{ fontWeight: local.quickCashAction === opt.value ? 700 : 400, fontSize: 12, color: local.quickCashAction === opt.value ? 'var(--em)' : 'var(--t2)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="fg s2">
              <Switch
                checked={local.openCashDrawer}
                onChange={v => patch({ openCashDrawer: v })}
                label="فتح درج النقود تلقائياً عند الدفع نقداً"
              />
              <div className="fg-hint">يعمل مع طابعات ESC/POS المتصلة بالدرج</div>
            </div>
          </div>
        );

      case 'receipt':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <label>اسم الشركة في رأس الإيصال</label>
              <input
                type="text"
                value={local.receiptCompanyName ?? ''}
                onChange={e => patch({ receiptCompanyName: e.target.value || null })}
                placeholder="اتركه فارغاً لقراءته من بيانات الشركة"
              />
              <div className="fg-hint">اتركه فارغاً ليُقرأ من activeCompany.name</div>
            </div>

            <div className="fg s2">
              <label>سطر رأس إضافي</label>
              <input
                type="text"
                value={local.receiptHeader2}
                onChange={e => patch({ receiptHeader2: e.target.value })}
                placeholder="العنوان، الهاتف..."
              />
            </div>

            <div className="fg s2">
              <label>رسالة التذييل</label>
              <input
                type="text"
                value={local.receiptFooter}
                onChange={e => patch({ receiptFooter: e.target.value })}
                placeholder="شكراً لتعاملكم معنا"
              />
            </div>

            <div className="fg s2">
              <Switch
                checked={local.receiptShowQr}
                onChange={v => patch({ receiptShowQr: v })}
                label="إظهار QR Code في الإيصال"
              />
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <div className="al al-b" style={{ marginBottom: 0 }}>
                <i className="ti ti-info-circle" />
                <div>
                  يمكن تعيين PIN للمدير لتقييد صلاحيات الكاشير على الخصومات الكبيرة.
                  PIN يُخزَّن محلياً — لا يُرسَل للسيرفر.
                </div>
              </div>
            </div>

            <div className="fg s2">
              <Switch
                checked={local.discountRequirePin}
                onChange={v => patch({ discountRequirePin: v })}
                label="طلب PIN المدير عند تجاوز حد الخصم"
              />
            </div>

            {local.discountRequirePin && (
              <>
                <div className="fg">
                  <label>عتبة طلب الـ PIN</label>
                  <div className="inp-row">
                    <input
                      type="number" min={1} max={100}
                      value={local.discountPinThreshold}
                      onChange={e => patch({ discountPinThreshold: parseInt(e.target.value) || 20 })}
                    />
                    <div className="inp-suf">%</div>
                  </div>
                </div>

                <div className="fg">
                  <label>PIN المدير (4 أرقام)</label>
                  <div className="inp-row">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={4} pattern="[0-9]{4}" inputMode="numeric"
                      value={local.managerPin}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        patch({ managerPin: val });
                      }}
                      placeholder="••••"
                      style={{ fontFamily: 'monospace', letterSpacing: 6, textAlign: 'center' }}
                    />
                    <button
                      type="button"
                      className="inp-suf"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowPin(p => !p)}
                    >
                      <i className={`ti ${showPin ? 'ti-eye-off' : 'ti-eye'}`} />
                    </button>
                  </div>
                  {local.managerPin && local.managerPin.length !== 4 && (
                    <div className="fg-hint" style={{ color: 'var(--red)' }}>
                      PIN يجب أن يكون 4 أرقام بالضبط
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="إعدادات نقطة البيع"
      subtitle="تُحفَظ محلياً لهذا الجهاز"
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="default" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" onClick={handleSave} disabled={!dirty}>
            حفظ الإعدادات
          </Button>
        </div>
      }
      footerLeft={
        <Button variant="danger" onClick={handleReset}>
          إعادة ضبط
        </Button>
      }
    >
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 16,
        background: 'var(--bg2)', borderRadius: 10, padding: 3,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500,
              background: activeTab === t.key ? 'var(--bg1)' : 'transparent',
              color: activeTab === t.key ? 'var(--em)' : 'var(--t3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all .15s', boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}
          >
            <i className={`ti ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ height: '55vh', overflowY: 'auto' }}>
        {renderTab()}
      </div>
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </Modal>
  );
}
