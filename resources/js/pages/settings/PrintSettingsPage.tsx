// resources/js/pages/settings/PrintSettingsPage.tsx
// ════════════════════════════════════════════════════════════════════════════
//  ما يجعل هذا النظام يتفوق على Odoo / QuickBooks / Square / Toast:
//
//  ✅ useDeferredValue — المعاينة لا تُعيق الـ slider أثناء السحب
//  ✅ Undo/Redo أزرار في الـ UI + Ctrl+Z / Ctrl+Y (60 خطوة)
//  ✅ قالب مستقل لكل نوع مستند — FV ≠ BL ≠ DEV، كل واحد يُحفَظ منفرداً
//  ✅ نسخ / مشاركة القالب: تصدير JSON + استيراد JSON
//  ✅ تعديل اسم القالب inline مع Enter للحفظ
//  ✅ paper_width_mm يتحدث صح عند تغيير paper_size
//  ✅ useActiveCompany بدلاً من useCurrentCompany (يتوافق مع appStore)
//  ✅ لوحة Preview لا تفقد موضعها عند التمرير
//  ✅ زر "معاينة بيانات حقيقية" يفتح نافذة بيانات الفاتورة الأخيرة
//  ✅ مؤشر حالة الحفظ: محفوظ ✓ / تغييرات غير محفوظة ●
//  ✅ شريط QuickNav يُظلِّل القسم المرئي حالياً (Intersection Observer)
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useCallback, useEffect, useMemo, useRef,
  useDeferredValue, useTransition,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useActiveCompany, useActiveSlug } from '@/lib/store/appStore';
import { apiGet } from '@/lib/api/core/client';
import {
  usePrintTemplates, usePrintTemplateMutations,
} from './print-settings/api/printTemplatesApi';
import PreviewSelector from './print-settings/components/PreviewSelector';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { dbSaveTemplate } from '@/pos/store/printStore';
import {
  createDefaultTemplate, DOC_TYPE_LIST,
  type PrintTemplate, type DocTypeCode, type ColumnKey,
  type AlignOption, type BorderStyle, type FontFamily,
  type CompanyData,
} from './print-settings/types';
import { Section } from './print-settings/sections/ToggleSwitch';
import { DocumentDataBuilder } from '@/reporting';
import type { UniversalDocumentData } from '@/reporting';
import type { CommercialDocument } from '@/lib/api/core/types';
import { RulesSection, TemplateLibraryModal } from '@/reporting';
import HeaderSectionControls from './print-settings/sections/HeaderSection';
import DocumentSectionControls from './print-settings/sections/DocumentSection';
import ItemsSectionControls from './print-settings/sections/ItemsSection';
import TotalsSectionControls from './print-settings/sections/TotalsSection';
import FooterSectionControls from './print-settings/sections/FooterSection';
import FormattingSectionControls from './print-settings/sections/FormattingSection';

// ═════════════════════════════════════════════════════════════════════════════
//  UI PRIMITIVES — مكونات بسيطة بلا إعادة render غير ضرورية
// ═════════════════════════════════════════════════════════════════════════════

const Toggle = React.memo(function Toggle({
  value, onChange, label,
}: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0', cursor: 'pointer', userSelect: 'none',
    }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 34, height: 18, borderRadius: 9, flexShrink: 0,
          background: value ? 'var(--em)' : 'var(--bg5)',
          border: '1px solid ' + (value ? 'var(--embo)' : 'var(--b3)'),
          position: 'relative', cursor: 'pointer', transition: 'background .16s, border-color .16s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, width: 12, height: 12,
          borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
          left: value ? 16 : 2, transition: 'left .16s',
        }} />
      </div>
      <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500, lineHeight: 1.4 }}>{label}</span>
    </label>
  );
});

const Slider = React.memo(function Slider({
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ padding: '2px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 11.5, color: 'var(--t3)' }}>{label}</span>
        <span style={{
          fontSize: 10.5, fontWeight: 800, color: 'var(--em)',
          background: 'var(--emb)', padding: '0 5px', borderRadius: 3,
          fontFamily: 'monospace',
        }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', height: 3, accentColor: 'var(--em)', cursor: 'pointer' }}
      />
    </div>
  );
});

function Field({ label, children, hint }: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div style={{ padding: '3px 0' }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>
        {label}
        {hint && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t4)', marginRight: 4 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const styledInput: React.CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)',
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  fontSize: 12, color: 'var(--t1)', outline: 'none',
  fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box',
};

function Input({ value, onChange, placeholder, onEnter }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; onEnter?: () => void;
}) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={styledInput}
      onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--emb)'; }}
      onBlur={e  => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{ ...styledInput, resize: 'vertical' }}
    />
  );
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={styledInput}>
      {children}
    </select>
  );
}

function Pills<T extends string>({ options, value, onChange }: {
  options: { v: T; l: string }[];
  value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
      {options.map(o => (
        <button
          key={o.v} onClick={() => onChange(o.v)} type="button"
          style={{
            flex: 1, padding: '4px 0', fontSize: 11, borderRadius: 'var(--r1)',
            border: `1px solid ${value === o.v ? 'var(--em)' : 'var(--b2)'}`,
            background: value === o.v ? 'var(--emb)' : 'var(--bg3)',
            color: value === o.v ? 'var(--em)' : 'var(--t3)',
            cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 600,
          }}
        >{o.l}</button>
      ))}
    </div>
  );
}

const ALIGN_OPTS: { v: AlignOption; l: string }[] = [
  { v: 'right', l: 'يمين' }, { v: 'center', l: 'وسط' }, { v: 'left', l: 'يسار' },
];
const BORDER_OPTS: { v: BorderStyle; l: string }[] = [
  { v: 'solid', l: '─' }, { v: 'dashed', l: '- -' },
  { v: 'double', l: '═' }, { v: 'none', l: 'بلا' },
];

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 30, height: 26, border: '1px solid var(--b2)', borderRadius: 4, cursor: 'pointer', padding: 1 }}
        />
        <input
          type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...styledInput, flex: 1, fontFamily: 'monospace', fontSize: 11 }}
        />
      </div>
    </Field>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--b2)', margin: '5px 0' }} />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', margin: '4px 0 2px', letterSpacing: '.3px' }}>
      {children}
    </div>
  );
}

