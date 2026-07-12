import React from 'react';
import type { BorderStyle, FontFamily } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';
import { Field, ColorField, Textarea, Input } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';
import { RowManager, type FieldOption } from '../components/RowManager';

const CUSTOMER_FIELD_OPTIONS: FieldOption[] = [
  { value: 'customer.name',            label: 'اسم العميل' },
  { value: 'customer.nif',             label: 'NIF العميل' },
  { value: 'customer.commercialName',  label: 'الاسم التجاري' },
  { value: 'customer.rc',              label: 'السجل التجاري' },
  { value: 'customer.nis',             label: 'NIS' },
  { value: 'customer.ai',              label: 'المادة الجبائية' },
  { value: 'customer.phone',           label: 'الهاتف' },
  { value: 'customer.mobile',          label: 'المحمول' },
  { value: 'customer.fax',             label: 'الفاكس' },
  { value: 'customer.email',           label: 'البريد الإلكتروني' },
  { value: 'customer.activity',        label: 'النشاط' },
  { value: 'customer.address',         label: 'العنوان' },
  { value: 'customer.deliveryAddress', label: 'عنوان التسليم' },
  { value: 'customer.bankName',        label: 'اسم البنك' },
  { value: 'customer.rib',             label: 'RIB' },
  { value: 'customer.code',            label: 'الرمز' },
];

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

const CUST_ROW_MAP: Record<string, { field: string; label: string }> = {
  show_client:                        { field: 'customer.name',            label: 'العميل' },
  show_client_nif:                    { field: 'customer.nif',             label: 'NIF العميل' },
  show_client_phone:                  { field: 'customer.phone',           label: 'هاتف العميل' },
  show_client_address:                { field: 'customer.address',         label: 'العنوان' },
  show_delivery_address:              { field: 'customer.deliveryAddress', label: 'عنوان التسليم' },
  show_customer_commercial_name:      { field: 'customer.commercialName',  label: 'الاسم التجاري' },
  show_customer_rc:                   { field: 'customer.rc',              label: 'السجل التجاري' },
  show_customer_nis:                  { field: 'customer.nis',             label: 'NIS' },
  show_customer_ai:                   { field: 'customer.ai',              label: 'المادة الجبائية' },
  show_customer_mobile:               { field: 'customer.mobile',          label: 'المحمول' },
  show_customer_fax:                  { field: 'customer.fax',             label: 'الفاكس' },
  show_customer_email:                { field: 'customer.email',           label: 'البريد الإلكتروني' },
  show_customer_activity:             { field: 'customer.activity',        label: 'النشاط' },
  show_customer_bank_name:            { field: 'customer.bankName',        label: 'اسم البنك' },
  show_customer_rib:                  { field: 'customer.rib',             label: 'RIB' },
};

const CUST_LABEL_MAP: Record<string, string> = {
  label_client:                       'cust_name',
  label_client_nif:                   'cust_nif',
  label_client_phone:                 'cust_phone',
  label_client_address:               'cust_address',
  label_delivery_address:             'cust_delivery',
  label_customer_commercial_name:     'cust_commercial_name',
  label_customer_rc:                  'cust_rc',
  label_customer_nis:                 'cust_nis',
  label_customer_ai:                  'cust_ai',
  label_customer_mobile:              'cust_mobile',
  label_customer_fax:                 'cust_fax',
  label_customer_email:               'cust_email',
  label_customer_activity:            'cust_activity',
  label_customer_bank_name:           'cust_bank_name',
  label_customer_rib:                 'cust_rib',
};

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'tajawal', label: 'Tajawal' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'arial', label: 'Arial' },
];

