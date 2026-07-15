import React from 'react';
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { printFieldResolver } from '../../services';
import { formatDate } from './shared';
import { renderLogo } from './LogoRenderer';

// ─── Color Palette (matching the HTML template exactly) ──────────────────────
const INK   = '#0a0a0a';
const MUTED = '#5c5c5c';
const LINE  = '#2a2a2a';
const TINT  = '#f5f5f5';
const DARK  = '#e7e7e7';

// ─── Helpers ────────────────────────────────────────────────────────────────

function field(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function fmtCurrency(v: unknown): string {
  const n = Number(v ?? 0);
  const [intPart, decPart] = n.toFixed(2).split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces}.${decPart}`;
}

function parseUnitMultiplier(unit: string | null | undefined): number {
  if (!unit) return 1;
  const m = unit.match(/\((\d+)\)/);
  return m ? parseInt(m[1], 10) : 1;
}

function computeTotalQty(line: { quantity: number; unit?: string | null }): number {
  return line.quantity * parseUnitMultiplier(line.unit);
}

// ─── Code 39 Barcode Encoder ────────────────────────────────────────────────
// Ported byte-for-byte from python-barcode reference / the HTML template.
// Encodes uppercase ASCII + (-) . (space) $ / + %  and produces a run-length
// string of '1' (bar) and '0' (space) characters including start/stop "*".

const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
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
const CODE39_MAP: Record<string, string> = {};
CODE39_CHARS.split('').forEach((ch, i) => { CODE39_MAP[ch] = CODE39_PATTERNS[i]; });
const CODE39_EDGE = '100010111011101';

function encodeCode39(raw: string): string {
  const code = raw.toUpperCase();
  const parts = [CODE39_EDGE];
  for (let i = 0; i < code.length; i++) {
    const pat = CODE39_MAP[code[i]];
    if (pat) parts.push(pat);
  }
  parts.push(CODE39_EDGE);
  return parts.join('0');
}

/** Group consecutive same-bit runs: [{ bit, len }] */
function runLengths(pattern: string): { bit: string; len: number }[] {
  const runs: { bit: string; len: number }[] = [];
  let i = 0;
  while (i < pattern.length) {
    const bit = pattern[i];
    let start = i;
    while (i < pattern.length && pattern[i] === bit) i++;
    runs.push({ bit, len: i - start });
  }
  return runs;
}

const BarcodeBars: React.FC<{ value: string }> = React.memo(({ value }) => {
  const pattern = encodeCode39(value);
  const runs = runLengths(pattern);
  const unitW = 0.34; // mm per bit-unit
  const height = 13;  // mm

  return (
    <div style={{ direction: 'ltr', display: 'inline-flex', alignItems: 'flex-end', lineHeight: 0 }}>
      {runs.map((r, i) =>
        r.bit === '1' ? (
          <div key={i} style={{ width: `${r.len * unitW}mm`, height: `${height}mm`, background: INK, flexShrink: 0 }} />
        ) : (
          <div key={i} style={{ width: `${r.len * unitW}mm`, height: `${height}mm`, flexShrink: 0 }} />
        )
      )}
    </div>
  );
});
BarcodeBars.displayName = 'BarcodeBars';

// ─── Styles ─────────────────────────────────────────────────────────────────

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
  const docNumber = field('document.number', data, tpl) as string;
  const docDate   = field('document.date', data, tpl) as string;
  const cashier   = field('customer.cashierName', data, tpl) as string;
  const clientName = field('customer.name', data, tpl) as string;
  const clientPhone = field('customer.phone', data, tpl) as string;

  const sumQty = data.lines.reduce((sum, l) => sum + l.quantity, 0);

  const prevBalance = data.balance?.previous ?? 0;
  const newBalance  = data.balance?.current ?? 0;
  const totalAmount = data.totals.totalTtc + prevBalance;

  // ── Shared: Company name + activity (used in both logo and no-logo branches) ──
  const companyActivity = tpl.show_activity && field('company.activity', data, tpl) && (
    <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 500, marginTop: 1 }}>
      {field('company.activity', data, tpl)}
    </div>
  );

  const companyName = tpl.show_company_name && (
    <div style={{
      fontSize: tpl.company_name_size ?? 20,
      fontWeight: tpl.company_name_bold ? 900 : 800,
      color: INK,
      lineHeight: 1.15,
      fontFamily: "'Tajawal', sans-serif",
    }}>
      {field('company.name', data, tpl)}
    </div>
  );

  // ── Top Decorative Bar ──
  const topBar: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2.5mm',
    background: DARK,
  };

  // ── Header Grid ──
  const headerGrid: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  };

  // ── Brand ──
  const brandWrap: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  // ── Company Contact Box ──
  const contactBox: React.CSSProperties = {
    ...BORDER_BOX_ACCENT,
    padding: '7px 12px',
    fontSize: 11,
    lineHeight: 1.85,
    color: MUTED,
    marginTop: 5,
    marginLeft: 10,
  };

  // ── Title ──
  const titleBlock: React.CSSProperties = {
    marginTop: 5,
    textAlign: 'center',
  };

  const titleText: React.CSSProperties = {
    fontSize: tpl.title_size ?? 23,
    fontWeight: tpl.title_bold ? 900 : 800,
    color: INK,
    letterSpacing: 1.5,
    position: 'relative',
    display: 'inline-block',
    paddingBottom: 4,
  };

  // ── Doc Info Box ──
  const docInfoBox: React.CSSProperties = {
    ...BORDER_BOX,
    padding: '6px 12px',
    fontSize: 11.5,
    lineHeight: 1.9,
  };

  // ── Client Card ──
  const clientCard: React.CSSProperties = {
    ...BORDER_BOX_ACCENT,
    padding: '7px 12px',
    fontSize: 12,
    lineHeight: 1.9,
    marginRight: 5,
  };

  // ── Separator ──
  const sepStyle: React.CSSProperties = {
    border: 'none',
    borderTop: '1px solid #d5d5d5',
    margin: '4mm 0 3mm',
  };

  // ── Items Table ──
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: tpl.items_font_size ?? 11.5,
    fontFamily: "'Tajawal', sans-serif",
  };

  const thStyle: React.CSSProperties = {
    background: LINE,
    color: '#fff',
    fontWeight: 700,
    padding: '6px 4px',
    border: `1px solid ${LINE}`,
    fontSize: tpl.items_font_size ?? 11.5,
  };

  const tdStyle: React.CSSProperties = {
    border: '1px solid #d5d5d5',
    padding: '6px 5px',
    textAlign: 'center',
  };

  const tdNumeric: React.CSSProperties = {
    ...tdStyle,
    direction: 'ltr',
    unicodeBidi: 'embed',
  };

  // ── Bottom Grid ──
  const bottomGrid: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    marginTop: 3,
    alignItems: 'flex-start',
  };

  // ── Info Card ──
  const infoCard: React.CSSProperties = {
    flex: 0.85,
    ...BORDER_BOX,
    overflow: 'hidden',
    fontSize: 11,
  };

  const infoHead: React.CSSProperties = {
    display: 'flex',
    background: TINT,
    fontWeight: 700,
    borderBottom: `1px solid ${LINE}`,
  };

  const infoHeadCell: React.CSSProperties = {
    flex: 1,
    padding: '5px 6px',
    textAlign: 'center',
  };

  const infoRow: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid #e8e8e8',
  };

  const infoRowLast: React.CSSProperties = {
    ...infoRow,
    borderBottom: 'none',
  };

  const infoCellLabel: React.CSSProperties = {
    flex: 1,
    padding: '5px 6px',
    textAlign: 'center',
    color: MUTED,
  };

  const infoCellValue: React.CSSProperties = {
    flex: 1,
    padding: '5px 6px',
    textAlign: 'center',
    fontWeight: 700,
  };

  // ── Stamp Box ──
  const stampBox: React.CSSProperties = {
    border: '1.5px dashed #a3a3a3',
    borderRadius: 4,
    flex: 1,
    minHeight: 78,
    position: 'relative',
  };

  const stampLabel: React.CSSProperties = {
    position: 'absolute',
    top: 5,
    right: 8,
    fontSize: 11,
    color: MUTED,
    fontWeight: 600,
  };

  // ── Warning Note ──
  const warningNote: React.CSSProperties = {
    fontSize: 9.5,
    color: MUTED,
    lineHeight: 1.5,
    textAlign: 'center',
    padding: '0 2px',
  };

  // ── Totals Card ──
  const totalsCard: React.CSSProperties = {
    flex: 1.25,
    ...BORDER_BOX,
    overflow: 'hidden',
    fontSize: 12,
  };

  const totalsRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 10px',
    borderBottom: '1px solid #e8e8e8',
  };

  const totalsRowLast: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    background: LINE,
    color: '#fff',
    fontWeight: 800,
    fontSize: 13,
    padding: '7px 10px',
    borderTop: `1px solid ${LINE}`,
  };

  // ── Footer ──
  const footerStyle: React.CSSProperties = {
    marginTop: 4,
    textAlign: 'center',
  };

  const printedMeta: React.CSSProperties = {
    fontSize: 10,
    color: MUTED,
    lineHeight: 1.6,
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', paddingTop: '3mm' }}>
      {/* Top decorative bar */}
      <div style={topBar} />

      {/* Header Grid */}
      <div style={headerGrid}>
        {/* ── Right Column: Brand + Contact + Title ── */}
        <div style={{ flex: 1 }}>
          {/* Brand: Logo + Company Name + Activity */}
          <div style={tpl.show_logo ? brandWrap : undefined}>
            {tpl.show_logo && renderLogo(tpl, data)}
            <div>
              {companyName}
              {companyActivity}
            </div>
          </div>

          {/* Company Contact Box */}
          <div style={contactBox}>

            {tpl.show_address && field('company.address', data, tpl) && (
              <div>{tpl.label_address || 'العنوان'}: <b style={VALUE_STYLE}>{field('company.address', data, tpl)}</b></div>
            )}
            {tpl.show_cashier && cashier && (
              <div>الكاشير: <b style={VALUE_STYLE}>{cashier}</b></div>
            )}
            {tpl.show_phone && field('company.phone', data, tpl) && (
              <div>{tpl.label_phone || 'الهاتف'}: {field('company.phone', data, tpl)}</div>
            )}
            {tpl.show_mobile && field('company.mobile', data, tpl) && (
              <div>{tpl.label_mobile || 'المحمول'}: {field('company.mobile', data, tpl)}</div>
            )}
            {tpl.show_fax && field('company.fax', data, tpl) && (
              <div>{tpl.label_fax || 'الفاكس'}: {field('company.fax', data, tpl)}</div>
            )}
            {tpl.show_email && field('company.email', data, tpl) && (
              <div>{tpl.label_email || 'البريد الإلكتروني'}: {field('company.email', data, tpl)}</div>
            )}
            {tpl.show_tax_id && field('company.nif', data, tpl) && (
              <div>{tpl.label_nif || 'NIF'}: {field('company.nif', data, tpl)}</div>
            )}
            {tpl.show_rc && field('company.rc', data, tpl) && (
              <div>{tpl.label_rc || 'RC'}: {field('company.rc', data, tpl)}</div>
            )}
            {tpl.show_nis && field('company.nis', data, tpl) && (
              <div>{tpl.label_nis || 'NIS'}: {field('company.nis', data, tpl)}</div>
            )}
            {tpl.show_article && field('company.article', data, tpl) && (
              <div>{tpl.label_article || 'المادة الجبائية'}: {field('company.article', data, tpl)}</div>
            )}
            {tpl.show_capital && field('company.capital', data, tpl) && (
              <div>{tpl.label_capital || 'رأس المال'}: {field('company.capital', data, tpl)}</div>
            )}
            {tpl.show_commercial_name && field('company.commercialName', data, tpl) && (
              <div>{tpl.label_commercial_name || 'الاسم التجاري'}: {field('company.commercialName', data, tpl)}</div>
            )}
            {tpl.show_bank_name && field('company.bankName', data, tpl) && (
              <div>{tpl.label_bank_name || 'اسم البنك'}: {field('company.bankName', data, tpl)}</div>
            )}
            {tpl.show_rib && field('company.rib', data, tpl) && (
              <div>{tpl.label_rib || 'RIB'}: {field('company.rib', data, tpl)}</div>
            )}
          </div>

          {/* Title */}
          <div style={titleBlock}>
            <span style={titleText}>
              {tpl.title_text || 'وصل تسليم'}
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                left: 0,
                height: 2,
                background: INK,
              }} />
            </span>
          </div>
        </div>

        {/* ── Left Column: Doc Info + Client ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Doc Info Box */}
          <div style={docInfoBox}>
            {tpl.show_doc_number && (
              <div>وصل رقم: <b style={VALUE_STYLE}>{fmt(docNumber)}</b></div>
            )}
            {tpl.show_date && (
              <div>التاريخ: <b style={VALUE_STYLE}>{fmt(formatDate(docDate))}</b></div>
            )}
            <div>الصفحة: <b style={VALUE_STYLE}>1/1</b></div>
          </div>

          {/* Client Card */}
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
              {tpl.show_client_address && field('customer.address', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_client_address || 'العنوان'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(field('customer.address', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_commercial_name && field('customer.commercialName', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_commercial_name || 'الاسم التجاري'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(field('customer.commercialName', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_nif && field('customer.nif', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_client_nif || 'NIF العميل'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(field('customer.nif', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_rc && field('customer.rc', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_rc || 'RC'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(field('customer.rc', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_nis && field('customer.nis', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_nis || 'NIS'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(field('customer.nis', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_ai && field('customer.ai', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_ai || 'المادة الجبائية'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(field('customer.ai', data, tpl))}</span>
                </>
              )}
              {tpl.show_customer_mobile && field('customer.mobile', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_customer_mobile || 'المحمول'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(field('customer.mobile', data, tpl))}</span>
                </>
              )}
              {tpl.show_delivery_address && field('customer.deliveryAddress', data, tpl) && (
                <>
                  <br />
                  <span style={LABEL_STYLE}>{tpl.label_delivery_address || 'عنوان التسليم'}:</span>{' '}
                  <span style={VALUE_STYLE}>{fmt(field('customer.deliveryAddress', data, tpl))}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <hr style={sepStyle} />

      {/* Items Table */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '6%', color: MUTED }}>رقم</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>التعيين</th>
            <th style={{ ...thStyle, width: '9%', fontWeight: 800, fontSize: 13 }}>الكمية</th>
            <th style={{ ...thStyle, width: '5%', color: MUTED, fontWeight: 700 }}>×</th>
            <th style={{ ...thStyle, width: '15%' }}>الوحدة</th>
            <th style={{ ...thStyle, width: '11%' }}>الكمية الإجمالية</th>
            <th style={{ ...thStyle, width: '12%' }}>الثمن الوحدي</th>
            <th style={{ ...thStyle, width: '16%', fontWeight: 800 }}>المبلغ</th>
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
                <td style={tdStyle}>{idx + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontSize: (tpl.items_font_size ?? 11.5) + 1 }}>
                  {line.name}
                </td>
                <td style={{ ...tdNumeric, fontWeight: 800, fontSize: 13 }}>{line.quantity}</td>
                <td style={{ ...tdStyle, color: MUTED, fontWeight: 700 }}>×</td>
                <td style={tdStyle}>{line.unit || '—'}</td>
                <td style={tdNumeric}>{computeTotalQty(line)}</td>
                <td style={tdNumeric}>{fmtCurrency(priceDisplay)}</td>
                <td style={{ ...tdNumeric, fontWeight: 800 }}>{fmtCurrency(amount)}</td>
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
        {/* Info Card */}
        <div style={infoCard}>
          <div style={infoHead}>
            <div style={infoHeadCell}>معلومة</div>
            <div style={infoHeadCell}>القيمة</div>
          </div>
          <div style={infoRow}>
            <div style={infoCellLabel}>صفحات</div>
            <div style={infoCellValue}>1</div>
          </div>
          <div style={infoRowLast}>
            <div style={infoCellLabel}>الكمية</div>
            <div style={infoCellValue}>{sumQty}</div>
          </div>
        </div>

        {/* Middle Column: Stamp + Warning */}
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

        {/* Totals Card */}
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
        {tpl.show_barcode && (
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <BarcodeBars value={tpl.barcode_content === 'custom' ? (tpl.barcode_custom_text ?? '') : docNumber} />
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 11,
              letterSpacing: 2,
              color: MUTED,
              direction: 'ltr',
            }}>
              {tpl.barcode_content === 'custom' ? tpl.barcode_custom_text : docNumber}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(DeliveryReceiptA5);
