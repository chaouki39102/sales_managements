import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLogo } from './LogoRenderer';
import { align, formatDate, Separator, InfoRow, type CompanyData } from './shared';

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

export function renderHeader(tpl: PrintTemplate, co: CompanyData, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalHeader(tpl, co);
  return renderPageHeader(tpl, co, data);
}
