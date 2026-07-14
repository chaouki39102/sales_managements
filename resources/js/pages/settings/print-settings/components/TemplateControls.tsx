import React, { useState } from 'react';
import type { PrintTemplate } from '../types';
import type { CompanyData } from '../types';
import { Toggle, Field, Input, Pills, SectionTitle } from './ui';
import { Accordion } from './Accordion';
import type { Updater } from './ColumnManager';
import { Section } from '../sections/ToggleSwitch';
import HeaderSectionControls from '../sections/HeaderSection';
import DocumentSectionControls from '../sections/DocumentSection';
import ItemsSectionControls from '../sections/ItemsSection';
import TotalsSectionControls from '../sections/TotalsSection';
import PaymentsSectionControls from '../sections/PaymentsSection';
import FooterSectionControls from '../sections/FooterSection';
import FormattingSectionControls from '../sections/FormattingSection';
import RulesSection from './RulesSection';
import { isPropertyVisible } from '../services/PropertyVisibilityService';

export function TemplateControls({ tpl, update, companyData }: {
  tpl: PrintTemplate; update: Updater; companyData: CompanyData | null;
}) {
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseVersion, setCollapseVersion] = useState(0);
  const docType = tpl.doc_type_code;
  const paperSize = tpl.paper_size;

  const sec = (k: string) => isPropertyVisible(k, docType, paperSize, tpl);

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

      {/* ── Section visibility toggles ── */}
      <div style={{
        padding: '6px 10px', background: 'var(--bg3)', borderRadius: 'var(--r2)',
        border: '1px solid var(--b2)', marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 4,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', width: '100%', marginBottom: 2 }}>
          إظهار / إخفاء الأقسام
        </span>
        <Toggle value={tpl.show_header_section} onChange={v => update('show_header_section', v)} label="الرأس" />
        <Toggle value={tpl.show_doc_info_section} onChange={v => update('show_doc_info_section', v)} label="المستند" />
        <Toggle value={tpl.show_items_section} onChange={v => update('show_items_section', v)} label="الجدول" />
        <Toggle value={tpl.show_totals_section} onChange={v => update('show_totals_section', v)} label="الإجماليات" />
        <Toggle value={tpl.show_payments_section} onChange={v => update('show_payments_section', v)} label="الدفع" />
        <Toggle value={tpl.show_footer_section} onChange={v => update('show_footer_section', v)} label="التذييل" />
      </div>

      {sec('show_header_section') && (
        <Section id="s-header" title="رأس الفاتورة — الشعار والشركة" icon="ti-building-store" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <HeaderSectionControls tpl={tpl} update={update} company={companyData} />
        </Section>
      )}

      {sec('show_doc_info_section') && (
        <Section id="s-doc" title="معلومات المستند" icon="ti-file-description" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <DocumentSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      {sec('show_items_section') && (
        <Section id="s-items" title="جدول المنتجات — الأعمدة والتنسيق" icon="ti-table" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <ItemsSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      {sec('show_totals_section') && (
        <Section id="s-totals" title="الإجماليات — الحسابات" icon="ti-cash" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <TotalsSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      {sec('show_payments_section') && (
        <Section id="s-payments" title="تفاصيل الدفع" icon="ti-cash-banknote" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <PaymentsSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      {sec('show_footer_section') && (
        <Section id="s-footer" title="التذييل — النصوص والتواقيع" icon="ti-file-text" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <FooterSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      <Section id="s-format" title="تنسيق الطباعة — الهوامش والمسافات" icon="ti-settings" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <FormattingSectionControls tpl={tpl} update={update} />
      </Section>

      <Accordion id="s-rules" title="القواعد — الإظهار/الإخفاء الشرطي" icon="ti-adjustments" collapseVersion={collapseVersion} defaultOpen={!allCollapsed}>
        <RulesSection tpl={tpl} update={update} />
      </Accordion>

      {sec('show_report_header') && (
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
          {tpl.show_report_top_products && (
            <div style={{ padding: '4px 0', borderBottom: '1px solid var(--b1)', marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4 }}>عرض أعمدة الجدول</div>
              {([['product', 'المنتج'], ['quantity', 'الكمية'], ['total', 'الإجمالي']] as const).map(([k, label]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--t2)', minWidth: 50 }}>{label}</span>
                  <input type="range" min={10} max={70} step={1}
                    value={tpl.report_col_widths[k] ?? 30}
                    onChange={e => update('report_col_widths', { ...tpl.report_col_widths, [k]: Number(e.target.value) })}
                    style={{ flex: 1, height: 3, accentColor: 'var(--em)' }} />
                  <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 28, textAlign: 'left' }}>
                    {tpl.report_col_widths[k] ?? 30}%
                  </span>
                  <input
                    value={tpl.report_col_headers[k] ?? ''}
                    onChange={e => update('report_col_headers', { ...tpl.report_col_headers, [k]: e.target.value })}
                    placeholder={label}
                    style={{
                      width: 60, fontSize: 10, padding: '1px 4px',
                      border: '1px solid var(--b2)', borderRadius: 'var(--r1)',
                      background: 'var(--bg3)', color: 'var(--t2)',
                      fontFamily: 'Tajawal, sans-serif',
                    }} />
                </div>
              ))}
            </div>
          )}
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
      )}
    </div>
  );
}
