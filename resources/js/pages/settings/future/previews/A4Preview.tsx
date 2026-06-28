import React from 'react';
import type { PrintTemplate, ColumnKey, CompanyData, ReceiptLiveData, AlignOption, BorderStyle } from '../../types';



interface A4Data {
  number: string;
  date: string;
  time: string;
  dueDate: string;
  cashier: string;
  client: string;
  clientNif: string;
  clientPhone: string;
  clientAddress: string;
  deliveryAddress: string;
  session: string;
  paymentTerm: string;
  items: Array<{ ref: string; name: string; qty: number; price: number; total: number; tva: number; discount: number; unit: string }>;
  tvaByRate: Array<{ rate: number; base: number; amount: number }>;
  totalHt: number;
  totalTva: number;
  totalDiscount: number;
  fiscalStamp: number;
  totalTtc: number;
  paid: number;
  change: number;
  remaining: number;
  prevBalance: number;
  newBalance: number;
  payments: Array<{ mode: string; amount: number }>;
}

function buildTvaByRate(items: ReceiptLiveData['items'] = []): Array<{ rate: number; base: number; amount: number }> {
  const map = new Map<number, { base: number; amount: number }>();
  for (const item of items) {
    const rate = Math.round(item.tva_rate ?? 0);
    const base = item.total_ht ?? 0;
    const tva  = base * (item.tva_rate ?? 0) / 100;
    const prev = map.get(rate) ?? { base: 0, amount: 0 };
    map.set(rate, { base: prev.base + base, amount: prev.amount + tva });
  }
  return Array.from(map.entries()).map(([rate, v]) => ({ rate, ...v }));
}

function buildData(tpl: PrintTemplate, liveData?: ReceiptLiveData | null): A4Data {
  if (!liveData) return {
    number: '', date: '', time: '', dueDate: '', cashier: '', client: '',
    clientNif: '', clientPhone: '', clientAddress: '', deliveryAddress: '',
    session: '', paymentTerm: '', items: [], tvaByRate: [],
    totalHt: 0, totalTva: 0, totalDiscount: 0, fiscalStamp: 0,
    totalTtc: 0, paid: 0, change: 0, remaining: 0,
    prevBalance: 0, newBalance: 0, payments: [],
  };
  return {
    number:  liveData.docNumber  ?? '',
    date:    liveData.docDate    ?? new Date().toLocaleDateString('ar-DZ'),
    time:    new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    dueDate: liveData.dueDate ?? '',
    cashier: liveData.cashierName ?? '',
    client:  liveData.client?.name ?? '',
    clientNif: liveData.client?.nif ?? '',
    clientPhone: liveData.client?.phone ?? '',
    clientAddress: liveData.client?.address ?? '',
    deliveryAddress: '',
    session: '',
    paymentTerm: '',
    items: (liveData.items ?? []).map((item, i) => ({
      ref:      item.ref ?? 'P' + (i + 1),
      name:     item.name,
      qty:      item.qty,
      price:    item.unit_price_ht,
      total:    item.total_ht,
      tva:      Math.round(item.tva_rate ?? 0),
      discount: item.discount_percentage ?? 0,
      unit:     item.unit ?? '',
    })),
    tvaByRate: buildTvaByRate(liveData.items),
    totalHt:       liveData.totals?.total_ht       ?? 0,
    totalTva:      liveData.totals?.total_tva      ?? 0,
    totalDiscount: liveData.totals?.total_discount ?? 0,
    fiscalStamp:   liveData.totals?.fiscal_stamp   ?? 0,
    totalTtc:      liveData.totals?.total_ttc      ?? 0,
    paid:          liveData.totals?.paid           ?? 0,
    change:        liveData.totals?.change         ?? 0,
    remaining:     liveData.totals?.remaining      ?? 0,
    prevBalance:   liveData.prevBalance            ?? 0,
    newBalance:    liveData.newBalance             ?? 0,
    payments:      liveData.payments               ?? [],
  };
}

