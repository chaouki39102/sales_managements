// ════════════════════════════════════════════════════════════════════════════
// pos/components/POSSettingsModal.tsx
//
// واجهة إعدادات POS — يفتحها المدير من الـ TopBar
// يُعدِّل usePOSSettings مباشرة (يُحفظ في localStorage)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import type { POSSettings, PriceDisplayMode, GridDefaultSize } from '@/pos/hooks/usePOSSettings';
import { isWebUsbSupported } from '@/pos/utils/printService';
import type { Warehouse, DocumentType } from '@/types';

interface POSSettingsModalProps {
  settings:      POSSettings;
  onSave:        (patch: Partial<POSSettings>) => void;
  onReset:       () => void;
  onClose:       () => void;
  warehouses:    Warehouse[];
  documentTypes: DocumentType[];
}

type Tab = 'general' | 'pricing' | 'print' | 'receipt' | 'security';

export default function POSSettingsModal({
  settings, onSave, onReset, onClose, warehouses, documentTypes,
}: POSSettingsModalProps) {
  const [local,     setLocal]     = useState<POSSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [dirty,     setDirty]     = useState(false);
  const [showPin,   setShowPin]   = useState(false);

  const patch = (p: Partial<POSSettings>) => {
    setLocal(prev => ({ ...prev, ...p }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(local);
    setDirty(false);
    onClose();
  };

  const handleReset = () => {
    if (!confirm('هل تريد إعادة ضبط كل الإعدادات للقيم الافتراضية؟')) return;
    onReset();
    onClose();
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'general',  label: 'عام',       icon: 'ti-settings' },
    { key: 'pricing',  label: 'الأسعار',   icon: 'ti-tag' },
    { key: 'print',    label: 'الطباعة',   icon: 'ti-printer' },
    { key: 'receipt',  label: 'الإيصال',   icon: 'ti-receipt' },
    { key: 'security', label: 'الأمان',    icon: 'ti-lock' },
  ];

  const invoiceTypes = documentTypes.filter(t =>
    ['FV', 'BL', 'FAC', 'PRO', 'DEV'].includes(t.code),
  );

  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">
              <i className="ti ti-settings-2" style={{ color: 'var(--em)', marginLeft: 7 }} />
              إعدادات نقطة البيع
            </div>
            <div className="m-sub">تُحفَظ محلياً لهذا الجهاز</div>
          </div>
          <button className="m-x" onClick={onClose} type="button">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Tabs */}
        <div className="pos-set-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`pos-set-tab ${activeTab === t.key ? 'on' : ''}`}
              onClick={() => setActiveTab(t.key)}
              type="button"
            >
              <i className={`ti ${t.icon}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="m-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── عام ── */}
          {activeTab === 'general' && (
            <div className="fgrid">
              <div className="fg s2">
                <label>المستودع الافتراضي</label>
                <select
                  value={local.defaultWarehouseId ?? ''}
                  onChange={e => patch({ defaultWarehouseId: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">— تلقائي (is_default) —</option>
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
                  <option value="cash">💵 نقداً</option>
                  <option value="cib">💳 CIB</option>
                  <option value="ccp">📮 CCP</option>
                  <option value="credit">📋 آجل</option>
                </select>
              </div>

              <div className="fg s2">
                <label>حجم شبكة المنتجات الافتراضي</label>
                <select
                  value={local.defaultGridSize}
                  onChange={e => patch({ defaultGridSize: e.target.value as GridDefaultSize })}
                >
                  <option value="xs">XS — كثيف جداً</option>
                  <option value="sm">SM — كثيف</option>
                  <option value="md">MD — متوسط (افتراضي)</option>
                  <option value="lg">LG — كبير</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="fg s2">
                <div className="pos-set-section">سلوك الواجهة</div>
              </div>

              {[
                { key: 'showQuickbarOnStart', label: 'إظهار شريط المنتجات السريعة عند الفتح' },
                { key: 'confirmOnClear',      label: 'طلب تأكيد قبل مسح السلة' },
                { key: 'autoClosePayment',    label: 'إغلاق نافذة الدفع تلقائياً بعد النجاح' },
                { key: 'playSoundOnAdd',      label: 'صوت عند إضافة منتج (beep)' },
                { key: 'playSoundOnSale',     label: 'صوت عند إتمام البيع (success chime)' },
                { key: 'showStockOnCard',     label: 'إظهار الرصيد في بطاقة المنتج' },
                { key: 'hideOutOfStock',      label: 'إخفاء المنتجات النافذة من الشبكة' },
              ].map(({ key, label }) => (
                <div className="fg s2" key={key}>
                  <label className="pos-set-toggle">
                    <input
                      type="checkbox"
                      checked={(local as any)[key]}
                      onChange={e => patch({ [key]: e.target.checked } as any)}
                    />
                    <span className="toggle-track" />
                    <span className="toggle-label">{label}</span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* ── الأسعار ── */}
          {activeTab === 'pricing' && (
            <div className="fgrid">
              <div className="fg s2">
                <label>طريقة عرض الأسعار في بطاقات المنتجات</label>
                <div className="pos-set-radio-group">
                  {([
                    { value: 'ttc', label: 'السعر TTC (شامل الضريبة)', desc: 'ما يدفعه الزبون فعلياً' },
                    { value: 'ht',  label: 'السعر HT (قبل الضريبة)',   desc: 'للمحلات التجارية B2B' },
                  ] as { value: PriceDisplayMode; label: string; desc: string }[]).map(opt => (
                    <label key={opt.value} className={`pos-set-radio ${local.priceDisplayMode === opt.value ? 'on' : ''}`}>
                      <input
                        type="radio"
                        name="priceDisplayMode"
                        value={opt.value}
                        checked={local.priceDisplayMode === opt.value}
                        onChange={() => patch({ priceDisplayMode: opt.value })}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="fg">
                <label>الحد الأقصى للخصم (%)</label>
                <div className="inp-row">
                  <input
                    type="number"
                    min={0} max={100} step={1}
                    value={local.maxDiscountPct}
                    onChange={e => patch({ maxDiscountPct: parseInt(e.target.value) || 0 })}
                  />
                  <div className="inp-suf">%</div>
                </div>
                <div className="fg-hint">0 = بدون حد أقصى</div>
              </div>

              <div className="fg">
                <label>عتبة تطبيق خصم الكمية</label>
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
          )}

          {/* ── الطباعة ── */}
          {activeTab === 'print' && (
            <div className="fgrid">
              <div className="fg s2">
                <label>طريقة الطباعة</label>
                <div className="pos-set-radio-group">
                  {[
                    { value: 'browser',  label: '🖨️ طباعة المتصفح (الافتراضي)', desc: 'يفتح dialog الطباعة العادي' },
                    { value: 'thermal',  label: '🔌 طابعة حرارية ESC/POS',        desc: `WebUSB — ${isWebUsbSupported() ? '✅ مدعوم في متصفحك' : '❌ غير مدعوم — استخدم Chrome/Edge'}` },
                  ].map(opt => (
                    <label key={opt.value} className={`pos-set-radio ${local.printMode === opt.value ? 'on' : ''}`}>
                      <input
                        type="radio" name="printMode" value={opt.value}
                        checked={local.printMode === opt.value}
                        onChange={() => patch({ printMode: opt.value as any })}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{opt.desc}</div>
                      </div>
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
                  <option value={1}>نسخة واحدة</option>
                  <option value={2}>نسختان</option>
                  <option value={3}>3 نسخ</option>
                </select>
              </div>

              <div className="fg s2">
                <label className="pos-set-toggle">
                  <input
                    type="checkbox"
                    checked={local.autoPrint}
                    onChange={e => patch({ autoPrint: e.target.checked })}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-label">طباعة تلقائية بعد كل بيع</span>
                </label>
              </div>

              <div className="fg s2">
                <label className="pos-set-toggle">
                  <input
                    type="checkbox"
                    checked={local.openCashDrawer}
                    onChange={e => patch({ openCashDrawer: e.target.checked })}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-label">
                    فتح درج النقود تلقائياً عند الدفع نقداً
                    <span style={{ fontSize: 11, color: 'var(--t4)', display: 'block' }}>
                      يعمل مع طابعات ESC/POS المتصلة بالدرج
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ── الإيصال ── */}
          {activeTab === 'receipt' && (
            <div className="fgrid">
              <div className="fg s2">
                <label>اسم الشركة في رأس الإيصال</label>
                <input
                  type="text"
                  value={local.receiptCompanyName ?? ''}
                  onChange={e => patch({ receiptCompanyName: e.target.value || null })}
                  placeholder="اتركه فارغاً لقراءته من بيانات الشركة"
                />
                <div className="fg-hint">اتركه فارغاً ليُقرأ من activeCompany.name تلقائياً</div>
              </div>

              <div className="fg s2">
                <label>سطر رأس إضافي (عنوان، هاتف...)</label>
                <input
                  type="text"
                  value={local.receiptHeader2}
                  onChange={e => patch({ receiptHeader2: e.target.value })}
                  placeholder="مثال: ورقلة، شارع العربي بن مهيدي | 029 71 23 45"
                />
              </div>

              <div className="fg s2">
                <label>رسالة تذييل الإيصال</label>
                <input
                  type="text"
                  value={local.receiptFooter}
                  onChange={e => patch({ receiptFooter: e.target.value })}
                  placeholder="شكراً لتعاملكم معنا"
                />
              </div>

              <div className="fg s2">
                <label className="pos-set-toggle">
                  <input
                    type="checkbox"
                    checked={local.receiptShowQr}
                    onChange={e => patch({ receiptShowQr: e.target.checked })}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-label">إظهار QR Code في الإيصال</span>
                </label>
              </div>
            </div>
          )}

          {/* ── الأمان ── */}
          {activeTab === 'security' && (
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
                <label className="pos-set-toggle">
                  <input
                    type="checkbox"
                    checked={local.discountRequirePin}
                    onChange={e => patch({ discountRequirePin: e.target.checked })}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-label">
                    طلب PIN المدير عند تجاوز حد الخصم
                  </span>
                </label>
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
                        maxLength={4}
                        pattern="[0-9]{4}"
                        inputMode="numeric"
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
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          <button className="btn btn-r" onClick={handleReset} type="button">
            <i className="ti ti-refresh" /> إعادة ضبط
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose} type="button">إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleSave}
            disabled={!dirty}
            type="button"
          >
            <i className="ti ti-device-floppy" /> حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