export default function DocumentSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  const fieldToRowId = (field: string) => 'cust_' + field.replace('customer.', '');

  const syncRow = (settingKey: string, val: boolean) => {
    const meta = CUST_ROW_MAP[settingKey];
    if (!meta) { update(settingKey as any, val as any); return; }
    const rowId = fieldToRowId(meta.field);
    const rows = [...(tpl.customer_info_rows ?? [])];
    const existingIdx = rows.findIndex(r => r.id === rowId);
    if (val && existingIdx === -1) {
      const maxOrder = rows.reduce((m, r) => Math.max(m, r.order), -1) + 1;
      rows.push({
        id: rowId,
        field: meta.field,
        label: meta.label,
        visible: true,
        order: maxOrder,
        labelSide: 'end' as const,
        valueSide: 'start' as const,
      });
    } else if (!val && existingIdx !== -1) {
      rows.splice(existingIdx, 1);
    }
    update(settingKey as any, val as any);
    update('customer_info_rows', rows);
  };

  const syncLabel = (key: string, val: string) => {
    update(key as any, val as any);
    const rowId = CUST_LABEL_MAP[key];
    if (!rowId) return;
    const rows = [...(tpl.customer_info_rows ?? [])];
    const idx = rows.findIndex(r => r.id === rowId);
    if (idx !== -1) {
      rows[idx] = { ...rows[idx], label: val };
      update('customer_info_rows', rows);
    }
  };

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
      <div className="ps-section-title" style={{ fontSize: 12 }}>ترتيب معلومات المستند</div>
      <RowManager
        rows={tpl.doc_info_rows ?? []}
        onChange={rows => update('doc_info_rows', rows)}
      />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {sec('show_doc_number') && <Toggle value={tpl.show_doc_number} onChange={v => update('show_doc_number', v)} label="رقم الوثيقة" />}
      {sec('show_date') && <Toggle value={tpl.show_date} onChange={v => update('show_date', v)} label="التاريخ" />}
      {sec('show_time') && <Toggle value={tpl.show_time} onChange={v => update('show_time', v)} label="الوقت" />}
      {sec('show_due_date') && <Toggle value={tpl.show_due_date} onChange={v => update('show_due_date', v)} label="تاريخ الاستحقاق" />}
      {sec('show_cashier') && <Toggle value={tpl.show_cashier} onChange={v => update('show_cashier', v)} label="اسم الكاشير" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {/* ── Customer Section ── */}
      <div className="ps-section-title" style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>بيانات العميل</div>

      {/* Style controls */}
      {sec('customer_info_font_family') && (
        <Field label="نوع خط معلومات العميل">
          <select
            value={tpl.customer_info_font_family}
            onChange={e => update('customer_info_font_family', e.target.value as FontFamily)}
            style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--b2)' }}
          >
            {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      )}
      {sec('customer_info_size') && <SliderField label="حجم الخط" value={tpl.customer_info_size} min={6} max={16} step={0.5} unit="px"
        onChange={v => update('customer_info_size', v)} />}
      {sec('customer_info_bold') && <Toggle value={tpl.customer_info_bold} onChange={v => update('customer_info_bold', v)} label="خط عريض" />}
      {sec('customer_info_italic') && <Toggle value={tpl.customer_info_italic} onChange={v => update('customer_info_italic', v)} label="خط مائل" />}
      {sec('customer_info_align') && <AlignButtons label="محاذاة النص" value={tpl.customer_info_align} onChange={v => update('customer_info_align', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {/* Show/hide toggles */}
      <div className="ps-section-title" style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>إظهار / إخفاء الحقول</div>
      <Toggle value={tpl.show_client}                        onChange={v => syncRow('show_client', v)}                        label="اسم العميل (customer.name)" />
      <Toggle value={tpl.show_client_nif}                    onChange={v => syncRow('show_client_nif', v)}                    label="NIF العميل (customer.nif)" />
      <Toggle value={tpl.show_customer_commercial_name}      onChange={v => syncRow('show_customer_commercial_name', v)}      label="الاسم التجاري (customer.commercialName)" />
      <Toggle value={tpl.show_customer_rc}                   onChange={v => syncRow('show_customer_rc', v)}                   label="السجل التجاري (customer.rc)" />
      <Toggle value={tpl.show_customer_nis}                  onChange={v => syncRow('show_customer_nis', v)}                  label="NIS (customer.nis)" />
      <Toggle value={tpl.show_customer_ai}                   onChange={v => syncRow('show_customer_ai', v)}                   label="المادة الجبائية (customer.ai)" />
      <Toggle value={tpl.show_client_phone}                  onChange={v => syncRow('show_client_phone', v)}                  label="الهاتف (customer.phone)" />
      <Toggle value={tpl.show_customer_mobile}               onChange={v => syncRow('show_customer_mobile', v)}               label="المحمول (customer.mobile)" />
      <Toggle value={tpl.show_customer_fax}                  onChange={v => syncRow('show_customer_fax', v)}                  label="الفاكس (customer.fax)" />
      <Toggle value={tpl.show_customer_email}                onChange={v => syncRow('show_customer_email', v)}                label="البريد الإلكتروني (customer.email)" />
      <Toggle value={tpl.show_customer_activity}             onChange={v => syncRow('show_customer_activity', v)}             label="النشاط (customer.activity)" />
      <Toggle value={tpl.show_client_address}                onChange={v => syncRow('show_client_address', v)}                label="العنوان (customer.address)" />
      <Toggle value={tpl.show_delivery_address}              onChange={v => syncRow('show_delivery_address', v)}              label="عنوان التسليم (customer.deliveryAddress)" />
      <Toggle value={tpl.show_customer_bank_name}            onChange={v => syncRow('show_customer_bank_name', v)}            label="اسم البنك (customer.bankName)" />
      <Toggle value={tpl.show_customer_rib}                  onChange={v => syncRow('show_customer_rib', v)}                  label="RIB (customer.rib)" />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {/* Row order */}
      <div className="ps-section-title" style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>ترتيب صفوف العميل</div>
      <RowManager
        rows={tpl.customer_info_rows ?? []}
        onChange={rows => update('customer_info_rows', rows)}
        fields={CUSTOMER_FIELD_OPTIONS}
        addLabel="+ إضافة سطر"
      />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {/* Labels */}
      <div className="ps-section-title" style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>تسميات الحقول</div>
      <Field label="تسمية اسم العميل"><Input value={tpl.label_client} onChange={v => syncLabel('label_client', v)} placeholder="العميل" /></Field>
      <Field label="تسمية الرقم الضريبي"><Input value={tpl.label_client_nif} onChange={v => syncLabel('label_client_nif', v)} placeholder="NIF العميل" /></Field>
      <Field label="تسمية الاسم التجاري"><Input value={tpl.label_customer_commercial_name} onChange={v => syncLabel('label_customer_commercial_name', v)} placeholder="الاسم التجاري" /></Field>
      <Field label="تسمية السجل التجاري"><Input value={tpl.label_customer_rc} onChange={v => syncLabel('label_customer_rc', v)} placeholder="RC" /></Field>
      <Field label="تسمية NIS"><Input value={tpl.label_customer_nis} onChange={v => syncLabel('label_customer_nis', v)} placeholder="NIS" /></Field>
      <Field label="تسمية المادة الجبائية"><Input value={tpl.label_customer_ai} onChange={v => syncLabel('label_customer_ai', v)} placeholder="المادة الجبائية" /></Field>
      <Field label="تسمية الهاتف"><Input value={tpl.label_client_phone} onChange={v => syncLabel('label_client_phone', v)} placeholder="هاتف العميل" /></Field>
      <Field label="تسمية المحمول"><Input value={tpl.label_customer_mobile} onChange={v => syncLabel('label_customer_mobile', v)} placeholder="المحمول" /></Field>
      <Field label="تسمية الفاكس"><Input value={tpl.label_customer_fax} onChange={v => syncLabel('label_customer_fax', v)} placeholder="الفاكس" /></Field>
      <Field label="تسمية البريد الإلكتروني"><Input value={tpl.label_customer_email} onChange={v => syncLabel('label_customer_email', v)} placeholder="البريد الإلكتروني" /></Field>
      <Field label="تسمية النشاط"><Input value={tpl.label_customer_activity} onChange={v => syncLabel('label_customer_activity', v)} placeholder="النشاط" /></Field>
      <Field label="تسمية العنوان"><Input value={tpl.label_client_address} onChange={v => syncLabel('label_client_address', v)} placeholder="العنوان" /></Field>
      <Field label="تسمية عنوان التسليم"><Input value={tpl.label_delivery_address} onChange={v => syncLabel('label_delivery_address', v)} placeholder="عنوان التسليم" /></Field>
      <Field label="تسمية اسم البنك"><Input value={tpl.label_customer_bank_name} onChange={v => syncLabel('label_customer_bank_name', v)} placeholder="اسم البنك" /></Field>
      <Field label="تسمية RIB"><Input value={tpl.label_customer_rib} onChange={v => syncLabel('label_customer_rib', v)} placeholder="RIB" /></Field>

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {/* Overrides */}
      <div className="ps-section-title" style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>بيانات العميل (تجاوز)</div>
      <Field label="تجاوز اسم العميل"><Input value={tpl.override_client_name} onChange={v => update('override_client_name', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز الرقم الضريبي"><Input value={tpl.override_client_nif} onChange={v => update('override_client_nif', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز الاسم التجاري"><Input value={tpl.override_customer_commercial_name} onChange={v => update('override_customer_commercial_name', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز السجل التجاري"><Input value={tpl.override_customer_rc} onChange={v => update('override_customer_rc', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز NIS"><Input value={tpl.override_customer_nis} onChange={v => update('override_customer_nis', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز المادة الجبائية"><Input value={tpl.override_customer_ai} onChange={v => update('override_customer_ai', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز الهاتف"><Input value={tpl.override_client_phone} onChange={v => update('override_client_phone', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز المحمول"><Input value={tpl.override_customer_mobile} onChange={v => update('override_customer_mobile', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز الفاكس"><Input value={tpl.override_customer_fax} onChange={v => update('override_customer_fax', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز البريد الإلكتروني"><Input value={tpl.override_customer_email} onChange={v => update('override_customer_email', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز النشاط"><Input value={tpl.override_customer_activity} onChange={v => update('override_customer_activity', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز العنوان"><Input value={tpl.override_client_address} onChange={v => update('override_client_address', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز عنوان التسليم"><Input value={tpl.override_delivery_address} onChange={v => update('override_delivery_address', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز اسم البنك"><Input value={tpl.override_customer_bank_name} onChange={v => update('override_customer_bank_name', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>
      <Field label="تجاوز RIB"><Input value={tpl.override_customer_rib} onChange={v => update('override_customer_rib', v)} placeholder="اتركه فارغاً للبيانات الأصلية" /></Field>

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

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
