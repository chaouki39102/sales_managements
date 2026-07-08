// ════════════════════════════════════════════════════════════════════════════
// pos/components/POSSettingsModal.tsx
//
// واجهة إعدادات POS — يُعدِّل usePOSSettings مباشرة (يُحفظ في localStorage)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import type { POSSettings, PriceDisplayMode, GridDefaultSize } from '@/pos/hooks/usePOSSettings';
import { isWebUsbSupported } from '@/pos/utils/printService';
import type { Warehouse, DocumentType } from '@/types';
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
}

type Tab = 'general' | 'pricing' | 'print' | 'receipt' | 'security';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'general',  label: 'عام',       icon: 'ti-settings' },
  { key: 'pricing',  label: 'الأسعار',   icon: 'ti-tag' },
  { key: 'print',    label: 'الطباعة',   icon: 'ti-printer' },
  { key: 'receipt',  label: 'الإيصال',   icon: 'ti-receipt' },
  { key: 'security', label: 'الأمان',    icon: 'ti-lock' },
];

const PAYMENT_OPTIONS = [
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

const toggleSettings: { key: keyof POSSettings; label: string }[] = [
  { key: 'showQuickbarOnStart', label: 'إظهار شريط المنتجات السريعة عند الفتح' },
  { key: 'confirmOnClear',      label: 'طلب تأكيد قبل مسح السلة' },
  { key: 'autoClosePayment',    label: 'إغلاق نافذة الدفع تلقائياً بعد النجاح' },
  { key: 'playSoundOnAdd',      label: 'صوت عند إضافة منتج' },
  { key: 'playSoundOnSale',     label: 'صوت عند إتمام البيع' },
  { key: 'showStockOnCard',     label: 'إظهار الرصيد في بطاقة المنتج' },
  { key: 'hideOutOfStock',      label: 'إخفاء المنتجات النافذة من الشبكة' },
  { key: 'clearSearchOnAdd',    label: 'تفريغ البحث بعد إضافة منتج' },
  { key: 'keyboardNav',         label: 'التنقل عبر النتائج بلوحة المفاتيح (↑↓)' },
];

export default function POSSettingsModal({
  settings, onSave, onReset, onClose, warehouses, documentTypes,
}: POSSettingsModalProps) {
  const [local,     setLocal]     = useState<POSSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [dirty,     setDirty]     = useState(false);
  const [showPin,   setShowPin]   = useState(false);
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
    ['FV', 'BL', 'FAC', 'PRO', 'DEV'].includes(t.code),
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
                {PAYMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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
                  onChange={v => patch({ [key]: v } as any)}
                  label={label}
                />
              </div>
            ))}
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
                      onChange={() => patch({ printMode: opt.value as any })}
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
              <Switch
                checked={local.autoPrint}
                onChange={v => patch({ autoPrint: v })}
                label="طباعة تلقائية بعد كل بيع"
              />
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
