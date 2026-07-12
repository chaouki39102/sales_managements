import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { align, formatDate, DocRow, Separator, renderLayoutRows, fontFamily } from './shared';
import { printFieldResolver } from '../../services';

function r(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function customerInfoStyle(tpl: PrintTemplate) {
  return {
    fontSize: tpl.customer_info_size,
    fontFamily: fontFamily(tpl.customer_info_font_family),
    fontWeight: tpl.customer_info_bold ? 700 : 400,
    fontStyle: tpl.customer_info_italic ? 'italic' : 'normal' as const,
    textAlign: align(tpl.customer_info_align) as React.CSSProperties['textAlign'],
  };
}

function labelOf(key: string, tpl: PrintTemplate): string {
  return ((tpl as any)[key] || '') as string;
}

function renderThermalDocInfo(tpl: PrintTemplate, data: UniversalDocumentData) {
  const cs = customerInfoStyle(tpl);
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
          <div style={cs}>
            <DocRow label={(labelOf('label_client', tpl) || 'العميل') + ':'} value={r('customer.name', data, tpl) as string} />
            {tpl.show_client_nif     && r('customer.nif', data, tpl)      && <DocRow label={(labelOf('label_client_nif', tpl) || 'NIF العميل') + ':'} value={r('customer.nif', data, tpl) as string} />}
            {tpl.show_customer_commercial_name && r('customer.commercialName', data, tpl) && <DocRow label={(labelOf('label_customer_commercial_name', tpl) || 'الاسم التجاري') + ':'} value={r('customer.commercialName', data, tpl) as string} />}
            {tpl.show_customer_rc    && r('customer.rc', data, tpl)       && <DocRow label={(labelOf('label_customer_rc', tpl) || 'RC') + ':'} value={r('customer.rc', data, tpl) as string} />}
            {tpl.show_customer_nis   && r('customer.nis', data, tpl)      && <DocRow label={(labelOf('label_customer_nis', tpl) || 'NIS') + ':'} value={r('customer.nis', data, tpl) as string} />}
            {tpl.show_customer_ai    && r('customer.ai', data, tpl)       && <DocRow label={(labelOf('label_customer_ai', tpl) || 'المادة الجبائية') + ':'} value={r('customer.ai', data, tpl) as string} />}
            {tpl.show_client_phone   && r('customer.phone', data, tpl)    && <DocRow label={(labelOf('label_client_phone', tpl) || 'هاتف العميل') + ':'} value={r('customer.phone', data, tpl) as string} />}
            {tpl.show_customer_mobile && r('customer.mobile', data, tpl)  && <DocRow label={(labelOf('label_customer_mobile', tpl) || 'المحمول') + ':'} value={r('customer.mobile', data, tpl) as string} />}
            {tpl.show_customer_fax   && r('customer.fax', data, tpl)      && <DocRow label={(labelOf('label_customer_fax', tpl) || 'الفاكس') + ':'} value={r('customer.fax', data, tpl) as string} />}
            {tpl.show_customer_email && r('customer.email', data, tpl)    && <DocRow label={(labelOf('label_customer_email', tpl) || 'البريد الإلكتروني') + ':'} value={r('customer.email', data, tpl) as string} />}
            {tpl.show_customer_activity && r('customer.activity', data, tpl) && <DocRow label={(labelOf('label_customer_activity', tpl) || 'النشاط') + ':'} value={r('customer.activity', data, tpl) as string} />}
            {tpl.show_client_address && r('customer.address', data, tpl)  && <DocRow label={(labelOf('label_client_address', tpl) || 'العنوان') + ':'} value={r('customer.address', data, tpl) as string} />}
            {tpl.show_delivery_address && r('customer.deliveryAddress', data, tpl) && <DocRow label={(labelOf('label_delivery_address', tpl) || 'عنوان التسليم') + ':'} value={r('customer.deliveryAddress', data, tpl) as string} />}
            {tpl.show_customer_bank_name && r('customer.bankName', data, tpl) && <DocRow label={(labelOf('label_customer_bank_name', tpl) || 'اسم البنك') + ':'} value={r('customer.bankName', data, tpl) as string} />}
            {tpl.show_customer_rib  && r('customer.rib', data, tpl)       && <DocRow label={(labelOf('label_customer_rib', tpl) || 'RIB') + ':'} value={r('customer.rib', data, tpl) as string} />}
          </div>
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

  const hasCustomerRows = tpl.customer_info_rows && tpl.customer_info_rows.length > 0;
  const cs = customerInfoStyle(tpl);

  if (isA4) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 30, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
            <div style={{ ...cs, fontWeight: 700, fontSize: tpl.customer_info_size + 1, marginBottom: 6, color: '#111' }}>بيانات العميل</div>
            <div style={{ ...cs, color: '#333' }}>
              {hasCustomerRows
                ? renderLayoutRows(tpl.customer_info_rows, data, tpl)
                : <>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{clientName}</div>
                    {tpl.show_client_nif     && r('customer.nif', data, tpl)     && <div>{labelOf('label_client_nif', tpl) || 'NIF'}: {r('customer.nif', data, tpl) as string}</div>}
                    {tpl.show_customer_commercial_name && r('customer.commercialName', data, tpl) && <div>{labelOf('label_customer_commercial_name', tpl) || 'الاسم التجاري'}: {r('customer.commercialName', data, tpl) as string}</div>}
                    {tpl.show_customer_rc    && r('customer.rc', data, tpl)      && <div>{labelOf('label_customer_rc', tpl) || 'RC'}: {r('customer.rc', data, tpl) as string}</div>}
                    {tpl.show_customer_nis   && r('customer.nis', data, tpl)     && <div>{labelOf('label_customer_nis', tpl) || 'NIS'}: {r('customer.nis', data, tpl) as string}</div>}
                    {tpl.show_customer_ai    && r('customer.ai', data, tpl)      && <div>{labelOf('label_customer_ai', tpl) || 'المادة الجبائية'}: {r('customer.ai', data, tpl) as string}</div>}
                    {tpl.show_client_phone   && r('customer.phone', data, tpl)   && <div>{labelOf('label_client_phone', tpl) || '☎'}: {r('customer.phone', data, tpl) as string}</div>}
                    {tpl.show_customer_mobile && r('customer.mobile', data, tpl) && <div>{labelOf('label_customer_mobile', tpl) || 'المحمول'}: {r('customer.mobile', data, tpl) as string}</div>}
                    {tpl.show_customer_fax   && r('customer.fax', data, tpl)     && <div>{labelOf('label_customer_fax', tpl) || 'الفاكس'}: {r('customer.fax', data, tpl) as string}</div>}
                    {tpl.show_customer_email && r('customer.email', data, tpl)   && <div>{labelOf('label_customer_email', tpl) || 'البريد'}: {r('customer.email', data, tpl) as string}</div>}
                    {tpl.show_customer_activity && r('customer.activity', data, tpl) && <div>{labelOf('label_customer_activity', tpl) || 'النشاط'}: {r('customer.activity', data, tpl) as string}</div>}
                    {tpl.show_client_address && r('customer.address', data, tpl) && <div>{labelOf('label_client_address', tpl) || 'العنوان'}: {r('customer.address', data, tpl) as string}</div>}
                    {tpl.show_customer_bank_name && r('customer.bankName', data, tpl) && <div>{labelOf('label_customer_bank_name', tpl) || 'البنك'}: {r('customer.bankName', data, tpl) as string}</div>}
                    {tpl.show_customer_rib  && r('customer.rib', data, tpl)      && <div>{labelOf('label_customer_rib', tpl) || 'RIB'}: {r('customer.rib', data, tpl) as string}</div>}
                  </>
              }
            </div>
          </div>
          {tpl.show_delivery_address && r('customer.deliveryAddress', data, tpl) && (
            <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
              <div style={{ ...cs, fontWeight: 700, fontSize: tpl.customer_info_size + 1, marginBottom: 6, color: '#111' }}>{labelOf('label_delivery_address', tpl) || 'عنوان التسليم'}</div>
              <div style={{ ...cs, color: '#333' }}>
                {r('customer.deliveryAddress', data, tpl) as string}
              </div>
            </div>
          )}
        </div>
        {tpl.doc_separator && tpl.doc_separator !== 'none' && <Separator style={tpl.doc_separator} />}
      </div>
    );
  }

  return (
    <div style={{
      ...cs, marginBottom: 10,
      padding: 8, background: '#f9fafb', borderRadius: 4,
    }}>
      {hasCustomerRows
        ? renderLayoutRows(tpl.customer_info_rows, data, tpl)
        : <>
            <span style={{ fontWeight: 700 }}>{labelOf('label_client', tpl) || 'العميل'}: </span>{clientName}
            {tpl.show_client_nif     && r('customer.nif', data, tpl)     && <span style={{ marginRight: 12 }}>{labelOf('label_client_nif', tpl) || 'NIF'}: {r('customer.nif', data, tpl) as string}</span>}
            {tpl.show_customer_commercial_name && r('customer.commercialName', data, tpl) && <span style={{ marginRight: 12 }}>{labelOf('label_customer_commercial_name', tpl) || 'الاسم التجاري'}: {r('customer.commercialName', data, tpl) as string}</span>}
            {tpl.show_customer_rc    && r('customer.rc', data, tpl)      && <span style={{ marginRight: 12 }}>{labelOf('label_customer_rc', tpl) || 'RC'}: {r('customer.rc', data, tpl) as string}</span>}
            {tpl.show_customer_nis   && r('customer.nis', data, tpl)     && <span style={{ marginRight: 12 }}>{labelOf('label_customer_nis', tpl) || 'NIS'}: {r('customer.nis', data, tpl) as string}</span>}
            {tpl.show_customer_ai    && r('customer.ai', data, tpl)      && <span style={{ marginRight: 12 }}>{labelOf('label_customer_ai', tpl) || 'المادة الجبائية'}: {r('customer.ai', data, tpl) as string}</span>}
            {tpl.show_client_phone   && r('customer.phone', data, tpl)   && <span style={{ marginRight: 12 }}>{labelOf('label_client_phone', tpl) || '☎'}: {r('customer.phone', data, tpl) as string}</span>}
            {tpl.show_customer_mobile && r('customer.mobile', data, tpl) && <span style={{ marginRight: 12 }}>{labelOf('label_customer_mobile', tpl) || 'المحمول'}: {r('customer.mobile', data, tpl) as string}</span>}
            {tpl.show_customer_fax   && r('customer.fax', data, tpl)     && <span style={{ marginRight: 12 }}>{labelOf('label_customer_fax', tpl) || 'الفاكس'}: {r('customer.fax', data, tpl) as string}</span>}
            {tpl.show_customer_email && r('customer.email', data, tpl)   && <span style={{ marginRight: 12 }}>{labelOf('label_customer_email', tpl) || 'البريد'}: {r('customer.email', data, tpl) as string}</span>}
            {tpl.show_customer_activity && r('customer.activity', data, tpl) && <span style={{ marginRight: 12 }}>{labelOf('label_customer_activity', tpl) || 'النشاط'}: {r('customer.activity', data, tpl) as string}</span>}
            {tpl.show_client_address && r('customer.address', data, tpl) && <div style={{ marginTop: 2 }}>{labelOf('label_client_address', tpl) || 'العنوان'}: {r('customer.address', data, tpl) as string}</div>}
            {tpl.show_customer_bank_name && r('customer.bankName', data, tpl) && <span style={{ marginRight: 12 }}>{labelOf('label_customer_bank_name', tpl) || 'البنك'}: {r('customer.bankName', data, tpl) as string}</span>}
            {tpl.show_customer_rib  && r('customer.rib', data, tpl)      && <span style={{ marginRight: 12 }}>{labelOf('label_customer_rib', tpl) || 'RIB'}: {r('customer.rib', data, tpl) as string}</span>}
          </>
      }
      {tpl.doc_separator && tpl.doc_separator !== 'none' && <Separator style={tpl.doc_separator} />}
    </div>
  );
}

export function renderDocInfo(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalDocInfo(tpl, data);
  return renderPageDocInfo(tpl, data);
}