function getCompany(tpl: PrintTemplate, api?: CompanyData | null): CompanyData {
  return {
    name:    tpl.company_name_text || api?.name    || '',
    address: tpl.override_address  || api?.address  || '',
    phone:   tpl.override_phone    || api?.phone   || '',
    nif:     tpl.override_nif      || api?.nif     || '',
    rc:      tpl.override_rc       || api?.rc      || '',
    nis:     tpl.override_nis      || api?.nis     || '',
    ice:     tpl.override_ice      || api?.ice     || '',
    article: tpl.override_article  || api?.article || '',
    logoUrl: api?.logoUrl,
  };
}

function getVisibleCols(tpl: PrintTemplate): ColumnKey[] {
  return tpl.col_order.filter(k => tpl.col_show[k] !== false);
}

function colLabel(c: ColumnKey): string {
  const labels: Record<ColumnKey, string> = {
    rowNumber: '#', barcode: 'باركود', ref: 'مرجع',
    name: 'البيان', unit: 'وحدة', quantity: 'الكمية',
    price: 'السعر', discount: 'خصم', tva: 'TVA', total: 'المجموع',
  };
  return labels[c];
}

function colValue(c: ColumnKey, item: A4Data['items'][0]) {
  switch (c) {
    case 'name': return item.name;
    case 'quantity': return String(item.qty);
    case 'price': return item.price.toFixed(2);
    case 'total': return item.total.toFixed(2);
    case 'ref': return item.ref;
    case 'unit': return item.unit;
    case 'discount': return item.discount > 0 ? item.discount + '%' : '';
    case 'tva': return 'TVA ' + item.tva + '%';
    default: return '';
  }
}

function align(a: AlignOption): React.CSSProperties['textAlign'] {
  return a === 'right' ? 'right' : a === 'left' ? 'left' : 'center';
}

const borderMap: Record<BorderStyle, string> = {
  solid: 'solid', dashed: 'dashed', double: 'double', none: 'none',
};

interface A4PreviewProps {
  tpl:      PrintTemplate;
  company?: CompanyData | null;
  liveData?: ReceiptLiveData | null;
}

export default function A4Preview({ tpl, company, liveData }: A4PreviewProps) {
  const co   = getCompany(tpl, company);
  const data = buildData(tpl, liveData);

  const paperWidth = 794;
  const fs = tpl.base_font_size;

  return (
    <div
      style={{
        width: paperWidth,
        minHeight: 1123,
        fontFamily: "'Tajawal', sans-serif",
        fontSize: fs,
        padding: '40px 50px',
        lineHeight: tpl.line_spacing,
        background: '#fff',
        color: '#111',
        direction: 'rtl',
        boxSizing: 'border-box',
      }}
    >
      <A4Header tpl={tpl} co={co} data={data} />
      <AddressBlock tpl={tpl} data={data} />
      <A4ItemsTable tpl={tpl} items={data.items} />
      <A4Totals tpl={tpl} data={data} />
      {tpl.show_payment_details && <A4Payments tpl={tpl} payments={data.payments} />}
      <A4Footer tpl={tpl} data={data} />
    </div>
  );
}

