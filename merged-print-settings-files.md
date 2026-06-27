

# =========================================
# 📘 pos
# =========================================

## FILE: resources/js/pages/settings/print-settings/A4Preview.tsx
```
﻿import React from 'react';
import type { PrintTemplate, ColumnKey, CompanyData, ReceiptLiveData, AlignOption, BorderStyle } from './types';



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
    const rate = Math.round((item.tva_rate ?? 0) * 100);
    const base = item.total_ht ?? 0;
    const tva  = base * (item.tva_rate ?? 0);
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
      tva:      Math.round((item.tva_rate ?? 0) * 100),
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
```

## FILE: resources/js/pages/settings/print-settings/A5Preview.tsx
```
import React from 'react';
import type { PrintTemplate, ColumnKey, CompanyData, ReceiptLiveData, AlignOption, BorderStyle } from './types';

interface A5Data {
  number: string; date: string; time: string;
  cashier: string; client: string;
  clientNif: string; clientPhone: string;
  items: Array<{ ref: string; name: string; qty: number; price: number; total: number; tva: number; discount: number; unit: string }>;
  tvaByRate: Array<{ rate: number; base: number; amount: number }>;
  totalHt: number; totalTva: number; totalDiscount: number;
  fiscalStamp: number; totalTtc: number;
  paid: number; change: number; remaining: number;
  prevBalance: number; newBalance: number;
  payments: Array<{ mode: string; amount: number }>;
}

function buildData(tpl: PrintTemplate, liveData?: ReceiptLiveData | null): A5Data {
  if (!liveData) return {
    number: '', date: '', time: '', cashier: '', client: '',
    clientNif: '', clientPhone: '', items: [], tvaByRate: [],
    totalHt: 0, totalTva: 0, totalDiscount: 0, fiscalStamp: 0,
    totalTtc: 0, paid: 0, change: 0, remaining: 0,
    prevBalance: 0, newBalance: 0, payments: [],
  };
  const buildTvaByRate = (items: ReceiptLiveData['items'] = []) => {
    const map = new Map<number, { base: number; amount: number }>();
    for (const item of items) {
      const rate = Math.round((item.tva_rate ?? 0) * 100);
      const base = item.total_ht ?? 0;
      const tva  = base * (item.tva_rate ?? 0);
      const prev = map.get(rate) ?? { base: 0, amount: 0 };
      map.set(rate, { base: prev.base + base, amount: prev.amount + tva });
    }
    return Array.from(map.entries()).map(([rate, v]) => ({ rate, ...v }));
  };
  return {
    number: liveData.docNumber ?? '',
    date: liveData.docDate ?? new Date().toLocaleDateString('ar-DZ'),
    time: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    cashier: liveData.cashierName ?? '',
    client: liveData.client?.name ?? '',
    clientNif: liveData.client?.nif ?? '',
    clientPhone: liveData.client?.phone ?? '',
    items: (liveData.items ?? []).map((item, i) => ({
      ref: item.ref ?? 'P' + (i + 1), name: item.name, qty: item.qty,
      price: item.unit_price_ht, total: item.total_ht,
      tva: Math.round((item.tva_rate ?? 0) * 100),
      discount: item.discount_percentage ?? 0, unit: item.unit ?? '',
    })),
    tvaByRate: buildTvaByRate(liveData.items),
    totalHt: liveData.totals?.total_ht ?? 0,
    totalTva: liveData.totals?.total_tva ?? 0,
    totalDiscount: liveData.totals?.total_discount ?? 0,
    fiscalStamp: liveData.totals?.fiscal_stamp ?? 0,
    totalTtc: liveData.totals?.total_ttc ?? 0,
    paid: liveData.totals?.paid ?? 0,
    change: liveData.totals?.change ?? 0,
    remaining: liveData.totals?.remaining ?? 0,
    prevBalance: liveData.prevBalance ?? 0,
    newBalance: liveData.newBalance ?? 0,
    payments: liveData.payments ?? [],
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

function colLabel(c: ColumnKey): string {
  const labels: Record<ColumnKey, string> = {
    rowNumber: '#', barcode: 'باركود', ref: 'مرجع',
    name: 'البيان', unit: 'وحدة', quantity: 'الكمية',
    price: 'السعر', discount: 'خصم', tva: 'TVA', total: 'المجموع',
  };
  return labels[c];
}

function colValue(c: ColumnKey, item: A5Data['items'][0]) {
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

interface A5PreviewProps {
  tpl:      PrintTemplate;
  company?: CompanyData | null;
  liveData?: ReceiptLiveData | null;
}

export default function A5Preview({ tpl, company, liveData }: A5PreviewProps) {
  const co   = getCompany(tpl, company);
  const data = buildData(tpl, liveData);
  const paperW = 559;
  const cols = tpl.col_order.filter(k => tpl.col_show[k] !== false);

  return (
    <div style={{
      width: paperW, minHeight: 794,
      fontFamily: "'Tajawal', sans-serif",
      fontSize: tpl.base_font_size,
      padding: '20px 24px',
      lineHeight: tpl.line_spacing,
      background: '#fff', color: '#111',
      direction: 'rtl', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 10, borderBottom: '1.5px solid #111' }}>
        <div>
          {tpl.show_logo && (
            <div style={{ marginBottom: 4 }}>
              {co.logoUrl ? (
                <img src={co.logoUrl} alt="logo" style={{ width: tpl.logo_size, height: tpl.logo_size, objectFit: 'contain', borderRadius: 4 }} />
              ) : (
                <div style={{ width: tpl.logo_size, height: tpl.logo_size, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: tpl.logo_size * 0.35, fontWeight: 900 }}>
                  {co.name.charAt(0)}
                </div>
              )}
            </div>
          )}
          {tpl.show_company_name && (
            <div style={{ fontSize: tpl.company_name_size + 2, fontWeight: tpl.company_name_bold ? 900 : 400, marginBottom: 2 }}>{co.name}</div>
          )}
          <div style={{ fontSize: tpl.company_info_size - 0.5, color: '#555' }}>
            {tpl.show_address && <div>{co.address}</div>}
            {tpl.show_phone && <div>☎ {co.phone}</div>}
            {tpl.show_tax_id && <div>NIF: {co.nif}</div>}
            {tpl.show_rc && <div>RC: {co.rc}</div>}
            {tpl.show_nis && <div>NIS: {co.nis}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'left', minWidth: 180 }}>
          <div style={{ fontSize: tpl.title_size + 2, fontWeight: tpl.title_bold ? 900 : 400, marginBottom: 8 }}>{tpl.title_text}</div>
          <table style={{ fontSize: tpl.company_info_size, borderCollapse: 'collapse' }}>
            <tbody>
              {tpl.show_doc_number && <A5InfoRow label="رقم" value={data.number} />}
              {tpl.show_date && <A5InfoRow label="التاريخ" value={data.date + (tpl.show_time ? ' ' + data.time : '')} />}
              {tpl.show_cashier && <A5InfoRow label="الكاشير" value={data.cashier} />}
            </tbody>
          </table>
        </div>
      </div>

      {tpl.show_client && data.client && (
        <div style={{ fontSize: tpl.company_info_size, marginBottom: 10, padding: 8, background: '#f9fafb', borderRadius: 4 }}>
          <span style={{ fontWeight: 700 }}>العميل: </span>{data.client}
          {tpl.show_client_nif && data.clientNif && <span style={{ marginRight: 12 }}>NIF: {data.clientNif}</span>}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tpl.items_font_size }}>
          <thead>
            <tr style={{ background: tpl.table_header_bg ? '#111' : '#f5f5f5', borderBottom: '1.5px solid #111' }}>
              {cols.map(c => (
                <th key={c} style={{
                  padding: '5px 6px', textAlign: c === 'name' || c === 'ref' ? 'right' as const : 'left' as const,
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
            {data.items.map((item, i) => (
              <tr key={i} style={{
                borderBottom: tpl.table_border_style !== 'none' ? '1px ' + tpl.table_border_style + ' #ddd' : 'none',
                background: tpl.alternating_rows && i % 2 === 1 ? '#fafafa' : 'transparent',
              }}>
                {cols.map(c => (
                  <td key={c} style={{
                    padding: '5px 6px', textAlign: c === 'name' || c === 'ref' ? 'right' as const : 'left' as const,
                    fontWeight: c === 'total' ? 700 : 400,
                  }}>
                    {colValue(c, item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: tpl.totals_font_size, fontWeight: tpl.totals_bold ? 700 : 400, marginBottom: 12, direction: 'ltr' }}>
        <table style={{ width: 260, borderCollapse: 'collapse' }}>
          <tbody>
            {tpl.show_total_ht && <A5TotalRow label="المجموع HT" val={data.totalHt} />}
            {tpl.show_discount_total && data.totalDiscount > 0 && <A5TotalRow label="الخصم" val={-data.totalDiscount} red />}
            {tpl.show_total_tva && <A5TotalRow label="TVA" val={data.totalTva} />}
            {tpl.show_fiscal_stamp && data.fiscalStamp > 0 && <A5TotalRow label="الطابع" val={data.fiscalStamp} />}
            {tpl.show_total_ttc && (
              <tr>
                <td style={{ padding: '6px 8px', borderTop: '2px double #111', fontWeight: tpl.total_ttc_bold ? 900 : 700, fontSize: tpl.total_ttc_font_size, textAlign: 'right' }}>TTC:</td>
                <td style={{ padding: '6px 8px', borderTop: '2px double #111', fontWeight: tpl.total_ttc_bold ? 900 : 700, fontSize: tpl.total_ttc_font_size, textAlign: 'right' }}>{data.totalTtc.toFixed(2)}</td>
              </tr>
            )}
            {tpl.show_paid_amount && <A5TotalRow label="المدفوع" val={data.paid} bold />}
            {tpl.show_change && <A5TotalRow label="الباقي" val={data.change} />}
            {tpl.show_remaining && data.remaining > 0 && <A5TotalRow label="المتبقي" val={data.remaining} red />}
          </tbody>
        </table>
      </div>

      {tpl.show_payment_details && data.payments.length > 0 && (
        <div style={{ fontSize: tpl.payment_font_size, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>وسائل الدفع:</div>
          {data.payments.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
              <span>{p.mode}</span>
              <span>{p.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: tpl.base_font_size - 0.5, borderTop: '1.5px solid #111', paddingTop: 10 }}>
        {tpl.footer_line1 && <div style={{ marginBottom: 1 }}>{tpl.footer_line1}</div>}
        {tpl.footer_line2 && <div style={{ marginBottom: 1 }}>{tpl.footer_line2}</div>}
        {tpl.show_thank_you && (
          <div style={{ fontWeight: 700, fontSize: tpl.thank_you_size, color: tpl.thank_you_color, margin: '4px 0' }}>
            {tpl.thank_you_text}
          </div>
        )}
        {tpl.footer_legal_text && (
          <div style={{ fontSize: tpl.base_font_size - 1.5, color: '#888' }}>{tpl.footer_legal_text}</div>
        )}
        {(tpl.show_cashier_signature || tpl.show_client_signature) && (
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16 }}>
            {tpl.show_cashier_signature && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 80, borderTop: '1px solid #111', marginBottom: 2 }} />
                <span style={{ fontSize: tpl.base_font_size - 1 }}>إمضاء الكاشير</span>
              </div>
            )}
            {tpl.show_client_signature && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 80, borderTop: '1px solid #111', marginBottom: 2 }} />
                <span style={{ fontSize: tpl.base_font_size - 1 }}>إمضاء العميل</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function A5InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ color: '#555', padding: '1px 0', whiteSpace: 'nowrap', fontWeight: 600 }}>{label}:</td>
      <td style={{ padding: '1px 0', paddingRight: 8 }}>{value}</td>
    </tr>
  );
}

function A5TotalRow({ label, val, red, bold }: { label: string; val: number; red?: boolean; bold?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: bold ? 800 : 400, color: red ? '#c00' : 'inherit' }}>{label}</td>
      <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: bold ? 800 : 400, color: red ? '#c00' : 'inherit' }}>{val.toFixed(2)}</td>
    </tr>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/api/printTemplatesApi.ts
```
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { PrintTemplate, PrintTemplateApiResponse, DocTypeCode } from '../types';

