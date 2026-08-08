import type { AlignOption, PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { Separator, borderStyle, align, fontFamily as _fontFamily } from './shared';
import FiscalQR from './FiscalQR';

function barcodeText(tpl: PrintTemplate, data: UniversalDocumentData): string {
  if (tpl.barcode_content === 'custom') return tpl.barcode_custom_text;
  if (tpl.barcode_content === 'total') return `${Number(data.totals.totalTtc).toFixed(2)} دج`;
  return data.doc.number;
}

function qrDataText(tpl: PrintTemplate, data: UniversalDocumentData): string {
  const parts: string[] = [];
  if (tpl.qr_content === 'doc-number' || tpl.qr_content === 'both') {
    parts.push(data.doc.number);
  }
  if (tpl.qr_content === 'company-info' || tpl.qr_content === 'both') {
    parts.push(data.company?.name || '');
  }
  return parts.join(' | ');
}

/**
 * Fiscal e-invoicing takes priority: real API documents carry the backend
 * `qrcode_content` payload (FiscalInvoiceQrService) — always render that.
 * Pre-sale snapshots / previews without a fiscal payload fall back to the
 * legacy template `qr_content` selection.
 */
function qrContent(tpl: PrintTemplate, data: UniversalDocumentData): string {
  if (data.doc.qrcodeContent) return data.doc.qrcodeContent;
  return qrDataText(tpl, data);
}

/** The new fiscal toggle (show_qr_code) supersedes the legacy show_qr — either enables the QR block. */
function qrActive(tpl: PrintTemplate): boolean {
  return Boolean(tpl.show_qr_code || tpl.show_qr);
}

/** When the fiscal toggle is on the user controls size/position; legacy templates keep the paper default. */
function qrSize(tpl: PrintTemplate, paperDefault: number): number {
  return tpl.show_qr_code ? (Number(tpl.qr_code_size) || paperDefault) : paperDefault;
}

function qrAlignOf(tpl: PrintTemplate): AlignOption {
  return tpl.show_qr_code ? (tpl.qr_code_align || 'center') : 'center';
}

function QRBlock(tpl: PrintTemplate, data: UniversalDocumentData, size: number, labelSize: number, qrAlign: AlignOption) {
  return (
    <div style={{ margin: '4px 0', textAlign: align(qrAlign) }}>
      <FiscalQR content={qrContent(tpl, data)} size={size} />
      {!data.doc.qrcodeContent && (
        <div style={{ fontSize: labelSize, color: '#666', marginTop: 1 }}>
          {qrDataText(tpl, data)}
        </div>
      )}
    </div>
  );
}

function renderThermalFooter(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_barcode || tpl.show_qr || tpl.show_qr_code ||
    tpl.show_cashier_signature || tpl.show_client_signature || tpl.show_stamp ||
    tpl.show_bank_details;

  if (!hasContent) return null;

  return (
    <div style={{ textAlign: align(tpl.footer_align), fontSize: tpl.base_font_size - 0.5, color: tpl.footer_text_color }}>
      <Separator style={tpl.footer_separator} />

      {tpl.show_bank_details && tpl.bank_details_text && (
        <div style={{ marginBottom: 6, padding: '4px 0', borderBottom: '1px solid #ddd' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.base_font_size - 0.5, marginBottom: 2 }}>البيانات البنكية</div>
          <div style={{ fontSize: tpl.base_font_size - 1, color: '#555', whiteSpace: 'pre-line' }}>
            {tpl.bank_details_text}
          </div>
        </div>
      )}

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
          fontSize: tpl.thank_you_size,
          fontWeight: 700,
          color: tpl.thank_you_color,
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
                width: i % 3 === 0 ? 2 : 1,
                height: i % 5 === 0 ? 28 : 22,
                background: '#111',
              }} />
            ))}
          </div>
          <div style={{ fontSize: tpl.base_font_size - 1, letterSpacing: 2, marginTop: 2 }}>
            {barcodeText(tpl, data)}
          </div>
        </div>
      )}

      {qrActive(tpl) && QRBlock(tpl, data, qrSize(tpl, 48), 7, qrAlignOf(tpl))}

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

