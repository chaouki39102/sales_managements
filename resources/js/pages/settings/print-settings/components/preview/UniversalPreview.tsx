import React, { useMemo, useEffect } from 'react';
import type { UniversalDocumentData, DocumentLine } from '@/reporting';
import type { PrintTemplate, ColumnKey } from '@/reporting';
import {
  mm, align, fontFamily, colDefaultHeader,
  Separator, DocRow, TotalRow, InfoRow,
  getCompany, getVisibleCols, colWidth, colAlign, borderStyle,
  type CompanyData,
} from './shared';
import { rulesEngine } from '@/reporting';
import { formulaEngine } from '@/reporting';
import { calculatedFieldService } from '@/reporting';
import ChartSection from '../ChartSection';

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface UniversalPreviewProps {
  tpl:      PrintTemplate;
  data:     UniversalDocumentData;
  company?: CompanyData | null;
}

// ─── colValue ───────────────────────────────────────────────────────────────────

function colValue(col: ColumnKey, line: DocumentLine, tpl: PrintTemplate): string {
  switch (col) {
    case 'rowNumber': return String(line.rowNumber);
    case 'barcode':   return line.barcode ?? '';
    case 'ref':       return line.ref ?? '';
    case 'name':      return line.name;
    case 'unit':      return line.unit ?? '';
    case 'quantity':  return String(line.quantity);
    case 'price':     return tpl.price_display === 'ttc' ? Number(line.unitPriceTtc).toFixed(2) : Number(line.unitPriceHt).toFixed(2);
    case 'discount':  return line.discountPct > 0 ? `${line.discountPct}%` : '';
    case 'tva':       return `${line.tvaPct}%`;
    case 'total':     return tpl.show_line_total_ttc ? Number(line.totalTtc).toFixed(2) : Number(line.totalHt).toFixed(2);
  }
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ─── Barcode / QR helpers ───────────────────────────────────────────────────────

function barcodeText(tpl: PrintTemplate, data: UniversalDocumentData): string {
  if (tpl.barcode_content === 'custom') return tpl.barcode_custom_text;
  if (tpl.barcode_content === 'total') return `${Number(data.totals.totalTtc).toFixed(2)} دج`;
  return data.doc.number;
}

function qrDataText(tpl: PrintTemplate, data: UniversalDocumentData): string {
  const parts: string[] = [];
  if (tpl.qr_content === 'doc-number' || tpl.qr_content === 'both') {
    parts.push(data.doc.number);
  }
  if (tpl.qr_content === 'company-info' || tpl.qr_content === 'both') {
    parts.push(data.company.name || '');
  }
  return parts.join(' | ');
}

// ─── SectionWrap — applies highlight styling from rules ─────────────────────────

function SectionWrap({ highlight, children }: {
  highlight: Record<string, string> | null;
  children: React.ReactNode;
}) {
  if (!highlight) return <>{children}</>;
  return <div style={highlight}>{children}</div>;
}

// ─── buildEvalContext — builds EvaluationContext for RuleEngine ─────────────────

import type { EvaluationContext, ExpressionValue } from '@/reporting';

function buildEvalContext(data: UniversalDocumentData): EvaluationContext {
  const t = data.totals;
  const computed: Record<string, ExpressionValue> = {
    totalHt:      t.totalHt,
    totalTva:     t.totalTva,
    totalTtc:     t.totalTtc,
    totalDiscount: t.totalDiscount,
    fiscalStamp:  t.fiscalStamp,
    paid:         t.paid,
    change:       t.change,
    remaining:    t.remaining,
    lineCount:    data.lines.length,
    itemCount:    data.lines.reduce((s, l) => s + (l.quantity || 0), 0),
    prevBalance:  data.balance?.previous ?? 0,
    newBalance:   data.balance?.current ?? 0,
    docNumber:    data.doc.number,
    docDate:      data.doc.date,
  };
  // Merge calculated fields from CalculatedFieldService
  const calcFields = calculatedFieldService.computeAll(data);
  Object.assign(computed, calcFields);
  return { data, computed };
}

// ─── Main component ─────────────────────────────────────────────────────────────

function UniversalPreview({ tpl, data, company }: UniversalPreviewProps) {
  // Clear formula expression cache when document data changes
  useEffect(() => { formulaEngine.clearCache(); }, [data]);

  const isThermal = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
  const isA4      = tpl.paper_size === 'A4';
  const isA5      = tpl.paper_size === 'A5';
  const co = useMemo(() => getCompany(tpl, company), [tpl, company]);

  // ── Rule evaluation ─────────────────────────────────────────────────────
  const ruleResult = useMemo(() => {
    if (!tpl.rules || tpl.rules.length === 0) return null;
    try {
      const ctx = buildEvalContext(data);
      return rulesEngine.evaluate(tpl.rules, ctx, formulaEngine);
    } catch {
      return null;
    }
  }, [tpl.rules, data]);

  const sectionVisible = (section: string): boolean => {
    if (ruleResult && ruleResult.visibility[section] === false) return false;
    return true;
  };

  const sectionHighlight = (section: string): Record<string, string> | null => {
    if (ruleResult && ruleResult.highlights[section]) return ruleResult.highlights[section];
    return null;
  };

  const paperWidth   = isThermal ? tpl.paper_width_mm * 3.78 : (isA4 ? 794 : 559);
  const paddingTop   = isThermal ? mm(tpl.margin_top) : (isA4 ? 40 : 20);
  const paddingSide  = isThermal ? mm(tpl.margin_sides) : (isA4 ? 50 : 24);
  const paddingBottom = isThermal ? mm(tpl.margin_bottom) : (isA4 ? 40 : 20);
  const minHeight    = isThermal ? 'auto' : (isA4 ? 1123 : 794);

  return (
    <div style={{
      width: paperWidth,
      direction: 'rtl',
      fontFamily: fontFamily(tpl.font_family),
      fontSize: tpl.base_font_size,
      lineHeight: tpl.line_spacing,
      padding: `${paddingTop}px ${paddingSide}px ${paddingBottom}px`,
      background: '#fff',
      color: '#111',
      margin: '0 auto',
      minHeight,
      boxSizing: 'border-box',
    }}>
      {tpl.show_header_section && sectionVisible('header') && (
        <SectionWrap highlight={sectionHighlight('header')}>
          {renderHeader(tpl, co, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_doc_info_section && sectionVisible('doc-info') && (
        <SectionWrap highlight={sectionHighlight('doc-info')}>
          {renderDocInfo(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_items_section && sectionVisible('items') && (
        <SectionWrap highlight={sectionHighlight('items')}>
          {renderItems(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {data.report && renderReport(tpl, data, isThermal, paperWidth)}
      {tpl.show_totals_section && sectionVisible('totals') && (
        <SectionWrap highlight={sectionHighlight('totals')}>
          {renderTotals(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_payments_section && tpl.show_payment_details && sectionVisible('payments') && (
        <SectionWrap highlight={sectionHighlight('payments')}>
          {renderPayments(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_footer_section && sectionVisible('footer') && (
        <SectionWrap highlight={sectionHighlight('footer')}>
          {renderFooter(tpl, data, isThermal)}
        </SectionWrap>
      )}
    </div>
  );
}

export default React.memo(UniversalPreview);

// ════════════════════════════════════════════════════════════════════════════════
// REPORT
// ════════════════════════════════════════════════════════════════════════════════

function renderReport(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean, width: number) {
  const r = data.report!;

  return (
    <div style={{ marginBottom: isThermal ? 4 : 12 }}>
      {/* Report header */}
      {tpl.show_report_header && (
        <div style={{ marginBottom: isThermal ? 3 : 8 }}>
          {tpl.report_header_text && (
            <div style={{
              fontSize: tpl.title_size, fontWeight: 900,
              textAlign: 'center', marginBottom: 4,
            }}>
              {tpl.report_header_text}
            </div>
          )}
          <div style={{ fontSize: tpl.base_font_size - 0.5, color: '#555', textAlign: 'center' }}>
            {tpl.show_report_period && r.periodStart && r.periodEnd && (
              <span>من {r.periodStart} إلى {r.periodEnd}</span>
            )}
            {tpl.show_report_cashier && r.cashierName && (
              <span style={{ marginRight: 12 }}>الكاشير: {r.cashierName}</span>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      {tpl.show_report_summary_cards && (
        <div style={{
          display: 'grid', gridTemplateColumns: isThermal ? '1fr' : 'repeat(3, 1fr)',
          gap: isThermal ? 4 : 8, marginBottom: isThermal ? 4 : 12,
        }}>
          {[
            { label: 'إجمالي المبيعات', val: r.grossSales, color: '#16a34a' },
            { label: 'المرتجعات',        val: -r.returnsTotal, color: '#dc2626', hide: r.returnsTotal === 0 },
            { label: 'صافي المبيعات',   val: r.netSales, color: '#2563eb' },
            { label: 'عدد الفواتير',     val: r.invoicesCount, color: '#8b5cf6', isCount: true },
            { label: 'متوسط الفاتورة',   val: r.avgInvoice, color: '#d97706' },
            { label: 'أعلى فاتورة',      val: r.highestInvoice, color: '#06b6d4' },
          ].map(card => {
            if (card.hide) return null;
            return (
              <div key={card.label} style={{
                padding: isThermal ? '3px 6px' : '10px 14px',
                borderRadius: 'var(--r2)', border: `1px solid ${card.color}22`,
                background: `${card.color}08`, textAlign: 'center',
              }}>
                <div style={{ fontSize: isThermal ? 9 : 11, color: '#666', marginBottom: 2 }}>{card.label}</div>
                <div style={{
                  fontSize: isThermal ? 13 : 18, fontWeight: 900, color: card.color,
                }}>
                  {card.isCount ? card.val : `${Number(card.val).toFixed(2)} دج`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment breakdown chart */}
      {tpl.show_charts && tpl.show_report_payment_breakdown && (
        <ChartSection
          data={data}
          chartType={tpl.chart_type}
          title={tpl.chart_title || 'توزيع وسائل الدفع'}
          width={isThermal ? 288 : width - 80}
        />
      )}

      {/* Top products table */}
      {tpl.show_report_top_products && r.topProducts.length > 0 && (
        <div style={{ marginTop: isThermal ? 4 : 12 }}>
          <div style={{ fontWeight: 700, fontSize: isThermal ? 11 : 13, marginBottom: 4 }}>
            أفضل المنتجات مبيعاً
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tpl.items_font_size }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 700 }}>المنتج</th>
                <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 700 }}>الكمية</th>
                <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 700 }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {r.topProducts.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '3px 6px' }}>{p.name}</td>
                  <td style={{ textAlign: 'center', padding: '3px 6px' }}>{p.quantity}</td>
                  <td style={{ textAlign: 'center', padding: '3px 6px' }}>{Number(p.totalTtc).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report footer */}
      {tpl.show_report_footer && tpl.report_footer_text && (
        <div style={{
          marginTop: isThermal ? 4 : 12,
          fontSize: tpl.base_font_size - 1,
          textAlign: 'center',
          color: '#666',
          borderTop: '1px solid #ddd',
          paddingTop: 6,
        }}>
          {tpl.report_footer_text}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════════════════════════════════════

function renderHeader(tpl: PrintTemplate, co: CompanyData, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalHeader(tpl, co);
  return renderPageHeader(tpl, co, data);
}

function renderThermalHeader(tpl: PrintTemplate, co: CompanyData) {
  return (
    <div style={{ textAlign: align(tpl.company_info_align), marginBottom: 5 }}>
      {tpl.show_logo && renderLogo(tpl, co)}
      {tpl.show_company_name && (
        <div style={{
          textAlign: align(tpl.company_name_align),
          fontSize: tpl.company_name_size,
          fontWeight: tpl.company_name_bold ? 900 : 400,
          color: tpl.company_name_color,
          marginBottom: 3,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          {co.name}
        </div>
      )}
      <div style={{ fontSize: tpl.company_info_size, color: '#444' }}>
        {tpl.show_address && co.address && <div>{co.address}</div>}
        {tpl.show_phone   && co.phone   && <div>☏ {co.phone}</div>}
        {tpl.show_tax_id  && co.nif     && <div>NIF: {co.nif}</div>}
        {tpl.show_rc      && co.rc      && <div>RC: {co.rc}</div>}
        {tpl.show_nis     && co.nis     && <div>NIS: {co.nis}</div>}
        {tpl.show_ice     && co.ice     && <div>ICE: {co.ice}</div>}
        {tpl.show_article && co.article && <div>{co.article}</div>}
      </div>
      {tpl.header_custom_text && (
        <div style={{ fontSize: tpl.company_info_size, color: '#555', marginTop: 2 }}>
          {tpl.header_custom_text}
        </div>
      )}
      <Separator style={tpl.header_separator} />
    </div>
  );
}

function renderPageHeader(tpl: PrintTemplate, co: CompanyData, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: isA4 ? 30 : 16,
      paddingBottom: isA4 ? 20 : 10,
      borderBottom: isA4 ? '2px solid #111' : '1.5px solid #111',
    }}>
      {/* Left column — logo + company info */}
      <div style={{ flex: 1 }}>
        {tpl.show_logo && renderLogo(tpl, co)}
        {tpl.show_company_name && (
          <div style={{
            fontSize: tpl.company_name_size + (isA4 ? 4 : 2),
            fontWeight: tpl.company_name_bold ? 900 : 400,
            fontFamily: "'Tajawal', sans-serif",
            marginBottom: 4,
          }}>
            {co.name}
          </div>
        )}
        <div style={{ fontSize: tpl.company_info_size, color: '#555' }}>
          {tpl.show_address && <div>{co.address}</div>}
          {tpl.show_phone   && <div>☎ {co.phone}</div>}
          {tpl.show_tax_id  && <div>NIF: {co.nif}</div>}
          {tpl.show_rc      && <div>RC: {co.rc}</div>}
          {tpl.show_nis     && <div>NIS: {co.nis}</div>}
          {tpl.show_ice     && <div>ICE: {co.ice}</div>}
          {tpl.show_article && <div>{co.article}</div>}
        </div>
      </div>

      {/* Right column — document title + info table */}
      <div style={{ textAlign: 'left', minWidth: isA4 ? 250 : 180 }}>
        <div style={{
          fontSize: tpl.title_size + (isA4 ? 4 : 2),
          fontWeight: tpl.title_bold ? 900 : 400,
          color: tpl.title_color,
          marginBottom: isA4 ? 12 : 8,
          textAlign: 'left',
        }}>
          {tpl.title_text}
        </div>
        <table style={{ fontSize: tpl.company_info_size, borderCollapse: 'collapse' }}>
          <tbody>
            {tpl.show_doc_number && <InfoRow label={isA4 ? 'رقم الفاتورة' : 'رقم'} value={data.doc.number} />}
            {tpl.show_date && <InfoRow label="التاريخ" value={formatDate(data.doc.date) + (tpl.show_time && data.doc.time ? ' ' + data.doc.time : '')} />}
            {tpl.show_due_date && data.doc.dueDate && <InfoRow label="تاريخ الاستحقاق" value={data.doc.dueDate} />}
            {tpl.show_cashier && (data.party?.cashierName || data.session?.cashierName) && (
              <InfoRow label="الكاشير" value={data.party?.cashierName || data.session?.cashierName || ''} />
            )}
            {tpl.show_session && data.session?.code && <InfoRow label="الجلسة" value={data.session.code} />}
            {tpl.show_payment_term && data.doc.dueDate && <InfoRow label="شروط الدفع" value={data.doc.dueDate} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderLogo(tpl: PrintTemplate, co: CompanyData) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: tpl.logo_align === 'right' ? 'flex-start' : tpl.logo_align === 'left' ? 'flex-end' : 'center',
      marginBottom: 4,
    }}>
      {co.logoUrl ? (
        <img src={co.logoUrl} alt="logo"
          style={{
            width: tpl.logo_size, height: tpl.logo_size,
            objectFit: 'contain',
            borderRadius: `${tpl.logo_border_radius}%`,
          }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div style={{
          width: tpl.logo_size, height: tpl.logo_size,
          background: '#111',
          borderRadius: `${tpl.logo_border_radius}%`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: tpl.logo_size * 0.35, fontWeight: 900,
        }}>
          {co.name.charAt(0)}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// DOC INFO — Title, document info, client info
// ════════════════════════════════════════════════════════════════════════════════

function renderDocInfo(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalDocInfo(tpl, data);
  return renderPageDocInfo(tpl, data);
}

function renderThermalDocInfo(tpl: PrintTemplate, data: UniversalDocumentData) {
  const doc = data.doc;
  const party = data.party;
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{
        textAlign: align(tpl.title_align),
        fontSize: tpl.title_size,
        fontWeight: tpl.title_bold ? 900 : 400,
        color: tpl.title_color,
        fontFamily: "'Tajawal', sans-serif",
        marginBottom: 4,
      }}>
        {tpl.title_text}
      </div>

      <div style={{ fontSize: tpl.base_font_size }}>
        {tpl.show_doc_number && <DocRow label="رقم:" value={doc.number} mono />}
        {tpl.show_date && <DocRow label="التاريخ:" value={`${formatDate(doc.date)}${tpl.show_time && doc.time ? ' ' + doc.time : ''}`} />}
        {tpl.show_due_date && doc.dueDate && <DocRow label="تاريخ الاستحقاق:" value={doc.dueDate} />}
        {tpl.show_cashier && (party?.cashierName || data.session?.cashierName) && (
          <DocRow label="الكاشير:" value={party?.cashierName || data.session?.cashierName || ''} />
        )}
        {tpl.show_session && data.session?.code && (
          <DocRow label="الجلسة:" value={data.session.code} />
        )}
        {tpl.show_client && party?.name && (
          <>
            <DocRow label="العميل:" value={party.name} />
            {tpl.show_client_nif     && party.nif     && <DocRow label="NIF العميل:" value={party.nif} />}
            {tpl.show_client_phone   && party.phone   && <DocRow label="هاتف العميل:" value={party.phone} />}
            {tpl.show_client_address && party.address && <DocRow label="العنوان:" value={party.address} />}
            {tpl.show_delivery_address && party.deliveryAddress && <DocRow label="عنوان التسليم:" value={party.deliveryAddress} />}
          </>
        )}
        {tpl.show_payment_term && data.doc.dueDate && (
          <DocRow label="شروط الدفع:" value={data.doc.dueDate} />
        )}
      </div>

      <Separator style={tpl.doc_separator} />
    </div>
  );
}

function renderPageDocInfo(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  const party = data.party;

  if (!tpl.show_client || !party?.name) return null;

  if (isA4) {
    return (
      <div style={{ display: 'flex', gap: 30, marginBottom: 24 }}>
        <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.company_info_size + 1, marginBottom: 6, color: '#111' }}>بيانات العميل</div>
          <div style={{ fontSize: tpl.company_info_size, color: '#333' }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{party.name}</div>
            {tpl.show_client_nif     && party.nif     && <div>NIF: {party.nif}</div>}
            {tpl.show_client_phone   && party.phone   && <div>☎ {party.phone}</div>}
            {tpl.show_client_address && party.address && <div>{party.address}</div>}
          </div>
        </div>
        {tpl.show_delivery_address && party.deliveryAddress && (
          <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: tpl.company_info_size + 1, marginBottom: 6, color: '#111' }}>عنوان التسليم</div>
            <div style={{ fontSize: tpl.company_info_size, color: '#333' }}>
              {party.deliveryAddress}
            </div>
          </div>
        )}
      </div>
    );
  }

  // A5
  return (
    <div style={{
      fontSize: tpl.company_info_size, marginBottom: 10,
      padding: 8, background: '#f9fafb', borderRadius: 4,
    }}>
      <span style={{ fontWeight: 700 }}>العميل: </span>{party.name}
      {tpl.show_client_nif   && party.nif   && <span style={{ marginRight: 12 }}>NIF: {party.nif}</span>}
      {tpl.show_client_phone && party.phone && <span style={{ marginRight: 12 }}>☎ {party.phone}</span>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ITEMS TABLE
// ════════════════════════════════════════════════════════════════════════════════

function renderItems(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalItems(tpl, data);
  return renderPageItems(tpl, data);
}

function renderThermalItems(tpl: PrintTemplate, data: UniversalDocumentData) {
  const visibleCols = getVisibleCols(tpl);
  if (visibleCols.length === 0 || data.lines.length === 0) return null;

  const ff = tpl.items_font_family === 'monospace'
    ? "'Courier New', monospace"
    : "'Tajawal', sans-serif";

  const bs = borderStyle(tpl.table_border_style);
  const border = tpl.table_border_style === 'none' ? 'none' : `1px ${bs} #999`;

  return (
    <div style={{ fontSize: tpl.items_font_size, fontFamily: ff, marginBottom: 4 }}>
      {tpl.show_col_header && (
        <div style={{
          display: 'flex', gap: 2,
          fontWeight: tpl.table_header_bold ? 800 : 400,
          color: tpl.table_header_color,
          background: tpl.table_header_bg ? '#f0f0f0' : 'transparent',
          borderBottom: border,
          paddingBottom: 3, marginBottom: 2,
        }}>
          {visibleCols.map(col => (
            <div key={col} style={{
              flex: `0 0 ${colWidth(tpl, col)}%`,
              textAlign: align(colAlign(tpl, col)),
            }}>
              {tpl.col_headers[col] ?? colDefaultHeader(col)}
            </div>
          ))}
        </div>
      )}

      {data.lines.map((line, idx) => (
        <div key={idx} style={{
          display: 'flex', gap: 2,
          background: tpl.alternating_rows && idx % 2 === 1 ? tpl.alternating_color : 'transparent',
          padding: '1px 0',
          borderBottom: tpl.table_border_style !== 'none' ? `1px ${bs} #eee` : 'none',
        }}>
          {visibleCols.map(col => (
            <div key={col} style={{
              flex: `0 0 ${colWidth(tpl, col)}%`,
              textAlign: align(colAlign(tpl, col)),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col === 'name' ? 'normal' : 'nowrap',
            }}>
              {colValue(col, line, tpl)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderPageItems(tpl: PrintTemplate, data: UniversalDocumentData) {
  const visibleCols = getVisibleCols(tpl);
  if (visibleCols.length === 0 || data.lines.length === 0) return null;

  const isA4 = tpl.paper_size === 'A4';
  const cellPad = isA4 ? '10px' : '5px 6px';

  return (
    <div style={{ marginBottom: isA4 ? 20 : 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tpl.items_font_size }}>
        <thead>
          <tr style={{
            background: tpl.table_header_bg ? '#111' : '#f5f5f5',
            borderBottom: isA4 ? '2px solid #111' : '1.5px solid #111',
          }}>
            {visibleCols.map(col => (
              <th key={col} style={{
                padding: cellPad,
                textAlign: col === 'name' || col === 'ref' ? 'right' as const : 'left' as const,
                fontWeight: tpl.table_header_bold ? 700 : 600,
                color: tpl.table_header_bg ? '#fff' : '#111',
                fontSize: tpl.items_font_size,
              }}>
                {tpl.col_headers[col] ?? colDefaultHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{
              borderBottom: tpl.table_border_style !== 'none'
                ? `1px ${borderStyle(tpl.table_border_style)} #ddd`
                : 'none',
              background: tpl.alternating_rows && i % 2 === 1 ? '#fafafa' : 'transparent',
            }}>
              {visibleCols.map(col => (
                <td key={col} style={{
                  padding: cellPad,
                  textAlign: col === 'name' || col === 'ref' ? 'right' as const : 'left' as const,
                  fontWeight: col === 'total' ? 700 : 400,
                  fontSize: tpl.items_font_size,
                }}>
                  {colValue(col, line, tpl)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TOTALS
// ════════════════════════════════════════════════════════════════════════════════

function renderTotals(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalTotals(tpl, data);
  return renderPageTotals(tpl, data);
}

function renderThermalTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const t = data.totals;
  const fs = tpl.totals_font_size;

  return (
    <div style={{
      fontSize: fs,
      fontWeight: tpl.totals_bold ? 700 : 400,
      textAlign: align(tpl.totals_align),
      marginBottom: 4,
    }}>
      {tpl.show_total_ht      && <TotalRow label="المجموع HT"        val={t.totalHt} />}
      {tpl.show_discount_total && t.totalDiscount > 0 && (
        <TotalRow label="إجمالي الخصومات" val={-t.totalDiscount} red />
      )}
      {tpl.show_total_tva     && <TotalRow label="TVA"               val={t.totalTva} />}
      {tpl.show_tva_breakdown && data.taxBreakdown.map(r => (
        <TotalRow key={r.rate} label={`  TVA ${r.rate}%`} val={r.tva} />
      ))}
      {tpl.show_fiscal_stamp  && t.fiscalStamp > 0 && (
        <TotalRow label="الطابع الجبائي" val={t.fiscalStamp} />
      )}

      {tpl.show_total_ttc && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          border: tpl.total_border_style === 'none'
            ? 'none'
            : `2px ${borderStyle(tpl.total_border_style)} #111`,
          padding: '3px 5px', margin: '5px 0',
          fontWeight: tpl.total_ttc_bold ? 900 : 700,
          fontSize: tpl.total_ttc_font_size,
          color: tpl.total_ttc_color,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          <span>المجموع TTC:</span>
          <span dir="ltr">{Number(t.totalTtc).toFixed(2)} دج</span>
        </div>
      )}

      {tpl.show_amount_in_words && (
        <div style={{ fontSize: fs - 1, textAlign: 'center', color: '#555', marginTop: 2 }}>
          <em>فقط: {numberToArabicWords(t.totalTtc)} ديناراً جزائرياً</em>
        </div>
      )}

      {tpl.show_paid_amount   && <TotalRow label="المدفوع"        val={t.paid} bold />}
      {tpl.show_change        && <TotalRow label="الباقي"         val={t.change} />}
      {tpl.show_remaining     && t.remaining > 0 && <TotalRow label="المتبقي"  val={t.remaining} red />}
      {tpl.show_prev_balance  && data.balance && <TotalRow label="الرصيد السابق"  val={data.balance.previous} />}
      {tpl.show_new_balance   && data.balance && <TotalRow label="الرصيد الجديد"  val={data.balance.current} bold />}
    </div>
  );
}

function renderPageTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const t = data.totals;
  const isA4 = tpl.paper_size === 'A4';
  const tblW = isA4 ? 320 : 260;

  const borderTop = tpl.total_border_style === 'none'
    ? 'none'
    : `${isA4 ? '3px' : '2px'} ${borderStyle(tpl.total_border_style)} #111`;

  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end',
      fontSize: tpl.totals_font_size,
      fontWeight: tpl.totals_bold ? 700 : 400,
      marginBottom: isA4 ? 24 : 12,
      direction: 'ltr',
    }}>
      <table style={{ width: tblW, borderCollapse: 'collapse' }}>
        <tbody>
          {tpl.show_total_ht      && <PageTotalRow label="المجموع HT"      val={t.totalHt} />}
          {tpl.show_discount_total && t.totalDiscount > 0 && <PageTotalRow label="إجمالي الخصومات" val={-t.totalDiscount} red />}
          {tpl.show_total_tva     && <PageTotalRow label="TVA"             val={t.totalTva} />}
          {tpl.show_tva_breakdown && data.taxBreakdown.map(r => (
            <PageTotalRow key={r.rate} label={`  TVA ${r.rate}%`} val={r.tva} />
          ))}
          {tpl.show_fiscal_stamp  && t.fiscalStamp > 0 && <PageTotalRow label="الطابع الجبائي" val={t.fiscalStamp} />}

          {tpl.show_total_ttc && (
            <tr>
              <td style={{
                padding: isA4 ? '10px 12px' : '6px 8px',
                borderTop: borderTop,
                fontWeight: tpl.total_ttc_bold ? 900 : 700,
                fontSize: tpl.total_ttc_font_size,
                textAlign: 'right',
              }}>
                المجموع TTC:
              </td>
              <td style={{
                padding: isA4 ? '10px 12px' : '6px 8px',
                borderTop: borderTop,
                fontWeight: tpl.total_ttc_bold ? 900 : 700,
                fontSize: tpl.total_ttc_font_size,
                textAlign: 'right',
              }}>
                {Number(t.totalTtc).toFixed(2)}
              </td>
            </tr>
          )}

          {tpl.show_paid_amount  && <PageTotalRow label="المدفوع"       val={t.paid} bold />}
          {tpl.show_change       && <PageTotalRow label="الباقي"        val={t.change} />}
          {tpl.show_remaining    && t.remaining > 0 && <PageTotalRow label="المبلغ المتبقي" val={t.remaining} red />}
          {tpl.show_prev_balance && data.balance && <PageTotalRow label="الرصيد السابق" val={data.balance.previous} />}
          {tpl.show_new_balance  && data.balance && <PageTotalRow label="الرصيد الجديد" val={data.balance.current} bold />}
        </tbody>
      </table>
    </div>
  );
}

function PageTotalRow({ label, val, red, bold }: { label: string; val: number; red?: boolean; bold?: boolean }) {
  return (
    <tr>
      <td style={{
        padding: '5px 12px',
        textAlign: 'right',
        fontWeight: bold ? 800 : 400,
        color: red ? '#c00' : 'inherit',
      }}>
        {label}
      </td>
      <td style={{
        padding: '5px 12px',
        textAlign: 'right',
        fontWeight: bold ? 800 : 400,
        color: red ? '#c00' : 'inherit',
      }}>
        {Number(val).toFixed(2)}
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════════════════════════

function renderPayments(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (data.payments.length === 0) return null;
  if (isThermal) return renderThermalPayments(tpl, data);
  return renderPagePayments(tpl, data);
}

function renderThermalPayments(tpl: PrintTemplate, data: UniversalDocumentData) {
  return (
    <div style={{ fontSize: tpl.payment_font_size, marginBottom: 4 }}>
      <Separator style="dashed" />
      <div style={{ fontWeight: 700, marginBottom: 2 }}>وسائل الدفع:</div>
      {data.payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>{p.mode}</span>
          <span dir="ltr">{Number(p.amount).toFixed(2)}</span>
        </div>
      ))}
      <Separator style="dashed" />
    </div>
  );
}

function renderPagePayments(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  if (isA4) {
    return (
      <div style={{ fontSize: tpl.payment_font_size, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>تفاصيل الدفع</div>
        <table style={{ width: 320, borderCollapse: 'collapse', direction: 'ltr' }}>
          <tbody>
            {data.payments.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 12px', textAlign: 'right' }}>{p.mode}</td>
                <td style={{ padding: '4px 12px', textAlign: 'right' }}>{Number(p.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // A5
  return (
    <div style={{ fontSize: tpl.payment_font_size, marginBottom: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>وسائل الدفع:</div>
      {data.payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
          <span>{p.mode}</span>
          <span>{Number(p.amount).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// FOOTER
// ════════════════════════════════════════════════════════════════════════════════

function renderFooter(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalFooter(tpl, data);
  if (tpl.paper_size === 'A4') return renderA4Footer(tpl, data);
  return renderA5Footer(tpl, data);
}

function renderThermalFooter(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_barcode || tpl.show_qr ||
    tpl.show_cashier_signature || tpl.show_client_signature || tpl.show_stamp;

  if (!hasContent) return null;

  return (
    <div style={{ textAlign: 'center', fontSize: tpl.base_font_size - 0.5 }}>
      <Separator style={tpl.footer_separator} />

      {tpl.footer_line1 && <div style={{ marginBottom: 2 }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ marginBottom: 2 }}>{tpl.footer_line2}</div>}
      {tpl.footer_line3 && <div style={{ marginBottom: 2 }}>{tpl.footer_line3}</div>}

      {tpl.show_returns_policy && tpl.returns_policy_text && (
        <div style={{ fontSize: tpl.base_font_size - 1, color: '#666', marginBottom: 3 }}>
          {tpl.returns_policy_text}
        </div>
      )}

      {tpl.show_thank_you && (
        <div style={{
          fontSize: tpl.thank_you_size,
          fontWeight: 700,
          color: tpl.thank_you_color,
          fontFamily: "'Tajawal', sans-serif",
          margin: '4px 0',
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 2, color: '#999', marginTop: 3 }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {tpl.show_barcode && (
        <div style={{ margin: '8px 0 4px' }}>
          <div style={{ display: 'inline-flex', gap: 1, alignItems: 'flex-end' }}>
            {Array.from({ length: 48 }, (_, i) => (
              <div key={i} style={{
                width: i % 3 === 0 ? 2 : 1,
                height: i % 5 === 0 ? 28 : 22,
                background: '#111',
              }} />
            ))}
          </div>
          <div style={{ fontSize: tpl.base_font_size - 1, letterSpacing: 2, marginTop: 2 }}>
            {barcodeText(tpl, data)}
          </div>
        </div>
      )}

      {tpl.show_qr && (
        <div style={{ margin: '4px auto', width: 48, height: 48 }}>
          <svg viewBox="0 0 10 10" width={48} height={48}>
            <rect x="0" y="0" width="3" height="3" fill="#111" />
            <rect x="1" y="1" width="1" height="1" fill="#fff" />
            <rect x="7" y="0" width="3" height="3" fill="#111" />
            <rect x="8" y="1" width="1" height="1" fill="#fff" />
            <rect x="0" y="7" width="3" height="3" fill="#111" />
            <rect x="1" y="8" width="1" height="1" fill="#fff" />
            <rect x="4" y="0" width="1" height="1" fill="#111" />
            <rect x="4" y="2" width="2" height="1" fill="#111" />
            <rect x="3" y="4" width="4" height="1" fill="#111" />
            <rect x="5" y="6" width="2" height="3" fill="#111" />
            <rect x="3" y="7" width="1" height="1" fill="#111" />
          </svg>
          <div style={{ fontSize: 7, color: '#666', marginTop: 1 }}>
            {qrDataText(tpl, data)}
          </div>
        </div>
      )}

      {(tpl.show_cashier_signature || tpl.show_client_signature) && (
        <div style={{
          display: 'flex', justifyContent: 'space-around',
          marginTop: 14, fontSize: tpl.base_font_size - 1,
        }}>
          {tpl.show_cashier_signature && (
            <div>
              <div style={{ width: 70, borderTop: '1px solid #111', marginBottom: 3 }} />
              <span>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.show_client_signature && (
            <div>
              <div style={{ width: 70, borderTop: '1px solid #111', marginBottom: 3 }} />
              <span>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}

      {tpl.show_stamp && (
        <div style={{
          width: 44, height: 44, margin: '8px auto',
          border: '2px solid #111', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 900, transform: 'rotate(-12deg)',
        }}>
          ختم
        </div>
      )}
    </div>
  );
}

function renderA4Footer(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_bank_details;

  if (!hasContent) return null;

  return (
    <div style={{
      fontSize: tpl.base_font_size - 0.5,
      borderTop: tpl.footer_separator === 'none' ? 'none' : '2px solid #111',
      paddingTop: 16,
      marginTop: 12,
    }}>
      {tpl.show_bank_details && tpl.bank_details_text && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>البيانات البنكية</div>
          <div style={{ fontSize: tpl.base_font_size - 1, color: '#555', whiteSpace: 'pre-line' }}>
            {tpl.bank_details_text}
          </div>
        </div>
      )}

      {tpl.footer_line1 && <div style={{ margin: '4px 0' }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ margin: '4px 0' }}>{tpl.footer_line2}</div>}
      {tpl.footer_line3 && <div style={{ margin: '4px 0' }}>{tpl.footer_line3}</div>}

      {tpl.show_returns_policy && tpl.returns_policy_text && (
        <div style={{ fontSize: tpl.base_font_size - 1, color: '#555', margin: '6px 0' }}>
          {tpl.returns_policy_text}
        </div>
      )}

      {tpl.show_thank_you && (
        <div style={{
          fontWeight: 700, margin: '8px 0',
          fontSize: tpl.thank_you_size,
          textAlign: 'center',
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 1.5, color: '#888', margin: '6px 0', textAlign: 'center' }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {(tpl.show_cashier_signature || tpl.show_client_signature) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: tpl.base_font_size }}>
          {tpl.show_cashier_signature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 150, height: 1, borderTop: '1px solid #111', marginBottom: 4 }} />
              <span>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.show_client_signature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 150, height: 1, borderTop: '1px solid #111', marginBottom: 4 }} />
              <span>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}

      {tpl.show_stamp && (
        <div style={{
          width: 60, height: 60, margin: '16px auto',
          border: '2px solid #111', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900,
          transform: 'rotate(-15deg)',
        }}>
          ختم
        </div>
      )}
    </div>
  );
}

function renderA5Footer(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.footer_legal_text ||
    tpl.show_cashier_signature || tpl.show_client_signature;

  if (!hasContent) return null;

  return (
    <div style={{
      textAlign: 'center',
      fontSize: tpl.base_font_size - 0.5,
      borderTop: tpl.footer_separator === 'none' ? 'none' : '1.5px solid #111',
      paddingTop: 10,
    }}>
      {tpl.footer_line1 && <div style={{ marginBottom: 1 }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ marginBottom: 1 }}>{tpl.footer_line2}</div>}

      {tpl.show_thank_you && (
        <div style={{
          fontWeight: 700, fontSize: tpl.thank_you_size,
          color: tpl.thank_you_color, margin: '4px 0',
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 1.5, color: '#888' }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {(tpl.show_cashier_signature || tpl.show_client_signature) && (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16 }}>
          {tpl.show_cashier_signature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, borderTop: '1px solid #111', marginBottom: 2 }} />
              <span style={{ fontSize: tpl.base_font_size - 1 }}>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.show_client_signature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, borderTop: '1px solid #111', marginBottom: 2 }} />
              <span style={{ fontSize: tpl.base_font_size - 1 }}>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// UTILITY — Arabic number to words (simplified)
// ════════════════════════════════════════════════════════════════════════════════

function numberToArabicWords(n: number): string {
  if (n === 0) return 'صفر';
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens  = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاث مئة', 'أربع مئة', 'خمس مئة', 'ست مئة', 'سبع مئة', 'ثمان مئة', 'تسع مئة'];

  const intPart = Math.floor(n);
  if (intPart === 0) return 'صفر';

  let result = '';

  const thousands = Math.floor(intPart / 1000);
  const remainder = intPart % 1000;

  if (thousands > 0) {
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else result += units[thousands] + ' آلاف';
  }

  if (remainder > 0) {
    if (result) result += ' و';
    const h = Math.floor(remainder / 100);
    const t = remainder % 100;

    if (h > 0) {
      result += hundreds[h];
    }

    if (t > 0) {
      if (h > 0) result += ' و';
      if (t < 10) {
        result += units[t];
      } else if (t < 20) {
        result += teens[t - 10];
      } else {
        const u = t % 10;
        const tIdx = Math.floor(t / 10);
        if (u > 0) result += units[u] + ' و';
        result += tens[tIdx];
      }
    }
  }

  return result;
}
