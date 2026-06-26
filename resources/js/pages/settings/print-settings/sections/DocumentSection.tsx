// resources/js/pages/settings/print-settings/sections/DocumentSection.tsx
import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function DocumentSectionControls({ tpl, update }: Props) {
  return (
    <Section title="معلومات المستند" icon="ti-file-description">
      {/* Title */}
      <div className="ps-field">
        <label className="ps-field-label">عنوان المستند</label>
        <input className="ps-input" value={tpl.titleText}
          onChange={e => update('titleText', e.target.value)} />
      </div>
      <SliderField label="حجم عنوان المستند" value={tpl.titleFontSize} min={10} max={22} unit="px"
        onChange={v => update('titleFontSize', v)} />
      <Toggle value={tpl.titleBold} onChange={v => update('titleBold', v)} label="خط عريض" />
      <AlignButtons label="محاذاة العنوان" value={tpl.titleAlign}
        onChange={v => update('titleAlign', v)} />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {/* Fields visibility */}
      <Toggle value={tpl.showDocNumber} onChange={v => update('showDocNumber', v)} label="رقم الوثيقة" />
      <Toggle value={tpl.showDate}      onChange={v => update('showDate', v)} label="التاريخ" />
      <Toggle value={tpl.showTime}      onChange={v => update('showTime', v)} label="الوقت" />
      <Toggle value={tpl.showDueDate}   onChange={v => update('showDueDate', v)} label="تاريخ الاستحقاق" />
      <Toggle value={tpl.showCashier}   onChange={v => update('showCashier', v)} label="اسم الكاشير" />
      <Toggle value={tpl.showClient}    onChange={v => update('showClient', v)} label="اسم العميل" />

      {/* Client details */}
      {tpl.showClient && (
        <>
          <div className="ps-section-title" style={{ fontSize: 12, marginTop: 4 }}>تفاصيل العميل</div>
          <Toggle value={tpl.showClientTaxId}    onChange={v => update('showClientTaxId', v)} label="الرقم الضريبي للعميل" />
          <Toggle value={tpl.showClientPhone}    onChange={v => update('showClientPhone', v)} label="هاتف العميل" />
          <Toggle value={tpl.showClientAddress}  onChange={v => update('showClientAddress', v)} label="عنوان العميل" />
        </>
      )}

      <Toggle value={tpl.showSession}    onChange={v => update('showSession', v)} label="رقم الجلسة" />
      <Toggle value={tpl.showPaymentTerm} onChange={v => update('showPaymentTerm', v)} label="شروط الدفع" />

      <BorderSelect label="فاصل المستند" value={tpl.docSeparator}
        onChange={v => update('docSeparator', v)} />
    </Section>
  );
}
