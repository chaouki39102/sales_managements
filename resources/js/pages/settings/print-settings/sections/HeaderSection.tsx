import React, { useRef, useState } from 'react';
import type { AlignOption, BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import type { CompanyData } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { Field, ColorField, Input } from '../components/ui';
import { usePrintTemplatesApi } from '../providers/PrintSettingsContext';
import { isSettingVisible } from '../services/SettingsRegistry';
import ImagePreviewModal from '../components/ImagePreviewModal';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
  company?: CompanyData | null;
}

export default function HeaderSectionControls({ tpl, update, company }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);
  const [uploading, setUploading] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const templatesApi = usePrintTemplatesApi();

  const logoPreviewUrl = tpl.logo_source === 'custom' ? tpl.custom_logo_url
    : tpl.logo_source === 'company' ? (company?.logoUrl ?? null)
    : null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await templatesApi.uploadLogo(file);
      update('custom_logo_url', res.url);
      update('logo_source', 'custom');
    } catch {
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      {sec('show_logo') && <Toggle value={tpl.show_logo} onChange={v => update('show_logo', v)} label="إظهار الشعار" />}
      {sec('show_logo') && tpl.show_logo && (
        <>
          <div className="ps-field">
            <label className="ps-field-label">مصدر الشعار</label>
            <div className="ps-paper-pills" style={{ marginTop: 2 }}>
              {(['default', 'company', 'custom'] as const).map(s => (
                <button key={s} className={`ps-paper-pill ${tpl.logo_source === s ? 'on' : ''}`}
                  onClick={() => update('logo_source', s)}>
                  {s === 'default' ? 'افتراضي' : s === 'company' ? 'شعار الشركة' : 'شعار مخصص'}
                </button>
              ))}
            </div>
          </div>

          <div className="ps-field">
            <label className="ps-field-label">معاينة الشعار</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 36 }}>
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="logo preview"
                  onClick={() => setZoomImg(logoPreviewUrl)}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, cursor: 'zoom-in', border: '1px solid var(--b2)' }} />
              ) : (
                <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                  {tpl.logo_source === 'default' ? 'سيتم استخدام الحرف الأول من اسم المؤسسة' : 'لا يوجد شعار'}
                </span>
              )}
            </div>
          </div>

          {tpl.logo_source === 'custom' && (
            <div className="ps-field">
              <label className="ps-field-label">رفع شعار مخصص</label>
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={handleLogoUpload} />
              <button onClick={() => fileRef.current?.click()} type="button"
                disabled={uploading}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--r1)', fontSize: 11,
                  border: '1px solid var(--b2)', background: 'var(--bg3)',
                  color: 'var(--t2)', cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <i className={`ti ${uploading ? 'ti-loader-2 spin' : 'ti-upload'}`} />
                {uploading ? 'رفع...' : 'اختيار صورة'}
              </button>
            </div>
          )}

          <SliderField label="حجم الشعار" value={tpl.logo_size} min={30} max={120} unit="px"
            onChange={v => update('logo_size', v)} />
          <AlignButtons label="محاذاة الشعار" value={tpl.logo_align}
            onChange={v => update('logo_align', v)} />
        </>
      )}

      <ImagePreviewModal open={!!zoomImg} src={zoomImg ?? ''} onClose={() => setZoomImg(null)} />

      {sec('show_company_name') && <Toggle value={tpl.show_company_name} onChange={v => update('show_company_name', v)} label="اسم المؤسسة" />}
      {sec('show_company_name') && tpl.show_company_name && (
        <>
          <SliderField label="حجم الخط" value={tpl.company_name_size} min={10} max={28} unit="px"
            onChange={v => update('company_name_size', v)} />
          <Toggle value={tpl.company_name_bold} onChange={v => update('company_name_bold', v)} label="خط عريض" />
          <AlignButtons label="محاذاة الاسم" value={tpl.company_name_align}
            onChange={v => update('company_name_align', v)} />
          <ColorField label="لون الاسم" value={tpl.company_name_color} onChange={v => update('company_name_color', v)} />
        </>
      )}

      {sec('header_custom_text') && <Field label="نص إضافي في الرأس">
        <Input value={tpl.header_custom_text}
          onChange={v => update('header_custom_text', v)}
          placeholder="مثال: السجل التجاري: 13/B.0123456" />
      </Field>}

      <div className="ps-section-title" style={{ marginTop: 8, fontSize: 12 }}>معلومات الشركة</div>
      {sec('show_address') && <Toggle value={tpl.show_address} onChange={v => update('show_address', v)} label="العنوان" />}
      {sec('show_phone') && <Toggle value={tpl.show_phone}   onChange={v => update('show_phone', v)} label="الهاتف" />}
      {sec('show_tax_id') && <Toggle value={tpl.show_tax_id}   onChange={v => update('show_tax_id', v)} label="رقم NIF" />}
      {sec('show_rc') && <Toggle value={tpl.show_rc}      onChange={v => update('show_rc', v)} label="السجل التجاري RC" />}
      {sec('show_nis') && <Toggle value={tpl.show_nis}     onChange={v => update('show_nis', v)} label="رقم NIS / STAT" />}
      {sec('show_ice') && <Toggle value={tpl.show_ice}     onChange={v => update('show_ice', v)} label="رقم ICE" />}
      {sec('show_article') && <Toggle value={tpl.show_article} onChange={v => update('show_article', v)} label="النشاط (Article)" />}

      {sec('company_info_size') && <SliderField label="حجم خط معلومات الشركة" value={tpl.company_info_size} min={7} max={14} unit="px"
        onChange={v => update('company_info_size', v)} />}
      {sec('company_info_align') && <AlignButtons label="محاذاة معلومات الشركة" value={tpl.company_info_align}
        onChange={v => update('company_info_align', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12, marginBottom: 4 }}>
        بيانات المؤسسة
        <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--t4)', marginRight: 6 }}>
          (اتركها فارغة لاستخدام بيانات الشركة تلقائياً)
        </span>
      </div>
      {sec('company_name_text') && <CompanyField label="الاسم" value={tpl.company_name_text} onChange={v => update('company_name_text', v)} placeholder="اسم المؤسسة" apiValue={company?.name} />}
      {sec('override_address') && <CompanyField label="العنوان" value={tpl.override_address} onChange={v => update('override_address', v)} placeholder="عنوان المؤسسة" apiValue={company?.address} />}
      {sec('override_phone') && <CompanyField label="الهاتف" value={tpl.override_phone} onChange={v => update('override_phone', v)} placeholder="رقم الهاتف" apiValue={company?.phone} />}
      {sec('override_nif') && <CompanyField label="NIF" value={tpl.override_nif} onChange={v => update('override_nif', v)} placeholder="الرقم الضريبي" apiValue={company?.nif} />}
      {sec('override_rc') && <CompanyField label="RC" value={tpl.override_rc} onChange={v => update('override_rc', v)} placeholder="السجل التجاري" apiValue={company?.rc} />}
      {sec('override_nis') && <CompanyField label="NIS" value={tpl.override_nis} onChange={v => update('override_nis', v)} placeholder="رقم NIS" apiValue={company?.nis} />}
      {sec('override_ice') && <CompanyField label="ICE" value={tpl.override_ice} onChange={v => update('override_ice', v)} placeholder="رقم ICE" />}
      {sec('override_article') && <CompanyField label="النشاط" value={tpl.override_article} onChange={v => update('override_article', v)} placeholder="نشاط المؤسسة" apiValue={company?.article} />}

      {sec('logo_border_radius') && <SliderField label="تدوير الزوايا" value={tpl.logo_border_radius} min={0} max={50} unit="%" onChange={v => update('logo_border_radius', v)} />}
      {sec('header_separator') && <BorderSelect label="فاصل الرأس" value={tpl.header_separator}
        onChange={v => update('header_separator', v as BorderStyle)} />}
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
  label: string; value: BorderStyle; onChange: (v: BorderStyle) => void;
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
      <input className="ps-input" style={{ fontSize: 12 }} value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={apiValue || placeholder} />
    </div>
  );
}
