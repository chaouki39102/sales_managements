import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { Separator } from './shared';

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
    parts.push(data.company.name || '');
  }
  return parts.join(' | ');
}

function renderThermalFooter(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_barcode || tpl.show_qr ||
    tpl.show_cashier_signature || tpl.show_client_signature || tpl.show_stamp;

  if (!hasContent) return null;

  return (
    <div style={{ textAlign: 'center', fontSize: tpl.base_font_size - 0.5 }}>
      <Separator style={tpl.footer_separator} />

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
            {qrDataText(tpl, data)}
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

function renderA4Footer(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_bank_details;

  if (!hasContent) return null;

  return (
    <div style={{
      fontSize: tpl.base_font_size - 0.5,
      borderTop: tpl.footer_separator === 'none' ? 'none' : '2px solid #111',
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

function renderA5Footer(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.footer_legal_text ||
    tpl.show_cashier_signature || tpl.show_client_signature;

  if (!hasContent) return null;

  return (
    <div style={{
      textAlign: 'center',
      fontSize: tpl.base_font_size - 0.5,
      borderTop: tpl.footer_separator === 'none' ? 'none' : '1.5px solid #111',
      paddingTop: 10,
    }}>
      {tpl.footer_line1 && <div style={{ marginBottom: 1 }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ marginBottom: 1 }}>{tpl.footer_line2}</div>}

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
  );
}

export function renderFooter(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalFooter(tpl, data);
  if (tpl.paper_size === 'A4') return renderA4Footer(tpl, data);
  return renderA5Footer(tpl, data);
}
