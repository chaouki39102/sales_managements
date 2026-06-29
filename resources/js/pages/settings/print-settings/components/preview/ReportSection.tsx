import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import ChartSection from '../ChartSection';

export function renderReport(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean, width: number) {
  const r = data.report!;

  return (
    <div style={{ marginBottom: isThermal ? 4 : 12 }}>
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

      {tpl.show_charts && tpl.show_report_payment_breakdown && (
        <ChartSection
          data={data}
          chartType={tpl.chart_type}
          title={tpl.chart_title || 'توزيع وسائل الدفع'}
          width={isThermal ? 288 : width - 80}
        />
      )}

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