function renderA4Footer(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_barcode || tpl.show_qr || tpl.show_qr_code ||
    tpl.show_bank_details ||
    tpl.show_cashier_signature || tpl.show_client_signature || tpl.show_stamp;

  if (!hasContent) return null;

  return (
    <div style={{
      fontSize: tpl.base_font_size - 0.5,
      borderTop: tpl.footer_separator === 'none' ? 'none' : `2px ${borderStyle(tpl.footer_separator)} #111`,
      paddingTop: 16,
      marginTop: 12,
      textAlign: align(tpl.footer_align),
      color: tpl.footer_text_color,
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
          color: tpl.thank_you_color,
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 1.5, color: '#888', margin: '6px 0' }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {tpl.show_barcode && (
        <div style={{ margin: '8px 0 4px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', gap: 1, alignItems: 'flex-end' }}>
            {Array.from({ length: 48 }, (_, i) => (
              <div key={i} style={{
                width: i % 3 === 0 ? 2 : 1,
                height: i % 5 === 0 ? 28 : 22,
                background: '#111',
              }} />
            ))}
          </div>
          <div style={{ fontSize: tpl.base_font_size - 1, letterSpacing: 2, marginTop: 2 }}>
            {barcodeText(tpl, data)}
          </div>
        </div>
      )}

      {qrActive(tpl) && QRBlock(tpl, data, qrSize(tpl, 48), 7, qrAlignOf(tpl))}

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

function renderA5Footer(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.footer_legal_text ||
    tpl.show_cashier_signature || tpl.show_client_signature ||
    tpl.show_barcode || tpl.show_qr || tpl.show_qr_code ||
    tpl.show_bank_details;

  if (!hasContent) return null;

  return (
    <div style={{
      textAlign: align(tpl.footer_align),
      fontSize: tpl.base_font_size - 0.5,
      color: tpl.footer_text_color,
      borderTop: tpl.footer_separator === 'none' ? 'none' : `1.5px ${borderStyle(tpl.footer_separator)} #111`,
      paddingTop: 10,
    }}>
      {tpl.show_bank_details && tpl.bank_details_text && (
        <div style={{ marginBottom: 6, padding: '4px 0', borderBottom: '1px solid #ddd' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.base_font_size - 0.5, marginBottom: 2 }}>البيانات البنكية</div>
          <div style={{ fontSize: tpl.base_font_size - 1, color: '#555', whiteSpace: 'pre-line' }}>
            {tpl.bank_details_text}
          </div>
        </div>
      )}
      {tpl.footer_line1 && <div style={{ marginBottom: 1 }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ marginBottom: 1 }}>{tpl.footer_line2}</div>}
      {tpl.footer_line3 && <div style={{ marginBottom: 1 }}>{tpl.footer_line3}</div>}

      {tpl.show_returns_policy && tpl.returns_policy_text && (
        <div style={{ fontSize: tpl.base_font_size - 1, color: '#666', marginBottom: 3 }}>
          {tpl.returns_policy_text}
        </div>
      )}

      {tpl.show_thank_you && (
        <div style={{
          fontWeight: 700, fontSize: tpl.thank_you_size,
          color: tpl.thank_you_color, margin: '4px 0',
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 1.5, color: '#888' }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {tpl.show_barcode && (
        <div style={{ margin: '6px 0 4px' }}>
          <div style={{ display: 'inline-flex', gap: 1, alignItems: 'flex-end' }}>
            {Array.from({ length: 36 }, (_, i) => (
              <div key={i} style={{
                width: i % 3 === 0 ? 2 : 1,
                height: i % 5 === 0 ? 22 : 16,
                background: '#111',
              }} />
            ))}
          </div>
          <div style={{ fontSize: tpl.base_font_size - 1.5, letterSpacing: 2, marginTop: 2 }}>
            {barcodeText(tpl, data)}
          </div>
        </div>
      )}

      {qrActive(tpl) && QRBlock(tpl, data, qrSize(tpl, 36), 6, qrAlignOf(tpl))}

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

      {tpl.show_stamp && (
        <div style={{
          width: 50, height: 50, margin: '10px auto',
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

export function renderFooter(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalFooter(tpl, data);
  if (tpl.paper_size === 'A4') return renderA4Footer(tpl, data);
  return renderA5Footer(tpl, data);
}
