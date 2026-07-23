import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { Separator, align, fontFamily } from './shared';
import { printFieldResolver } from '../../services';

function renderThermalPayments(tpl: PrintTemplate, data: UniversalDocumentData) {
  return (
    <div style={{ fontSize: tpl.payment_font_size, fontFamily: fontFamily(tpl.payments_font_family), textAlign: align(tpl.payments_align), marginBottom: 4 }}>
      <Separator style="dashed" />
      <div style={{ fontWeight: 700, marginBottom: 2 }}>وسائل الدفع:</div>
      {data.payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>{printFieldResolver.resolveItemField('payment.method', p as any, i)}</span>
          <span dir="ltr">{Number(printFieldResolver.resolveItemField('payment.amount', p as any, i)).toFixed(2)}</span>
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
      <div style={{ fontSize: tpl.payment_font_size, marginBottom: 16, textAlign: align(tpl.payments_align) }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>تفاصيل الدفع</div>
        <table style={{ width: 320, borderCollapse: 'collapse', direction: 'ltr' }}>
          <tbody>
            {data.payments.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 12px', textAlign: 'right' }}>{printFieldResolver.resolveItemField('payment.method', p as any, i)}</td>
                <td style={{ padding: '4px 12px', textAlign: 'right' }}>{Number(printFieldResolver.resolveItemField('payment.amount', p as any, i)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ fontSize: tpl.payment_font_size, marginBottom: 10, textAlign: align(tpl.payments_align) }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>وسائل الدفع:</div>
      {data.payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
          <span>{printFieldResolver.resolveItemField('payment.method', p as any, i)}</span>
          <span>{Number(printFieldResolver.resolveItemField('payment.amount', p as any, i)).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export function renderPayments(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (!tpl.show_payment_details) return null;
  if (data.payments.length === 0) return null;
  if (isThermal) return renderThermalPayments(tpl, data);
  return renderPagePayments(tpl, data);
}