function A4Header({ tpl, co, data }: { tpl: PrintTemplate; co: CompanyData; data: A4Data }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, paddingBottom: 20, borderBottom: '2px solid #111' }}>
      <div style={{ flex: 1 }}>
        {tpl.show_logo && (
          <div style={{ marginBottom: 8 }}>
            {co.logoUrl ? (
              <img src={co.logoUrl} alt="logo"
                style={{ width: tpl.logo_size * 1.5, height: tpl.logo_size * 1.5, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <div style={{
                width: tpl.logo_size * 1.5, height: tpl.logo_size * 1.5,
                background: '#111', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: tpl.logo_size * 0.4, fontWeight: 900,
              }}>
                {co.name.charAt(0)}
              </div>
            )}
          </div>
        )}
        {tpl.show_company_name && (
          <div style={{
            fontSize: tpl.company_name_size + 4,
            fontWeight: tpl.company_name_bold ? 900 : 400,
            fontFamily: "'Tajawal', sans-serif",
            marginBottom: 4,
          }}>
            {co.name}
          </div>
        )}
        <div style={{ fontSize: tpl.company_info_size, color: '#555' }}>
          {tpl.show_address && <div>{co.address}</div>}
          {tpl.show_phone && <div>☎ {co.phone}</div>}
          {tpl.show_tax_id && <div>NIF: {co.nif}</div>}
          {tpl.show_rc && <div>RC: {co.rc}</div>}
          {tpl.show_nis && <div>NIS: {co.nis}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'left', minWidth: 250 }}>
        <div style={{
          fontSize: tpl.title_size + 4,
          fontWeight: tpl.title_bold ? 900 : 400,
          color: '#111',
          marginBottom: 12,
          textAlign: 'left',
        }}>
          {tpl.title_text}
        </div>
        <table style={{ fontSize: tpl.company_info_size, borderCollapse: 'collapse' }}>
          <tbody>
            {tpl.show_doc_number && <A4InfoRow label="رقم الفاتورة" value={data.number} />}
            {tpl.show_date && <A4InfoRow label="التاريخ" value={data.date} />}
            {tpl.show_time && <A4InfoRow label="الوقت" value={data.time} />}
            {tpl.show_due_date && <A4InfoRow label="تاريخ الاستحقاق" value={data.dueDate} />}
            {tpl.show_cashier && <A4InfoRow label="الكاشير" value={data.cashier} />}
            {tpl.show_payment_term && <A4InfoRow label="شروط الدفع" value={data.paymentTerm} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function A4InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ color: '#555', padding: '2px 0', whiteSpace: 'nowrap', fontWeight: 600 }}>{label}:</td>
      <td style={{ padding: '2px 0', paddingRight: 12 }}>{value}</td>
    </tr>
  );
}

function AddressBlock({ tpl, data }: { tpl: PrintTemplate; data: A4Data }) {
  return (
    <div style={{ display: 'flex', gap: 30, marginBottom: 24 }}>
      {tpl.show_client && (
        <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.company_info_size + 1, marginBottom: 6, color: '#111' }}>بيانات العميل</div>
          <div style={{ fontSize: tpl.company_info_size, color: '#333' }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{data.client}</div>
            {tpl.show_client_nif && data.clientNif && <div>NIF: {data.clientNif}</div>}
            {tpl.show_client_phone && data.clientPhone && <div>☎ {data.clientPhone}</div>}
            {tpl.show_client_address && data.clientAddress && <div>{data.clientAddress}</div>}
          </div>
        </div>
      )}
      {tpl.show_delivery_address && data.deliveryAddress && (
        <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.company_info_size + 1, marginBottom: 6, color: '#111' }}>عنوان التسليم</div>
          <div style={{ fontSize: tpl.company_info_size, color: '#333' }}>
            {data.deliveryAddress}
          </div>
        </div>
      )}
    </div>
  );
}