export const printTemplateKeys = {
  all:     (slug: string)              => [slug, 'print-templates']              as const,
  list:    (slug: string, code?: string) => [slug, 'print-templates', 'list', code] as const,
  detail:  (slug: string, id: number)  => [slug, 'print-templates', id]         as const,
};

function toApiPayload(tpl: Partial<PrintTemplate>): Record<string, unknown> {
  const {
    id, name, doc_type_code, paper_size, is_default, is_active,
    created_at, updated_at,
    ...config
  } = tpl as PrintTemplate;

  return {
    name:          name          ?? 'قالب جديد',
    doc_type_code: doc_type_code ?? 'FV',
    paper_size:    paper_size    ?? '80mm',
    is_default:    is_default    ?? false,
    is_active:     is_active     ?? true,
    config,
  };
}

function fromApiResponse(r: PrintTemplateApiResponse): PrintTemplate {
  return {
    id:            r.id,
    name:          r.name,
    doc_type_code: r.doc_type_code as DocTypeCode,
    paper_size:    r.paper_size as PrintTemplate['paper_size'],
    is_default:    r.is_default,
    is_active:     r.is_active,
    created_at:    r.created_at,
    updated_at:    r.updated_at,
    ...(r.config ?? {}),
  } as PrintTemplate;
}

export const printTemplatesApi = {
  list: (docTypeCode?: string) =>
    apiGet<PrintTemplateApiResponse[]>('/print-templates', docTypeCode
      ? { doc_type_code: docTypeCode } : undefined)
      .then(r => (Array.isArray(r) ? r : (r as any)?.data ?? []).map(fromApiResponse)),

  show: (id: number) =>
    apiGet<PrintTemplateApiResponse>(`/print-templates/${id}`)
      .then(fromApiResponse),

  create: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) =>
    apiPost<PrintTemplateApiResponse>('/print-templates', toApiPayload(tpl as any))
      .then(fromApiResponse),

  update: (id: number, tpl: Partial<PrintTemplate>) =>
    apiPut<PrintTemplateApiResponse>(`/print-templates/${id}`, toApiPayload(tpl))
      .then(fromApiResponse),

  delete: (id: number) =>
    apiDelete(`/print-templates/${id}`),

  setDefault: (id: number) =>
    apiPost<PrintTemplateApiResponse>(`/print-templates/${id}/set-default`)
      .then(fromApiResponse),

  duplicate: (id: number, newName: string) =>
    apiPost<PrintTemplateApiResponse>(`/print-templates/${id}/duplicate`, { name: newName })
      .then(fromApiResponse),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePrintTemplates(docTypeCode?: DocTypeCode) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        printTemplateKeys.list(slug ?? '', docTypeCode),
    queryFn:         () => printTemplatesApi.list(docTypeCode),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePrintTemplate(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  printTemplateKeys.detail(slug ?? '', id!),
    queryFn:   () => printTemplatesApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

export function usePrintTemplateMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
    if (slug) qc.invalidateQueries({ queryKey: printTemplateKeys.all(slug) });
  };

  const invalidateOne = (tpl: PrintTemplate) => {
    if (slug && tpl.id) {
      qc.setQueryData(printTemplateKeys.detail(slug, tpl.id), tpl);
      qc.invalidateQueries({ queryKey: printTemplateKeys.all(slug) });
    }
  };

  const create = useMutation({
    mutationFn: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      printTemplatesApi.create(tpl),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PrintTemplate> }) =>
      printTemplatesApi.update(id, data),
    onSuccess: invalidateOne,
  });

  const remove = useMutation({
    mutationFn: printTemplatesApi.delete,
    onSuccess:  invalidateAll,
  });

  const setDefault = useMutation({
    mutationFn: printTemplatesApi.setDefault,
    onSuccess:  invalidateAll,
  });

  const duplicate = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      printTemplatesApi.duplicate(id, name),
    onSuccess: invalidateAll,
  });

  return { create, update, remove, setDefault, duplicate };
}
```

## FILE: resources/js/pages/settings/print-settings/components/PreviewSelector.tsx
```
import React, { useMemo } from 'react';
import type { PrintTemplate, CompanyData, ReceiptLiveData } from '../types';
import UniversalPreview from '@/reporting/components/preview/UniversalPreview';
import { DocumentDataBuilder, emptyDocumentData } from '@/reporting';
import type { UniversalDocumentData } from '@/reporting';
import A4Preview from '../A4Preview';
import A5Preview from '../A5Preview';
import ReceiptPreview from './ReceiptPreview';

interface Props {
  tpl:          PrintTemplate;
  company?:     CompanyData | null;
  liveData?:    ReceiptLiveData | null;
  overrideData?: UniversalDocumentData | null;
  useLegacy?:   boolean;
}

export default function PreviewSelector({ tpl, company, liveData, overrideData, useLegacy = false }: Props) {
  if (useLegacy) {
    if (tpl.paper_size === 'A4') return <A4Preview tpl={tpl} company={company} liveData={liveData} />;
    if (tpl.paper_size === 'A5') return <A5Preview tpl={tpl} company={company} liveData={liveData} />;
    return <ReceiptPreview tpl={tpl} company={company} live={liveData} />;
  }

  const data: UniversalDocumentData = useMemo(() => {
    if (overrideData) return overrideData;
    if (!liveData) return emptyDocumentData();
    return DocumentDataBuilder.fromLegacy(liveData);
  }, [liveData, overrideData]);

  return <UniversalPreview tpl={tpl} data={data} company={company ?? null} />;
}
```

## FILE: resources/js/pages/settings/print-settings/components/ReceiptPreview.tsx
```
import React, { useMemo } from 'react';
import type { PrintTemplate, ColumnKey, CompanyData, TemplateLiveData, BorderStyle, AlignOption } from '../types';

const mm = (v: number) => v * 3.78;

function sep(style: BorderStyle) {
  if (style === 'none') return null;
  const map = { solid: 'solid', dashed: 'dashed', double: 'double' } as const;
  return <div style={{ borderTop: `1px ${map[style] ?? 'dashed'} #999`, margin: '4px 0' }} />;
}

function align(a: AlignOption): React.CSSProperties['textAlign'] {
  return a === 'right' ? 'right' : a === 'left' ? 'left' : 'center';
}

function fontFamily(f: PrintTemplate['font_family']): string {
  switch (f) {
    case 'monospace': return "'Courier New', monospace";
    case 'times':     return "'Times New Roman', serif";
    case 'arial':     return "Arial, sans-serif";
    default:          return "'Tajawal', sans-serif";
  }
}

