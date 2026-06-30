import React from 'react';
import type { BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';
import { Field, ColorField, Textarea, Input } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function DocumentSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      {sec('title_text') && <Field label="عنوان المستند">
        <Input value={tpl.title_text} onChange={v => update('title_text', v)} />
      </Field>}
      {sec('title_size') && <SliderField label="حجم عنوان المستند" value={tpl.title_size} min={10} max={22} unit="px"
        onChange={v => update('title_size', v)} />}
      {sec('title_bold') && <Toggle value={tpl.title_bold} onChange={v => update('title_bold', v)} label="خط عريض" />}
      {sec('title_align') && <AlignButtons label="محاذاة العنوان" value={tpl.title_align} onChange={v => update('title_align', v)} />}
      {sec('title_color') && <ColorField label="لون العنوان" value={tpl.title_color} onChange={v => update('title_color', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {sec('show_doc_number') && <Toggle value={tpl.show_doc_number} onChange={v => update('show_doc_number', v)} label="رقم الوثيقة" />}
      {sec('show_date') && <Toggle value={tpl.show_date} onChange={v => update('show_date', v)} label="التاريخ" />}
      {sec('show_time') && <Toggle value={tpl.show_time} onChange={v => update('show_time', v)} label="الوقت" />}
      {sec('show_due_date') && <Toggle value={tpl.show_due_date} onChange={v => update('show_due_date', v)} label="تاريخ الاستحقاق" />}
      {sec('show_cashier') && <Toggle value={tpl.show_cashier} onChange={v => update('show_cashier', v)} label="اسم الكاشير" />}
      {sec('show_client') && <Toggle value={tpl.show_client} onChange={v => update('show_client', v)} label="اسم العميل" />}

      {sec('show_client') && tpl.show_client && (
        <>
          <div className="ps-section-title" style={{ fontSize: 12, marginTop: 4 }}>تفاصيل العميل</div>
          {sec('show_client_nif') && <Toggle value={tpl.show_client_nif} onChange={v => update('show_client_nif', v)} label="الرقم الضريبي للعميل" />}
          {sec('show_client_phone') && <Toggle value={tpl.show_client_phone} onChange={v => update('show_client_phone', v)} label="هاتف العميل" />}
          {sec('show_client_address') && <Toggle value={tpl.show_client_address} onChange={v => update('show_client_address', v)} label="عنوان العميل" />}
          {sec('show_delivery_address') && <Toggle value={tpl.show_delivery_address} onChange={v => update('show_delivery_address', v)} label="  ↳ عنوان التسليم" />}
        </>
      )}

      {sec('show_session') && <Toggle value={tpl.show_session} onChange={v => update('show_session', v)} label="رقم الجلسة" />}
      {sec('show_payment_term') && <Toggle value={tpl.show_payment_term} onChange={v => update('show_payment_term', v)} label="شروط الدفع" />}
      {sec('show_bank_details') && <Toggle value={tpl.show_bank_details} onChange={v => update('show_bank_details', v)} label="البيانات البنكية" />}
      {sec('show_bank_details') && tpl.show_bank_details && (
        <Field label="نص البيانات البنكية">
          <Textarea value={tpl.bank_details_text} onChange={v => update('bank_details_text', v)} placeholder="CCP: 001 234 567 — بنك الفلاحة" rows={3} />
        </Field>
      )}

      {sec('doc_separator') && <BorderSelect label="فاصل المستند" value={tpl.doc_separator} onChange={v => update('doc_separator', v as BorderStyle)} />}
    </>
  );
}
