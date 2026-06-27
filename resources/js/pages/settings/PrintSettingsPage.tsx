import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useCurrentCompany } from '@/lib/api/endpoints/companies';
import {
  usePrintTemplates, usePrintTemplateMutations,
} from './print-settings/api/printTemplatesApi';
import ReceiptPreview from './print-settings/components/ReceiptPreview';
import {
  createDefaultTemplate, DOC_TYPE_LIST,
  type PrintTemplate, type DocTypeCode, type ColumnKey,
  type AlignOption, type BorderStyle, type FontFamily,
  type CompanyData,
} from './print-settings/types';

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="ps-toggle" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
      <div
        className={`ps-toggle-track ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
        style={{
          width: 36, height: 20, borderRadius: 10, flexShrink: 0,
          background: value ? 'var(--em)' : 'var(--bg5)',
          border: '1px solid ' + (value ? 'var(--em)' : 'var(--b3)'),
          position: 'relative', cursor: 'pointer', transition: 'all .18s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, transition: 'left .18s',
          left: value ? 18 : 2,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        }} />
      </div>
      <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500 }}>{label}</span>
    </label>
  );
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ padding: '3px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: 'var(--t3)' }}>{label}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--em)',
          background: 'var(--emb)', padding: '1px 6px', borderRadius: 4,
          fontFamily: 'monospace',
        }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', height: 3, accentColor: 'var(--em)' }}
      />
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>
        {label}
        {hint && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t4)', marginRight: 5 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)',
        border: '1px solid var(--b2)', background: 'var(--bg3)',
        fontSize: 12, color: 'var(--t1)', outline: 'none',
        fontFamily: 'Tajawal, sans-serif',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--emb)'; }}
      onBlur={e  => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)',
        border: '1px solid var(--b2)', background: 'var(--bg3)',
        fontSize: 12, color: 'var(--t1)', outline: 'none', resize: 'vertical',
        fontFamily: 'Tajawal, sans-serif',
      }}
    />
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)',
        border: '1px solid var(--b2)', background: 'var(--bg3)',
        fontSize: 12, color: 'var(--t1)', outline: 'none',
        fontFamily: 'Tajawal, sans-serif',
      }}
    >
      {children}
    </select>
  );
}

function AlignPills({ value, onChange }: { value: AlignOption; onChange: (v: AlignOption) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
      {(['right', 'center', 'left'] as AlignOption[]).map(a => (
        <button key={a}
          onClick={() => onChange(a)}
          style={{
            flex: 1, padding: '4px 0', fontSize: 11, borderRadius: 'var(--r1)',
            border: `1px solid ${value === a ? 'var(--em)' : 'var(--b2)'}`,
            background: value === a ? 'var(--emb)' : 'var(--bg3)',
            color: value === a ? 'var(--em)' : 'var(--t3)',
            cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 600,
          }}
        >
          {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
        </button>
      ))}
    </div>
  );
}

function BorderPills({ value, onChange }: { value: BorderStyle; onChange: (v: BorderStyle) => void }) {
  const opts: { v: BorderStyle; l: string }[] = [
    { v: 'solid', l: '─' }, { v: 'dashed', l: '- -' },
    { v: 'double', l: '═' }, { v: 'none', l: 'بلا' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          style={{
            flex: 1, padding: '4px 0', fontSize: 11, borderRadius: 'var(--r1)',
            border: `1px solid ${value === o.v ? 'var(--em)' : 'var(--b2)'}`,
            background: value === o.v ? 'var(--emb)' : 'var(--bg3)',
            color: value === o.v ? 'var(--em)' : 'var(--t3)',
            cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700,
          }}
        >{o.l}</button>
      ))}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 32, height: 28, border: '1px solid var(--b2)', borderRadius: 4, cursor: 'pointer', padding: 1 }}
        />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, padding: '4px 7px', border: '1px solid var(--b2)',
            borderRadius: 'var(--r1)', background: 'var(--bg3)',
            fontSize: 12, color: 'var(--t1)', outline: 'none',
            fontFamily: 'monospace',
          }}
        />
      </div>
    </Field>
  );
}

function Accordion({ title, icon, children, defaultOpen = true }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 6, border: '1px solid var(--b2)', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', background: 'var(--bg3)',
          border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          borderBottom: open ? '1px solid var(--b2)' : 'none',
        }}
      >
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 14 }} />
        <span style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{title}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 12, color: 'var(--t4)' }} />
      </button>
      {open && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Column Manager ───────────────────────────────────────────────────────────

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'rowNumber', label: 'رقم السطر'   },
  { key: 'barcode',   label: 'باركود'       },
  { key: 'ref',       label: 'المرجع'        },
  { key: 'name',      label: 'اسم المنتج'   },
  { key: 'unit',      label: 'الوحدة'        },
  { key: 'quantity',  label: 'الكمية'        },
  { key: 'price',     label: 'السعر'         },
  { key: 'discount',  label: 'الخصم'         },
  { key: 'tva',       label: 'نسبة TVA'      },
  { key: 'total',     label: 'المجموع'       },
];

function ColumnManager({ tpl, update }: { tpl: PrintTemplate; update: Updater }) {
  const toggleCol = (key: ColumnKey, show: boolean) => {
    update('col_show', { ...tpl.col_show, [key]: show });
    if (show && !tpl.col_order.includes(key))
      update('col_order', [...tpl.col_order, key]);
  };

  const moveCol = (key: ColumnKey, dir: -1 | 1) => {
    const arr = [...tpl.col_order];
    const idx = arr.indexOf(key);
    if (idx < 0) return;
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    update('col_order', arr);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {ALL_COLUMNS.map(col => {
        const visible = tpl.col_show[col.key] !== false;
        const idx     = tpl.col_order.indexOf(col.key);
        return (
          <div key={col.key} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 6px', borderRadius: 'var(--r1)',
            background: visible ? 'var(--emb)' : 'var(--bg3)',
            border: `1px solid ${visible ? 'var(--embo)' : 'var(--b1)'}`,
            transition: 'all .13s',
          }}>
            <div
              onClick={() => toggleCol(col.key, !visible)}
              style={{
                width: 30, height: 17, borderRadius: 9,
                background: visible ? 'var(--em)' : 'var(--bg5)',
                border: `1px solid ${visible ? 'var(--em)' : 'var(--b3)'}`,
                position: 'relative', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 1.5, left: visible ? 14 : 1.5,
                width: 12, height: 12, borderRadius: '50%', background: '#fff',
                transition: 'left .18s',
              }} />
            </div>

            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
              {col.label}
              {visible && idx >= 0 && (
                <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 5 }}>#{idx + 1}</span>
              )}
            </span>

            <button
              onClick={() => moveCol(col.key, -1)} disabled={idx <= 0}
              style={{ ...miniBtn, opacity: idx <= 0 ? 0.3 : 1 }}
            ><i className="ti ti-chevron-right" /></button>
            <button
              onClick={() => moveCol(col.key, 1)} disabled={idx >= tpl.col_order.length - 1}
              style={{ ...miniBtn, opacity: idx >= tpl.col_order.length - 1 ? 0.3 : 1 }}
            ><i className="ti ti-chevron-left" /></button>

            {visible && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <input
                  type="range" min={5} max={60} step={1}
                  value={tpl.col_widths[col.key] ?? 20}
                  onChange={e => update('col_widths', { ...tpl.col_widths, [col.key]: Number(e.target.value) })}
                  style={{ width: 50, height: 3, accentColor: 'var(--em)' }}
                />
                <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 22, textAlign: 'left' }}>
                  {tpl.col_widths[col.key] ?? 20}%
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, border: '1px solid var(--b2)',
  background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 11,
  color: 'var(--t3)', padding: 0,
};

// ─── Template Editor Controls ─────────────────────────────────────────────────

type Updater = <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;

function TemplateControls({ tpl, update }: { tpl: PrintTemplate; update: Updater }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

      <Accordion title="رأس الفاتورة — الشعار والشركة" icon="ti-building-store">
        <Toggle value={tpl.show_logo} onChange={v => update('show_logo', v)} label="إظهار الشعار" />
        {tpl.show_logo && (
          <>
            <Slider label="حجم الشعار" value={tpl.logo_size} min={30} max={150} unit="px" onChange={v => update('logo_size', v)} />
            <Slider label="تدوير الزوايا" value={tpl.logo_border_radius} min={0} max={50} unit="%" onChange={v => update('logo_border_radius', v)} />
            <Field label="محاذاة الشعار"><AlignPills value={tpl.logo_align} onChange={v => update('logo_align', v)} /></Field>
          </>
        )}

        <Toggle value={tpl.show_company_name} onChange={v => update('show_company_name', v)} label="اسم المؤسسة" />
        {tpl.show_company_name && (
          <>
            <Field label="نص الاسم" hint="(فارغ = من بيانات الشركة)">
              <Input value={tpl.company_name_text} onChange={v => update('company_name_text', v)} placeholder="اسم المؤسسة..." />
            </Field>
            <Slider label="حجم الخط" value={tpl.company_name_size} min={10} max={30} unit="px" onChange={v => update('company_name_size', v)} />
            <Toggle value={tpl.company_name_bold} onChange={v => update('company_name_bold', v)} label="خط عريض" />
            <Field label="محاذاة الاسم"><AlignPills value={tpl.company_name_align} onChange={v => update('company_name_align', v)} /></Field>
            <ColorField label="لون الاسم" value={tpl.company_name_color} onChange={v => update('company_name_color', v)} />
          </>
        )}

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', marginBottom: 4 }}>معلومات الشركة</div>
        <Toggle value={tpl.show_address} onChange={v => update('show_address', v)} label="العنوان" />
        <Toggle value={tpl.show_phone}   onChange={v => update('show_phone', v)}   label="الهاتف" />
        <Toggle value={tpl.show_tax_id}  onChange={v => update('show_tax_id', v)}  label="رقم NIF" />
        <Toggle value={tpl.show_rc}      onChange={v => update('show_rc', v)}      label="السجل التجاري RC" />
        <Toggle value={tpl.show_nis}     onChange={v => update('show_nis', v)}     label="رقم NIS / STAT" />
        <Toggle value={tpl.show_ice}     onChange={v => update('show_ice', v)}     label="رقم ICE" />
        <Toggle value={tpl.show_article} onChange={v => update('show_article', v)} label="النشاط (Article)" />
        <Slider label="حجم خط المعلومات" value={tpl.company_info_size} min={7} max={14} unit="px" onChange={v => update('company_info_size', v)} />
        <Field label="محاذاة المعلومات"><AlignPills value={tpl.company_info_align} onChange={v => update('company_info_align', v)} /></Field>

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', marginBottom: 4 }}>
          بيانات مخصصة <span style={{ fontWeight: 400, color: 'var(--t4)' }}>(تستبدل بيانات الشركة في الطباعة)</span>
        </div>
        <Field label="العنوان"><Input value={tpl.override_address} onChange={v => update('override_address', v)} placeholder="فارغ = من الشركة" /></Field>
        <Field label="الهاتف"><Input value={tpl.override_phone} onChange={v => update('override_phone', v)} /></Field>
        <Field label="NIF"><Input value={tpl.override_nif} onChange={v => update('override_nif', v)} /></Field>
        <Field label="RC"><Input value={tpl.override_rc} onChange={v => update('override_rc', v)} /></Field>
        <Field label="NIS"><Input value={tpl.override_nis} onChange={v => update('override_nis', v)} /></Field>
        <Field label="ICE"><Input value={tpl.override_ice} onChange={v => update('override_ice', v)} /></Field>

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <Field label="نص إضافي في الرأس">
          <Input value={tpl.header_custom_text} onChange={v => update('header_custom_text', v)} placeholder="مثال: مفتوح من 08:00 إلى 20:00" />
        </Field>
        <Field label="فاصل الرأس"><BorderPills value={tpl.header_separator} onChange={v => update('header_separator', v)} /></Field>
      </Accordion>

      <Accordion title="معلومات المستند" icon="ti-file-description">
        <Field label="عنوان المستند">
          <Input value={tpl.title_text} onChange={v => update('title_text', v)} />
        </Field>
        <Slider label="حجم العنوان" value={tpl.title_size} min={10} max={24} unit="px" onChange={v => update('title_size', v)} />
        <Toggle value={tpl.title_bold} onChange={v => update('title_bold', v)} label="خط عريض" />
        <Field label="محاذاة العنوان"><AlignPills value={tpl.title_align} onChange={v => update('title_align', v)} /></Field>
        <ColorField label="لون العنوان" value={tpl.title_color} onChange={v => update('title_color', v)} />

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <Toggle value={tpl.show_doc_number}   onChange={v => update('show_doc_number', v)}   label="رقم الوثيقة" />
        <Toggle value={tpl.show_date}         onChange={v => update('show_date', v)}         label="التاريخ" />
        <Toggle value={tpl.show_time}         onChange={v => update('show_time', v)}         label="الوقت" />
        <Toggle value={tpl.show_due_date}     onChange={v => update('show_due_date', v)}     label="تاريخ الاستحقاق" />
        <Toggle value={tpl.show_cashier}      onChange={v => update('show_cashier', v)}      label="اسم الكاشير" />
        <Toggle value={tpl.show_session}      onChange={v => update('show_session', v)}      label="رقم الجلسة" />
        <Toggle value={tpl.show_payment_term} onChange={v => update('show_payment_term', v)} label="شروط الدفع" />
        <Toggle value={tpl.show_client}       onChange={v => update('show_client', v)}       label="العميل" />
        {tpl.show_client && (
          <>
            <Toggle value={tpl.show_client_nif}     onChange={v => update('show_client_nif', v)}     label="  ↳ NIF العميل" />
            <Toggle value={tpl.show_client_phone}   onChange={v => update('show_client_phone', v)}   label="  ↳ هاتف العميل" />
            <Toggle value={tpl.show_client_address} onChange={v => update('show_client_address', v)} label="  ↳ عنوان العميل" />
            <Toggle value={tpl.show_delivery_address} onChange={v => update('show_delivery_address', v)} label="  ↳ عنوان التسليم" />
          </>
        )}
        <Toggle value={tpl.show_bank_details} onChange={v => update('show_bank_details', v)} label="البيانات البنكية" />
        {tpl.show_bank_details && (
          <Field label="نص البيانات البنكية">
            <Textarea value={tpl.bank_details_text} onChange={v => update('bank_details_text', v)}
              placeholder="بنك الفلاحة — CCP: 001 234 567" rows={3} />
          </Field>
        )}
        <Field label="فاصل المعلومات"><BorderPills value={tpl.doc_separator} onChange={v => update('doc_separator', v)} /></Field>
      </Accordion>

      <Accordion title="جدول المنتجات — الأعمدة" icon="ti-list-details">
        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>
          فعّل الأعمدة وحدد ترتيبها وعرضها
        </div>
        <ColumnManager tpl={tpl} update={update} />

        <div style={{ height: 1, background: 'var(--b2)', margin: '8px 0' }} />
        <Slider label="حجم الخط" value={tpl.items_font_size} min={7} max={14} unit="px" onChange={v => update('items_font_size', v)} />
        <Field label="نوع الخط">
          <Select value={tpl.items_font_family} onChange={v => update('items_font_family', v as FontFamily)}>
            <option value="tajawal">Tajawal — عربي واضح</option>
            <option value="monospace">Courier — أحادي المسافة</option>
            <option value="arial">Arial — لاتيني</option>
            <option value="times">Times — كلاسيكي</option>
          </Select>
        </Field>
        <Toggle value={tpl.show_col_header}   onChange={v => update('show_col_header', v)}   label="إظهار رأس الجدول" />
        {tpl.show_col_header && (
          <>
            <Toggle value={tpl.table_header_bold} onChange={v => update('table_header_bold', v)} label="خط عريض للرأس" />
            <Toggle value={tpl.table_header_bg}   onChange={v => update('table_header_bg', v)}   label="خلفية ملونة للرأس" />
            <ColorField label="لون نص الرأس" value={tpl.table_header_color} onChange={v => update('table_header_color', v)} />
          </>
        )}
        <Field label="حدود الجدول"><BorderPills value={tpl.table_border_style} onChange={v => update('table_border_style', v)} /></Field>
        <Toggle value={tpl.alternating_rows} onChange={v => update('alternating_rows', v)} label="تلوين متناوب للأسطر" />
        {tpl.alternating_rows && (
          <ColorField label="لون الأسطر الزوجية" value={tpl.alternating_color} onChange={v => update('alternating_color', v)} />
        )}
        <Field label="عرض الأسعار">
          <Select value={tpl.price_display} onChange={v => update('price_display', v as 'ht' | 'ttc')}>
            <option value="ht">HT (بدون ضريبة)</option>
            <option value="ttc">TTC (بالضريبة)</option>
          </Select>
        </Field>
        <Toggle value={tpl.show_line_total_ttc} onChange={v => update('show_line_total_ttc', v)} label="الإجمالي TTC لكل سطر" />
      </Accordion>

      <Accordion title="الإجماليات والمدفوعات" icon="ti-cash">
        <Slider label="حجم خط الإجماليات" value={tpl.totals_font_size} min={8} max={16} unit="px" onChange={v => update('totals_font_size', v)} />
        <Toggle value={tpl.totals_bold} onChange={v => update('totals_bold', v)} label="خط عريض" />
        <Field label="محاذاة"><AlignPills value={tpl.totals_align} onChange={v => update('totals_align', v)} /></Field>

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <Toggle value={tpl.show_total_ht}      onChange={v => update('show_total_ht', v)}      label="المجموع HT" />
        <Toggle value={tpl.show_total_tva}     onChange={v => update('show_total_tva', v)}     label="مبلغ TVA" />
        <Toggle value={tpl.show_tva_breakdown} onChange={v => update('show_tva_breakdown', v)} label="تفصيل TVA حسب النسبة" />
        <Toggle value={tpl.show_discount_total} onChange={v => update('show_discount_total', v)} label="إجمالي الخصومات" />
        <Toggle value={tpl.show_fiscal_stamp}  onChange={v => update('show_fiscal_stamp', v)}  label="الطابع الجبائي" />

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <Toggle value={tpl.show_total_ttc} onChange={v => update('show_total_ttc', v)} label="الإجمالي TTC (الكبير)" />
        {tpl.show_total_ttc && (
          <>
            <Slider label="حجم خط TTC" value={tpl.total_ttc_font_size} min={11} max={26} unit="px" onChange={v => update('total_ttc_font_size', v)} />
            <Toggle value={tpl.total_ttc_bold} onChange={v => update('total_ttc_bold', v)} label="خط عريض" />
            <ColorField label="لون TTC" value={tpl.total_ttc_color} onChange={v => update('total_ttc_color', v)} />
            <Field label="إطار TTC"><BorderPills value={tpl.total_border_style} onChange={v => update('total_border_style', v)} /></Field>
          </>
        )}
        <Toggle value={tpl.show_amount_in_words} onChange={v => update('show_amount_in_words', v)} label="المبلغ بالكتابة" />

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', marginBottom: 4 }}>الأرصدة والدفع</div>
        <Toggle value={tpl.show_payment_details} onChange={v => update('show_payment_details', v)} label="تفصيل وسائل الدفع" />
        {tpl.show_payment_details && (
          <Slider label="حجم خط وسائل الدفع" value={tpl.payment_font_size} min={8} max={14} unit="px" onChange={v => update('payment_font_size', v)} />
        )}
        <Toggle value={tpl.show_paid_amount}  onChange={v => update('show_paid_amount', v)}  label="المبلغ المدفوع" />
        <Toggle value={tpl.show_change}       onChange={v => update('show_change', v)}       label="الباقي (الصرف)" />
        <Toggle value={tpl.show_remaining}    onChange={v => update('show_remaining', v)}    label="المبلغ المتبقي (دين)" />
        <Toggle value={tpl.show_prev_balance} onChange={v => update('show_prev_balance', v)} label="الرصيد السابق" />
        <Toggle value={tpl.show_new_balance}  onChange={v => update('show_new_balance', v)}  label="الرصيد الجديد" />
      </Accordion>

      <Accordion title="التذييل — النصوص والباركود" icon="ti-file-text">
        <Field label="سطر 1">
          <Input value={tpl.footer_line1} onChange={v => update('footer_line1', v)} placeholder="مثال: مفتوح يومياً 08:00 – 20:00" />
        </Field>
        <Field label="سطر 2">
          <Input value={tpl.footer_line2} onChange={v => update('footer_line2', v)} />
        </Field>
        <Field label="سطر 3">
          <Input value={tpl.footer_line3} onChange={v => update('footer_line3', v)} />
        </Field>
        <Field label="فاصل التذييل"><BorderPills value={tpl.footer_separator} onChange={v => update('footer_separator', v)} /></Field>

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <Toggle value={tpl.show_thank_you} onChange={v => update('show_thank_you', v)} label="رسالة الشكر" />
        {tpl.show_thank_you && (
          <>
            <Field label="نص رسالة الشكر">
              <Input value={tpl.thank_you_text} onChange={v => update('thank_you_text', v)} />
            </Field>
            <Slider label="حجم خط الشكر" value={tpl.thank_you_size} min={9} max={20} unit="px" onChange={v => update('thank_you_size', v)} />
            <ColorField label="لون الشكر" value={tpl.thank_you_color} onChange={v => update('thank_you_color', v)} />
          </>
        )}

        <Toggle value={tpl.show_returns_policy} onChange={v => update('show_returns_policy', v)} label="سياسة الإرجاع" />
        {tpl.show_returns_policy && (
          <Field label="نص السياسة">
            <Textarea value={tpl.returns_policy_text} onChange={v => update('returns_policy_text', v)} />
          </Field>
        )}

        <Field label="نص قانوني سفلي">
          <Textarea value={tpl.footer_legal_text} onChange={v => update('footer_legal_text', v)}
            placeholder="يُعتبر هذا المستند ملزماً قانونياً..." />
        </Field>

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <Toggle value={tpl.show_barcode} onChange={v => update('show_barcode', v)} label="الباركود" />
        {tpl.show_barcode && (
          <Field label="محتوى الباركود">
            <Select value={tpl.barcode_content} onChange={v => update('barcode_content', v as any)}>
              <option value="doc-number">رقم المستند</option>
              <option value="total">المبلغ الإجمالي</option>
              <option value="custom">نص مخصص</option>
            </Select>
            {tpl.barcode_content === 'custom' && (
              <div style={{ marginTop: 4 }}>
                <Input value={tpl.barcode_custom_text} onChange={v => update('barcode_custom_text', v)} placeholder="النص..." />
              </div>
            )}
          </Field>
        )}

        <Toggle value={tpl.show_qr} onChange={v => update('show_qr', v)} label="QR Code" />
        {tpl.show_qr && (
          <Field label="محتوى QR">
            <Select value={tpl.qr_content} onChange={v => update('qr_content', v as any)}>
              <option value="doc-number">رقم المستند</option>
              <option value="company-info">معلومات الشركة</option>
              <option value="both">الاثنين معاً</option>
            </Select>
          </Field>
        )}

        <div style={{ height: 1, background: 'var(--b2)', margin: '6px 0' }} />
        <Toggle value={tpl.show_cashier_signature} onChange={v => update('show_cashier_signature', v)} label="إمضاء الكاشير" />
        <Toggle value={tpl.show_client_signature}  onChange={v => update('show_client_signature', v)}  label="إمضاء العميل" />
        <Toggle value={tpl.show_stamp}             onChange={v => update('show_stamp', v)}             label="ختم المؤسسة" />
      </Accordion>

      <Accordion title="تنسيق الطباعة — ورق وهوامش" icon="ti-settings" defaultOpen={false}>
        <Field label="عرض الورق">
          <div style={{ display: 'flex', gap: 4 }}>
            {([80, 58] as const).map(w => (
              <button key={w} onClick={() => update('paper_width_mm', w)}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 12, borderRadius: 'var(--r1)',
                  border: `1px solid ${tpl.paper_width_mm === w ? 'var(--em)' : 'var(--b2)'}`,
                  background: tpl.paper_width_mm === w ? 'var(--emb)' : 'var(--bg3)',
                  color: tpl.paper_width_mm === w ? 'var(--em)' : 'var(--t3)',
                  cursor: 'pointer', fontWeight: 700,
                }}
              >{w} mm</button>
            ))}
          </div>
        </Field>
        <Field label="اتجاه الصفحة (للـ A4)">
          <div style={{ display: 'flex', gap: 4 }}>
            {(['portrait', 'landscape'] as const).map(o => (
              <button key={o} onClick={() => update('page_orientation', o)}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 12, borderRadius: 'var(--r1)',
                  border: `1px solid ${tpl.page_orientation === o ? 'var(--em)' : 'var(--b2)'}`,
                  background: tpl.page_orientation === o ? 'var(--emb)' : 'var(--bg3)',
                  color: tpl.page_orientation === o ? 'var(--em)' : 'var(--t3)',
                  cursor: 'pointer', fontWeight: 700,
                }}
              >{o === 'portrait' ? 'عمودي' : 'أفقي'}</button>
            ))}
          </div>
        </Field>
        <Slider label="هامش علوي"  value={tpl.margin_top}    min={0} max={15} unit="mm" onChange={v => update('margin_top', v)} />
        <Slider label="هامش سفلي"  value={tpl.margin_bottom} min={0} max={15} unit="mm" onChange={v => update('margin_bottom', v)} />
        <Slider label="هامش جانبي" value={tpl.margin_sides}  min={0} max={15} unit="mm" onChange={v => update('margin_sides', v)} />
        <Slider label="تباعد الأسطر" value={tpl.line_spacing} min={1} max={2.5} step={0.1} unit="×" onChange={v => update('line_spacing', v)} />
        <Slider label="حجم الخط الأساسي" value={tpl.base_font_size} min={8} max={14} unit="px" onChange={v => update('base_font_size', v)} />
        <Field label="نوع الخط الأساسي">
          <Select value={tpl.font_family} onChange={v => update('font_family', v as FontFamily)}>
            <option value="tajawal">Tajawal — عربي</option>
            <option value="monospace">Courier — أحادي</option>
            <option value="arial">Arial — لاتيني</option>
            <option value="times">Times New Roman</option>
          </Select>
        </Field>
      </Accordion>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveTab = 'templates' | 'printers';
const EMPTY_TEMPLATES: PrintTemplate[] = [];
const DOC_CATEGORIES = [
  { key: 'pos',      label: 'نقطة البيع',  icon: 'ti-device-desktop' },
  { key: 'sales',    label: 'المبيعات',    icon: 'ti-receipt' },
  { key: 'purchase', label: 'الشراء',      icon: 'ti-truck' },
  { key: 'warehouse',label: 'المخزون',     icon: 'ti-box' },
] as const;

export default function PrintSettingsPage() {
  const { data: activeCompany } = useCurrentCompany();
  const companyData: CompanyData | null = useMemo(() => activeCompany
    ? {
        name:     activeCompany.name    ?? '',
        address:  activeCompany.address ?? '',
        phone:    activeCompany.phone   ?? '',
        nif:      activeCompany.nif     ?? '',
        rc:       activeCompany.rc      ?? '',
        nis:      activeCompany.nis     ?? '',
        ice:      '',
        article:  activeCompany.ai      ?? '',
        logoUrl:  activeCompany.avatar  ?? null,
      }
    : null, [activeCompany]);

  const [activeTab,    setActiveTab]    = useState<ActiveTab>('templates');
  const [activeDocCat, setActiveDocCat] = useState<string>('pos');
  const [activeDoc,    setActiveDoc]    = useState<DocTypeCode>('POS');
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [localTpl,     setLocalTpl]     = useState<PrintTemplate | null>(null);
  const [isDirty,      setIsDirty]      = useState(false);
  const [isSaving,       setIsSaving]      = useState(false);

  const { data: templatesData, isLoading } = usePrintTemplates(activeDoc);
  const templates = templatesData ?? EMPTY_TEMPLATES;
  const mutations = usePrintTemplateMutations();

  useEffect(() => {
    if (templates.length > 0) {
      const defaultTpl = templates.find(t => t.is_default) ?? templates[0];
      setSelectedTplId(defaultTpl.id);
      setLocalTpl({ ...defaultTpl });
      setIsDirty(false);
    } else {
      setSelectedTplId(null);
      setLocalTpl(createDefaultTemplate(activeDoc));
      setIsDirty(true);
    }
  }, [templates, activeDoc]);

  const update: Updater = useCallback(<K extends keyof PrintTemplate>(
    key: K, val: PrintTemplate[K],
  ) => {
    setLocalTpl(prev => prev ? { ...prev, [key]: val } : prev);
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!localTpl) return;
    setIsSaving(true);
    try {
      if (selectedTplId && localTpl.id) {
        const saved = await mutations.update.mutateAsync({ id: localTpl.id, data: localTpl });
        setLocalTpl({ ...saved });
        setIsDirty(false);
        toast.success('تم حفظ القالب');
      } else {
        const saved = await mutations.create.mutateAsync({
          ...localTpl,
          doc_type_code: activeDoc,
          is_default: templates.length === 0,
        });
        setSelectedTplId(saved.id);
        setLocalTpl({ ...saved });
        setIsDirty(false);
        toast.success('تم إنشاء القالب');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setIsSaving(false);
    }
  }, [localTpl, selectedTplId, activeDoc, templates.length, mutations]);

  const handleSetDefault = useCallback(async (id: number) => {
    try {
      await mutations.setDefault.mutateAsync(id);
      toast.success('تم تعيين القالب الافتراضي');
    } catch { toast.error('فشل التعيين'); }
  }, [mutations]);

  const handleDuplicate = useCallback(async (tpl: PrintTemplate) => {
    if (!tpl.id) return;
    try {
      const copy = await mutations.duplicate.mutateAsync({
        id: tpl.id, name: `نسخة من ${tpl.name}`,
      });
      setSelectedTplId(copy.id);
      setLocalTpl({ ...copy });
      setIsDirty(false);
      toast.success('تم نسخ القالب');
    } catch { toast.error('فشل النسخ'); }
  }, [mutations]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('هل تريد حذف هذا القالب نهائياً؟')) return;
    try {
      await mutations.remove.mutateAsync(id);
      toast.success('تم الحذف');
    } catch { toast.error('فشل الحذف'); }
  }, [mutations]);

  const handleNewTemplate = useCallback(() => {
    const tpl = createDefaultTemplate(activeDoc, '80mm', 'قالب جديد');
    setLocalTpl(tpl);
    setSelectedTplId(null);
    setIsDirty(true);
  }, [activeDoc]);

  const handleExportTemplate = useCallback(() => {
    if (!localTpl) return;
    const payload = JSON.stringify({
      version: 2,
      docCode: activeDoc,
      template: localTpl,
      exportedAt: new Date().toISOString(),
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `print-template-${activeDoc}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير القالب');
  }, [activeDoc, localTpl]);

  const handleImportTemplate = useCallback(() => {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const imported = data.template ?? data;
        if (!imported || !imported.col_order) { toast.error('ملف غير صالح'); return; }
        setLocalTpl(prev => prev ? { ...prev, ...imported } : imported);
        setIsDirty(true);
        toast.success('تم استيراد القالب — احفظ للتطبيق');
      } catch { toast.error('فشل قراءة الملف'); }
    };
    input.click();
  }, []);

  const handleTestPrint = useCallback(() => {
    if (!localTpl) return;
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) { window.print(); return; }

    const style = document.createElement('style');
    const paperWidth = localTpl.paper_width_mm * 3.78;
    style.textContent = `
      @page { margin: 0; }
      body { margin: 0; background: #fff; font-family: 'Tajawal', sans-serif; }
      @media print { body { margin: 0; } }
    `;

    printWindow.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/>');
    printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(`<div id="print-root" style="width:${paperWidth}px;margin:0 auto;">`);
    printWindow.document.close();

    const printRoot = printWindow.document.getElementById('print-root');
    if (printRoot) {
      const el = document.createElement('div');
      const Preview = ReceiptPreview;
      const root = document.createElement('div');
      printRoot.appendChild(root);

      import('react-dom/client').then(({ createRoot }) => {
        createRoot(root).render(
          React.createElement(Preview, { tpl: localTpl, company: companyData })
        );
        setTimeout(() => { printWindow.print(); setTimeout(() => printWindow.close(), 500); }, 300);
      });
    }
  }, [localTpl, companyData]);

  const docsInCategory = DOC_TYPE_LIST.filter(d => d.category === activeDocCat);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh' }}>

      {/* ── Top Bar ── */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg2)', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--t1)' }}>
            <i className="ti ti-printer" style={{ marginLeft: 6, color: 'var(--em)' }} />
            إعدادات الطباعة
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--t4)' }}>
            تحكم كامل في قوالب طباعة جميع المستندات
          </div>
        </div>

        <div style={{ marginRight: 'auto', display: 'flex', gap: 6 }}>
          {(['templates', 'printers'] as ActiveTab[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--r2)', fontSize: 12.5, fontWeight: 700,
                border: `1px solid ${activeTab === t ? 'var(--em)' : 'var(--b2)'}`,
                background: activeTab === t ? 'var(--emb)' : 'var(--bg3)',
                color: activeTab === t ? 'var(--em)' : 'var(--t3)',
                cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
              }}
            >
              <i className={`ti ${t === 'templates' ? 'ti-template' : 'ti-device-desktop'}`} style={{ marginLeft: 5 }} />
              {t === 'templates' ? 'قوالب الطباعة' : 'الطابعات'}
            </button>
          ))}
        </div>
      </div>

      {/* ══ TEMPLATES TAB ══ */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* ── Sidebar: Document Type Selector ── */}
          <div style={{
            width: 220, borderLeft: '1px solid var(--b2)', flexShrink: 0,
            background: 'var(--bg2)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {DOC_CATEGORIES.map(cat => (
              <div key={cat.key}>
                <div
                  onClick={() => setActiveDocCat(cat.key)}
                  style={{
                    padding: '8px 14px', cursor: 'pointer', fontSize: 11.5, fontWeight: 800,
                    color: activeDocCat === cat.key ? 'var(--em)' : 'var(--t4)',
                    background: activeDocCat === cat.key ? 'var(--emb)' : 'transparent',
                    borderBottom: '1px solid var(--b1)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    textTransform: 'uppercase', letterSpacing: '.8px',
                  }}
                >
                  <i className={`ti ${cat.icon}`} style={{ fontSize: 13 }} />
                  {cat.label}
                </div>

                {activeDocCat === cat.key && docsInCategory.map(doc => {
                  const count = templates.filter(t => t.doc_type_code === doc.code).length;
                  return (
                    <div
                      key={doc.code}
                      onClick={() => setActiveDoc(doc.code)}
                      style={{
                        padding: '7px 14px 7px 20px', cursor: 'pointer', fontSize: 12.5,
                        color: activeDoc === doc.code ? 'var(--em)' : 'var(--t2)',
                        background: activeDoc === doc.code ? 'rgba(10,138,92,.05)' : 'transparent',
                        borderRight: activeDoc === doc.code ? '2px solid var(--em)' : '2px solid transparent',
                        borderBottom: '1px solid var(--b1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        <span style={{ fontWeight: 800, marginLeft: 5 }}>{doc.code}</span>
                        {doc.name}
                      </span>
                      {count > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 8,
                          background: 'var(--emb)', color: 'var(--em)',
                        }}>{count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── Main content ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

            {/* Templates list + actions bar */}
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--b2)',
              background: 'var(--bg3)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginLeft: 4 }}>
                قوالب {DOC_TYPE_LIST.find(d => d.code === activeDoc)?.name}:
              </span>

              <div style={{ display: 'flex', gap: 5, flex: 1, flexWrap: 'wrap' }}>
                {templates.map(tpl => (
                  <div key={tpl.id!} style={{
                    display: 'flex', alignItems: 'center', gap: 0,
                    border: `1.5px solid ${selectedTplId === tpl.id ? 'var(--em)' : 'var(--b2)'}`,
                    borderRadius: 'var(--r2)', overflow: 'hidden',
                    background: selectedTplId === tpl.id ? 'var(--emb)' : 'var(--bg2)',
                  }}>
                    <button
                      onClick={() => {
                        setSelectedTplId(tpl.id);
                        setLocalTpl({ ...tpl });
                        setIsDirty(false);
                      }}
                      style={{
                        padding: '5px 10px', border: 'none', background: 'transparent',
                        cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 12,
                        fontWeight: 600, color: selectedTplId === tpl.id ? 'var(--em)' : 'var(--t2)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {tpl.is_default && <i className="ti ti-star-filled" style={{ fontSize: 10, color: 'var(--gold)' }} />}
                      {tpl.name}
                    </button>
                    <div style={{ display: 'flex', borderRight: '1px solid var(--b2)' }}>
                      <button onClick={() => handleSetDefault(tpl.id!)}
                        title="تعيين كافتراضي"
                        style={{ padding: '5px 6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gold)' }}>
                        <i className={`ti ti-star${tpl.is_default ? '-filled' : ''}`} style={{ fontSize: 12 }} />
                      </button>
                      <button onClick={() => handleDuplicate(tpl)}
                        title="نسخ القالب"
                        style={{ padding: '5px 6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--blue)' }}>
                        <i className="ti ti-copy" style={{ fontSize: 12 }} />
                      </button>
                      <button onClick={() => handleDelete(tpl.id!)}
                        title="حذف القالب"
                        style={{ padding: '5px 6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--red)' }}>
                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  </div>
                ))}

                <button onClick={handleNewTemplate}
                  style={{
                    padding: '5px 10px', borderRadius: 'var(--r2)', border: '1.5px dashed var(--embo)',
                    background: 'var(--emb)', color: 'var(--em)', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <i className="ti ti-plus" /> قالب جديد
                </button>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleExportTemplate}
                  style={{ padding: '5px 8px', border: '1px solid var(--b2)', borderRadius: 'var(--r1)', background: 'var(--bg2)', cursor: 'pointer', color: 'var(--t3)', fontSize: 11 }}
                  title="تصدير"><i className="ti ti-download" /></button>
                <button onClick={handleImportTemplate}
                  style={{ padding: '5px 8px', border: '1px solid var(--b2)', borderRadius: 'var(--r1)', background: 'var(--bg2)', cursor: 'pointer', color: 'var(--t3)', fontSize: 11 }}
                  title="استيراد"><i className="ti ti-upload" /></button>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--r2)', fontSize: 12.5, fontWeight: 800,
                    border: 'none', cursor: isDirty ? 'pointer' : 'not-allowed',
                    background: isDirty ? 'var(--em)' : 'var(--bg5)',
                    color: isDirty ? '#fff' : 'var(--t4)',
                    fontFamily: 'Tajawal, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all .15s',
                  }}
                >
                  {isSaving
                    ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
                    : <><i className="ti ti-device-floppy" /> {isDirty ? 'حفظ التغييرات' : 'محفوظ'}</>
                  }
                </button>
              </div>
            </div>

            {/* Editor + Preview */}
            {localTpl && (
              <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* Controls */}
                <div style={{
                  borderLeft: '1px solid var(--b2)',
                  overflowY: 'auto', padding: '12px 10px',
                  background: 'var(--bg2)',
                }}>
                  <div style={{
                    padding: '8px 10px', marginBottom: 10,
                    background: 'var(--bg3)', borderRadius: 'var(--r2)',
                    border: '1px solid var(--b2)',
                  }}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>
                      اسم القالب
                    </label>
                    <Input
                      value={localTpl.name}
                      onChange={v => update('name', v)}
                      placeholder="اسم القالب..."
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <Field label="حجم الورق">
                        <Select
                          value={localTpl.paper_size}
                          onChange={v => update('paper_size', v as PrintTemplate['paper_size'])}
                        >
                          <option value="80mm">80mm حراري</option>
                          <option value="58mm">58mm حراري</option>
                          <option value="A4">A4</option>
                          <option value="A5">A5</option>
                        </Select>
                      </Field>
                    </div>
                  </div>

                  <TemplateControls tpl={localTpl} update={update} />
                </div>

                {/* Preview */}
                <div style={{ overflowY: 'auto', background: 'var(--bg1)', padding: 20 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 14,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>
                      <i className="ti ti-eye" style={{ marginLeft: 5, color: 'var(--em)' }} />
                      معاينة حية
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {companyData && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: 'var(--emb)', border: '1px solid var(--embo)',
                          color: 'var(--em)', fontWeight: 600,
                        }}>
                          {companyData.name}
                        </span>
                      )}
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: 'var(--bg3)', border: '1px solid var(--b2)',
                        color: 'var(--t3)', fontWeight: 600,
                      }}>
                        {localTpl.paper_width_mm}mm × تلقائي
                      </span>
                      <button
                        onClick={handleTestPrint}
                        style={{
                          padding: '4px 10px', borderRadius: 'var(--r1)', fontSize: 11.5, fontWeight: 700,
                          border: '1px solid var(--b2)', background: 'var(--bg3)',
                          color: 'var(--t2)', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <i className="ti ti-printer" /> طباعة تجريبية
                      </button>
                    </div>
                  </div>

                  <div style={{
                    width: localTpl.paper_width_mm * 3.78, marginBottom: 4,
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 9, color: 'var(--t4)',
                  }}>
                    <span>0</span>
                    <span>{Math.round(localTpl.paper_width_mm / 2)}mm</span>
                    <span>{localTpl.paper_width_mm}mm</span>
                  </div>

                  <div style={{
                    display: 'inline-block',
                    boxShadow: '0 4px 20px rgba(0,0,0,.12)',
                    border: '1px solid #ddd',
                  }}>
                    <ReceiptPreview tpl={localTpl} company={companyData} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ PRINTERS TAB ══ */}
      {activeTab === 'printers' && (
        <div style={{ padding: 24, maxWidth: 600 }}>
          <div style={{
            padding: 16, borderRadius: 'var(--r3)', border: '1px solid var(--b2)',
            background: 'var(--bg3)', display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <i className="ti ti-info-circle" style={{ fontSize: 20, color: 'var(--blue)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>
                اكتشاف الطابعات عبر WebUSB
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>
                يتطلب متصفح Chrome أو Edge. انقر "اكتشاف" لعرض الطابعات المتصلة.
              </div>
              <button
                onClick={async () => {
                  const usb = (navigator as any).usb;
                  if (!usb) { toast.error('WebUSB غير مدعوم — استخدم Chrome/Edge'); return; }
                  try {
                    const device = await usb.requestDevice({ filters: [] });
                    toast.success(`تم اكتشاف: ${device.productName ?? 'طابعة'}`);
                  } catch (e: any) {
                    if (e?.name !== 'NotFoundError') toast.error(String(e?.message));
                  }
                }}
                style={{
                  marginTop: 10, padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: 'none', background: 'var(--em)', color: '#fff',
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                <i className="ti ti-device-usb" /> اكتشاف الطابعات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
