import React from 'react';
import type { BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { ColorField, Field, Input, Textarea } from '../components/ui';
import { AlignButtons, BorderSelect } from './HeaderSection';
import { isSettingVisible } from '../services/SettingsRegistry';
import { RowManager } from '../components/RowManager';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function FooterSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      <Section title="التذييل — النصوص والتواقيع" icon="ti-file-text">
        {sec('footer_line1') && <Field label="سطر التذييل 1">
          <Input value={tpl.footer_line1}
            onChange={v => update('footer_line1', v)}
            placeholder="مثال: مفتوح من 08:00 إلى 20:00" />
        </Field>}
        {sec('footer_line2') && <Field label="سطر التذييل 2">
          <Input value={tpl.footer_line2}
            onChange={v => update('footer_line2', v)} />
        </Field>}
        {sec('footer_line3') && <Field label="سطر التذييل 3">
          <Input value={tpl.footer_line3}
            onChange={v => update('footer_line3', v)} />
        </Field>}

        <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
        <div className="ps-section-title" style={{ fontSize: 12 }}>ترتيب صفوف التذييل</div>
        <RowManager
          rows={tpl.footer_rows ?? []}
          onChange={rows => update('footer_rows', rows)}
        />

        {sec('footer_separator') && <BorderSelect label="فاصل التذييل" value={tpl.footer_separator}
          onChange={v => update('footer_separator', v as BorderStyle)} />}
        {sec('footer_align') && <AlignButtons label="محاذاة التذييل" value={tpl.footer_align}
          onChange={v => update('footer_align', v)} />}
        {sec('footer_text_color') && <ColorField label="لون النص" value={tpl.footer_text_color} onChange={v => update('footer_text_color', v)} />}

        <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

        {sec('show_thank_you') && <Toggle value={tpl.show_thank_you} onChange={v => update('show_thank_you', v)} label="رسالة الشكر" />}
        {sec('show_thank_you') && tpl.show_thank_you && (
          <>
            <Field label="نص رسالة الشكر">
              <Input value={tpl.thank_you_text}
                onChange={v => update('thank_you_text', v)} />
            </Field>
            {sec('thank_you_size') && <SliderField label="حجم خط الشكر" value={tpl.thank_you_size} min={9} max={18} unit="px"
              onChange={v => update('thank_you_size', v)} />}
            {sec('thank_you_color') && <ColorField label="لون الشكر" value={tpl.thank_you_color} onChange={v => update('thank_you_color', v)} />}
          </>
        )}

        {sec('show_returns_policy') && <Toggle value={tpl.show_returns_policy} onChange={v => update('show_returns_policy', v)} label="سياسة الإرجاع" />}
        {sec('show_returns_policy') && tpl.show_returns_policy && (
          <Field label="نص سياسة الإرجاع">
            <Textarea value={tpl.returns_policy_text}
              onChange={v => update('returns_policy_text', v)} rows={2} />
          </Field>
        )}

        {sec('footer_legal_text') && <Field label="نص قانوني (تذييل سفلي)">
          <Textarea value={tpl.footer_legal_text}
            onChange={v => update('footer_legal_text', v)}
            placeholder="مثال: يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري" rows={2} />
        </Field>}
      </Section>

      <Section title="الباركود و QR" icon="ti-barcode">
        {sec('show_barcode') && <Toggle value={tpl.show_barcode} onChange={v => update('show_barcode', v)} label="الباركود" />}
        {sec('show_barcode') && tpl.show_barcode && (
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

        {sec('show_qr') && <Toggle value={tpl.show_qr} onChange={v => update('show_qr', v)} label="QR Code" />}
        {sec('show_qr') && tpl.show_qr && (
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
        {sec('show_cashier_signature') && <Toggle value={tpl.show_cashier_signature} onChange={v => update('show_cashier_signature', v)} label="إمضاء الكاشير" />}
        {sec('show_client_signature') && <Toggle value={tpl.show_client_signature} onChange={v => update('show_client_signature', v)} label="إمضاء العميل" />}
        {sec('show_stamp') && <Toggle value={tpl.show_stamp} onChange={v => update('show_stamp', v)} label="ختم المؤسسة" />}
      </Section>
    </>
  );
}
