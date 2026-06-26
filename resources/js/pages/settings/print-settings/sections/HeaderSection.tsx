// resources/js/pages/settings/print-settings/sections/HeaderSection.tsx
import React from 'react';
import type { ReceiptTemplate80mm, AlignOption, CompanyPreviewData } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
  company?: CompanyPreviewData | null;
}

export default function HeaderSectionControls({ tpl, update, company }: Props) {
  return (
    <Section title="رأس الفاتورة — الشعار والشركة" icon="ti-building-store">
      {/* Logo */}
      <Toggle value={tpl.showLogo} onChange={v => update('showLogo', v)} label="إظهار الشعار" />
      {tpl.showLogo && (
        <>
          <SliderField label="حجم الشعار" value={tpl.logoSize} min={30} max={120} unit="px"
            onChange={v => update('logoSize', v)} />
          <AlignButtons label="محاذاة الشعار" value={tpl.logoAlign}
            onChange={v => update('logoAlign', v)} />
        </>
      )}

      {/* Company Name */}
      <Toggle value={tpl.showCompanyName} onChange={v => update('showCompanyName', v)} label="اسم المؤسسة" />
      {tpl.showCompanyName && (
        <>
          <SliderField label="حجم الخط" value={tpl.companyNameSize} min={10} max={28} unit="px"
            onChange={v => update('companyNameSize', v)} />
          <Toggle value={tpl.companyNameBold} onChange={v => update('companyNameBold', v)} label="خط عريض" />
          <AlignButtons label="محاذاة الاسم" value={tpl.companyNameAlign}
            onChange={v => update('companyNameAlign', v)} />
        </>
      )}

      {/* Custom header text */}
      <div className="ps-field">
        <label className="ps-field-label">نص إضافي في الرأس</label>
        <input className="ps-input" value={tpl.headerCustomText}
          onChange={e => update('headerCustomText', e.target.value)}
          placeholder="مثال: السجل التجاري: 13/B.0123456" />
      </div>

      {/* Company info visibility */}
      <div className="ps-section-title" style={{ marginTop: 8, fontSize: 12 }}>معلومات الشركة</div>
      <Toggle value={tpl.showAddress} onChange={v => update('showAddress', v)} label="العنوان" />
      <Toggle value={tpl.showPhone}   onChange={v => update('showPhone', v)} label="الهاتف" />
      <Toggle value={tpl.showTaxId}   onChange={v => update('showTaxId', v)} label="رقم NIF" />
      <Toggle value={tpl.showRc}      onChange={v => update('showRc', v)} label="السجل التجاري RC" />
      <Toggle value={tpl.showNis}     onChange={v => update('showNis', v)} label="رقم NIS / STAT" />
      <Toggle value={tpl.showIce}     onChange={v => update('showIce', v)} label="رقم ICE" />
      <Toggle value={tpl.showArticle} onChange={v => update('showArticle', v)} label="النشاط (Article)" />

      <SliderField label="حجم خط معلومات الشركة" value={tpl.companyInfoFontSize} min={7} max={14} unit="px"
        onChange={v => update('companyInfoFontSize', v)} />
      <AlignButtons label="محاذاة معلومات الشركة" value={tpl.companyInfoAlign}
        onChange={v => update('companyInfoAlign', v)} />

      {/* Company data override */}
      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12, marginBottom: 4 }}>
        بيانات المؤسسة
        <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--t4)', marginRight: 6 }}>
          (اتركها فارغة لاستخدام بيانات الشركة تلقائياً)
        </span>
      </div>
      <CompanyField label="الاسم" value={tpl.companyName} onChange={v => update('companyName', v)} placeholder="اسم المؤسسة" apiValue={company?.name} />
      <CompanyField label="العنوان" value={tpl.companyAddress} onChange={v => update('companyAddress', v)} placeholder="عنوان المؤسسة" apiValue={company?.address} />
      <CompanyField label="الهاتف" value={tpl.companyPhone} onChange={v => update('companyPhone', v)} placeholder="رقم الهاتف" apiValue={company?.phone} />
      <CompanyField label="NIF" value={tpl.companyNif} onChange={v => update('companyNif', v)} placeholder="الرقم الضريبي" apiValue={company?.nif} />
      <CompanyField label="RC" value={tpl.companyRc} onChange={v => update('companyRc', v)} placeholder="السجل التجاري" apiValue={company?.rc} />
      <CompanyField label="NIS" value={tpl.companyNis} onChange={v => update('companyNis', v)} placeholder="رقم NIS" apiValue={company?.nis} />
      <CompanyField label="ICE" value={tpl.companyIce} onChange={v => update('companyIce', v)} placeholder="رقم ICE" />
      <CompanyField label="النشاط" value={tpl.companyArticle} onChange={v => update('companyArticle', v)} placeholder="نشاط المؤسسة" apiValue={company?.article} />

      {/* Header separator */}
      <BorderSelect label="فاصل الرأس" value={tpl.headerSeparator}
        onChange={v => update('headerSeparator', v)} />
    </Section>
  );
}

// ─── Reusable sub-components ─────────────────────────────────────────────────

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