interface PreviewItem {
  ref: string; name: string; qty: number; price: number; total: number; tva: number; discount: number; unit: string;
}

interface PreviewTotals {
  totalHt: number; totalTva: number; totalDiscount: number; fiscalStamp: number;
  totalTtc: number; paid: number; change: number; remaining: number;
  prevBalance: number; newBalance: number;
  tvaByRate: Array<{ rate: number; base: number; amount: number }>;
}

interface Props {
  tpl:      PrintTemplate;
  company?: CompanyData | null;
  live?:    TemplateLiveData | null;
}

export default function ReceiptPreview({ tpl, company, live }: Props) {
  const co = useMemo(() => ({
    name:    tpl.company_name_text  || company?.name    || '',
    address: tpl.override_address   || company?.address || '',
    phone:   tpl.override_phone     || company?.phone   || '',
    nif:     tpl.override_nif       || company?.nif     || '',
    rc:      tpl.override_rc        || company?.rc      || '',
    nis:     tpl.override_nis       || company?.nis     || '',
    ice:     tpl.override_ice       || company?.ice     || '',
    article: tpl.override_article   || company?.article || '',
    logoUrl: company?.logoUrl,
  }), [tpl, company]);

  const items = useMemo(() => live?.items
    ? live.items.map((it, i) => ({
        ref: it.ref ?? `P${i+1}`, name: it.name, qty: it.qty,
        price: it.unit_price_ht, total: it.total_ht,
        tva: it.tva_rate, discount: it.discount_percentage ?? 0, unit: it.unit ?? '',
      }))
    : [], [live]);

  const doc = useMemo(() => ({
    number:  live?.docNumber   ?? 'FV-2025-001770',
    date:    live?.docDate     ?? '2025-06-26',
    time:    new Date().toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' }),
    cashier: live?.cashierName ?? 'أحمد بن علي',
    client:  live?.client,
    payments:live?.payments    ?? [],
    totals:  live?.totals ? {
      totalHt:      live.totals.total_ht,
      totalTva:     live.totals.total_tva,
      totalDiscount:live.totals.total_discount,
      fiscalStamp:  live.totals.fiscal_stamp,
      totalTtc:     live.totals.total_ttc,
      paid:         live.totals.paid ?? 0,
      change:       live.totals.change ?? 0,
      remaining:    live.totals.remaining ?? 0,
      tvaByRate: [],
    } : {
      totalHt: 0, totalTva: 0, totalDiscount: 0, fiscalStamp: 0,
      totalTtc: 0, paid: 0, change: 0, remaining: 0,
      prevBalance: 0, newBalance: 0, tvaByRate: [],
    },
    prevBalance: live?.prevBalance ?? 0,
    newBalance:  live?.newBalance  ?? 0,
  }), [live]);

  const paperPx = tpl.paper_width_mm * 3.78;
  const ff      = fontFamily(tpl.font_family);

  return (
    <div style={{
      width:       paperPx,
      fontFamily:  ff,
      fontSize:    tpl.base_font_size,
      lineHeight:  tpl.line_spacing,
      paddingTop:  mm(tpl.margin_top),
      paddingBottom: mm(tpl.margin_bottom),
      paddingLeft: mm(tpl.margin_sides),
      paddingRight: mm(tpl.margin_sides),
      background:  '#fff',
      color:       '#111',
      direction:   'rtl',
    }}>
      <Header tpl={tpl} co={co} />
      <DocInfo tpl={tpl} doc={doc} />
      <ItemsTable tpl={tpl} items={items} />
      <Totals tpl={tpl} t={doc.totals} />
      {tpl.show_payment_details && <Payments tpl={tpl} payments={doc.payments} />}
      <Footer tpl={tpl} doc={doc} />
    </div>
  );
}

function Header({ tpl, co }: { tpl: PrintTemplate; co: CompanyData }) {
  return (
    <div style={{ textAlign: align(tpl.company_info_align), marginBottom: 5 }}>
      {tpl.show_logo && (
        <div style={{
          display: 'flex',
          justifyContent: tpl.logo_align === 'right' ? 'flex-start' : tpl.logo_align === 'left' ? 'flex-end' : 'center',
          marginBottom: 4,
        }}>
          {co.logoUrl ? (
            <img src={co.logoUrl} alt="logo"
              style={{
                width: tpl.logo_size, height: tpl.logo_size,
                objectFit: 'contain',
                borderRadius: `${tpl.logo_border_radius}%`,
              }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: tpl.logo_size, height: tpl.logo_size,
              background: '#111',
              borderRadius: `${tpl.logo_border_radius}%`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: tpl.logo_size * 0.35, fontWeight: 900,
            }}>
              {co.name.charAt(0)}
            </div>
          )}
        </div>
      )}

      {tpl.show_company_name && (
        <div style={{
          textAlign:  align(tpl.company_name_align),
          fontSize:   tpl.company_name_size,
          fontWeight: tpl.company_name_bold ? 900 : 400,
          color:      tpl.company_name_color,
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

      {sep(tpl.header_separator)}
    </div>
  );
}

function DocInfo({ tpl, doc }: { tpl: PrintTemplate; doc: any }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{
        textAlign:  align(tpl.title_align),
        fontSize:   tpl.title_size,
        fontWeight: tpl.title_bold ? 900 : 400,
        color:      tpl.title_color,
        fontFamily: "'Tajawal', sans-serif",
        marginBottom: 4,
      }}>
        {tpl.title_text}
      </div>

      <div style={{ fontSize: tpl.base_font_size }}>
        {tpl.show_doc_number && <DocRow label="رقم:" value={doc.number} mono />}
        {tpl.show_date && <DocRow label="التاريخ:" value={`${doc.date}${tpl.show_time ? ' ' + doc.time : ''}`} />}
        {tpl.show_cashier && doc.cashier && <DocRow label="الكاشير:" value={doc.cashier} />}
        {tpl.show_client && doc.client?.name && (
          <>
            <DocRow label="العميل:" value={doc.client.name} />
            {tpl.show_client_nif     && doc.client.nif     && <DocRow label="NIF العميل:" value={doc.client.nif} />}
            {tpl.show_client_phone   && doc.client.phone   && <DocRow label="هاتف العميل:" value={doc.client.phone} />}
            {tpl.show_client_address && doc.client.address && <DocRow label="العنوان:" value={doc.client.address} />}
          </>
        )}
      </div>

      {sep(tpl.doc_separator)}
    </div>
  );
}

function DocRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: mono ? "'Courier New', monospace" : undefined }}>{value}</span>
    </div>
  );
}

