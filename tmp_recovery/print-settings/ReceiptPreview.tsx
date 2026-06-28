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
    cashier: live?.cashierName ?? '╪ث╪ص┘à╪» ╪ذ┘ ╪╣┘┘è',
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
        {tpl.show_phone   && co.phone   && <div>ظء {co.phone}</div>}
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
        {tpl.show_doc_number && <DocRow label="╪▒┘é┘à:" value={doc.number} mono />}
        {tpl.show_date && <DocRow label="╪د┘╪ز╪د╪▒┘è╪«:" value={`${doc.date}${tpl.show_time ? ' ' + doc.time : ''}`} />}
        {tpl.show_cashier && doc.cashier && <DocRow label="╪د┘┘â╪د╪┤┘è╪▒:" value={doc.cashier} />}
        {tpl.show_client && doc.client?.name && (
          <>
            <DocRow label="╪د┘╪╣┘à┘è┘:" value={doc.client.name} />
            {tpl.show_client_nif     && doc.client.nif     && <DocRow label="NIF ╪د┘╪╣┘à┘è┘:" value={doc.client.nif} />}
            {tpl.show_client_phone   && doc.client.phone   && <DocRow label="┘ç╪د╪ز┘ ╪د┘╪╣┘à┘è┘:" value={doc.client.phone} />}
            {tpl.show_client_address && doc.client.address && <DocRow label="╪د┘╪╣┘┘ê╪د┘:" value={doc.client.address} />}
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
    rowNumber: '#', barcode: '╪ذ╪د╪▒┘â┘ê╪»', ref: '┘à╪▒╪ش╪╣',
    name: '╪د┘╪ذ┘è╪د┘', unit: '┘ê╪ص╪»╪ر', quantity: '┘â┘à┘è╪ر',
    price: '╪│╪╣╪▒', discount: '╪«╪╡┘à', tva: 'TVA', total: '┘à╪ش┘à┘ê╪╣',
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
      {tpl.show_total_ht      && <TRow label="╪د┘┘à╪ش┘à┘ê╪╣ HT"        val={t.totalHt} />}
      {tpl.show_discount_total && t.totalDiscount > 0 && (
        <TRow label="╪ح╪ش┘à╪د┘┘è ╪د┘╪«╪╡┘ê┘à╪د╪ز" val={-t.totalDiscount} red />
      )}
      {tpl.show_total_tva     && <TRow label="TVA"               val={t.totalTva} />}
      {tpl.show_tva_breakdown && t.tvaByRate.map(r => (
        <TRow key={r.rate} label={`  TVA ${r.rate}%`} val={r.amount} />
      ))}
      {tpl.show_fiscal_stamp  && t.fiscalStamp > 0 && (
        <TRow label="╪د┘╪╖╪د╪ذ╪╣ ╪د┘╪ش╪ذ╪د╪خ┘è" val={t.fiscalStamp} />
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
          <span>╪د┘┘à╪ش┘à┘ê╪╣ TTC:</span>
          <span dir="ltr">{t.totalTtc.toFixed(2)} ╪»╪ش</span>
        </div>
      )}

      {tpl.show_amount_in_words && (
        <div style={{ fontSize: fs - 1, textAlign: 'center', color: '#555', marginTop: 2 }}>
          <em>┘┘é╪╖: ╪│╪ز┘à╪د╪خ╪ر ┘ê╪«┘à╪│╪ر ┘ê╪«┘à╪│┘ê┘ ╪»┘è┘╪د╪▒╪د┘ï ╪ش╪▓╪د╪خ╪▒┘è╪د┘ï</em>
        </div>
      )}

      {tpl.show_paid_amount   && <TRow label="╪د┘┘à╪»┘┘ê╪╣"        val={t.paid} bold />}
      {tpl.show_change        && <TRow label="╪د┘╪ذ╪د┘é┘è"         val={t.change} />}
      {tpl.show_remaining     && t.remaining > 0 && <TRow label="╪د┘┘à╪ز╪ذ┘é┘è"  val={t.remaining} red />}
      {tpl.show_prev_balance  && <TRow label="╪د┘╪▒╪╡┘è╪» ╪د┘╪│╪د╪ذ┘é"  val={t.prevBalance} />}
      {tpl.show_new_balance   && <TRow label="╪د┘╪▒╪╡┘è╪» ╪د┘╪ش╪»┘è╪»"  val={t.newBalance} bold />}
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
      <div style={{ fontWeight: 700, marginBottom: 2 }}>┘ê╪│╪د╪خ┘ ╪د┘╪»┘╪╣:</div>
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
              <span>╪ح┘à╪╢╪د╪ة ╪د┘┘â╪د╪┤┘è╪▒</span>
            </div>
          )}
          {tpl.show_client_signature && (
            <div>
              <div style={{ width: 70, borderTop: '1px solid #111', marginBottom: 3 }} />
              <span>╪ح┘à╪╢╪د╪ة ╪د┘╪╣┘à┘è┘</span>
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
          ╪«╪ز┘à
        </div>
      )}
    </div>
  );
}
