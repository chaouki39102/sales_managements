import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { Separator } from './shared';

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

export function renderPayments(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (data.payments.length === 0) return null;
  if (isThermal) return renderThermalPayments(tpl, data);
  return renderPagePayments(tpl, data);
}
