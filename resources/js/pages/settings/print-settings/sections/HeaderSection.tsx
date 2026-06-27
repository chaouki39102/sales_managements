import React from 'react';
import type { ReceiptTemplate80mm, AlignOption, CompanyPreviewData } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
  company?: CompanyPreviewData | null;
}

export default function HeaderSectionControls({ tpl, update, company }: Props) {
  return (
    <>
      <Toggle value={tpl.show_logo} onChange={v => update('show_logo', v)} label="إظهار الشعار" />
      {tpl.show_logo && (
        <>
          <SliderField label="حجم الشعار" value={tpl.logo_size} min={30} max={120} unit="px"
            onChange={v => update('logo_size', v)} />
          <AlignButtons label="محاذاة الشعار" value={tpl.logo_align}
            onChange={v => update('logo_align', v)} />
        </>
      )}

      <Toggle value={tpl.show_company_name} onChange={v => update('show_company_name', v)} label="اسم المؤسسة" />
      {tpl.show_company_name && (
        <>
          <SliderField label="حجم الخط" value={tpl.company_name_size} min={10} max={28} unit="px"
            onChange={v => update('company_name_size', v)} />
          <Toggle value={tpl.company_name_bold} onChange={v => update('company_name_bold', v)} label="خط عريض" />
          <AlignButtons label="محاذاة الاسم" value={tpl.company_name_align}
            onChange={v => update('company_name_align', v)} />
        </>
      )}

      <div className="ps-field">
        <label className="ps-field-label">نص إضافي في الرأس</label>
        <input className="ps-input" value={tpl.header_custom_text}
          onChange={e => update('header_custom_text', e.target.value)}
          placeholder="مثال: السجل التجاري: 13/B.0123456" />
      </div>

      <div className="ps-section-title" style={{ marginTop: 8, fontSize: 12 }}>معلومات الشركة</div>
      <Toggle value={tpl.show_address} onChange={v => update('show_address', v)} label="العنوان" />
      <Toggle value={tpl.show_phone}   onChange={v => update('show_phone', v)} label="الهاتف" />
      <Toggle value={tpl.show_tax_id}   onChange={v => update('show_tax_id', v)} label="رقم NIF" />
      <Toggle value={tpl.show_rc}      onChange={v => update('show_rc', v)} label="السجل التجاري RC" />
      <Toggle value={tpl.show_nis}     onChange={v => update('show_nis', v)} label="رقم NIS / STAT" />
      <Toggle value={tpl.show_ice}     onChange={v => update('show_ice', v)} label="رقم ICE" />
      <Toggle value={tpl.show_article} onChange={v => update('show_article', v)} label="النشاط (Article)" />

      <SliderField label="حجم خط معلومات الشركة" value={tpl.company_info_size} min={7} max={14} unit="px"
        onChange={v => update('company_info_size', v)} />
      <AlignButtons label="محاذاة معلومات الشركة" value={tpl.company_info_align}
        onChange={v => update('company_info_align', v)} />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12, marginBottom: 4 }}>
        بيانات المؤسسة
        <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--t4)', marginRight: 6 }}>
          (اتركها فارغة لاستخدام بيانات الشركة تلقائياً)
        </span>
      </div>
      <CompanyField label="الاسم" value={tpl.company_name_text} onChange={v => update('company_name_text', v)} placeholder="اسم المؤسسة" apiValue={company?.name} />
      <CompanyField label="العنوان" value={tpl.override_address} onChange={v => update('override_address', v)} placeholder="عنوان المؤسسة" apiValue={company?.address} />
      <CompanyField label="الهاتف" value={tpl.override_phone} onChange={v => update('override_phone', v)} placeholder="رقم الهاتف" apiValue={company?.phone} />
      <CompanyField label="NIF" value={tpl.override_nif} onChange={v => update('override_nif', v)} placeholder="الرقم الضريبي" apiValue={company?.nif} />
      <CompanyField label="RC" value={tpl.override_rc} onChange={v => update('override_rc', v)} placeholder="السجل التجاري" apiValue={company?.rc} />
      <CompanyField label="NIS" value={tpl.override_nis} onChange={v => update('override_nis', v)} placeholder="رقم NIS" apiValue={company?.nis} />
      <CompanyField label="ICE" value={tpl.override_ice} onChange={v => update('override_ice', v)} placeholder="رقم ICE" />
      <CompanyField label="النشاط" value={tpl.override_article} onChange={v => update('override_article', v)} placeholder="نشاط المؤسسة" apiValue={company?.article} />

      <BorderSelect label="فاصل الرأس" value={tpl.header_separator}
        onChange={v => update('header_separator', v as any)} />
    </>
  );
}

export function AlignButtons({ label, value, onChange }: {
  label: string; value: AlignOption; onChange: (v: AlignOption) => void;
}) {
  return (
    <div className="ps-field">
      <label className="ps-field-label">{label}</label>
      <div className="ps-paper-pills" style={{ marginTop: 2 }}>
        {(['right', 'center', 'left'] as AlignOption[]).map(a => (
          <button key={a} className={`ps-paper-pill ${value === a ? 'on' : ''}`}
            onClick={() => onChange(a)}>
            {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BorderSelect({ label, value, onChange }: {
  label: string; value: 'solid' | 'dashed' | 'double' | 'none'; onChange: (v: any) => void;
}) {
  return (
    <div className="ps-field">
      <label className="ps-field-label">{label}</label>
      <select className="ps-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="solid">خط متصل</option>
        <option value="dashed">خط متقطع</option>
        <option value="double">خط مزدوج</option>
        <option value="none">بدون فاصل</option>
      </select>
    </div>
  );
}

export function CompanyField({ label, value, onChange, placeholder, apiValue }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; apiValue?: string;
}) {
  const isUsingApi = !value && !!apiValue;
  return (
    <div className="ps-field">
      <label className="ps-field-label">
        {label}
        {isUsingApi && (
          <span className="ps-badge-api">تلقائي من الشركة</span>
        )}
      </label>
      <input className="ps-input" style={{ fontSize: 12 }} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={apiValue || placeholder} />
    </div>
  );
}
