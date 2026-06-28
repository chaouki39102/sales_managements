import React from 'react';
import type { PrintTemplate, ColumnKey, CompanyData, ReceiptLiveData, AlignOption, BorderStyle } from '../../types';

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
      const rate = Math.round(item.tva_rate ?? 0);
      const base = item.total_ht ?? 0;
      const tva  = base * (item.tva_rate ?? 0) / 100;
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
      tva: Math.round(item.tva_rate ?? 0),
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
    rowNumber: '#', barcode: '╪ذ╪د╪▒┘â┘ê╪»', ref: '┘à╪▒╪ش╪╣',
    name: '╪د┘╪ذ┘è╪د┘', unit: '┘ê╪ص╪»╪ر', quantity: '╪د┘┘â┘à┘è╪ر',
    price: '╪د┘╪│╪╣╪▒', discount: '╪«╪╡┘à', tva: 'TVA', total: '╪د┘┘à╪ش┘à┘ê╪╣',
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
            {tpl.show_phone && <div>ظء {co.phone}</div>}
            {tpl.show_tax_id && <div>NIF: {co.nif}</div>}
            {tpl.show_rc && <div>RC: {co.rc}</div>}
            {tpl.show_nis && <div>NIS: {co.nis}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'left', minWidth: 180 }}>
          <div style={{ fontSize: tpl.title_size + 2, fontWeight: tpl.title_bold ? 900 : 400, marginBottom: 8 }}>{tpl.title_text}</div>
          <table style={{ fontSize: tpl.company_info_size, borderCollapse: 'collapse' }}>
            <tbody>
              {tpl.show_doc_number && <A5InfoRow label="╪▒┘é┘à" value={data.number} />}
              {tpl.show_date && <A5InfoRow label="╪د┘╪ز╪د╪▒┘è╪«" value={data.date + (tpl.show_time ? ' ' + data.time : '')} />}
              {tpl.show_cashier && <A5InfoRow label="╪د┘┘â╪د╪┤┘è╪▒" value={data.cashier} />}
            </tbody>
          </table>
        </div>
      </div>

      {tpl.show_client && data.client && (
        <div style={{ fontSize: tpl.company_info_size, marginBottom: 10, padding: 8, background: '#f9fafb', borderRadius: 4 }}>
          <span style={{ fontWeight: 700 }}>╪د┘╪╣┘à┘è┘: </span>{data.client}
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
            {tpl.show_total_ht && <A5TotalRow label="╪د┘┘à╪ش┘à┘ê╪╣ HT" val={data.totalHt} />}
            {tpl.show_discount_total && data.totalDiscount > 0 && <A5TotalRow label="╪د┘╪«╪╡┘à" val={-data.totalDiscount} red />}
            {tpl.show_total_tva && <A5TotalRow label="TVA" val={data.totalTva} />}
            {tpl.show_fiscal_stamp && data.fiscalStamp > 0 && <A5TotalRow label="╪د┘╪╖╪د╪ذ╪╣" val={data.fiscalStamp} />}
            {tpl.show_total_ttc && (
              <tr>
                <td style={{ padding: '6px 8px', borderTop: '2px double #111', fontWeight: tpl.total_ttc_bold ? 900 : 700, fontSize: tpl.total_ttc_font_size, textAlign: 'right' }}>TTC:</td>
                <td style={{ padding: '6px 8px', borderTop: '2px double #111', fontWeight: tpl.total_ttc_bold ? 900 : 700, fontSize: tpl.total_ttc_font_size, textAlign: 'right' }}>{data.totalTtc.toFixed(2)}</td>
              </tr>
            )}
            {tpl.show_paid_amount && <A5TotalRow label="╪د┘┘à╪»┘┘ê╪╣" val={data.paid} bold />}
            {tpl.show_change && <A5TotalRow label="╪د┘╪ذ╪د┘é┘è" val={data.change} />}
            {tpl.show_remaining && data.remaining > 0 && <A5TotalRow label="╪د┘┘à╪ز╪ذ┘é┘è" val={data.remaining} red />}
          </tbody>
        </table>
      </div>

      {tpl.show_payment_details && data.payments.length > 0 && (
        <div style={{ fontSize: tpl.payment_font_size, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>┘ê╪│╪د╪خ┘ ╪د┘╪»┘╪╣:</div>
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
                <span style={{ fontSize: tpl.base_font_size - 1 }}>╪ح┘à╪╢╪د╪ة ╪د┘┘â╪د╪┤┘è╪▒</span>
              </div>
            )}
            {tpl.show_client_signature && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 80, borderTop: '1px solid #111', marginBottom: 2 }} />
                <span style={{ fontSize: tpl.base_font_size - 1 }}>╪ح┘à╪╢╪د╪ة ╪د┘╪╣┘à┘è┘</span>
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
