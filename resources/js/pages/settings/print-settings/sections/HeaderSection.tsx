import React, { useRef, useState } from 'react';
import type { AlignOption, BorderStyle, LayoutBlock } from '../types';
import type { PrintTemplate } from '../types';
import type { CompanyData } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { Field, ColorField, Input } from '../components/ui';
import { usePrintTemplatesApi } from '../providers/PrintSettingsContext';
import { isSettingVisible } from '../services/SettingsRegistry';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { RowManager, type FieldOption } from '../components/RowManager';

const COMPANY_FIELD_OPTIONS: FieldOption[] = [
  { value: 'company.name',            label: 'اسم الشركة' },
  { value: 'company.commercialName',  label: 'الاسم التجاري' },
  { value: 'company.address',         label: 'العنوان' },
  { value: 'company.phone',           label: 'الهاتف' },
  { value: 'company.mobile',          label: 'المحمول' },
  { value: 'company.fax',             label: 'الفاكس' },
  { value: 'company.email',           label: 'البريد الإلكتروني' },
  { value: 'company.nif',             label: 'NIF' },
  { value: 'company.rc',              label: 'RC' },
  { value: 'company.nis',             label: 'NIS' },
  { value: 'company.article',         label: 'المادة الجبائية' },
  { value: 'company.capital',         label: 'الرأس المال' },
  { value: 'company.bankName',        label: 'اسم البنك' },
  { value: 'company.rib',             label: 'RIB' },
  { value: 'company.activity',        label: 'النشاط' },
];

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
  company?: CompanyData | null;
}

