import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { TotalRow, borderStyle } from './shared';
import { numberToArabicWords } from '../../utils';

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

function renderThermalTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const t = data.totals;
  const fs = tpl.totals_font_size;

  return (
    <div style={{
      fontSize: fs,
      fontWeight: tpl.totals_bold ? 700 : 400,
      textAlign: tpl.totals_align === 'left' ? 'left' : tpl.totals_align === 'center' ? 'center' : 'right',
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

  const totalsJustify = tpl.totals_align === 'left' ? 'flex-start' : tpl.totals_align === 'center' ? 'center' : 'flex-end';

  return (
    <div style={{
      display: 'flex', justifyContent: totalsJustify,
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
                color: tpl.total_ttc_color,
              }}>
                المجموع TTC:
              </td>
              <td style={{
                padding: isA4 ? '10px 12px' : '6px 8px',
                borderTop: borderTop,
                fontWeight: tpl.total_ttc_bold ? 900 : 700,
                fontSize: tpl.total_ttc_font_size,
                textAlign: 'right',
                color: tpl.total_ttc_color,
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

export function renderTotals(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalTotals(tpl, data);
  return renderPageTotals(tpl, data);
}
