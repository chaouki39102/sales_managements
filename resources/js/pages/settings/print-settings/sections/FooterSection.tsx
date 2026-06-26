// resources/js/pages/settings/print-settings/sections/FooterSection.tsx
import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { BorderSelect } from './HeaderSection';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function FooterSectionControls({ tpl, update }: Props) {
  return (
    <>
      <Section title="التذييل — النصوص والتواقيع" icon="ti-file-text">
        {/* Footer lines */}
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 1</label>
          <input className="ps-input" value={tpl.footerLine1}
            onChange={e => update('footerLine1', e.target.value)}
            placeholder="مثال: مفتوح من 08:00 إلى 20:00" />
        </div>
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 2</label>
          <input className="ps-input" value={tpl.footerLine2}
            onChange={e => update('footerLine2', e.target.value)} />
        </div>
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 3</label>
          <input className="ps-input" value={tpl.footerLine3}
            onChange={e => update('footerLine3', e.target.value)} />
        </div>

        <BorderSelect label="فاصل التذييل" value={tpl.footerSeparator}
          onChange={v => update('footerSeparator', v)} />

        <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

        {/* Thank you */}
        <Toggle value={tpl.showThankYou} onChange={v => update('showThankYou', v)} label="رسالة الشكر" />
        {tpl.showThankYou && (
          <>
            <div className="ps-field">
              <label className="ps-field-label">نص رسالة الشكر</label>
              <input className="ps-input" value={tpl.thankYouText}
                onChange={e => update('thankYouText', e.target.value)} />
            </div>
            <SliderField label="حجم خط الشكر" value={tpl.thankYouFontSize} min={9} max={18} unit="px"
              onChange={v => update('thankYouFontSize', v)} />
          </>
        )}

        {/* Returns policy */}
        <Toggle value={tpl.showReturnsPolicy} onChange={v => update('showReturnsPolicy', v)} label="سياسة الإرجاع" />
        {tpl.showReturnsPolicy && (
          <div className="ps-field">
            <label className="ps-field-label">نص سياسة الإرجاع</label>
            <textarea className="ps-input ps-textarea" value={tpl.returnsPolicyText}
              onChange={e => update('returnsPolicyText', e.target.value)} rows={2} />
          </div>
        )}

        {/* Legal text */}
        <div className="ps-field">
          <label className="ps-field-label">نص قانوني (تذييل سفلي)</label>
          <textarea className="ps-input ps-textarea" value={tpl.footerLegalText}
            onChange={e => update('footerLegalText', e.target.value)}
            placeholder="مثال: يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري"
            rows={2} />
        </div>
      </Section>

      <Section title="الباركود و QR" icon="ti-barcode">
        <Toggle value={tpl.showBarcode} onChange={v => update('showBarcode', v)} label="الباركود" />
        {tpl.showBarcode && (
          <div className="ps-field">
            <label className="ps-field-label">محتوى الباركود</label>
            <select className="ps-select" value={tpl.barcodeContent}
              onChange={e => update('barcodeContent', e.target.value as any)}>
              <option value="doc-number">رقم المستند</option>
              <option value="total">المبلغ الإجمالي</option>
              <option value="custom">نص مخصص</option>
            </select>
            {tpl.barcodeContent === 'custom' && (
              <input className="ps-input" style={{ marginTop: 4 }} value={tpl.barcodeCustomText}
                onChange={e => update('barcodeCustomText', e.target.value)}
                placeholder="أدخل النص للباركود" />
            )}
          </div>
        )}

        <Toggle value={tpl.showQr} onChange={v => update('showQr', v)} label="QR Code" />
        {tpl.showQr && (
          <div className="ps-field">
            <label className="ps-field-label">محتوى QR</label>
            <select className="ps-select" value={tpl.qrContent}
              onChange={e => update('qrContent', e.target.value as any)}>
              <option value="doc-number">رقم المستند</option>
              <option value="company-info">معلومات الشركة</option>
              <option value="both">الاثنين معاً</option>
            </select>
          </div>
        )}
      </Section>

      <Section title="التواقيع والختم" icon="ti-signature">
        <Toggle value={tpl.showCashierSignature} onChange={v => update('showCashierSignature', v)} label="إمضاء الكاشير" />
        <Toggle value={tpl.showClientSignature}  onChange={v => update('showClientSignature', v)} label="إمضاء العميل" />
        <Toggle value={tpl.showStamp}            onChange={v => update('showStamp', v)} label="ختم المؤسسة" />
      </Section>
    </>
  );
}