function A4ItemsTable({ tpl, items }: { tpl: PrintTemplate; items: A4Data['items'] }) {
  const cols = getVisibleCols(tpl);
  if (cols.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tpl.items_font_size }}>
        <thead>
          <tr style={{
            background: tpl.table_header_bg ? '#111' : '#f5f5f5',
            borderBottom: '2px solid #111',
          }}>
            {cols.map(c => (
              <th key={c} style={{
                padding: '8px 10px',
                textAlign: c === 'name' || c === 'ref' ? 'right' as const : 'left' as const,
                fontWeight: tpl.table_header_bold ? 700 : 600,
                color: tpl.table_header_bg ? '#fff' : '#111',
                fontSize: tpl.items_font_size,
              }}>
                {tpl.col_headers[c] ?? colLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{
              borderBottom: tpl.table_border_style !== 'none' ? '1px ' + tpl.table_border_style + ' #ddd' : 'none',
              background: tpl.alternating_rows && i % 2 === 1 ? '#fafafa' : 'transparent',
            }}>
              {cols.map(c => (
                <td key={c} style={{
                  padding: '10px',
                  textAlign: c === 'name' || c === 'ref' ? 'right' as const : 'left' as const,
                  fontWeight: c === 'total' ? 700 : 400,
                  fontSize: tpl.items_font_size,
                }}>
                  {colValue(c, item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function A4Totals({ tpl, data }: { tpl: PrintTemplate; data: A4Data }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end',
      fontSize: tpl.totals_font_size,
      fontWeight: tpl.totals_bold ? 700 : 400,
      marginBottom: 24,
      direction: 'ltr',
    }}>
      <table style={{ width: 320, borderCollapse: 'collapse' }}>
        <tbody>
          {tpl.show_total_ht && <A4TotalRow label="المجموع HT" val={data.totalHt} />}
          {tpl.show_discount_total && data.totalDiscount > 0 && <A4TotalRow label="إجمالي الخصومات" val={-data.totalDiscount} red />}
          {tpl.show_total_tva && <A4TotalRow label="TVA" val={data.totalTva} />}
          {tpl.show_tva_breakdown && data.tvaByRate.map(r => (
            <A4TotalRow key={r.rate} label={'  TVA ' + r.rate + '%'} val={r.amount} />
          ))}
          {tpl.show_fiscal_stamp && data.fiscalStamp > 0 && <A4TotalRow label="الطابع الجبائي" val={data.fiscalStamp} />}
          {tpl.show_total_ttc && (
            <tr>
              <td style={{
                padding: '10px 12px',
                borderTop: '3px double #111',
                fontWeight: tpl.total_ttc_bold ? 900 : 700,
                fontSize: tpl.total_ttc_font_size,
                textAlign: 'right',
              }}>
                المجموع TTC:
              </td>
              <td style={{
                padding: '10px 12px',
                borderTop: '3px double #111',
                fontWeight: tpl.total_ttc_bold ? 900 : 700,
                fontSize: tpl.total_ttc_font_size,
                textAlign: 'right',
              }}>
                {data.totalTtc.toFixed(2)}
              </td>
            </tr>
          )}
          {tpl.show_paid_amount && <A4TotalRow label="المدفوع" val={data.paid} bold />}
          {tpl.show_change && <A4TotalRow label="الباقي" val={data.change} />}
          {tpl.show_remaining && <A4TotalRow label="المبلغ المتبقي" val={data.remaining} />}
          {tpl.show_prev_balance && <A4TotalRow label="الرصيد السابق" val={data.prevBalance} />}
          {tpl.show_new_balance && <A4TotalRow label="الرصيد الجديد" val={data.newBalance} bold />}
        </tbody>
      </table>
    </div>
  );
}

function A4TotalRow({ label, val, red, bold }: { label: string; val: number; red?: boolean; bold?: boolean }) {
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
        {val.toFixed(2)}
      </td>
    </tr>
  );
}

function A4Payments({ tpl, payments }: { tpl: PrintTemplate; payments: A4Data['payments'] }) {
  if (payments.length === 0) return null;
  return (
    <div style={{ fontSize: tpl.payment_font_size, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>تفاصيل الدفع</div>
      <table style={{ width: 320, borderCollapse: 'collapse', direction: 'ltr' }}>
        <tbody>
          {payments.map((p, i) => (
            <tr key={i}>
              <td style={{ padding: '4px 12px', textAlign: 'right' }}>{p.mode}</td>
              <td style={{ padding: '4px 12px', textAlign: 'right' }}>{p.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function A4Footer({ tpl, data }: { tpl: PrintTemplate; data: A4Data }) {
  const hasContent = tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_bank_details;

  if (!hasContent) return null;

  return (
    <div style={{
      fontSize: tpl.base_font_size - 0.5,
      borderTop: '2px solid #111',
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
