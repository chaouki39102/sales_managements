import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLogo } from './LogoRenderer';
import { align, formatDate, Separator, InfoRow } from './shared';
import { printFieldResolver } from '../../services';

function r(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function renderThermalHeader(tpl: PrintTemplate, data: UniversalDocumentData) {
  return (
    <div style={{ textAlign: align(tpl.company_info_align), marginBottom: 5 }}>
      {tpl.show_logo && renderLogo(tpl, data)}
      {tpl.show_company_name && (
        <div style={{
          textAlign: align(tpl.company_name_align),
          fontSize: tpl.company_name_size,
          fontWeight: tpl.company_name_bold ? 900 : 400,
          color: tpl.company_name_color,
          marginBottom: 3,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          {r('company.name', data, tpl)}
        </div>
      )}
      <div style={{ fontSize: tpl.company_info_size, color: '#444' }}>
        {tpl.show_address && r('company.address', data, tpl) && <div>{r('company.address', data, tpl)}</div>}
        {tpl.show_phone   && r('company.phone', data, tpl)   && <div>☏ {r('company.phone', data, tpl)}</div>}
        {tpl.show_tax_id  && r('company.nif', data, tpl)     && <div>NIF: {r('company.nif', data, tpl)}</div>}
        {tpl.show_rc      && r('company.rc', data, tpl)      && <div>RC: {r('company.rc', data, tpl)}</div>}
        {tpl.show_nis     && r('company.nis', data, tpl)     && <div>NIS: {r('company.nis', data, tpl)}</div>}
        {tpl.show_ice     && r('company.ice', data, tpl)     && <div>ICE: {r('company.ice', data, tpl)}</div>}
        {tpl.show_article && r('company.article', data, tpl) && <div>{r('company.article', data, tpl)}</div>}
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

function renderPageHeader(tpl: PrintTemplate, data: UniversalDocumentData) {
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
        {tpl.show_logo && renderLogo(tpl, data)}
        {tpl.show_company_name && (
          <div style={{
            fontSize: tpl.company_name_size + (isA4 ? 4 : 2),
            fontWeight: tpl.company_name_bold ? 900 : 400,
            fontFamily: "'Tajawal', sans-serif",
            marginBottom: 4,
          }}>
            {r('company.name', data, tpl)}
          </div>
        )}
        <div style={{ fontSize: tpl.company_info_size, color: '#555' }}>
          {tpl.show_address && <div>{r('company.address', data, tpl)}</div>}
          {tpl.show_phone   && <div>☎ {r('company.phone', data, tpl)}</div>}
          {tpl.show_tax_id  && <div>NIF: {r('company.nif', data, tpl)}</div>}
          {tpl.show_rc      && <div>RC: {r('company.rc', data, tpl)}</div>}
          {tpl.show_nis     && <div>NIS: {r('company.nis', data, tpl)}</div>}
          {tpl.show_ice     && <div>ICE: {r('company.ice', data, tpl)}</div>}
          {tpl.show_article && <div>{r('company.article', data, tpl)}</div>}
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
            {tpl.show_doc_number && <InfoRow label={isA4 ? 'رقم الفاتورة' : 'رقم'} value={r('document.number', data, tpl) as string} />}
            {tpl.show_date && <InfoRow label="التاريخ" value={formatDate(r('document.date', data, tpl) as string) + (tpl.show_time && r('document.time', data, tpl) ? ' ' + r('document.time', data, tpl) : '')} />}
            {tpl.show_due_date && r('document.dueDate', data, tpl) && <InfoRow label="تاريخ الاستحقاق" value={r('document.dueDate', data, tpl) as string} />}
            {tpl.show_cashier && (r('customer.cashierName', data, tpl)) && (
              <InfoRow label="الكاشير" value={r('customer.cashierName', data, tpl) as string} />
            )}
            {tpl.show_session && r('session.code', data, tpl) && <InfoRow label="الجلسة" value={r('session.code', data, tpl) as string} />}
            {tpl.show_payment_term && r('document.dueDate', data, tpl) && <InfoRow label="شروط الدفع" value={r('document.dueDate', data, tpl) as string} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function renderHeader(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalHeader(tpl, data);
  return renderPageHeader(tpl, data);
}