function ItemsTable({ tpl, items }: { tpl: PrintTemplate; items: PreviewItem[] }) {
  const visibleCols = tpl.col_order.filter(k => tpl.col_show[k] !== false);
  const ff = tpl.items_font_family === 'monospace' ? "'Courier New', monospace" : "'Tajawal', sans-serif";

  const borderMap: Record<BorderStyle, string> = {
    solid: 'solid', dashed: 'dashed', double: 'double', none: 'none',
  };
  const borderStyle = borderMap[tpl.table_border_style] ?? 'dashed';
  const border = tpl.table_border_style === 'none' ? 'none' : `1px ${borderStyle} #999`;

  return (
    <div style={{ fontSize: tpl.items_font_size, fontFamily: ff, marginBottom: 4 }}>
      {tpl.show_col_header && (
        <div style={{
          display: 'flex', gap: 2,
          fontWeight: tpl.table_header_bold ? 800 : 400,
          color: tpl.table_header_color,
          background: tpl.table_header_bg ? '#f0f0f0' : 'transparent',
          borderBottom: border,
          paddingBottom: 3, marginBottom: 2,
        }}>
          {visibleCols.map(col => (
            <div key={col} style={{
              flex: `0 0 ${tpl.col_widths[col] ?? 20}%`,
              textAlign: align(tpl.col_aligns[col] ?? (col === 'name' ? 'right' : 'center')),
            }}>
              {tpl.col_headers[col] ?? colDefaultHeader(col)}
            </div>
          ))}
        </div>
      )}

      {items.map((item, idx) => (
        <div key={idx} style={{
          display: 'flex', gap: 2,
          background: tpl.alternating_rows && idx % 2 === 1 ? tpl.alternating_color : 'transparent',
          padding: '1px 0',
          borderBottom: tpl.table_border_style !== 'none' ? `1px ${borderStyle} #eee` : 'none',
        }}>
          {visibleCols.map(col => (
            <div key={col} style={{
              flex: `0 0 ${tpl.col_widths[col] ?? 20}%`,
              textAlign: align(tpl.col_aligns[col] ?? (col === 'name' ? 'right' : 'center')),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col === 'name' ? 'normal' : 'nowrap',
            }}>
              {colValue(col, item, idx, tpl)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function colDefaultHeader(col: ColumnKey): string {
  const map: Record<ColumnKey, string> = {
    rowNumber: '#', barcode: 'باركود', ref: 'مرجع',
    name: 'البيان', unit: 'وحدة', quantity: 'كمية',
    price: 'سعر', discount: 'خصم', tva: 'TVA', total: 'مجموع',
  };
  return map[col] ?? col;
}

function colValue(col: ColumnKey, item: PreviewItem, idx: number, tpl: PrintTemplate): string {
  const price = tpl.price_display === 'ttc'
    ? item.price * (1 + item.tva / 100)
    : item.price;
  const total = tpl.show_line_total_ttc
    ? item.total * (1 + item.tva / 100)
    : item.total;

  switch (col) {
    case 'rowNumber': return String(idx + 1);
    case 'barcode':   return item.ref;
    case 'ref':       return item.ref;
    case 'name':      return item.name;
    case 'unit':      return item.unit;
    case 'quantity':  return String(item.qty);
    case 'price':     return price.toFixed(2);
    case 'discount':  return item.discount > 0 ? `${item.discount}%` : '';
    case 'tva':       return `${item.tva}%`;
    case 'total':     return total.toFixed(2);
    default:          return '';
  }
}

function Totals({ tpl, t }: { tpl: PrintTemplate; t: PreviewTotals }) {
  const { totals_font_size: fs } = tpl;

  const borderMap: Record<string, string> = {
    solid: 'solid', dashed: 'dashed', double: 'double', none: 'none',
  };

  return (
    <div style={{
      fontSize:   fs,
      fontWeight: tpl.totals_bold ? 700 : 400,
      textAlign:  align(tpl.totals_align),
      marginBottom: 4,
    }}>
      {tpl.show_total_ht      && <TRow label="المجموع HT"        val={t.totalHt} />}
      {tpl.show_discount_total && t.totalDiscount > 0 && (
        <TRow label="إجمالي الخصومات" val={-t.totalDiscount} red />
      )}
      {tpl.show_total_tva     && <TRow label="TVA"               val={t.totalTva} />}
      {tpl.show_tva_breakdown && t.tvaByRate.map(r => (
        <TRow key={r.rate} label={`  TVA ${r.rate}%`} val={r.amount} />
      ))}
      {tpl.show_fiscal_stamp  && t.fiscalStamp > 0 && (
        <TRow label="الطابع الجبائي" val={t.fiscalStamp} />
      )}

      {tpl.show_total_ttc && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          border: tpl.total_border_style === 'none' ? 'none'
            : `2px ${borderMap[tpl.total_border_style] ?? 'double'} #111`,
          padding: '3px 5px', margin: '5px 0',
          fontWeight: tpl.total_ttc_bold ? 900 : 700,
          fontSize:   tpl.total_ttc_font_size,
          color:      tpl.total_ttc_color,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          <span>المجموع TTC:</span>
          <span dir="ltr">{t.totalTtc.toFixed(2)} دج</span>
        </div>
      )}

      {tpl.show_amount_in_words && (
        <div style={{ fontSize: fs - 1, textAlign: 'center', color: '#555', marginTop: 2 }}>
          <em>فقط: ستمائة وخمسة وخمسون ديناراً جزائرياً</em>
        </div>
      )}

      {tpl.show_paid_amount   && <TRow label="المدفوع"        val={t.paid} bold />}
      {tpl.show_change        && <TRow label="الباقي"         val={t.change} />}
      {tpl.show_remaining     && t.remaining > 0 && <TRow label="المتبقي"  val={t.remaining} red />}
      {tpl.show_prev_balance  && <TRow label="الرصيد السابق"  val={t.prevBalance} />}
      {tpl.show_new_balance   && <TRow label="الرصيد الجديد"  val={t.newBalance} bold />}
    </div>
  );
}

function TRow({ label, val, red, bold }: { label: string; val: number; red?: boolean; bold?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', marginBottom: 2,
      fontWeight: bold ? 800 : 'inherit',
      color: red ? '#c00' : 'inherit',
    }}>
      <span>{label}</span>
      <span dir="ltr">{Math.abs(val).toFixed(2)}{red && val < 0 ? '-' : ''}</span>
    </div>
  );
}

function Payments({ tpl, payments }: { tpl: PrintTemplate; payments: Array<{ mode: string; amount: number }> }) {
  return (
    <div style={{ fontSize: tpl.payment_font_size, marginBottom: 4 }}>
      {sep('dashed')}
      <div style={{ fontWeight: 700, marginBottom: 2 }}>وسائل الدفع:</div>
      {payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>{p.mode}</span>
          <span dir="ltr">{p.amount.toFixed(2)}</span>
        </div>
      ))}
      {sep('dashed')}
    </div>
  );
}

function Footer({ tpl, doc }: { tpl: PrintTemplate; doc: any }) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_barcode || tpl.show_qr ||
    tpl.show_cashier_signature || tpl.show_client_signature || tpl.show_stamp;

  if (!hasContent) return null;

  return (
    <div style={{ textAlign: 'center', fontSize: tpl.base_font_size - 0.5 }}>
      {sep(tpl.footer_separator)}

      {tpl.footer_line1 && <div style={{ marginBottom: 2 }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ marginBottom: 2 }}>{tpl.footer_line2}</div>}
      {tpl.footer_line3 && <div style={{ marginBottom: 2 }}>{tpl.footer_line3}</div>}

      {tpl.show_returns_policy && tpl.returns_policy_text && (
        <div style={{ fontSize: tpl.base_font_size - 1, color: '#666', marginBottom: 3 }}>
          {tpl.returns_policy_text}
        </div>
      )}

      {tpl.show_thank_you && (
        <div style={{
          fontSize:   tpl.thank_you_size,
          fontWeight: 700,
          color:      tpl.thank_you_color,
          fontFamily: "'Tajawal', sans-serif",
          margin: '4px 0',
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 2, color: '#999', marginTop: 3 }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {tpl.show_barcode && (
        <div style={{ margin: '8px 0 4px' }}>
          <div style={{ display: 'inline-flex', gap: 1, alignItems: 'flex-end' }}>
            {Array.from({ length: 48 }, (_, i) => (
              <div key={i} style={{
                width:      i % 3 === 0 ? 2 : 1,
                height:     i % 5 === 0 ? 28 : 22,
                background: '#111',
              }} />
            ))}
          </div>
          <div style={{ fontSize: tpl.base_font_size - 1, letterSpacing: 2, marginTop: 2 }}>
            {tpl.barcode_content === 'custom' ? tpl.barcode_custom_text : doc.number}
          </div>
        </div>
      )}

      {tpl.show_qr && (
        <div style={{ margin: '4px auto', width: 48, height: 48 }}>
          <svg viewBox="0 0 10 10" width={48} height={48}>
            <rect x="0" y="0" width="3" height="3" fill="#111" />
            <rect x="1" y="1" width="1" height="1" fill="#fff" />
            <rect x="7" y="0" width="3" height="3" fill="#111" />
            <rect x="8" y="1" width="1" height="1" fill="#fff" />
            <rect x="0" y="7" width="3" height="3" fill="#111" />
            <rect x="1" y="8" width="1" height="1" fill="#fff" />
            <rect x="4" y="0" width="1" height="1" fill="#111" />
            <rect x="4" y="2" width="2" height="1" fill="#111" />
            <rect x="3" y="4" width="4" height="1" fill="#111" />
            <rect x="5" y="6" width="2" height="3" fill="#111" />
            <rect x="3" y="7" width="1" height="1" fill="#111" />
          </svg>
          <div style={{ fontSize: 7, color: '#666', marginTop: 1 }}>
            {doc.number}
          </div>
        </div>
      )}

      {(tpl.show_cashier_signature || tpl.show_client_signature) && (
        <div style={{
          display: 'flex', justifyContent: 'space-around',
          marginTop: 14, fontSize: tpl.base_font_size - 1,
        }}>
          {tpl.show_cashier_signature && (
            <div>
              <div style={{ width: 70, borderTop: '1px solid #111', marginBottom: 3 }} />
              <span>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.show_client_signature && (
            <div>
              <div style={{ width: 70, borderTop: '1px solid #111', marginBottom: 3 }} />
              <span>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}

      {tpl.show_stamp && (
        <div style={{
          width: 44, height: 44, margin: '8px auto',
          border: '2px solid #111', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 900, transform: 'rotate(-12deg)',
        }}>
          ختم
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/index.ts
```
export { default as ReceiptPreview } from './components/ReceiptPreview';
export { default as A4Preview } from './A4Preview';
export { default as A5Preview } from './A5Preview';
export { default as PreviewSelector } from './components/PreviewSelector';
export * from './types';
export type { ReceiptLiveData, CompanyPreviewData } from './types';
```

## FILE: resources/js/pages/settings/print-settings/sections/DocumentSection.tsx
```
import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function DocumentSectionControls({ tpl, update }: Props) {
  return (
    <Section title="معلومات المستند" icon="ti-file-description">
      <div className="ps-field">
        <label className="ps-field-label">عنوان المستند</label>
        <input className="ps-input" value={tpl.title_text}
          onChange={e => update('title_text', e.target.value)} />
      </div>
      <SliderField label="حجم عنوان المستند" value={tpl.title_size} min={10} max={22} unit="px"
        onChange={v => update('title_size', v)} />
      <Toggle value={tpl.title_bold} onChange={v => update('title_bold', v)} label="خط عريض" />
      <AlignButtons label="محاذاة العنوان" value={tpl.title_align}
        onChange={v => update('title_align', v)} />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      <Toggle value={tpl.show_doc_number} onChange={v => update('show_doc_number', v)} label="رقم الوثيقة" />
      <Toggle value={tpl.show_date}      onChange={v => update('show_date', v)} label="التاريخ" />
      <Toggle value={tpl.show_time}      onChange={v => update('show_time', v)} label="الوقت" />
      <Toggle value={tpl.show_due_date}   onChange={v => update('show_due_date', v)} label="تاريخ الاستحقاق" />
      <Toggle value={tpl.show_cashier}   onChange={v => update('show_cashier', v)} label="اسم الكاشير" />
      <Toggle value={tpl.show_client}    onChange={v => update('show_client', v)} label="اسم العميل" />

      {tpl.show_client && (
        <>
          <div className="ps-section-title" style={{ fontSize: 12, marginTop: 4 }}>تفاصيل العميل</div>
          <Toggle value={tpl.show_client_nif}    onChange={v => update('show_client_nif', v)} label="الرقم الضريبي للعميل" />
          <Toggle value={tpl.show_client_phone}    onChange={v => update('show_client_phone', v)} label="هاتف العميل" />
          <Toggle value={tpl.show_client_address}  onChange={v => update('show_client_address', v)} label="عنوان العميل" />
        </>
      )}

      <Toggle value={tpl.show_session}    onChange={v => update('show_session', v)} label="رقم الجلسة" />
      <Toggle value={tpl.show_payment_term} onChange={v => update('show_payment_term', v)} label="شروط الدفع" />

      <BorderSelect label="فاصل المستند" value={tpl.doc_separator}
        onChange={v => update('doc_separator', v as any)} />
    </Section>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/FooterSection.tsx
```
import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { BorderSelect } from './HeaderSection';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function FooterSectionControls({ tpl, update }: Props) {
  return (
    <>
      <Section title="التذييل — النصوص والتواقيع" icon="ti-file-text">
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 1</label>
          <input className="ps-input" value={tpl.footer_line1}
            onChange={e => update('footer_line1', e.target.value)}
            placeholder="مثال: مفتوح من 08:00 إلى 20:00" />
        </div>
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 2</label>
          <input className="ps-input" value={tpl.footer_line2}
            onChange={e => update('footer_line2', e.target.value)} />
        </div>
        <div className="ps-field">
          <label className="ps-field-label">سطر التذييل 3</label>
          <input className="ps-input" value={tpl.footer_line3}
            onChange={e => update('footer_line3', e.target.value)} />
        </div>

        <BorderSelect label="فاصل التذييل" value={tpl.footer_separator}
          onChange={v => update('footer_separator', v as any)} />

        <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

        <Toggle value={tpl.show_thank_you} onChange={v => update('show_thank_you', v)} label="رسالة الشكر" />
        {tpl.show_thank_you && (
          <>
            <div className="ps-field">
              <label className="ps-field-label">نص رسالة الشكر</label>
              <input className="ps-input" value={tpl.thank_you_text}
                onChange={e => update('thank_you_text', e.target.value)} />
            </div>
            <SliderField label="حجم خط الشكر" value={tpl.thank_you_size} min={9} max={18} unit="px"
              onChange={v => update('thank_you_size', v)} />
          </>
        )}

        <Toggle value={tpl.show_returns_policy} onChange={v => update('show_returns_policy', v)} label="سياسة الإرجاع" />
        {tpl.show_returns_policy && (
          <div className="ps-field">
            <label className="ps-field-label">نص سياسة الإرجاع</label>
            <textarea className="ps-input ps-textarea" value={tpl.returns_policy_text}
              onChange={e => update('returns_policy_text', e.target.value)} rows={2} />
          </div>
        )}

        <div className="ps-field">
          <label className="ps-field-label">نص قانوني (تذييل سفلي)</label>
          <textarea className="ps-input ps-textarea" value={tpl.footer_legal_text}
            onChange={e => update('footer_legal_text', e.target.value)}
            placeholder="مثال: يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري"
            rows={2} />
        </div>
      </Section>

      <Section title="الباركود و QR" icon="ti-barcode">
        <Toggle value={tpl.show_barcode} onChange={v => update('show_barcode', v)} label="الباركود" />
        {tpl.show_barcode && (
          <div className="ps-field">
            <label className="ps-field-label">محتوى الباركود</label>
            <select className="ps-select" value={tpl.barcode_content}
              onChange={e => update('barcode_content', e.target.value as any)}>
              <option value="doc-number">رقم المستند</option>
              <option value="total">المبلغ الإجمالي</option>
              <option value="custom">نص مخصص</option>
            </select>
            {tpl.barcode_content === 'custom' && (
              <input className="ps-input" style={{ marginTop: 4 }} value={tpl.barcode_custom_text}
                onChange={e => update('barcode_custom_text', e.target.value)}
                placeholder="أدخل النص للباركود" />
            )}
          </div>
        )}

        <Toggle value={tpl.show_qr} onChange={v => update('show_qr', v)} label="QR Code" />
        {tpl.show_qr && (
          <div className="ps-field">
            <label className="ps-field-label">محتوى QR</label>
            <select className="ps-select" value={tpl.qr_content}
              onChange={e => update('qr_content', e.target.value as any)}>
              <option value="doc-number">رقم المستند</option>
              <option value="company-info">معلومات الشركة</option>
              <option value="both">الاثنين معاً</option>
            </select>
          </div>
        )}
      </Section>

      <Section title="التواقيع والختم" icon="ti-signature">
        <Toggle value={tpl.show_cashier_signature} onChange={v => update('show_cashier_signature', v)} label="إمضاء الكاشير" />
        <Toggle value={tpl.show_client_signature}  onChange={v => update('show_client_signature', v)} label="إمضاء العميل" />
        <Toggle value={tpl.show_stamp}            onChange={v => update('show_stamp', v)} label="ختم المؤسسة" />
      </Section>
    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/FormattingSection.tsx
```
import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { SliderField, Section } from './ToggleSwitch';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function FormattingSectionControls({ tpl, update }: Props) {
  return (
    <Section title="تنسيق الطباعة — الهوامش والمسافات" icon="ti-settings">
      <div className="ps-field">
        <label className="ps-field-label">عرض الورق</label>
        <div className="ps-paper-pills" style={{ marginTop: 2 }}>
          {([80, 58] as const).map(w => (
            <button key={w} className={`ps-paper-pill ${tpl.paper_width_mm === w ? 'on' : ''}`}
              onClick={() => update('paper_width_mm', w)}>
              {w} mm
            </button>
          ))}
        </div>
      </div>

      <SliderField label="الهامش العلوي" value={tpl.margin_top} min={0} max={10} unit="mm"
        onChange={v => update('margin_top', v)} />
      <SliderField label="الهامش السفلي" value={tpl.margin_bottom} min={0} max={10} unit="mm"
        onChange={v => update('margin_bottom', v)} />
      <SliderField label="الهامش الجانبي" value={tpl.margin_sides} min={0} max={10} unit="mm"
        onChange={v => update('margin_sides', v)} />
      <SliderField label="تباعد الأسطر" value={tpl.line_spacing} min={1} max={2.5} step={0.1} unit="×"
        onChange={v => update('line_spacing', v)} />
      <SliderField label="حجم الخط الأساسي" value={tpl.base_font_size} min={8} max={14} unit="px"
        onChange={v => update('base_font_size', v)} />
    </Section>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/HeaderSection.tsx
```
import React from 'react';
import type { ReceiptTemplate80mm, AlignOption, CompanyPreviewData } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
  company?: CompanyPreviewData | null;
}

export default function HeaderSectionControls({ tpl, update, company }: Props) {
  return (
    <Section title="رأس الفاتورة — الشعار والشركة" icon="ti-building-store">
      <Toggle value={tpl.show_logo} onChange={v => update('show_logo', v)} label="إظهار الشعار" />
      {tpl.show_logo && (
        <>
          <SliderField label="حجم الشعار" value={tpl.logo_size} min={30} max={120} unit="px"
            onChange={v => update('logo_size', v)} />
          <AlignButtons label="محاذاة الشعار" value={tpl.logo_align}
            onChange={v => update('logo_align', v)} />
        </>
      )}

      <Toggle value={tpl.show_company_name} onChange={v => update('show_company_name', v)} label="اسم المؤسسة" />
      {tpl.show_company_name && (
        <>
          <SliderField label="حجم الخط" value={tpl.company_name_size} min={10} max={28} unit="px"
            onChange={v => update('company_name_size', v)} />
          <Toggle value={tpl.company_name_bold} onChange={v => update('company_name_bold', v)} label="خط عريض" />
          <AlignButtons label="محاذاة الاسم" value={tpl.company_name_align}
            onChange={v => update('company_name_align', v)} />
        </>
      )}

      <div className="ps-field">
        <label className="ps-field-label">نص إضافي في الرأس</label>
        <input className="ps-input" value={tpl.header_custom_text}
          onChange={e => update('header_custom_text', e.target.value)}
          placeholder="مثال: السجل التجاري: 13/B.0123456" />
      </div>

      <div className="ps-section-title" style={{ marginTop: 8, fontSize: 12 }}>معلومات الشركة</div>
      <Toggle value={tpl.show_address} onChange={v => update('show_address', v)} label="العنوان" />
      <Toggle value={tpl.show_phone}   onChange={v => update('show_phone', v)} label="الهاتف" />
      <Toggle value={tpl.show_tax_id}   onChange={v => update('show_tax_id', v)} label="رقم NIF" />
      <Toggle value={tpl.show_rc}      onChange={v => update('show_rc', v)} label="السجل التجاري RC" />
      <Toggle value={tpl.show_nis}     onChange={v => update('show_nis', v)} label="رقم NIS / STAT" />
      <Toggle value={tpl.show_ice}     onChange={v => update('show_ice', v)} label="رقم ICE" />
      <Toggle value={tpl.show_article} onChange={v => update('show_article', v)} label="النشاط (Article)" />

      <SliderField label="حجم خط معلومات الشركة" value={tpl.company_info_size} min={7} max={14} unit="px"
        onChange={v => update('company_info_size', v)} />
      <AlignButtons label="محاذاة معلومات الشركة" value={tpl.company_info_align}
        onChange={v => update('company_info_align', v)} />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12, marginBottom: 4 }}>
        بيانات المؤسسة
        <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--t4)', marginRight: 6 }}>
          (اتركها فارغة لاستخدام بيانات الشركة تلقائياً)
        </span>
      </div>
      <CompanyField label="الاسم" value={tpl.company_name_text} onChange={v => update('company_name_text', v)} placeholder="اسم المؤسسة" apiValue={company?.name} />
      <CompanyField label="العنوان" value={tpl.override_address} onChange={v => update('override_address', v)} placeholder="عنوان المؤسسة" apiValue={company?.address} />
      <CompanyField label="الهاتف" value={tpl.override_phone} onChange={v => update('override_phone', v)} placeholder="رقم الهاتف" apiValue={company?.phone} />
      <CompanyField label="NIF" value={tpl.override_nif} onChange={v => update('override_nif', v)} placeholder="الرقم الضريبي" apiValue={company?.nif} />
      <CompanyField label="RC" value={tpl.override_rc} onChange={v => update('override_rc', v)} placeholder="السجل التجاري" apiValue={company?.rc} />
      <CompanyField label="NIS" value={tpl.override_nis} onChange={v => update('override_nis', v)} placeholder="رقم NIS" apiValue={company?.nis} />
      <CompanyField label="ICE" value={tpl.override_ice} onChange={v => update('override_ice', v)} placeholder="رقم ICE" />
      <CompanyField label="النشاط" value={tpl.override_article} onChange={v => update('override_article', v)} placeholder="نشاط المؤسسة" apiValue={company?.article} />

      <BorderSelect label="فاصل الرأس" value={tpl.header_separator}
        onChange={v => update('header_separator', v as any)} />
    </Section>
  );
}

export function AlignButtons({ label, value, onChange }: {
  label: string; value: AlignOption; onChange: (v: AlignOption) => void;
}) {
  return (
    <div className="ps-field">
      <label className="ps-field-label">{label}</label>
      <div className="ps-paper-pills" style={{ marginTop: 2 }}>
        {(['right', 'center', 'left'] as AlignOption[]).map(a => (
          <button key={a} className={`ps-paper-pill ${value === a ? 'on' : ''}`}
            onClick={() => onChange(a)}>
            {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BorderSelect({ label, value, onChange }: {
  label: string; value: 'solid' | 'dashed' | 'double' | 'none'; onChange: (v: any) => void;
}) {
  return (
    <div className="ps-field">
      <label className="ps-field-label">{label}</label>
      <select className="ps-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="solid">خط متصل</option>
        <option value="dashed">خط متقطع</option>
        <option value="double">خط مزدوج</option>
        <option value="none">بدون فاصل</option>
      </select>
    </div>
  );
}

export function CompanyField({ label, value, onChange, placeholder, apiValue }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; apiValue?: string;
}) {
  const isUsingApi = !value && !!apiValue;
  return (
    <div className="ps-field">
      <label className="ps-field-label">
        {label}
        {isUsingApi && (
          <span className="ps-badge-api">تلقائي من الشركة</span>
        )}
      </label>
      <input className="ps-input" style={{ fontSize: 12 }} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={apiValue || placeholder} />
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/ItemsSection.tsx
```
import React from 'react';
import type { ReceiptTemplate80mm, ColumnKey } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { BorderSelect } from './HeaderSection';

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'rowNumber', label: 'رقم السطر' },
  { key: 'barcode',   label: 'باركود المنتج' },
  { key: 'ref',       label: 'المرجع' },
  { key: 'name',      label: 'اسم المنتج' },
  { key: 'unit',      label: 'الوحدة' },
  { key: 'quantity',  label: 'الكمية' },
  { key: 'price',     label: 'السعر' },
  { key: 'discount',  label: 'الخصم' },
  { key: 'tva',       label: 'نسبة TVA' },
  { key: 'total',     label: 'المجموع' },
];

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function ItemsSectionControls({ tpl, update }: Props) {
  const toggleCol = (key: ColumnKey, show: boolean) => {
    const newShow = { ...tpl.col_show, [key]: show };
    update('col_show', newShow);
    if (show && !tpl.col_order.includes(key)) {
      update('col_order', [...tpl.col_order, key]);
    }
  };

  const moveCol = (key: ColumnKey, dir: -1 | 1) => {
    const idx = tpl.col_order.indexOf(key);
    if (idx === -1) return;
    const newOrder = [...tpl.col_order];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    update('col_order', newOrder);
  };

  const changeColWidth = (key: ColumnKey, width: number) => {
    update('col_widths', { ...tpl.col_widths, [key]: Math.max(5, Math.min(60, width)) });
  };

  const changeColHeader = (key: ColumnKey, header: string) => {
    update('col_headers', { ...tpl.col_headers, [key]: header });
  };

  return (
    <>
      <Section title="الأعمدة — إظهار / ترتيب / عرض" icon="ti-list-details">
        <div className="ps-section-sub" style={{ marginBottom: 8 }}>
          اختر الأعمدة التي تظهر في جدول المنتجات، ورتبها حسب ما تريد
        </div>

        {COLUMNS.map(col => {
          const visible = tpl.col_show[col.key] !== false;
          const idx = tpl.col_order.indexOf(col.key);
          return (
            <div key={col.key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 0', borderBottom: '1px solid var(--b1)',
            }}>
              <div
                className={`ps-toggle-track ${visible ? 'on' : ''}`}
                onClick={() => toggleCol(col.key, !visible)}
                style={{ flexShrink: 0 }}
              >
                <div className="ps-toggle-thumb" />
              </div>

              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
                {col.label}
              </span>

              <button className="ps-btn-xs" onClick={() => moveCol(col.key, -1)}
                disabled={idx <= 0}
                style={{ opacity: idx <= 0 ? 0.3 : 1 }}>
                <i className="ti ti-chevron-right" />
              </button>
              <button className="ps-btn-xs" onClick={() => moveCol(col.key, 1)}
                disabled={idx >= tpl.col_order.length - 1}
                style={{ opacity: idx >= tpl.col_order.length - 1 ? 0.3 : 1 }}>
                <i className="ti ti-chevron-left" />
              </button>

              {visible && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input type="range" min={5} max={60} step={1}
                    value={tpl.col_widths[col.key] ?? 20}
                    onChange={e => changeColWidth(col.key, Number(e.target.value))}
                    style={{ width: 50, height: 3 }} />
                  <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 20 }}>
                    {tpl.col_widths[col.key] ?? 20}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </Section>

      <Section title="تنسيق جدول المنتجات" icon="ti-table-options">
        <SliderField label="حجم الخط" value={tpl.items_font_size} min={7} max={14} unit="px"
          onChange={v => update('items_font_size', v)} />

        <div className="ps-field">
          <label className="ps-field-label">نوع الخط</label>
          <select className="ps-select" value={tpl.items_font_family}
            onChange={e => update('items_font_family', e.target.value as any)}>
            <option value="tajawal">Tajawal (واضح)</option>
            <option value="monospace">Courier (أحادي)</option>
          </select>
        </div>

        <Toggle value={tpl.show_col_header} onChange={v => update('show_col_header', v)} label="إظهار رأس الجدول" />
        {tpl.show_col_header && (
          <>
            <Toggle value={tpl.table_header_bold} onChange={v => update('table_header_bold', v)} label="خط عريض للرأس" />
            <Toggle value={tpl.table_header_bg} onChange={v => update('table_header_bg', v)} label="خلفية للرأس" />
            {COLUMNS.filter(c => tpl.col_show[c.key] !== false).map(col => {
              if (col.key === 'name' || col.key === 'quantity' || col.key === 'price' || col.key === 'total') {
                return (
                  <div className="ps-field" key={col.key} style={{ marginTop: 2 }}>
                    <label className="ps-field-label">رأس: {col.label}</label>
                    <input className="ps-input" style={{ fontSize: 11 }}
                      value={tpl.col_headers[col.key] ?? ''}
                      onChange={e => changeColHeader(col.key, e.target.value)}
                      placeholder={col.label} />
                  </div>
                );
              }
              return null;
            })}
          </>
        )}

        <BorderSelect label="حدود الجدول" value={tpl.table_border_style}
          onChange={v => update('table_border_style', v as any)} />
        <Toggle value={tpl.alternating_rows} onChange={v => update('alternating_rows', v)} label="تلوين متناوب للأسطر" />
      </Section>

      <Section title="خيارات عرض الأسعار" icon="ti-calculator">
        <div className="ps-field">
          <label className="ps-field-label">عرض الأسعار</label>
          <div className="ps-paper-pills" style={{ marginTop: 2 }}>
            {(['ht', 'ttc'] as const).map(m => (
              <button key={m} className={`ps-paper-pill ${tpl.price_display === m ? 'on' : ''}`}
                onClick={() => update('price_display', m)}>
                {m === 'ht' ? 'HT (بدون ضريبة)' : 'TTC (بالضريبة)'}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/ToggleSwitch.tsx
```
// resources/js/pages/settings/print-settings/sections/ToggleSwitch.tsx
import React from 'react';

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="ps-toggle">
      <div className={`ps-toggle-track ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
        <div className="ps-toggle-thumb" />
      </div>
      <span className="ps-toggle-label">{label}</span>
    </label>
  );
}

export function SliderField({
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="ps-slider-field">
      <div className="ps-slider-header">
        <span className="ps-slider-label">{label}</span>
        <span className="ps-slider-val">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} className="ps-range" />
    </div>
  );
}

export function Section({ title, icon, children, defaultOpen = true, id }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean; id?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="ps-section" id={id}>
      <button className="ps-section-head" onClick={() => setOpen(o => !o)}>
        <i className={`ti ${icon}`} />
        <span>{title}</span>
        <i className={`ti ti-chevron-down ps-section-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && <div className="ps-section-body">{children}</div>}
    </div>
  );
}

export function ColorToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <Toggle value={value} onChange={onChange} label={label} />;
}
```

## FILE: resources/js/pages/settings/print-settings/sections/TotalsSection.tsx
```
import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function TotalsSectionControls({ tpl, update }: Props) {
  return (
    <Section title="الإجماليات — الحسابات" icon="ti-cash">
      <SliderField label="حجم خط الإجماليات" value={tpl.totals_font_size} min={8} max={16} unit="px"
        onChange={v => update('totals_font_size', v)} />
      <Toggle value={tpl.totals_bold} onChange={v => update('totals_bold', v)} label="خط عريض" />
      <AlignButtons label="محاذاة الإجماليات" value={tpl.totals_align}
        onChange={v => update('totals_align', v)} />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      <Toggle value={tpl.show_total_ht}      onChange={v => update('show_total_ht', v)} label="المجموع HT" />
      <Toggle value={tpl.show_total_tva}     onChange={v => update('show_total_tva', v)} label="مبلغ TVA" />
      <Toggle value={tpl.show_tva_breakdown} onChange={v => update('show_tva_breakdown', v)} label="تفصيل TVA حسب النسبة" />
      <Toggle value={tpl.show_discount_total} onChange={v => update('show_discount_total', v)} label="إجمالي الخصومات" />
      <Toggle value={tpl.show_fiscal_stamp}  onChange={v => update('show_fiscal_stamp', v)} label="الطابع الجبائي" />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <Toggle value={tpl.show_total_ttc} onChange={v => update('show_total_ttc', v)} label="المجموع TTC (الإجمالي)" />
      {tpl.show_total_ttc && (
        <>
          <SliderField label="حجم خط TTC" value={tpl.total_ttc_font_size} min={12} max={24} unit="px"
            onChange={v => update('total_ttc_font_size', v)} />
          <Toggle value={tpl.total_ttc_bold} onChange={v => update('total_ttc_bold', v)} label="خط عريض" />
          <BorderSelect label="إطار TTC" value={tpl.total_border_style}
            onChange={v => update('total_border_style', v as any)} />
        </>
      )}

      <Toggle value={tpl.show_amount_in_words} onChange={v => update('show_amount_in_words', v)} label="المبلغ بالكتابة" />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>المبالغ والرصيد</div>
      <Toggle value={tpl.show_paid_amount}  onChange={v => update('show_paid_amount', v)} label="المبلغ المدفوع" />
      <Toggle value={tpl.show_change}      onChange={v => update('show_change', v)} label="الباقي (الصرف)" />
      <Toggle value={tpl.show_remaining}   onChange={v => update('show_remaining', v)} label="المبلغ المتبقي" />
      <Toggle value={tpl.show_prev_balance} onChange={v => update('show_prev_balance', v)} label="الرصيد السابق" />
      <Toggle value={tpl.show_new_balance}  onChange={v => update('show_new_balance', v)} label="الرصيد الجديد" />
    </Section>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/types.ts
```
// ════════════════════════════════════════════════════════════════════════════
// print-settings/types.ts
// النظام الكامل لإدارة قوالب الطباعة:
//   - كل مستند يدعم أكثر من نموذج
//   - كل نموذج محفوظ في قاعدة البيانات
//   - المستخدم يتحكم في كل شيء
// ════════════════════════════════════════════════════════════════════════════

// ─── Enums & unions ───────────────────────────────────────────────────────────

export type PaperSize       = '80mm' | '58mm' | 'A4' | 'A5' | 'none';
export type AlignOption     = 'right' | 'center' | 'left';
export type BorderStyle     = 'solid' | 'dashed' | 'double' | 'none';
export type PriceMode       = 'ht' | 'ttc';
export type PageOrientation = 'portrait' | 'landscape';
export type FontFamily      = 'tajawal' | 'monospace' | 'times' | 'arial';

export type ColumnKey =
  | 'rowNumber' | 'barcode' | 'ref' | 'name'
  | 'unit' | 'quantity' | 'price' | 'discount' | 'tva' | 'total';

// ─── Document types ───────────────────────────────────────────────────────────

export const DOC_TYPE_LIST = [
  { code: 'FV',  name: 'فاتورة المبيعات',   category: 'sales'     },
  { code: 'BL',  name: 'وصل التسليم',       category: 'sales'     },
  { code: 'DEV', name: 'عرض السعر',         category: 'sales'     },
  { code: 'BCC', name: 'طلب العميل',        category: 'sales'     },
  { code: 'AA',  name: 'مرتجع المبيعات',   category: 'sales'     },
  { code: 'FA',  name: 'فاتورة الشراء',    category: 'purchase'  },
  { code: 'BR',  name: 'وصل الاستلام',     category: 'purchase'  },
  { code: 'AV',  name: 'أمر الشراء',       category: 'purchase'  },
  { code: 'DDP', name: 'إذن التسليم',      category: 'warehouse' },
  { code: 'BT',  name: 'تحويل المخزون',   category: 'warehouse' },
  { code: 'POS', name: 'إيصال POS',        category: 'pos'       },
  { code: 'RPT', name: 'تقرير الجلسة',    category: 'pos'       },
] as const;

export type DocTypeCode = typeof DOC_TYPE_LIST[number]['code'];

// ─── PrintTemplate — القالب الكامل ───────────────────────────────────────────

export interface PrintTemplate {
  id:           number | null;
  name:         string;
  doc_type_code: DocTypeCode;
  paper_size:   PaperSize;
  is_default:   boolean;
  is_active:    boolean;
  created_at?:  string;
  updated_at?:  string;

  paper_width_mm:   58 | 80;
  page_orientation: PageOrientation;
  margin_top:       number;
  margin_bottom:    number;
  margin_sides:     number;
  line_spacing:     number;
  base_font_size:   number;
  font_family:      FontFamily;

  show_logo:         boolean;
  logo_size:         number;
  logo_align:        AlignOption;
  logo_border_radius: number;

  show_company_name:   boolean;
  company_name_text:   string;
  company_name_size:   number;
  company_name_bold:   boolean;
  company_name_align:  AlignOption;
  company_name_color:  string;

  show_address:        boolean;
  show_phone:          boolean;
  show_tax_id:         boolean;
  show_rc:             boolean;
  show_nis:            boolean;
  show_ice:            boolean;
  show_article:        boolean;
  company_info_align:  AlignOption;
  company_info_size:   number;
  override_address:    string;
  override_phone:      string;
  override_nif:        string;
  override_rc:         string;
  override_nis:        string;
  override_ice:        string;
  override_article:    string;

  header_custom_text:  string;
  header_separator:    BorderStyle;

  title_text:       string;
  title_size:       number;
  title_bold:       boolean;
  title_align:      AlignOption;
  title_color:      string;
  show_doc_number:  boolean;
  show_date:        boolean;
  show_time:        boolean;
  show_due_date:    boolean;
  show_cashier:     boolean;
  show_client:      boolean;
  show_client_nif:  boolean;
  show_client_phone:boolean;
  show_client_address: boolean;
  show_delivery_address: boolean;
  show_session:     boolean;
  show_payment_term:boolean;
  show_bank_details:boolean;
  bank_details_text:string;
  doc_separator:    BorderStyle;

  col_order:   ColumnKey[];
  col_show:    Partial<Record<ColumnKey, boolean>>;
  col_widths:  Partial<Record<ColumnKey, number>>;
  col_headers: Partial<Record<ColumnKey, string>>;
  col_aligns:  Partial<Record<ColumnKey, AlignOption>>;

  items_font_size:    number;
  items_font_family:  FontFamily;
  show_col_header:    boolean;
  table_header_bold:  boolean;
  table_header_bg:    boolean;
  table_header_color: string;
  table_border_style: BorderStyle;
  alternating_rows:   boolean;
  alternating_color:  string;
  price_display:      PriceMode;
  show_line_total_ttc:boolean;

  totals_font_size:    number;
  totals_bold:         boolean;
  totals_align:        AlignOption;
  show_total_ht:       boolean;
  show_total_tva:      boolean;
  show_tva_breakdown:  boolean;
  show_discount_total: boolean;
  show_fiscal_stamp:   boolean;
  show_total_ttc:      boolean;
  total_ttc_font_size: number;
  total_ttc_bold:      boolean;
  total_ttc_color:     string;
  total_border_style:  BorderStyle;
  show_amount_in_words:boolean;
  show_paid_amount:    boolean;
  show_change:         boolean;
  show_remaining:      boolean;
  show_prev_balance:   boolean;
  show_new_balance:    boolean;

  show_payment_details:boolean;
  payment_font_size:   number;

  footer_line1:        string;
  footer_line2:        string;
  footer_line3:        string;
  footer_separator:    BorderStyle;
  show_thank_you:      boolean;
  thank_you_text:      string;
  thank_you_size:      number;
  thank_you_color:     string;
  show_returns_policy: boolean;
  returns_policy_text: string;
  footer_legal_text:   string;

  show_barcode:         boolean;
  barcode_content:      'doc-number' | 'total' | 'custom';
  barcode_custom_text:  string;
  show_qr:              boolean;
  qr_content:           'doc-number' | 'company-info' | 'both';

  show_cashier_signature: boolean;
  show_client_signature:  boolean;
  show_stamp:             boolean;

  show_header_section:    boolean;
  show_doc_info_section:  boolean;
  show_items_section:     boolean;
  show_totals_section:    boolean;
  show_payments_section:  boolean;
  show_footer_section:    boolean;

  rules: ReportRule[];

  show_report_header:        boolean;
  report_header_text:        string;
  show_report_footer:        boolean;
  report_footer_text:        string;
  show_charts:               boolean;
  chart_type:                'bar' | 'pie';
  chart_title:               string;
  group_by:                  string;
  sort_by:                   string;
  sort_direction:            'asc' | 'desc';
  show_report_period:        boolean;
  show_report_cashier:       boolean;
  show_report_summary_cards: boolean;
  show_report_payment_breakdown: boolean;
  show_report_top_products:  boolean;
}

export type SectionTarget = 'header' | 'doc-info' | 'items' | 'totals' | 'payments' | 'footer';

export interface ReportRule {
  id: string;
  condition: string;
  action: 'show' | 'hide' | 'highlight' | 'disable';
  target: string;
  priority?: number;
  highlightStyle?: Record<string, string>;
}

// ─── Default template factory ─────────────────────────────────────────────────

export function createDefaultTemplate(
  docTypeCode: DocTypeCode = 'POS',
  paperSize: PaperSize = '80mm',
  name = 'القالب الافتراضي',
): PrintTemplate {
  const is80mm = paperSize === '80mm' || paperSize === '58mm';
  return {
    id:             null,
    name,
    doc_type_code:  docTypeCode,
    paper_size:     paperSize,
    is_default:     true,
    is_active:      true,

    paper_width_mm:   paperSize === '58mm' ? 58 : 80,
    page_orientation: 'portrait',
    margin_top:       3,
    margin_bottom:    3,
    margin_sides:     3,
    line_spacing:     1.3,
    base_font_size:   10,
    font_family:      'tajawal',

    show_logo:          true,
    logo_size:          56,
    logo_align:         'center',
    logo_border_radius: 50,

    show_company_name:  true,
    company_name_text:  '',
    company_name_size:  15,
    company_name_bold:  true,
    company_name_align: 'center',
    company_name_color: '#111111',

    show_address:       true,
    show_phone:         true,
    show_tax_id:        true,
    show_rc:            true,
    show_nis:           false,
    show_ice:           false,
    show_article:       false,
    company_info_align: 'center',
    company_info_size:  9,
    override_address:   '',
    override_phone:     '',
    override_nif:       '',
    override_rc:        '',
    override_nis:       '',
    override_ice:       '',
    override_article:   '',

    header_custom_text: '',
    header_separator:   'dashed',

    title_text:       docTypeCode === 'POS' ? 'إيصال بيع' : 'فاتورة بيع',
    title_size:       13,
    title_bold:       true,
    title_align:      'center',
    title_color:      '#111111',
    show_doc_number:  true,
    show_date:        true,
    show_time:        true,
    show_due_date:    false,
    show_cashier:     true,
    show_client:      true,
    show_client_nif:  false,
    show_client_phone:false,
    show_client_address: false,
    show_delivery_address: false,
    show_session:     docTypeCode === 'POS',
    show_payment_term:false,
    show_bank_details:false,
    bank_details_text:'',
    doc_separator:    'dashed',

    col_order:   ['name', 'quantity', 'price', 'total'],
    col_show:    { name: true, quantity: true, price: true, total: true },
    col_widths:  { name: 40, quantity: 15, price: 22, total: 23 },
    col_headers: { name: 'البيان', quantity: 'الكمية', price: 'السعر', total: 'الإجمالي' },
    col_aligns:  { name: 'right', quantity: 'center', price: 'center', total: 'center' },

    items_font_size:    10,
    items_font_family:  'tajawal',
    show_col_header:    true,
    table_header_bold:  true,
    table_header_bg:    false,
    table_header_color: '#333333',
    table_border_style: 'dashed',
    alternating_rows:   false,
    alternating_color:  '#f5f5f5',
    price_display:      'ht',
    show_line_total_ttc:false,

    totals_font_size:    10,
    totals_bold:         true,
    totals_align:        'right',
    show_total_ht:       true,
    show_total_tva:      true,
    show_tva_breakdown:  false,
    show_discount_total: true,
    show_fiscal_stamp:   true,
    show_total_ttc:      true,
    total_ttc_font_size: 14,
    total_ttc_bold:      true,
    total_ttc_color:     '#111111',
    total_border_style:  'double',
    show_amount_in_words:false,
    show_paid_amount:    true,
    show_change:         true,
    show_remaining:      false,
    show_prev_balance:   true,
    show_new_balance:    true,

    show_payment_details:true,
    payment_font_size:   9,

    footer_line1:        '',
    footer_line2:        '',
    footer_line3:        '',
    footer_separator:    'solid',
    show_thank_you:      true,
    thank_you_text:      'شكراً لزيارتكم!',
    thank_you_size:      11,
    thank_you_color:     '#111111',
    show_returns_policy: true,
    returns_policy_text: 'كل الاحتجاجات لا تتعدى 48 ساعة',
    footer_legal_text:   '',

    show_barcode:        true,
    barcode_content:     'doc-number',
    barcode_custom_text: '',
    show_qr:             false,
    qr_content:          'doc-number',

    show_cashier_signature: false,
    show_client_signature:  false,
    show_stamp:             false,

    show_header_section:    true,
    show_doc_info_section:  true,
    show_items_section:     true,
    show_totals_section:    true,
    show_payments_section:  true,
    show_footer_section:    true,

    rules: [],

    show_report_header:        true,
    report_header_text:        '',
    show_report_footer:        true,
    report_footer_text:        '',
    show_charts:               true,
    chart_type:                'bar',
    chart_title:               '',
    group_by:                  '',
    sort_by:                   '',
    sort_direction:            'asc',
    show_report_period:        true,
    show_report_cashier:       true,
    show_report_summary_cards: true,
    show_report_payment_breakdown: true,
    show_report_top_products:  true,
  };
}

// ─── API types ────────────────────────────────────────────────────────────────

export interface PrintTemplateApiResponse {
  id:            number;
  name:          string;
  doc_type_code: string;
  paper_size:    string;
  is_default:    boolean;
  is_active:     boolean;
  config:        Omit<PrintTemplate, 'id' | 'name' | 'doc_type_code' | 'paper_size' | 'is_default' | 'is_active' | 'created_at' | 'updated_at'>;
  created_at:    string;
  updated_at:    string;
}

// ─── Live data ───────────────────────────────────────────────────────────────

export interface TemplateLiveData {
  docNumber?:   string;
  docDate?:     string;
  dueDate?:     string;
  cashierName?: string;
  client?:      { name?: string; nif?: string; phone?: string; address?: string } | null;
  items?:       Array<{
    name:               string;
    ref?:               string;
    qty:                number;
    unit_price_ht:      number;
    unit?:              string;
    tva_rate:           number;
    discount_percentage?: number;
    total_ht:           number;
  }>;
  totals?: {
    total_ht:       number;
    total_tva:      number;
    total_ttc:      number;
    fiscal_stamp:   number;
    total_discount: number;
    paid?:          number;
    change?:        number;
    remaining?:     number;
  };
  payments?:    Array<{ mode: string; amount: number }>;
  prevBalance?: number;
  newBalance?:  number;
}

export interface CompanyData {
  name:     string;
  address:  string;
  phone:    string;
  nif:      string;
  rc:       string;
  nis:      string;
  ice:      string;
  article:  string;
  logoUrl?: string | null;
}

// ─── Detected printer & doc config (لإعدادات الطابعات) ─────────────────────

export interface DetectedPrinter {
  id:        string;
  name:      string;
  isDefault: boolean;
  status:    'ready' | 'offline' | 'unknown';
  source?:   'usb' | 'demo' | 'manual';
}

export interface DocumentPrintConfig {
  docTypeCode:   string;
  docTypeName:   string;
  enabled:       boolean;
  paperSize:     PaperSize;
  printerId:     string | null;
  copies:        number;
  autoPrint:     boolean;
  showPreview:   boolean;
  templates:     PaperSize[];
}

// ─── Backward-compat aliases ──────────────────────────────────────────────────
// تُستخدم في POS والمكونات القديمة

export type ReceiptTemplate80mm = PrintTemplate;
export type CompanyPreviewData = CompanyData;
export type ReceiptLiveData = TemplateLiveData;

export function defaultTemplate(): PrintTemplate {
  return createDefaultTemplate('FV', '80mm');
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