// ── Accordion ─────────────────────────────────────────────────────────────────

function Accordion({ title, icon, id, children, defaultOpen = false, collapseVersion }: {
  title: string; icon: string; id?: string;
  children: React.ReactNode; defaultOpen?: boolean; collapseVersion?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setOpen(defaultOpen); }, [collapseVersion]);
  return (
    <div
      id={id}
      style={{
        marginBottom: 4, border: '1px solid var(--b2)',
        borderRadius: 'var(--r2)', overflow: 'visible',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)} type="button"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 11px', background: 'var(--bg3)',
          border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          borderBottom: open ? '1px solid var(--b2)' : 'none',
          position: 'sticky', top: 0, zIndex: 5,
        }}
      >
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 13, flexShrink: 0 }} />
        <span style={{
          flex: 1, textAlign: 'right', fontSize: 12.5,
          fontWeight: 700, color: 'var(--t1)',
        }}>{title}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Column Manager ─────────────────────────────────────────────────────────────

const ALL_COLS: { key: ColumnKey; label: string }[] = [
  { key: 'rowNumber', label: 'رقم السطر'  },
  { key: 'barcode',   label: 'باركود'      },
  { key: 'ref',       label: 'المرجع'       },
  { key: 'name',      label: 'المنتج'       },
  { key: 'unit',      label: 'الوحدة'       },
  { key: 'quantity',  label: 'الكمية'       },
  { key: 'price',     label: 'السعر'        },
  { key: 'discount',  label: 'الخصم'        },
  { key: 'tva',       label: 'TVA'          },
  { key: 'total',     label: 'الإجمالي'    },
];

const miniBtn: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, border: '1px solid var(--b2)',
  background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 10,
  color: 'var(--t3)', padding: 0, flexShrink: 0,
};

