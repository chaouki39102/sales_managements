import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { align, formatDate, DocRow, Separator } from './shared';

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

export function renderDocInfo(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalDocInfo(tpl, data);
  return renderPageDocInfo(tpl, data);
}