export default function HeaderSectionControls({ tpl, update, company }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);
  const [uploading, setUploading] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const templatesApi = usePrintTemplatesApi();

  const hl = tpl.header_layout ?? { mode: 'simple' as const, columns: [] };
  const isColumns = hl.mode === 'columns';

  const ROW_ID_MAP: Record<string, { field: string; label: string }> = {
    show_commercial_name: { field: 'company.commercialName', label: 'الاسم التجاري' },
    show_address:         { field: 'company.address',       label: 'العنوان' },
    show_phone:           { field: 'company.phone',         label: 'الهاتف' },
    show_mobile:          { field: 'company.mobile',        label: 'المحمول' },
    show_fax:             { field: 'company.fax',           label: 'الفاكس' },
    show_email:           { field: 'company.email',         label: 'البريد الإلكتروني' },
    show_tax_id:          { field: 'company.nif',           label: 'NIF' },
    show_rc:              { field: 'company.rc',            label: 'RC' },
    show_nis:             { field: 'company.nis',           label: 'NIS' },
    show_article:         { field: 'company.article',       label: 'المادة الجبائية' },
    show_capital:         { field: 'company.capital',       label: 'الرأس المال' },
    show_bank_name:       { field: 'company.bankName',      label: 'اسم البنك' },
    show_rib:             { field: 'company.rib',           label: 'RIB' },
    show_activity:        { field: 'company.activity',      label: 'النشاط' },
  };

  const ROW_LABEL_MAP: Record<string, string> = {
    label_commercial_name: 'co_commercial_name',
    label_address:         'co_address',
    label_phone:           'co_phone',
    label_mobile:          'co_mobile',
    label_fax:             'co_fax',
    label_email:           'co_email',
    label_nif:             'co_nif',
    label_rc:              'co_rc',
    label_nis:             'co_nis',
    label_article:         'co_article',
    label_capital:         'co_capital',
    label_bank_name:       'co_bank_name',
    label_rib:             'co_rib',
    label_activity:        'co_activity',
  };

  const syncLabel = (key: string, val: string) => {
    update(key as any, val as any);
    const rowId = ROW_LABEL_MAP[key];
    if (!rowId) return;
    const rows = [...(tpl.company_info_rows ?? [])];
    const idx = rows.findIndex(r => r.id === rowId);
    if (idx !== -1) {
      rows[idx] = { ...rows[idx], label: val };
      update('company_info_rows', rows);
    }
  };

  const syncRow = (settingKey: string, val: boolean) => {
    const rowId = settingKey.replace('show_', 'co_');
    const meta = ROW_ID_MAP[settingKey];
    if (!meta) { update(settingKey as any, val as any); return; }
    const rows = [...(tpl.company_info_rows ?? [])];
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
    update('company_info_rows', rows);
  };

  const toggleColumnExpand = (colId: string) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      return next;
    });
  };

  const updateHeaderLayout = (patch: Partial<typeof hl>) => {
    update('header_layout', { ...hl, ...patch });
  };

  const addColumn = () => {
    const newCol: LayoutBlock = {
      id: `col_${Date.now()}`, order: hl.columns.length, visible: true,
      width: 30, align: 'center', rows: [],
    };
    updateHeaderLayout({ columns: [...hl.columns, newCol] });
    setExpandedColumns(prev => new Set(prev).add(newCol.id));
  };

  const removeColumn = (colId: string) => {
    updateHeaderLayout({ columns: hl.columns.filter(c => c.id !== colId) });
  };

  const updateColumn = (colId: string, patch: Partial<LayoutBlock>) => {
    updateHeaderLayout({
      columns: hl.columns.map(c => c.id === colId ? { ...c, ...patch } : c),
    });
  };

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

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-field">
        <label className="ps-field-label">تخطيط الرأس</label>
        <div className="ps-paper-pills" style={{ marginTop: 2 }}>
          {(['simple', 'columns'] as const).map(m => (
            <button key={m} className={`ps-paper-pill ${hl.mode === m ? 'on' : ''}`}
              onClick={() => updateHeaderLayout({ mode: m, columns: m === 'simple' ? [] : hl.columns })}>
              {m === 'simple' ? 'بسيط' : 'أعمدة'}
            </button>
          ))}
        </div>
      </div>

      {isColumns && (
        <Section title="أعمدة الرأس" icon="ti-columns" defaultOpen>
          {hl.columns.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--t4)', padding: '4px 0' }}>
              لا توجد أعمدة. اضغط "+ إضافة عمود" للبدء.
            </div>
          )}
          {hl.columns
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((col) => {
              const open = expandedColumns.has(col.id);
              const colIdx = hl.columns.indexOf(col);
              return (
                <div key={col.id} style={{
                  border: '1px solid var(--b2)', borderRadius: 'var(--r1)',
                  marginBottom: 4, overflow: 'hidden',
                }}>
                  <div
                    onClick={() => toggleColumnExpand(col.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', cursor: 'pointer',
                      background: open ? 'var(--emb)' : 'var(--bg3)',
                      borderBottom: open ? '1px solid var(--b2)' : 'none',
                    }}
                  >
                    <i className={`ti ti-chevron-${open ? 'down' : 'left'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
                    <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: 'var(--t2)' }}>
                      عمود {colIdx + 1}
                      {col.width ? ` (${col.width}%)` : ''}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeColumn(col.id); }}
                      style={{
                        width: 18, height: 18, borderRadius: 4,
                        border: '1px solid var(--b2)', background: 'var(--bg3)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 10, color: '#c00', padding: 0,
                      }}
                      type="button" title="حذف العمود"
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                  {open && (
                    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <SliderField label="العرض" value={col.width ?? 30} min={10} max={60} unit="%"
                        onChange={v => updateColumn(col.id, { width: v })} />
                      <AlignButtons label="المحاذاة" value={col.align}
                        onChange={v => updateColumn(col.id, { align: v })} />
                      <BorderSelect label="الإطار" value={col.border?.style ?? 'none'}
                        onChange={v => updateColumn(col.id, {
                          border: { ...(col.border ?? { style: 'none', width: 1, color: '#333' }), style: v },
                        })} />
                      <div style={{ borderTop: '1px solid var(--b2)', margin: '4px 0' }} />
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 2 }}>صفوف العمود</div>
                      <RowManager
                        rows={col.rows ?? []}
                        onChange={rows => updateColumn(col.id, { rows })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          <button
            onClick={addColumn}
            type="button"
            style={{
              width: '100%', padding: '5px 0', marginTop: 4, borderRadius: 'var(--r1)',
              border: '1px dashed var(--b2)', background: 'transparent',
              cursor: 'pointer', fontSize: 11, color: 'var(--t3)',
              fontFamily: 'Tajawal, sans-serif', fontWeight: 600,
            }}
          >
            + إضافة عمود
          </button>
        </Section>
      )}

      <div className="ps-section-title" style={{ marginTop: 8, fontSize: 12 }}>معلومات الشركة</div>
      <RowManager
        rows={tpl.company_info_rows ?? []}
        onChange={rows => update('company_info_rows', rows)}
        fields={COMPANY_FIELD_OPTIONS}
        addLabel="+ إضافة سطر"
      />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>إظهار / إخفاء الحقول</div>
      <Toggle value={tpl.show_address}        onChange={v => syncRow('show_address', v)}        label="العنوان (address)" />
      <Toggle value={tpl.show_phone}          onChange={v => syncRow('show_phone', v)}          label="الهاتف (phone)" />
      <Toggle value={tpl.show_mobile}         onChange={v => syncRow('show_mobile', v)}         label="المحمول (mobile)" />
      <Toggle value={tpl.show_fax}            onChange={v => syncRow('show_fax', v)}            label="الفاكس (fax)" />
      <Toggle value={tpl.show_email}          onChange={v => syncRow('show_email', v)}          label="البريد الإلكتروني (email)" />
      <Toggle value={tpl.show_commercial_name} onChange={v => syncRow('show_commercial_name', v)} label="الاسم التجاري (commercial_name)" />
      <Toggle value={tpl.show_tax_id}         onChange={v => syncRow('show_tax_id', v)}         label="رقم الضريبة NIF (nif)" />
      <Toggle value={tpl.show_rc}             onChange={v => syncRow('show_rc', v)}             label="السجل التجاري RC (rc)" />
      <Toggle value={tpl.show_nis}            onChange={v => syncRow('show_nis', v)}            label="رقم NIS / STAT (nis)" />
      <Toggle value={tpl.show_article}        onChange={v => syncRow('show_article', v)}        label="المادة الجبائية (ai)" />
      <Toggle value={tpl.show_capital}        onChange={v => syncRow('show_capital', v)}        label="الرأس المال (capital_amount)" />
      <Toggle value={tpl.show_bank_name}      onChange={v => syncRow('show_bank_name', v)}      label="اسم البنك (bank_name)" />
      <Toggle value={tpl.show_rib}            onChange={v => syncRow('show_rib', v)}            label="الحساب البنكي (rib)" />
      <Toggle value={tpl.show_activity}       onChange={v => syncRow('show_activity', v)}       label="النشاط (activity)" />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>سمة ومحاذاة</div>
      {sec('company_info_size') && <SliderField label="حجم الخط" value={tpl.company_info_size} min={7} max={14} unit="px"
        onChange={v => update('company_info_size', v)} />}
      {sec('company_info_font_family') && <div className="ps-field">
        <label className="ps-field-label">نوع الخط</label>
        <select className="ps-select" value={tpl.company_info_font_family}
          onChange={e => update('company_info_font_family', e.target.value as any)}>
          <option value="tajawal">Tajawal (واضح)</option>
          <option value="monospace">Courier (أحادي)</option>
          <option value="times">Times (كلاسيكي)</option>
          <option value="arial">Arial (حديث)</option>
        </select>
      </div>}
      {sec('company_info_bold') && <Toggle value={tpl.company_info_bold} onChange={v => update('company_info_bold', v)} label="خط عريض" />}
      {sec('company_info_italic') && <Toggle value={tpl.company_info_italic} onChange={v => update('company_info_italic', v)} label="خط مائل" />}
      {sec('company_info_align') && <AlignButtons label="محاذاة المعلومات" value={tpl.company_info_align}
        onChange={v => update('company_info_align', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>تسميات الحقول</div>
      <Field label="تسمية العنوان (address)"><Input value={tpl.label_address} onChange={v => syncLabel('label_address', v)} placeholder="العنوان" /></Field>
      <Field label="تسمية الهاتف (phone)"><Input value={tpl.label_phone} onChange={v => syncLabel('label_phone', v)} placeholder="الهاتف" /></Field>
      <Field label="تسمية المحمول (mobile)"><Input value={tpl.label_mobile} onChange={v => syncLabel('label_mobile', v)} placeholder="المحمول" /></Field>
      <Field label="تسمية الفاكس (fax)"><Input value={tpl.label_fax} onChange={v => syncLabel('label_fax', v)} placeholder="الفاكس" /></Field>
      <Field label="تسمية البريد الإلكتروني (email)"><Input value={tpl.label_email} onChange={v => syncLabel('label_email', v)} placeholder="البريد الإلكتروني" /></Field>
      <Field label="تسمية الاسم التجاري (commercial_name)"><Input value={tpl.label_commercial_name} onChange={v => syncLabel('label_commercial_name', v)} placeholder="الاسم التجاري" /></Field>
      <Field label="تسمية رقم الضريبة (nif)"><Input value={tpl.label_nif} onChange={v => syncLabel('label_nif', v)} placeholder="NIF" /></Field>
      <Field label="تسمية السجل التجاري (rc)"><Input value={tpl.label_rc} onChange={v => syncLabel('label_rc', v)} placeholder="RC" /></Field>
      <Field label="تسمية NIS (nis)"><Input value={tpl.label_nis} onChange={v => syncLabel('label_nis', v)} placeholder="NIS" /></Field>
      <Field label="تسمية المادة الجبائية (ai)"><Input value={tpl.label_article} onChange={v => syncLabel('label_article', v)} placeholder="المادة الجبائية" /></Field>
      <Field label="تسمية الرأس المال (capital_amount)"><Input value={tpl.label_capital} onChange={v => syncLabel('label_capital', v)} placeholder="الرأس المال" /></Field>
      <Field label="تسمية اسم البنك (bank_name)"><Input value={tpl.label_bank_name} onChange={v => syncLabel('label_bank_name', v)} placeholder="اسم البنك" /></Field>
      <Field label="تسمية الحساب البنكي (rib)"><Input value={tpl.label_rib} onChange={v => syncLabel('label_rib', v)} placeholder="RIB" /></Field>
      <Field label="تسمية النشاط (activity)"><Input value={tpl.label_activity} onChange={v => syncLabel('label_activity', v)} placeholder="النشاط" /></Field>

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
      <CompanyField label="المحمول" value={tpl.override_mobile} onChange={v => update('override_mobile', v)} placeholder="رقم المحمول" apiValue={company?.mobile} />
      <CompanyField label="الفاكس" value={tpl.override_fax} onChange={v => update('override_fax', v)} placeholder="الفاكس" apiValue={company?.fax} />
      <CompanyField label="البريد الإلكتروني" value={tpl.override_email} onChange={v => update('override_email', v)} placeholder="البريد الإلكتروني" apiValue={company?.email} />
      <CompanyField label="الاسم التجاري" value={tpl.override_commercial_name} onChange={v => update('override_commercial_name', v)} placeholder="الاسم التجاري" apiValue={company?.commercialName} />
      <CompanyField label="NIF" value={tpl.override_nif} onChange={v => update('override_nif', v)} placeholder="الرقم الضريبي" apiValue={company?.nif} />
      <CompanyField label="RC" value={tpl.override_rc} onChange={v => update('override_rc', v)} placeholder="السجل التجاري" apiValue={company?.rc} />
      <CompanyField label="NIS" value={tpl.override_nis} onChange={v => update('override_nis', v)} placeholder="رقم NIS" apiValue={company?.nis} />
      <CompanyField label="المادة الجبائية" value={tpl.override_article} onChange={v => update('override_article', v)} placeholder="المادة الجبائية" apiValue={company?.article} />
      <CompanyField label="الرأس المال" value={tpl.override_capital} onChange={v => update('override_capital', v)} placeholder="الرأس المال" apiValue={company?.capital} />
      <CompanyField label="اسم البنك" value={tpl.override_bank_name} onChange={v => update('override_bank_name', v)} placeholder="اسم البنك" apiValue={company?.bankName} />
      <CompanyField label="الحساب البنكي" value={tpl.override_rib} onChange={v => update('override_rib', v)} placeholder="RIB" apiValue={company?.rib} />
      <CompanyField label="النشاط" value={tpl.override_activity} onChange={v => update('override_activity', v)} placeholder="النشاط" apiValue={company?.activity} />

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
