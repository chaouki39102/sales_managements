import React from 'react';
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData, DocumentLine } from '../../types/data';
import { printFieldResolver } from '../../services';
import { formatDate } from './shared';
import { renderLogo } from './LogoRenderer';

// ─── Color Palette ──────────────────────────────────────────────────────────
const INK   = '#0a0a0a';
const MUTED = '#5c5c5c';
const LINE  = '#2a2a2a';
const TINT  = '#f5f5f5';
const DARK  = '#e7e7e7';

// ─── Helpers ────────────────────────────────────────────────────────────────

function r(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function fmtCurrency(v: unknown): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  const [intPart, decPart] = n.toFixed(2).split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces}.${decPart}`;
}

function parseUnitMultiplier(unit: string | null | undefined): number {
  if (!unit) return 1;
  const m = unit.match(/\((\d+)\)/);
  return m ? parseInt(m[1], 10) : 1;
}

function computeTotalQty(line: DocumentLine): number {
  return line.quantity * parseUnitMultiplier(line.unit);
}

// ─── Code39 Barcode ─────────────────────────────────────────────────────────

const CODE39_REF = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'.split('');
const CODE39_PATTERNS = [
  '101000111011101','111010001010111','101110001010111','111011100010101',
  '101000111010111','111010001110101','101110001110101','101000101110111',
  '111010001011101','101110001011101','111010100010111','101110100010111',
  '111011101000101','101011100010111','111010111000101','101110111000101',
  '101010001110111','111010100011101','101110100011101','101011100011101',
  '111010101000111','101110101000111','111011101010001','101011101000111',
  '111010111010001','101110111010001','101010111000111','111010101110001',
  '101110101110001','101011101110001','111000101010111','100011101010111',
  '111000111010101','100010111010111','111000101110101','100011101110101',
  '100010101110111','111000101011101','100011101011101','100010001000101',
  '100010001010001','100010100010001','101000100010001',
];
const CODE39_EDGE = '100010111011101';
const CODE39_MAP: Record<string, string> = {};
CODE39_REF.forEach((ch, i) => { CODE39_MAP[ch] = CODE39_PATTERNS[i]; });

function encodeCode39(raw: string): string {
  const code = String(raw ?? '').toUpperCase();
  const parts: string[] = [CODE39_EDGE];
  for (const ch of code) {
    if (CODE39_MAP[ch]) parts.push(CODE39_MAP[ch]);
  }
  parts.push(CODE39_EDGE);
  return parts.join('0');
}

interface BarcodeBar { x: number; width: number; }

function buildBarcodeBars(value: string, moduleWidth = 0.34): { bars: BarcodeBar[]; totalWidth: number } {
  const pattern = encodeCode39(value);
  const bars: BarcodeBar[] = [];
  let x = 0;
  let i = 0;
  while (i < pattern.length) {
    const bit = pattern[i];
    const start = i;
    while (i < pattern.length && pattern[i] === bit) i++;
    const width = (i - start) * moduleWidth;
    if (bit === '1') bars.push({ x, width });
    x += width;
  }
  return { bars, totalWidth: x };
}

// ─── Static Styles ──────────────────────────────────────────────────────────

const BORDER_BOX: React.CSSProperties = {
  border: `1px solid ${LINE}`,
  borderRadius: 3,
};

const BORDER_BOX_ACCENT: React.CSSProperties = {
  ...BORDER_BOX,
  borderRight: `3px solid ${INK}`,
};

const LABEL_STYLE: React.CSSProperties = {
  color: MUTED,
  fontWeight: 500,
};

const VALUE_STYLE: React.CSSProperties = {
  fontWeight: 700,
  color: INK,
};

// ─── Main Renderer ──────────────────────────────────────────────────────────

function DeliveryReceiptA5({ tpl, data }: { tpl: PrintTemplate; data: UniversalDocumentData }) {
  const docNumber   = r('document.number', data, tpl) as string;
  const docDate     = r('document.date', data, tpl) as string;
  const cashier     = r('customer.cashierName', data, tpl) as string;
  const clientName  = r('customer.name', data, tpl) as string;
  const clientPhone = r('customer.phone', data, tpl) as string;

  const sumQty   = data.lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalQty = data.lines.reduce((sum, l) => sum + computeTotalQty(l), 0);

  const prevBalance = data.balance?.previous ?? 0;
  // ✅ totalAmount - paid: works for ALL doc types (accounting + non-accounting).
  // For non-accounting docs (BL, DEV, BCC), data.balance?.current = previousBalance
  // (unchanged), but the receipt must show the running total debt.
  const totalAmount = data.totals.netToPay + prevBalance;
  const newBalance  = totalAmount - (data.totals.paid ?? 0);

  // ── Barcode (pre-computed) ──
  const barcodeValue = tpl.show_barcode
    ? ((tpl.barcode_content === 'custom' ? tpl.barcode_custom_text : docNumber) ?? '')
    : '';
  const barcode = tpl.show_barcode && barcodeValue ? buildBarcodeBars(barcodeValue) : null;

  // ── Top Decorative Bar ──
  const topBar: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '2.5mm', background: DARK,
  };

  // ── Header Grid ──
  const headerGrid: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginTop: 4,
  };

  // ── Brand ──
  const brandWrap: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
  };

  const companyNameStyle: React.CSSProperties = {
    fontSize: tpl.company_name_size ?? 20,
    fontWeight: tpl.company_name_bold ? 900 : 800,
    color: INK, lineHeight: 1.15, fontFamily: "'Tajawal', sans-serif",
  };

  const activityStyle: React.CSSProperties = {
    fontSize: 10.5, color: MUTED, fontWeight: 500, marginTop: 1,
  };

  // ── Company Contact Box ──
  const contactBox: React.CSSProperties = {
    ...BORDER_BOX_ACCENT, padding: '7px 12px', fontSize: 11,
    lineHeight: 1.85, color: MUTED, marginTop: 5,
  };

  // ── Title ──
  const titleBlock: React.CSSProperties = {
    marginTop: 5, textAlign: 'center',
  };

  const titleText: React.CSSProperties = {
    fontSize: tpl.title_size ?? 23,
    fontWeight: tpl.title_bold ? 900 : 800,
    color: INK, letterSpacing: 1.5,
    position: 'relative', display: 'inline-block', paddingBottom: 4,
  };

  const titleUnderline: React.CSSProperties = {
    position: 'absolute', bottom: 0, right: 0, left: 0,
    height: 2, background: INK,
  };

  // ── Doc Info Box ──
  const docInfoBox: React.CSSProperties = {
    ...BORDER_BOX, padding: '6px 12px', fontSize: 11.5, lineHeight: 1.9,
  };

  // ── Client Card ──
  const clientCard: React.CSSProperties = {
    ...BORDER_BOX_ACCENT, padding: '7px 12px', fontSize: 12,
    lineHeight: 1.9,
  };

  // ── Separator ──
  const sepStyle: React.CSSProperties = {
    border: 'none', borderTop: '1px solid #d5d5d5', margin: '4mm 0 3mm',
  };

  // ── Items Table ──
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: tpl.table_header_radius ? 'separate' : 'collapse',
    borderSpacing: 0,
    fontSize: tpl.items_font_size ?? 11.5,
    fontFamily: "'Tajawal', sans-serif",
  };

  const thStyle: React.CSSProperties = {
    background: tpl.table_header_bg || INK,
    color: tpl.table_header_color || '#fff',
    fontWeight: tpl.table_header_bold !== false ? 700 : 400,
    padding: '6px 4px',
    border: `1px solid ${INK}`,
    fontSize: tpl.items_font_size ?? 11.5,
  };

  const thRadius = tpl.table_header_radius || 0;

  const tdStyle: React.CSSProperties = {
    border: '1px solid #d5d5d5', padding: '6px 5px', textAlign: 'center',
  };

  const tdStyleNum: React.CSSProperties = {
    ...tdStyle, direction: 'ltr',
  };

  // ── Bottom Grid ──
  const bottomGrid: React.CSSProperties = {
    display: 'flex', gap: 8, marginTop: 3, alignItems: 'flex-start',
  };

  // ── Info Card ──
  const infoCard: React.CSSProperties = {
    flex: 0.85, ...BORDER_BOX, overflow: 'hidden', fontSize: 11,
  };

  const infoHead: React.CSSProperties = {
    display: 'flex', background: TINT, fontWeight: 700, borderBottom: `1px solid ${LINE}`,
  };

  const infoHeadCell: React.CSSProperties = {
    flex: 1, padding: '5px 6px', textAlign: 'center',
  };

  const infoRow: React.CSSProperties = {
    display: 'flex', borderBottom: '1px solid #e8e8e8',
  };

  const infoRowLast: React.CSSProperties = {
    ...infoRow, borderBottom: 'none',
  };

  const infoCellLabel: React.CSSProperties = {
    flex: 1, padding: '5px 6px', textAlign: 'center', color: MUTED,
  };

  const infoCellValue: React.CSSProperties = {
    flex: 1, padding: '5px 6px', textAlign: 'center', fontWeight: 700,
  };

  // ── Stamp Box ──
  const stampBox: React.CSSProperties = {
    border: '1.5px dashed #a3a3a3', borderRadius: 4,
    flex: 1, minHeight: 78, position: 'relative',
  };

  const stampLabel: React.CSSProperties = {
    position: 'absolute', top: 5, right: 8,
    fontSize: 11, color: MUTED, fontWeight: 600,
  };

  // ── Warning Note ──
  const warningNote: React.CSSProperties = {
    fontSize: 9.5, color: MUTED, lineHeight: 1.5, textAlign: 'center', padding: '0 2px',
  };

  // ── Totals Card ──
  const totalsCard: React.CSSProperties = {
    flex: 1.25, ...BORDER_BOX, overflow: 'hidden', fontSize: 12,
  };

  const totalsRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #e8e8e8',
  };

  const totalsRowLast: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between',
    background: INK, color: '#fff', fontWeight: 800, fontSize: 13,
    padding: '7px 10px', borderTop: `1px solid ${INK}`,
  };

  // ── Footer ──
  const footerStyle: React.CSSProperties = {
    marginTop: 4, textAlign: 'center',
  };

  const printedMeta: React.CSSProperties = {
    fontSize: 10, color: MUTED, lineHeight: 1.6,
  };

  // ── Brand name+activity block (used in both logo and no-logo branches) ──
  const nameActivityBlock = (
    <div>
      {tpl.show_company_name && (
        <div style={companyNameStyle}>{r('company.name', data, tpl)}</div>
      )}
      {tpl.show_activity && r('company.activity', data, tpl) && (
        <div style={activityStyle}>{r('company.activity', data, tpl)}</div>
      )}
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', paddingTop: '3mm' }}>
      <div style={topBar} />

      <div style={headerGrid}>
        {/* ── Right Column: Brand + Contact + Title ── */}
        <div style={{ flex: 1 }}>
          {tpl.show_logo ? (
            <div style={brandWrap}>
              {renderLogo(tpl, data)}
              {nameActivityBlock}
            </div>
          ) : nameActivityBlock}

          <div style={contactBox}>
            {tpl.show_phone && r('company.phone', data, tpl) && (
              <div>{tpl.label_phone || 'الهاتف'}: {r('company.phone', data, tpl)}</div>
            )}
            {tpl.show_address && r('company.address', data, tpl) && (
              <div>{tpl.label_address || 'العنوان'}: <b style={VALUE_STYLE}>{r('company.address', data, tpl)}</b></div>
            )}
            {tpl.show_cashier && cashier && (
              <div>الكاشير: <b style={VALUE_STYLE}>{cashier}</b></div>
            )}
            {tpl.show_mobile && r('company.mobile', data, tpl) && (
              <div>{tpl.label_mobile || 'المحمول'}: {r('company.mobile', data, tpl)}</div>
            )}
            {tpl.show_fax && r('company.fax', data, tpl) && (
              <div>{tpl.label_fax || 'الفاكس'}: {r('company.fax', data, tpl)}</div>
            )}
            {tpl.show_email && r('company.email', data, tpl) && (
              <div>{tpl.label_email || 'البريد الإلكتروني'}: {r('company.email', data, tpl)}</div>
            )}
            {tpl.show_tax_id && r('company.nif', data, tpl) && (
              <div>{tpl.label_nif || 'NIF'}: {r('company.nif', data, tpl)}</div>
            )}
            {tpl.show_rc && r('company.rc', data, tpl) && (
              <div>{tpl.label_rc || 'RC'}: {r('company.rc', data, tpl)}</div>
            )}
            {tpl.show_nis && r('company.nis', data, tpl) && (
              <div>{tpl.label_nis || 'NIS'}: {r('company.nis', data, tpl)}</div>
            )}
            {tpl.show_article && r('company.article', data, tpl) && (
              <div>{tpl.label_article || 'المادة الجبائية'}: {r('company.article', data, tpl)}</div>
            )}
            {tpl.show_capital && r('company.capital', data, tpl) && (
              <div>{tpl.label_capital || 'رأس المال'}: {r('company.capital', data, tpl)}</div>
            )}
            {tpl.show_commercial_name && r('company.commercialName', data, tpl) && (
              <div>{tpl.label_commercial_name || 'الاسم التجاري'}: {r('company.commercialName', data, tpl)}</div>
            )}
            {tpl.show_bank_name && r('company.bankName', data, tpl) && (
              <div>{tpl.label_bank_name || 'اسم البنك'}: {r('company.bankName', data, tpl)}</div>
            )}
            {tpl.show_rib && r('company.rib', data, tpl) && (
              <div>{tpl.label_rib || 'RIB'}: {r('company.rib', data, tpl)}</div>
            )}
          </div>

          <div style={titleBlock}>
            <span style={titleText}>
              {tpl.title_text || 'وصل تسليم'}
              <span style={titleUnderline} />
            </span>
          </div>
        </div>

        {/* ── Left Column: Doc Info + Client ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={docInfoBox}>
            {tpl.show_doc_number && (
              <div>وصل رقم: <b style={VALUE_STYLE}>{fmt(docNumber)}</b></div>
            )}
            {tpl.show_date && (
              <div>التاريخ: <b style={VALUE_STYLE}>{fmt(formatDate(docDate))}</b></div>
            )}
            <div>الصفحة: <b style={VALUE_STYLE}>1/1</b></div>
          </div>

          {tpl.show_client && clientName && (
            <div style={clientCard}>
              <span style={LABEL_STYLE}>المطلوب من:</span>{' '}
              <span style={VALUE_STYLE}>{fmt(clientName)}</span>
              {tpl.show_client_phone && clientPhone && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_client_phone || 'الهاتف'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(clientPhone)}</span>
                </>
              )}
              {tpl.show_client_address && r('customer.address', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_client_address || 'العنوان'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(r('customer.address', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_commercial_name && r('customer.commercialName', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_commercial_name || 'الاسم التجاري'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(r('customer.commercialName', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_nif && r('customer.nif', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_client_nif || 'NIF العميل'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(r('customer.nif', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_rc && r('customer.rc', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_rc || 'RC'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(r('customer.rc', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_nis && r('customer.nis', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_nis || 'NIS'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(r('customer.nis', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_ai && r('customer.ai', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_ai || 'المادة الجبائية'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(r('customer.ai', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_mobile && r('customer.mobile', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_mobile || 'المحمول'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(r('customer.mobile', data, tpl))}</span>
                </>
              )}
              {tpl.show_delivery_address && r('customer.deliveryAddress', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_delivery_address || 'عنوان التسليم'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(r('customer.deliveryAddress', data, tpl))}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <hr style={sepStyle} />

      {/* Items Table */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '6%', color: MUTED, borderRadius: thRadius ? `0 ${thRadius}px ${thRadius}px 0` : undefined }}>رقم</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>التعيين</th>
            <th style={{ ...thStyle, width: '9%', fontWeight: 800, fontSize: 13 }}>الكمية</th>
            <th style={{ ...thStyle, width: '5%', color: MUTED, fontWeight: 700 }}>×</th>
            <th style={{ ...thStyle, width: '15%' }}>الوحدة</th>
            <th style={{ ...thStyle, width: '11%' }}>الكمية الإجمالية</th>
            <th style={{ ...thStyle, width: '12%' }}>الثمن الوحدي</th>
            <th style={{ ...thStyle, width: '16%', fontWeight: 800, borderRadius: thRadius ? `${thRadius}px 0 0 ${thRadius}px` : undefined }}>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, idx) => {
            const priceDisplay = tpl.price_display === 'ttc' ? line.unitPriceTtc : line.unitPriceHt;
            const amount = tpl.show_line_total_ttc ? line.totalTtc : line.totalHt;
            return (
              <tr key={idx} style={{
                background: tpl.alternating_rows && idx % 2 === 1 ? (tpl.alternating_color || TINT) : 'transparent',
              }}>
                <td style={tdStyleNum}>{idx + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontSize: (tpl.items_font_size ?? 11.5) + 1 }}>
                  {line.name}
                </td>
                <td style={{ ...tdStyleNum, fontWeight: 800, fontSize: 13 }}>{line.quantity}</td>
                <td style={{ ...tdStyle, color: MUTED, fontWeight: 700 }}>×</td>
                <td style={tdStyle}>{line.unit || '—'}</td>
                <td style={tdStyleNum}>{computeTotalQty(line)}</td>
                <td style={tdStyleNum}>{fmtCurrency(priceDisplay)}</td>
                <td style={{ ...tdStyleNum, fontWeight: 800 }}>{fmtCurrency(amount)}</td>
              </tr>
            );
          })}
          {data.lines.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={8}>لا توجد بنود</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Bottom Grid */}
      <div style={bottomGrid}>
        <div style={infoCard}>
          <div style={infoHead}>
            <div style={infoHeadCell}>معلومة</div>
            <div style={infoHeadCell}>القيمة</div>
          </div>
          <div style={infoRow}>
            <div style={infoCellLabel}>صفحات</div>
            <div style={infoCellValue}>1</div>
          </div>
          <div style={infoRow}>
            <div style={infoCellLabel}>الكمية</div>
            <div style={infoCellValue}>{sumQty}</div>
          </div>
          <div style={infoRowLast}>
            <div style={infoCellLabel}>الكمية الإجمالية</div>
            <div style={infoCellValue}>{totalQty}</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {tpl.show_stamp && (
            <div style={stampBox}>
              <div style={stampLabel}>الختم</div>
            </div>
          )}
          {tpl.footer_legal_text && (
            <div style={warningNote}>{tpl.footer_legal_text}</div>
          )}
        </div>

        <div style={totalsCard}>
          {tpl.show_total_ttc && (
            <div style={totalsRow}>
              <span>المبلغ TTC</span>
              <span dir="ltr">{fmtCurrency(data.totals.totalTtc)}</span>
            </div>
          )}
          {tpl.show_prev_balance && (
            <div style={totalsRow}>
              <span>الدين القديم</span>
              <span dir="ltr">{fmtCurrency(prevBalance)}</span>
            </div>
          )}
          <div style={totalsRow}>
            <span>المجموع</span>
            <span dir="ltr">{fmtCurrency(totalAmount)}</span>
          </div>
          {tpl.show_paid_amount && (
            <div style={totalsRow}>
              <span>المدفوع</span>
              <span dir="ltr">{fmtCurrency(data.totals.paid)}</span>
            </div>
          )}
          {tpl.show_new_balance && (
            <div style={totalsRowLast}>
              <span>الرصيد الجديد</span>
              <span dir="ltr">{fmtCurrency(newBalance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <div style={printedMeta}>
          {tpl.show_date && docDate && (
            <div>{fmt(formatDate(docDate))} : مطبوعة</div>
          )}
          {tpl.show_cashier && cashier && (
            <div>{cashier} : من طرف</div>
          )}
        </div>
        {barcode && (
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <svg
              width={`${barcode.totalWidth.toFixed(2)}mm`}
              height="13mm"
              viewBox={`0 0 ${barcode.totalWidth.toFixed(2)} 13`}
              style={{ direction: 'ltr', display: 'block' }}
            >
              {barcode.bars.map((bar, i) => (
                <rect key={i} x={bar.x} y={0} width={bar.width} height={13} fill={INK} />
              ))}
            </svg>
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 11, letterSpacing: 2, color: MUTED, direction: 'ltr',
            }}>
              {barcodeValue}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(DeliveryReceiptA5);