type Updater = <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ALL_COLS.map(col => {
        const visible = tpl.col_show[col.key] !== false;
        const idx     = tpl.col_order.indexOf(col.key);
        return (
          <div
            key={col.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px',
              borderRadius: 'var(--r1)',
              background: visible ? 'var(--emb)' : 'var(--bg3)',
              border: `1px solid ${visible ? 'var(--embo)' : 'var(--b1)'}`,
            }}
          >
            {/* toggle */}
            <div
              onClick={() => toggleCol(col.key, !visible)}
              style={{
                width: 28, height: 15, borderRadius: 8, flexShrink: 0,
                background: visible ? 'var(--em)' : 'var(--bg5)',
                border: `1px solid ${visible ? 'var(--em)' : 'var(--b3)'}`,
                position: 'relative', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 1.5,
                left: visible ? 12 : 1.5,
                width: 10, height: 10, borderRadius: '50%', background: '#fff',
                transition: 'left .15s',
              }} />
            </div>

            <span style={{
              flex: 1, fontSize: 11.5, fontWeight: 600, color: 'var(--t2)',
              minWidth: 0,
            }}>
              {col.label}
              {visible && idx >= 0 && (
                <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4 }}>#{idx + 1}</span>
              )}
            </span>

            <button onClick={() => moveCol(col.key, -1)} disabled={idx <= 0}
              style={{ ...miniBtn, opacity: idx <= 0 ? .3 : 1 }} type="button">
              <i className="ti ti-chevron-right" />
            </button>
            <button onClick={() => moveCol(col.key, 1)}
              disabled={idx >= tpl.col_order.length - 1}
              style={{ ...miniBtn, opacity: idx >= tpl.col_order.length - 1 ? .3 : 1 }} type="button">
              <i className="ti ti-chevron-left" />
            </button>

            {visible && (
              <>
                <input
                  type="range" min={5} max={60} step={1}
                  value={tpl.col_widths[col.key] ?? 20}
                  onChange={e => update('col_widths', { ...tpl.col_widths, [col.key]: Number(e.target.value) })}
                  style={{ width: 44, height: 3, accentColor: 'var(--em)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 22 }}>
                  {tpl.col_widths[col.key] ?? 20}%
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEMPLATE CONTROLS — all sections
// ═════════════════════════════════════════════════════════════════════════════

function TemplateControls({ tpl, update, companyData }: {
  tpl: PrintTemplate; update: Updater; companyData: CompanyData | null;
}) {
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseVersion, setCollapseVersion] = useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* زر طي/فتح الكل */}
      <button onClick={() => {
        setAllCollapsed(c => !c);
        setCollapseVersion(v => v + 1);
      }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)',
          cursor: 'pointer', fontSize: 12, color: 'var(--t2)', marginBottom: 4,
        }}>
        <i className="ti ti-arrows-vertical" />
        {allCollapsed ? 'فتح الكل' : 'طي الكل'}
      </button>

      {/* ── رأس الفاتورة (HeaderSection) ── */}
      <Section id="s-header" title="رأس الفاتورة — الشعار والشركة" icon="ti-building-store" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <HeaderSectionControls tpl={tpl} update={update} company={companyData} />
        <div style={{ padding: '8px 11px', borderTop: '1px solid var(--b2)' }}>
          <Slider label="تدوير الزوايا" value={tpl.logo_border_radius} min={0} max={50} unit="%" onChange={v => update('logo_border_radius', v)} />
          <ColorField label="لون الاسم" value={tpl.company_name_color} onChange={v => update('company_name_color', v)} />
        </div>
      </Section>

      {/* ── معلومات المستند (DocumentSection) ── */}
      <Section id="s-doc" title="معلومات المستند" icon="ti-file-description" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <DocumentSectionControls tpl={tpl} update={update} />
        <div style={{ padding: '8px 11px' }}>
          <ColorField label="لون العنوان" value={tpl.title_color} onChange={v => update('title_color', v)} />
          <Toggle value={tpl.show_delivery_address} onChange={v => update('show_delivery_address', v)} label="  ↳ عنوان التسليم" />
          <Toggle value={tpl.show_bank_details} onChange={v => update('show_bank_details', v)} label="البيانات البنكية" />
          {tpl.show_bank_details && (
            <Field label="نص البيانات البنكية">
              <Textarea value={tpl.bank_details_text} onChange={v => update('bank_details_text', v)} placeholder="CCP: 001 234 567 — بنك الفلاحة" rows={3} />
            </Field>
          )}
        </div>
      </Section>

      {/* ── جدول المنتجات (ItemsSection) ── */}
      <Section id="s-items" title="جدول المنتجات — الأعمدة والتنسيق" icon="ti-table" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <ItemsSectionControls tpl={tpl} update={update} />
        <div style={{ padding: '8px 11px' }}>
          <ColorField label="لون نص الرأس" value={tpl.table_header_color} onChange={v => update('table_header_color', v)} />
          {tpl.alternating_rows && (
            <ColorField label="لون الأسطر الزوجية" value={tpl.alternating_color} onChange={v => update('alternating_color', v)} />
          )}
          <Toggle value={tpl.show_line_total_ttc} onChange={v => update('show_line_total_ttc', v)} label="الإجمالي TTC لكل سطر" />
        </div>
      </Section>

      {/* ── الإجماليات (TotalsSection) ── */}
      <Section id="s-totals" title="الإجماليات — الحسابات" icon="ti-cash" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <TotalsSectionControls tpl={tpl} update={update} />
        <div style={{ padding: '8px 11px' }}>
          <ColorField label="لون TTC" value={tpl.total_ttc_color} onChange={v => update('total_ttc_color', v)} />
          <Toggle value={tpl.show_payment_details} onChange={v => update('show_payment_details', v)} label="تفصيل وسائل الدفع" />
          {tpl.show_payment_details && (
            <Slider label="حجم الخط" value={tpl.payment_font_size} min={8} max={14} unit="px" onChange={v => update('payment_font_size', v)} />
          )}
        </div>
      </Section>

      {/* ── التذييل (FooterSection) ── */}
      <Section id="s-footer" title="التذييل — النصوص والتواقيع" icon="ti-file-text" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <FooterSectionControls tpl={tpl} update={update} />
        <div style={{ padding: '8px 11px' }}>
          <ColorField label="لون الشكر" value={tpl.thank_you_color} onChange={v => update('thank_you_color', v)} />
        </div>
      </Section>

      {/* ── التنسيق (FormattingSection) ── */}
      <Section id="s-format" title="تنسيق الطباعة — الهوامش والمسافات" icon="ti-settings" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <FormattingSectionControls tpl={tpl} update={update} />
        <div style={{ padding: '8px 11px' }}>
          <Field label="نوع الخط الأساسي">
            <Select value={tpl.font_family} onChange={v => update('font_family', v as FontFamily)}>
              <option value="tajawal">Tajawal — عربي</option>
              <option value="monospace">Courier — أحادي</option>
              <option value="arial">Arial — لاتيني</option>
              <option value="times">Times New Roman</option>
            </Select>
          </Field>
          <Field label="اتجاه الصفحة (A4/A5)">
            <Pills
              options={[{ v: 'portrait' as const, l: 'عمودي' }, { v: 'landscape' as const, l: 'أفقي' }]}
              value={tpl.page_orientation}
              onChange={v => update('page_orientation', v)}
            />
          </Field>
        </div>
      </Section>

      {/* ── القواعد والشروط ── */}
      <Accordion id="s-rules" title="القواعد — الإظهار/الإخفاء الشرطي" icon="ti-adjustments" collapseVersion={collapseVersion} defaultOpen={!allCollapsed}>
        <RulesSection tpl={tpl} update={update} />
      </Accordion>

      {/* ── التقرير (Phase 5) ── */}
      <Accordion id="s-report" title="التقارير — الرسوم البيانية والتجميع" icon="ti-report-analytics" collapseVersion={collapseVersion} defaultOpen={!allCollapsed}>
        <Field label="نص رأس التقرير">
          <Input value={tpl.report_header_text} onChange={v => update('report_header_text', v)} />
        </Field>
        <Toggle value={tpl.show_report_header} onChange={v => update('show_report_header', v)} label="عرض رأس التقرير" />
        <Toggle value={tpl.show_charts} onChange={v => update('show_charts', v)} label="عرض الرسم البياني" />
        {tpl.show_charts && (
          <>
            <div style={{ padding: '2px 0' }}>
              <Pills
                options={[{ v: 'bar' as const, l: 'مخطط أعمدة' }, { v: 'pie' as const, l: 'مخطط دائري' }]}
                value={tpl.chart_type}
                onChange={v => update('chart_type', v)}
              />
            </div>
            <Field label="عنوان الرسم البياني">
              <Input value={tpl.chart_title} onChange={v => update('chart_title', v)} placeholder="توزيع وسائل الدفع" />
            </Field>
          </>
        )}
        <SectionTitle>خيارات التقرير</SectionTitle>
        <Toggle value={tpl.show_report_period}  onChange={v => update('show_report_period', v)}  label="عرض الفترة" />
        <Toggle value={tpl.show_report_cashier} onChange={v => update('show_report_cashier', v)} label="عرض الكاشير" />
        <Toggle value={tpl.show_report_summary_cards} onChange={v => update('show_report_summary_cards', v)} label="عرض بطاقات الملخص" />
        <Toggle value={tpl.show_report_payment_breakdown} onChange={v => update('show_report_payment_breakdown', v)} label="توزيع وسائل الدفع" />
        <Toggle value={tpl.show_report_top_products} onChange={v => update('show_report_top_products', v)} label="أفضل المنتجات" />
        <SectionTitle>ترتيب وتجميع</SectionTitle>
        <Field label="تجميع حسب">
          <Input value={tpl.group_by} onChange={v => update('group_by', v)} placeholder="مثال: category" />
        </Field>
        <Field label="ترتيب حسب">
          <Input value={tpl.sort_by} onChange={v => update('sort_by', v)} placeholder="مثال: total" />
        </Field>
        <div style={{ padding: '2px 0' }}>
          <Pills
            options={[{ v: 'asc' as const, l: 'تصاعدي' }, { v: 'desc' as const, l: 'تنازلي' }]}
            value={tpl.sort_direction}
            onChange={v => update('sort_direction', v)}
          />
        </div>
        <Toggle value={tpl.show_report_footer} onChange={v => update('show_report_footer', v)} label="عرض تذييل التقرير" />
        <Field label="نص تذييل التقرير">
          <Input value={tpl.report_footer_text} onChange={v => update('report_footer_text', v)} />
        </Field>
      </Accordion>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  QUICK NAV — يُظلِّل القسم المرئي تلقائياً
// ═════════════════════════════════════════════════════════════════════════════

const NAV_SECTIONS = [
  { id: 's-header', label: 'الشعار'    },
  { id: 's-doc',    label: 'المستند'   },
  { id: 's-items',  label: 'المنتجات'  },
  { id: 's-totals', label: 'الإجمالي'  },
  { id: 's-footer', label: 'التذييل'   },
  { id: 's-format', label: 'التنسيق'   },
  { id: 's-rules',  label: 'القواعد'   },
  { id: 's-report', label: 'التقرير'   },
];

function QuickNav({ controlsRef }: { controlsRef: React.RefObject<HTMLDivElement> }) {
  const [active, setActive] = useState('s-header');

  useEffect(() => {
    const container = controlsRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { root: container, threshold: 0.3 },
    );

    NAV_SECTIONS.forEach(s => {
      const el = container.querySelector(`#${s.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [controlsRef]);

  return (
    <div style={{
      display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8,
      padding: '6px 8px', background: 'var(--bg3)', borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)',
    }}>
      {NAV_SECTIONS.map(s => (
        <button
          key={s.id} type="button"
          onClick={() => {
            const el = controlsRef.current?.querySelector(`#${s.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          style={{
            padding: '3px 8px', borderRadius: 5, fontSize: 11,
            fontFamily: 'Tajawal, sans-serif', fontWeight: 700,
            border: `1px solid ${active === s.id ? 'var(--em)' : 'var(--b2)'}`,
            background: active === s.id ? 'var(--emb)' : 'transparent',
            color: active === s.id ? 'var(--em)' : 'var(--t4)',
            cursor: 'pointer', transition: 'all .12s',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  CONSTANTS & HELPERS
// ═════════════════════════════════════════════════════════════════════════════

const PAPER_DIM: Record<string, { w: number; h: number }> = {
  '80mm': { w: 80,  h: 0   },
  '58mm': { w: 58,  h: 0   },
  'A4':   { w: 210, h: 297 },
  'A5':   { w: 148, h: 210 },
};

function paperLabel(size: string, mm: number): string {
  const d = PAPER_DIM[size];
  if (!d) return `${mm}mm × تلقائي`;
  return d.h > 0 ? `${d.w}×${d.h}mm` : `${d.w}mm × تلقائي`;
}

const DOC_CATS = [
  { key: 'pos',      label: 'POS',        icon: 'ti-device-desktop' },
  { key: 'sales',    label: 'المبيعات',   icon: 'ti-receipt'        },
  { key: 'purchase', label: 'الشراء',     icon: 'ti-truck'          },
  { key: 'warehouse',label: 'المخزون',    icon: 'ti-box'            },
] as const;

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function PrintSettingsPage() {
  // ── بيانات الشركة من store (لا API call إضافي) ─────────────────────────────
  const activeCompany = useActiveCompany();
  const companyData: CompanyData | null = useMemo(() => activeCompany
    ? {
        name:    activeCompany.name    ?? '',
        address: activeCompany.address ?? '',
        phone:   activeCompany.phone   ?? '',
        nif:     activeCompany.nif     ?? '',
        rc:      activeCompany.rc      ?? '',
        nis:     activeCompany.nis     ?? '',
        ice:     '',
        article: (activeCompany as any).ai     ?? '',
        logoUrl: (activeCompany as any).avatar ?? null,
      }
    : null,
  [activeCompany]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeCat,     setActiveCat]     = useState<string>('pos');
  const [activeDoc,     setActiveDoc]     = useState<DocTypeCode>('POS');
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [localTpl,      setLocalTpl]      = useState<PrintTemplate | null>(null);
  const [isDirty,       setIsDirty]       = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [canUndo,       setCanUndo]       = useState(false);
  const [canRedo,       setCanRedo]       = useState(false);
  const [editingName,   setEditingName]   = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<number | null>(null);
  const [useRealData,       setUseRealData]       = useState(true);
  const [showLibrary,       setShowLibrary]       = useState(false);


  const historyRef    = useRef<PrintTemplate[]>([]);
  const historyPos    = useRef(-1);
  const controlsRef   = useRef<HTMLDivElement>(null);

  // ✅ deferredTpl — المعاينة لا تعيق الـ slider
  const deferredTpl = useDeferredValue(localTpl);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: templatesRaw, isLoading } = usePrintTemplates(activeDoc);
  const templates = useMemo(() => templatesRaw ?? [], [templatesRaw]);
  const mutations = usePrintTemplateMutations();

  const slug = useActiveSlug();
  const { data: previewDoc, refetch, isFetching } = useQuery({
    queryKey: [slug, 'preview-latest-doc', activeDoc],
    queryFn: async () => {
      // Step 1: get the latest doc ID
      const list = await apiGet<{ data: { id: number }[] }>('/documents', {
        'filter[document_type.code]': activeDoc,
        'page[size]': 1,
        sort: '-id',
        'fields[commercial_documents]': 'id',
      });
      const docs = (list as any)?.data ?? [];
      const first = docs[0] as { id?: number } | undefined;
      if (!first?.id) return null;
      // Step 2: fetch full doc with all relations via show endpoint
      const full = await apiGet<{ data: CommercialDocument }>(`/documents/${first.id}`, {
        include: ['party', 'lines', 'lines.product', 'lines.packaging', 'lines.stockLot', 'payments', 'payments.paymentMode'].join(','),
      });
      const doc = (full as any)?.data ?? full;
      return doc ?? null;
    },
    enabled: !!slug && useRealData,
    staleTime: 60_000,
  });
  // auto-refetch when user toggles Real Data back on
  const prevUseRealData = useRef(useRealData);
  useEffect(() => {
    if (useRealData && !prevUseRealData.current) refetch();
    prevUseRealData.current = useRealData;
  }, [useRealData, refetch]);
  const previewData: UniversalDocumentData | null = useMemo(() => {
    if (!previewDoc || !companyData) return null;
    return DocumentDataBuilder.fromApiDocument(previewDoc, companyData as any);
  }, [previewDoc, companyData]);

  useEffect(() => {
    if (templates.length > 0) {
      const tpl = templates.find(t => t.is_default) ?? templates[0];
      setSelectedTplId(tpl.id);
      setLocalTpl({ ...createDefaultTemplate(activeDoc, tpl.paper_size), ...tpl });
      setIsDirty(false);
    } else {
      setSelectedTplId(null);
      setLocalTpl(createDefaultTemplate(activeDoc));
      setIsDirty(true);
    }
    historyRef.current = [];
    historyPos.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }, [templates, activeDoc]);

  // ── Undo/Redo ─────────────────────────────────────────────────────────────
  const pushHistory = useCallback((tpl: PrintTemplate) => {
    const stack = historyRef.current;
    stack.length = historyPos.current + 1;
    stack.push({ ...tpl });
    if (stack.length > 60) stack.shift();
    historyPos.current = stack.length - 1;
    setCanUndo(historyPos.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyPos.current <= 0) return;
    const prev = historyRef.current[historyPos.current - 1];
    setLocalTpl({ ...prev });
    historyPos.current--;
    setCanUndo(historyPos.current > 0);
    setCanRedo(true);
    setIsDirty(true);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyPos.current >= historyRef.current.length - 1) return;
    const next = historyRef.current[historyPos.current + 1];
    setLocalTpl({ ...next });
    historyPos.current++;
    setCanUndo(true);
    setCanRedo(historyPos.current < historyRef.current.length - 1);
    setIsDirty(true);
  }, []);

  // ── Update ────────────────────────────────────────────────────────────────
  const update: Updater = useCallback(<K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => {
    setLocalTpl(prev => {
      if (prev) pushHistory(prev);
      const next = prev ? { ...prev, [key]: val } : prev;
      // ✅ sync paper_width_mm عند تغيير paper_size
      if (key === 'paper_size' && next) {
        const d = PAPER_DIM[val as string];
        if (d && (val === '80mm' || val === '58mm')) {
          next.paper_width_mm = val === '58mm' ? 58 : 80;
        }
      }
      return next;
    });
    setIsDirty(true);
  }, [pushHistory]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!localTpl || isSaving) return;
    setIsSaving(true);
    try {
      let savedTpl: PrintTemplate;
      if (localTpl.id) {
        savedTpl = await mutations.update.mutateAsync({ id: localTpl.id, data: localTpl });
        setLocalTpl({ ...savedTpl });
      } else {
        savedTpl = await mutations.create.mutateAsync({
          ...localTpl,
          doc_type_code: activeDoc,
          is_default: templates.length === 0,
        });
        setSelectedTplId(savedTpl.id);
        setLocalTpl({ ...savedTpl });
      }
      setIsDirty(false);
      // Phase 0 — settings table is the primary print backend (POS reads from here).
      // printTemplatesApi calls above handle the template-management UI (list, select).
      // Surface errors from dbSaveTemplate — no more silent .catch(() => {}).
      try {
        await dbSaveTemplate(activeDoc, savedTpl.paper_size, savedTpl as any);
      } catch {
        toast.error('❌ فشل حفظ القالب في الإعدادات — POS سيستخدم بيانات قديمة');
        throw new Error('dbSaveTemplate failed');
      }
      toast.success('✅ تم حفظ القالب');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setIsSaving(false);
    }
  }, [localTpl, isSaving, activeDoc, templates.length, mutations]);

  // ── Other actions ─────────────────────────────────────────────────────────
  const handleSetDefault = useCallback(async (id: number) => {
    setActionLoading(`default-${id}`);
    try { await mutations.setDefault.mutateAsync(id); toast.success('تم تعيين القالب الافتراضي'); }
    catch { toast.error('فشل التعيين'); }
    finally { setActionLoading(null); }
  }, [mutations]);

  const handleDuplicate = useCallback(async (tpl: PrintTemplate) => {
    if (!tpl.id) return;
    setActionLoading(`duplicate-${tpl.id}`);
    try {
      const copy = await mutations.duplicate.mutateAsync({ id: tpl.id, name: `نسخة من ${tpl.name}` });
      setSelectedTplId(copy.id);
      setLocalTpl({ ...copy });
      setIsDirty(false);
      toast.success('تم نسخ القالب');
    } catch { toast.error('فشل النسخ'); }
    finally { setActionLoading(null); }
  }, [mutations]);

  const handleDelete = useCallback(async (id: number) => {
    setDeleteTarget(id);
  }, []);

  const handleToggleActive = useCallback(async (tpl: PrintTemplate) => {
    if (!tpl.id) return;
    setActionLoading(`toggle-${tpl.id}`);
    if (localTpl?.id === tpl.id) setLocalTpl(p => p ? { ...p, is_active: !p.is_active } : p);
    try { await mutations.update.mutateAsync({ id: tpl.id, data: { is_active: !tpl.is_active } }); toast.success(tpl.is_active ? 'تم تعطيل القالب' : 'تم تفعيل القالب'); }
    catch { toast.error('فشل التحديث'); }
    finally { setActionLoading(null); }
  }, [mutations, localTpl]);

  const confirmDelete = useCallback(async () => {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setActionLoading(`delete-${id}`);
    setDeleteTarget(null);
    try { await mutations.remove.mutateAsync(id); toast.success('تم الحذف'); }
    catch { toast.error('فشل الحذف'); }
    finally { setActionLoading(null); }
  }, [deleteTarget, mutations]);

  const handleNewTemplate = useCallback(() => {
    setShowLibrary(true);
  }, []);

  const handleInstallLibrary = useCallback(async (_templateId: string, tpl: PrintTemplate) => {
    try {
      const saved = await mutations.installLibrary.mutateAsync(_templateId);
      setSelectedTplId(saved.id);
      setLocalTpl({ ...saved });
      setIsDirty(false);
      setShowLibrary(false);
      try {
        await dbSaveTemplate(activeDoc, saved.paper_size, saved as any);
      } catch { /* ignore legacy sync */ }
      toast.success(`✅ تم تثبيت القالب "${saved.name}"`);
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل تثبيت القالب');
    }
  }, [activeDoc, templates.length, mutations]);

  const handleExport = useCallback(() => {
    if (!localTpl) return;
    const json = JSON.stringify({ version: 2, docCode: activeDoc, template: localTpl, exportedAt: new Date().toISOString() }, null, 2);
    const a    = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: `print-template-${activeDoc}.json`,
    });
    a.click();
    toast.success('تم تصدير القالب');
  }, [activeDoc, localTpl]);

  const handleImport = useCallback(() => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data     = JSON.parse(await file.text());
        const imported = data.template ?? data;
        if (!imported?.col_order || !imported?.paper_size) {
          toast.error('ملف غير صالح');
          return;
        }
        const merged = { ...createDefaultTemplate(imported.doc_type_code ?? activeDoc, imported.paper_size), ...imported, id: localTpl?.id ?? null };
        setLocalTpl(merged);
        setIsDirty(true);
        toast.success('تم الاستيراد — احفظ للتطبيق');
      } catch { toast.error('فشل قراءة الملف'); }
    };
    input.click();
  }, [activeDoc, localTpl?.id]);

  const handleTestPrint = useCallback(async () => {
    if (!localTpl) return;
    const mmW = PAPER_DIM[localTpl.paper_size]?.w ?? localTpl.paper_width_mm;
    const winW = Math.min(Math.round(mmW * 3.78) + 60, 900);
    const win  = window.open('', '_blank', `width=${winW},height=700`);
    if (!win) { window.print(); return; }
    const printCss = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #fff; display: flex; justify-content: center; }
      @media print { body { padding: 0; } @page { margin: 0; } }
    `;
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
      <meta charset="UTF-8"/>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
      <style>${printCss}</style>
    </head><body><div id="r"></div></body></html>`);
    win.document.close();
    const { createRoot } = await import('react-dom/client');
    const root = win.document.getElementById('r');
    if (!root) return;
    const reactRoot = createRoot(root);
    reactRoot.render(
      React.createElement(PreviewSelector, {
        tpl: localTpl, company: companyData,
        overrideData: useRealData ? previewData : null,
      }),
    );
    await win.document.fonts.ready;
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 400));
    win.focus();
    win.print();
    setTimeout(() => win.close(), 500);
  }, [localTpl, companyData, previewData, useRealData]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const refs = useRef({ handleSave, handleUndo, handleRedo, isDirty, isSaving });
  useEffect(() => { refs.current = { handleSave, handleUndo, handleRedo, isDirty, isSaving }; });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); if (refs.current.isDirty && !refs.current.isSaving) refs.current.handleSave(); }
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); refs.current.handleUndo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); refs.current.handleRedo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const docsInCat = DOC_TYPE_LIST.filter(d => d.category === activeCat);

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <><div style={{ display: 'flex', flexDirection: 'column', height: '100vh', direction: 'rtl', overflow: 'hidden' }}>

      {/* ══ TOP BAR ══ */}
      <div style={{
        padding: '10px 18px', borderBottom: '1px solid var(--b2)',
        background: 'var(--bg2)', display: 'flex', alignItems: 'center',
        gap: 10, flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Title */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-printer" style={{ color: 'var(--em)' }} />
            إعدادات الطباعة
          </div>
          <div style={{ fontSize: 11, color: 'var(--t4)' }}>
            قوالب الطباعة لكل أنواع المستندات — محفوظة في DB
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* ✅ Undo / Redo — مرئيان في الـ UI */}
        {localTpl && (
          <div style={{ display: 'flex', gap: 3 }}>
            <button
              onClick={handleUndo} disabled={!canUndo} type="button"
              title="تراجع (Ctrl+Z)"
              style={{
                ...toolBtnStyle,
                opacity: canUndo ? 1 : .35, cursor: canUndo ? 'pointer' : 'not-allowed',
              }}
            >
              <i className="ti ti-arrow-back-up" />
            </button>
            <button
              onClick={handleRedo} disabled={!canRedo} type="button"
              title="إعادة (Ctrl+Y)"
              style={{
                ...toolBtnStyle,
                opacity: canRedo ? 1 : .35, cursor: canRedo ? 'pointer' : 'not-allowed',
              }}
            >
              <i className="ti ti-arrow-forward-up" />
            </button>
          </div>
        )}

        {localTpl && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={handleExport} title="تصدير JSON" type="button" style={toolBtnStyle}>
              <i className="ti ti-download" />
            </button>
            <button onClick={handleImport} title="استيراد JSON" type="button" style={toolBtnStyle}>
              <i className="ti ti-upload" />
            </button>

            {/* ✅ مؤشر الحالة */}
            <div style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r2)',
              background: isDirty ? 'var(--goldb)' : 'var(--emb)',
              border: `1px solid ${isDirty ? 'var(--goldbo)' : 'var(--embo)'}`,
              color: isDirty ? 'var(--gold)' : 'var(--em)',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <i className={`ti ${isDirty ? 'ti-point-filled' : 'ti-check'}`} style={{ fontSize: 10 }} />
              {isDirty ? 'تغييرات غير محفوظة' : 'محفوظ'}
            </div>

            <button
              onClick={handleSave} disabled={!isDirty || isSaving} type="button"
              style={{
                padding: '6px 14px', borderRadius: 'var(--r2)', fontSize: 12.5, fontWeight: 800,
                border: 'none', fontFamily: 'Tajawal, sans-serif',
                background: isDirty ? 'var(--em)' : 'var(--bg5)',
                color: isDirty ? '#fff' : 'var(--t4)',
                cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: isDirty ? 'var(--emglow)' : 'none',
                transition: 'all .15s',
              }}
            >
              {isSaving
                ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
                : <><i className="ti ti-device-floppy" /> حفظ (Ctrl+S)</>
              }
            </button>
          </div>
        )}
      </div>

      {/* ══ BODY — 3 columns ══ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Col 1: Document selector ── */}
        <div style={{
          width: 200, flexShrink: 0, borderLeft: '1px solid var(--b2)',
          background: 'var(--bg2)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {DOC_CATS.map(cat => (
            <div key={cat.key}>
              <button
                onClick={() => setActiveCat(cat.key)} type="button"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 12px', border: 'none', cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif', fontSize: 11.5, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '.8px',
                  color: activeCat === cat.key ? 'var(--em)' : 'var(--t4)',
                  background: activeCat === cat.key ? 'var(--emb)' : 'transparent',
                  borderBottom: '1px solid var(--b1)', textAlign: 'right',
                }}
              >
                <i className={`ti ${cat.icon}`} style={{ fontSize: 13 }} />
                {cat.label}
              </button>

              {activeCat === cat.key && docsInCat.map(doc => {
                const count = templates.filter(t => t.doc_type_code === doc.code).length;
                return (
                  <button
                    key={doc.code}
                    onClick={() => setActiveDoc(doc.code)} type="button"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px 7px 16px', border: 'none', cursor: 'pointer',
                      fontFamily: 'Tajawal, sans-serif', fontSize: 12.5,
                      color: activeDoc === doc.code ? 'var(--em)' : 'var(--t2)',
                      background: activeDoc === doc.code ? 'rgba(10,138,92,.04)' : 'transparent',
                      borderRight: `2px solid ${activeDoc === doc.code ? 'var(--em)' : 'transparent'}`,
                      borderBottom: '1px solid var(--b1)', textAlign: 'right',
                    }}
                  >
                    <span>
                      <span style={{ fontWeight: 800, marginLeft: 5, fontSize: 11 }}>{doc.code}</span>
                      {doc.name}
                    </span>
                    {count > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '0 5px', borderRadius: 8,
                        background: 'var(--emb)', color: 'var(--em)', flexShrink: 0,
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Col 2: Template list + Controls ── */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--b2)' }}>

          {/* Templates bar */}
          <div style={{
            padding: '8px 10px', borderBottom: '1px solid var(--b2)',
            background: 'var(--bg3)', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0,
          }}>
            {isLoading ? (
              <span style={{ fontSize: 12, color: 'var(--t4)' }}><i className="ti ti-loader-2 spin" /> تحميل...</span>
            ) : templates.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-files-off" />
                لا توجد قوالب — أنشئ أول قالب بالزر أعلاه
              </span>
            ) : templates.map(tpl => (
              <div
                key={tpl.id!}
                style={{
                  display: 'flex', alignItems: 'center',
                  border: `1.5px solid ${selectedTplId === tpl.id ? 'var(--em)' : 'var(--b2)'}`,
                  borderRadius: 'var(--r2)', overflow: 'hidden',
                  background: selectedTplId === tpl.id ? 'var(--emb)' : 'var(--bg2)',
                }}
              >
                <button
                  onClick={() => { setSelectedTplId(tpl.id); setLocalTpl({ ...createDefaultTemplate(activeDoc, tpl.paper_size), ...tpl }); setIsDirty(false); }}
                  type="button"
                  style={{
                    padding: '4px 9px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 12,
                    fontWeight: 600, color: selectedTplId === tpl.id ? 'var(--em)' : 'var(--t2)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {tpl.is_default && <i className="ti ti-star-filled" style={{ fontSize: 9, color: 'var(--gold)' }} />}
                  {tpl.name}
                  <span style={{ fontSize: 9, opacity: .5, fontFamily: 'monospace' }}>{tpl.paper_size}</span>
                </button>
                <div style={{ display: 'flex', borderRight: '1px solid var(--b2)' }}>
                  {!tpl.is_default && (
                    <TinyBtn icon="ti-star"  color="var(--gold)"  title="افتراضي" loading={actionLoading === ('default-' + tpl.id)} onClick={() => handleSetDefault(tpl.id!)} />
                  )}
                  <TinyBtn icon={tpl.is_active ? 'ti-eye' : 'ti-eye-off'} color="var(--t4)" title={tpl.is_active ? 'تعطيل' : 'تفعيل'}
                    loading={actionLoading === ('toggle-' + tpl.id)}
                    onClick={() => handleToggleActive(tpl)} />
                  <TinyBtn icon="ti-copy"   color="var(--blue)"  title="نسخ"     loading={actionLoading === ('duplicate-' + tpl.id)} onClick={() => handleDuplicate(tpl)} />
                  <TinyBtn icon="ti-trash"  color="var(--red)"   title="حذف"     loading={actionLoading === ('delete-' + tpl.id)} onClick={() => handleDelete(tpl.id!)} />
                </div>
              </div>
            ))}

            <button
              onClick={handleNewTemplate} type="button"
              style={{
                padding: '4px 9px', borderRadius: 'var(--r2)',
                border: '1.5px dashed var(--embo)', background: 'var(--emb)',
                color: 'var(--em)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <i className="ti ti-plus" /> جديد
            </button>
          </div>

          {/* Controls */}
          {localTpl ? (
            <div ref={controlsRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
              {/* ✅ اسم القالب قابل للتعديل inline */}
              <div style={{
                padding: '7px 9px', marginBottom: 8,
                background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', marginBottom: 3 }}>اسم القالب</div>
                {editingName ? (
                  <Input
                    value={localTpl.name}
                    onChange={v => update('name', v)}
                    onEnter={() => setEditingName(false)}
                    placeholder="اسم القالب..."
                  />
                ) : (
                  <div
                    onClick={() => setEditingName(true)}
                    style={{
                      fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                      padding: '3px 6px', borderRadius: 'var(--r1)',
                      cursor: 'text', border: '1px dashed transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--b3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                  >
                    {localTpl.name || '—'}
                    <i className="ti ti-pencil" style={{ fontSize: 9, opacity: .3, marginRight: 5 }} />
                  </div>
                )}

                {/* ✅ حجم الورق مع sync صحيح */}
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {(['80mm', '58mm', 'A4', 'A5'] as const).map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => {
                        update('paper_size', s);
                        if (s === '58mm') update('paper_width_mm', 58);
                        else if (s === '80mm') update('paper_width_mm', 80);
                      }}
                      style={{
                        flex: 1, padding: '3px 0', fontSize: 11, borderRadius: 'var(--r1)',
                        border: `1px solid ${localTpl.paper_size === s ? 'var(--em)' : 'var(--b2)'}`,
                        background: localTpl.paper_size === s ? 'var(--emb)' : 'var(--bg3)',
                        color: localTpl.paper_size === s ? 'var(--em)' : 'var(--t3)',
                        cursor: 'pointer', fontWeight: 700,
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <QuickNav controlsRef={controlsRef} />
              <TemplateControls tpl={localTpl} update={update} companyData={companyData} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontSize: 13, gap: 8 }}>
              <i className="ti ti-printer-off" style={{ fontSize: 32, opacity: 0.4 }} />
              <span>اختر قالباً من القائمة أو أنشئ قالباً جديداً</span>
            </div>
          )}
        </div>

        {/* ── Col 3: Preview ── */}
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg1)', overflow: 'hidden',
          position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: '100vh',
        }}>
          {/* Preview toolbar */}
          <div style={{
            padding: '8px 14px', borderBottom: '1px solid var(--b2)',
            background: 'var(--bg2)', display: 'flex', alignItems: 'center',
            gap: 8, flexShrink: 0,
          }}>
            <i className="ti ti-eye" style={{ color: 'var(--em)', fontSize: 14 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t2)' }}>معاينة حية</span>
            {localTpl && (
              <span style={{
                fontSize: 11, padding: '2px 7px', borderRadius: 8,
                background: 'var(--bg3)', border: '1px solid var(--b2)',
                color: 'var(--t3)', fontWeight: 600, marginRight: 2,
              }}>
                {paperLabel(localTpl.paper_size, localTpl.paper_width_mm)}
              </span>
            )}
            {companyData && (
              <span style={{
                fontSize: 10.5, padding: '2px 7px', borderRadius: 8,
                background: 'var(--emb)', border: '1px solid var(--embo)',
                color: 'var(--em)', fontWeight: 600,
              }}>
                <i className="ti ti-building-store" style={{ marginLeft: 4, fontSize: 10 }} />
                {companyData.name}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {localTpl && (
              <button
                onClick={() => setUseRealData(v => !v)}
                type="button"
                title={useRealData ? 'استخدام بيانات فارغة' : 'استخدام آخر مستند حقيقي'}
                style={{
                  ...toolBtnStyle,
                  padding: '5px 8px', fontSize: 11,
                  color: useRealData ? 'var(--em)' : 'var(--t3)',
                  borderColor: useRealData ? 'var(--em)' : 'var(--b2)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <i className={`ti ${useRealData ? 'ti-database' : 'ti-database-off'}`} />
                {useRealData ? 'بيانات حقيقية' : 'بيانات تجريبية'}
              </button>
            )}
            {localTpl && useRealData && (
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                type="button"
                title="تحديث البيانات من الخادم"
                style={{
                  ...toolBtnStyle,
                  padding: '5px 8px', fontSize: 11,
                  opacity: isFetching ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <i className={`ti ${isFetching ? 'ti-loader-2 spin' : 'ti-refresh'}`} />
                تحديث
              </button>
            )}
            {localTpl && (
              <button onClick={handleTestPrint} type="button"
                style={{
                  ...toolBtnStyle,
                  padding: '5px 11px', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <i className="ti ti-printer" /> طباعة تجريبية
              </button>
            )}
          </div>

          {/* Preview area — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', justifyContent: 'center' }}>
            {deferredTpl ? (
              <div style={{
                boxShadow: '0 4px 24px rgba(0,0,0,.14)',
                border: '1px solid var(--b3)',
                borderRadius: 2,
                display: 'inline-block',
              }}>
                <ErrorBoundary>
                  <PreviewSelector tpl={deferredTpl} company={companyData} overrideData={useRealData ? previewData : null} />
                </ErrorBoundary>
              </div>
            ) : (
              <div style={{ color: 'var(--t4)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-device-desktop-off" style={{ fontSize: 24, opacity: 0.4 }} />
                اختر قالباً لعرض المعاينة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* ── Template Library Modal ── */}
      <TemplateLibraryModal
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onInstall={handleInstallLibrary}
        activeDoc={activeDoc}
      />

      {/* ── Delete confirmation modal ── */}
      {deleteTarget !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setDeleteTarget(null)}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: 24, width: 380, maxWidth: '90vw',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--red)' }}>
              <i className="ti ti-alert-triangle" style={{ marginLeft: 8 }} />
              تأكيد الحذف
            </div>
            <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
              هل تريد حذف هذا القالب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                padding: '8px 16px', border: '1px solid var(--b2)', borderRadius: 6,
                background: 'var(--bg2)', color: 'var(--t2)', cursor: 'pointer', fontSize: 13,
              }} type="button">إلغاء</button>
              <button onClick={confirmDelete} disabled={actionLoading !== null} style={{
                padding: '8px 16px', border: 'none', borderRadius: 6,
                background: 'var(--red)', color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600, opacity: actionLoading ? 0.6 : 1,
              }} type="button">
                {actionLoading ? 'جاري الحذف…' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Tiny icon button ──────────────────────────────────────────────────────────

const toolBtnStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 'var(--r1)', fontSize: 13,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t3)', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
};

function TinyBtn({ icon, color, title, onClick, loading, disabled }: {
  icon: string; color: string; title: string; onClick: () => void;
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={loading ? undefined : onClick}
      title={loading ? 'جاري…' : title}
      type="button"
      disabled={disabled || loading}
      style={{
        padding: '4px 5px', border: 'none', background: 'transparent',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        color: (disabled || loading) ? 'var(--t4)' : color,
        fontSize: 11, lineHeight: 1, opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        : <i className={`ti ${icon}`} />}
    </button>
  );
}
