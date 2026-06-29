import React from 'react';
import type { ReceiptTemplate80mm, BorderStyle } from '../types';
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
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 1</label>
          <input className="ps-input" value={tpl.footer_line1 ?? ''}
            onChange={e => update('footer_line1', e.target.value)}
            placeholder="مثال: مفتوح من 08:00 إلى 20:00" />
        </div>
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 2</label>
          <input className="ps-input" value={tpl.footer_line2 ?? ''}
            onChange={e => update('footer_line2', e.target.value)} />
        </div>
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 3</label>
          <input className="ps-input" value={tpl.footer_line3 ?? ''}
            onChange={e => update('footer_line3', e.target.value)} />
        </div>

        <BorderSelect label="فاصل التذييل" value={tpl.footer_separator}
          onChange={v => update('footer_separator', v as BorderStyle)} />

        <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

        <Toggle value={tpl.show_thank_you} onChange={v => update('show_thank_you', v)} label="رسالة الشكر" />
        {tpl.show_thank_you && (
          <>
            <div className="ps-field">
              <label className="ps-field-label">نص رسالة الشكر</label>
              <input className="ps-input" value={tpl.thank_you_text ?? ''}
                onChange={e => update('thank_you_text', e.target.value)} />
            </div>
            <SliderField label="حجم خط الشكر" value={tpl.thank_you_size} min={9} max={18} unit="px"
              onChange={v => update('thank_you_size', v)} />
          </>
        )}

        <Toggle value={tpl.show_returns_policy} onChange={v => update('show_returns_policy', v)} label="سياسة الإرجاع" />
        {tpl.show_returns_policy && (
          <div className="ps-field">
            <label className="ps-field-label">نص سياسة الإرجاع</label>
            <textarea className="ps-input ps-textarea" value={tpl.returns_policy_text ?? ''}
              onChange={e => update('returns_policy_text', e.target.value)} rows={2} />
          </div>
        )}

        <div className="ps-field">
          <label className="ps-field-label">نص قانوني (تذييل سفلي)</label>
          <textarea className="ps-input ps-textarea" value={tpl.footer_legal_text ?? ''}
            onChange={e => update('footer_legal_text', e.target.value)}
            placeholder="مثال: يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري"
            rows={2} />
        </div>
      </Section>

      <Section title="الباركود و QR" icon="ti-barcode">
        <Toggle value={tpl.show_barcode} onChange={v => update('show_barcode', v)} label="الباركود" />
        {tpl.show_barcode && (
          <div className="ps-field">
            <label className="ps-field-label">محتوى الباركود</label>
            <select className="ps-select" value={tpl.barcode_content}
              onChange={e => update('barcode_content', e.target.value as 'doc-number' | 'total' | 'custom')}>
              <option value="doc-number">رقم المستند</option>
              <option value="total">المبلغ الإجمالي</option>
              <option value="custom">نص مخصص</option>
            </select>
            {tpl.barcode_content === 'custom' && (
              <input className="ps-input" style={{ marginTop: 4 }} value={tpl.barcode_custom_text ?? ''}
                onChange={e => update('barcode_custom_text', e.target.value)}
                placeholder="أدخل النص للباركود" />
            )}
          </div>
        )}

        <Toggle value={tpl.show_qr} onChange={v => update('show_qr', v)} label="QR Code" />
        {tpl.show_qr && (
          <div className="ps-field">
            <label className="ps-field-label">محتوى QR</label>
            <select className="ps-select" value={tpl.qr_content}
              onChange={e => update('qr_content', e.target.value as 'doc-number' | 'company-info' | 'both')}>
              <option value="doc-number">رقم المستند</option>
              <option value="company-info">معلومات الشركة</option>
              <option value="both">الاثنين معاً</option>
            </select>
          </div>
        )}
      </Section>

      <Section title="التواقيع والختم" icon="ti-signature">
        <Toggle value={tpl.show_cashier_signature} onChange={v => update('show_cashier_signature', v)} label="إمضاء الكاشير" />
        <Toggle value={tpl.show_client_signature}  onChange={v => update('show_client_signature', v)} label="إمضاء العميل" />
        <Toggle value={tpl.show_stamp}            onChange={v => update('show_stamp', v)} label="ختم المؤسسة" />
      </Section>
    </>
  );
}
