import React, { useState } from 'react';
import type { PrintTemplate, FontFamily } from '../types';
import type { CompanyData } from '../types';
import { Toggle, Slider, Field, Input, Textarea, Select, Pills, ColorField, SectionTitle } from './ui';
import { Accordion } from './Accordion';
import { ColumnManager, type Updater } from './ColumnManager';
import { Section } from '../sections/ToggleSwitch';
import HeaderSectionControls from '../sections/HeaderSection';
import DocumentSectionControls from '../sections/DocumentSection';
import ItemsSectionControls from '../sections/ItemsSection';
import TotalsSectionControls from '../sections/TotalsSection';
import FooterSectionControls from '../sections/FooterSection';
import FormattingSectionControls from '../sections/FormattingSection';
import RulesSection from './RulesSection';

export function TemplateControls({ tpl, update, companyData }: {
  tpl: PrintTemplate; update: Updater; companyData: CompanyData | null;
}) {
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseVersion, setCollapseVersion] = useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

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

      <Section id="s-header" title="رأس الفاتورة — الشعار والشركة" icon="ti-building-store" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <HeaderSectionControls tpl={tpl} update={update} company={companyData} />
        <div style={{ padding: '8px 11px', borderTop: '1px solid var(--b2)' }}>
          <Slider label="تدوير الزوايا" value={tpl.logo_border_radius} min={0} max={50} unit="%" onChange={v => update('logo_border_radius', v)} />
          <ColorField label="لون الاسم" value={tpl.company_name_color} onChange={v => update('company_name_color', v)} />
        </div>
      </Section>

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

      <Section id="s-footer" title="التذييل — النصوص والتواقيع" icon="ti-file-text" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <FooterSectionControls tpl={tpl} update={update} />
        <div style={{ padding: '8px 11px' }}>
          <ColorField label="لون الشكر" value={tpl.thank_you_color} onChange={v => update('thank_you_color', v)} />
        </div>
      </Section>

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

      <Accordion id="s-rules" title="القواعد — الإظهار/الإخفاء الشرطي" icon="ti-adjustments" collapseVersion={collapseVersion} defaultOpen={!allCollapsed}>
        <RulesSection tpl={tpl} update={update} />
      </Accordion>

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
