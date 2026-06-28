import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function DocumentSectionControls({ tpl, update }: Props) {
  return (
    <>
      <div className="ps-field">
        <label className="ps-field-label">عنوان المستند</label>
        <input className="ps-input" value={tpl.title_text ?? ''}
          onChange={e => update('title_text', e.target.value)} />
      </div>
      <SliderField label="حجم عنوان المستند" value={tpl.title_size} min={10} max={22} unit="px"
        onChange={v => update('title_size', v)} />
      <Toggle value={tpl.title_bold} onChange={v => update('title_bold', v)} label="خط عريض" />
      <AlignButtons label="محاذاة العنوان" value={tpl.title_align}
        onChange={v => update('title_align', v)} />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      <Toggle value={tpl.show_doc_number} onChange={v => update('show_doc_number', v)} label="رقم الوثيقة" />
      <Toggle value={tpl.show_date}      onChange={v => update('show_date', v)} label="التاريخ" />
      <Toggle value={tpl.show_time}      onChange={v => update('show_time', v)} label="الوقت" />
      <Toggle value={tpl.show_due_date}   onChange={v => update('show_due_date', v)} label="تاريخ الاستحقاق" />
      <Toggle value={tpl.show_cashier}   onChange={v => update('show_cashier', v)} label="اسم الكاشير" />
      <Toggle value={tpl.show_client}    onChange={v => update('show_client', v)} label="اسم العميل" />

      {tpl.show_client && (
        <>
          <div className="ps-section-title" style={{ fontSize: 12, marginTop: 4 }}>تفاصيل العميل</div>
          <Toggle value={tpl.show_client_nif}    onChange={v => update('show_client_nif', v)} label="الرقم الضريبي للعميل" />
          <Toggle value={tpl.show_client_phone}    onChange={v => update('show_client_phone', v)} label="هاتف العميل" />
          <Toggle value={tpl.show_client_address}  onChange={v => update('show_client_address', v)} label="عنوان العميل" />
        </>
      )}

      <Toggle value={tpl.show_session}    onChange={v => update('show_session', v)} label="رقم الجلسة" />
      <Toggle value={tpl.show_payment_term} onChange={v => update('show_payment_term', v)} label="شروط الدفع" />

      <BorderSelect label="فاصل المستند" value={tpl.doc_separator}
        onChange={v => update('doc_separator', v as any)} />
    </>
  );
}
