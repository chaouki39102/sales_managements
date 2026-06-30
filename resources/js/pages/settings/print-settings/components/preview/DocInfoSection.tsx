import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { align, formatDate, DocRow, Separator } from './shared';
import { printFieldResolver } from '../../services';

function r(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function renderThermalDocInfo(tpl: PrintTemplate, data: UniversalDocumentData) {
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
        {tpl.show_doc_number && <DocRow label="رقم:" value={r('document.number', data, tpl) as string} mono />}
        {tpl.show_date && <DocRow label="التاريخ:" value={`${formatDate(r('document.date', data, tpl) as string)}${tpl.show_time && r('document.time', data, tpl) ? ' ' + r('document.time', data, tpl) : ''}`} />}
        {tpl.show_due_date && r('document.dueDate', data, tpl) && <DocRow label="تاريخ الاستحقاق:" value={r('document.dueDate', data, tpl) as string} />}
        {tpl.show_cashier && r('customer.cashierName', data, tpl) && (
          <DocRow label="الكاشير:" value={r('customer.cashierName', data, tpl) as string} />
        )}
        {tpl.show_session && r('session.code', data, tpl) && (
          <DocRow label="الجلسة:" value={r('session.code', data, tpl) as string} />
        )}
        {tpl.show_client && r('customer.name', data, tpl) && (
          <>
            <DocRow label="العميل:" value={r('customer.name', data, tpl) as string} />
            {tpl.show_client_nif     && r('customer.nif', data, tpl)      && <DocRow label="NIF العميل:" value={r('customer.nif', data, tpl) as string} />}
            {tpl.show_client_phone   && r('customer.phone', data, tpl)    && <DocRow label="هاتف العميل:" value={r('customer.phone', data, tpl) as string} />}
            {tpl.show_client_address && r('customer.address', data, tpl)  && <DocRow label="العنوان:" value={r('customer.address', data, tpl) as string} />}
            {tpl.show_delivery_address && r('customer.deliveryAddress', data, tpl) && <DocRow label="عنوان التسليم:" value={r('customer.deliveryAddress', data, tpl) as string} />}
          </>
        )}
        {tpl.show_payment_term && r('document.dueDate', data, tpl) && (
          <DocRow label="شروط الدفع:" value={r('document.dueDate', data, tpl) as string} />
        )}
      </div>

      <Separator style={tpl.doc_separator} />
    </div>
  );
}

function renderPageDocInfo(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  const clientName = r('customer.name', data, tpl) as string;

  if (!tpl.show_client || !clientName) return null;

  if (isA4) {
    return (
      <div style={{ display: 'flex', gap: 30, marginBottom: 24 }}>
        <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.company_info_size + 1, marginBottom: 6, color: '#111' }}>بيانات العميل</div>
          <div style={{ fontSize: tpl.company_info_size, color: '#333' }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{clientName}</div>
            {tpl.show_client_nif     && r('customer.nif', data, tpl)     && <div>NIF: {r('customer.nif', data, tpl) as string}</div>}
            {tpl.show_client_phone   && r('customer.phone', data, tpl)   && <div>☎ {r('customer.phone', data, tpl) as string}</div>}
            {tpl.show_client_address && r('customer.address', data, tpl) && <div>{r('customer.address', data, tpl) as string}</div>}
          </div>
        </div>
        {tpl.show_delivery_address && r('customer.deliveryAddress', data, tpl) && (
          <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: tpl.company_info_size + 1, marginBottom: 6, color: '#111' }}>عنوان التسليم</div>
            <div style={{ fontSize: tpl.company_info_size, color: '#333' }}>
              {r('customer.deliveryAddress', data, tpl) as string}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      fontSize: tpl.company_info_size, marginBottom: 10,
      padding: 8, background: '#f9fafb', borderRadius: 4,
    }}>
      <span style={{ fontWeight: 700 }}>العميل: </span>{clientName}
      {tpl.show_client_nif   && r('customer.nif', data, tpl)   && <span style={{ marginRight: 12 }}>NIF: {r('customer.nif', data, tpl) as string}</span>}
      {tpl.show_client_phone && r('customer.phone', data, tpl) && <span style={{ marginRight: 12 }}>☎ {r('customer.phone', data, tpl) as string}</span>}
    </div>
  );
}

export function renderDocInfo(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalDocInfo(tpl, data);
  return renderPageDocInfo(tpl, data);
}
