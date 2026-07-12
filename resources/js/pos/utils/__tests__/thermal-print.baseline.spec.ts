// ════════════════════════════════════════════════════════════════════════════
// pos/utils/__tests__/thermal-print.baseline.spec.ts
//
// Baseline vitest suite for the thermal ESC/POS print path.
//
// Captures current behavior of buildReceiptBytesFromTemplate() BEFORE the
// Stage 1 (Section Visibility Gates) refactor.
//
// Design:
//   - Tests marked "BASELINE — no change expected" must pass identically
//     before and after Stage 1.
//   - Tests under "Current behavior (pre-fix)" deliberately document the
//     BROKEN state (sections appearing when their show_*_section flag is
//     OFF). After Stage 1, these assertions will be inverted.
//
// Encoding note:
//   ESC/POS output uses Windows-1256 for Arabic text. We assert on:
//     (a) ESC/POS command bytes (always ASCII-safe)
//     (b) ASCII content embedded in the receipt (doc numbers, NIFs, QR data,
//         numeric values, company names written in Latin chars)
//     (c) Byte length as a proxy for structural presence
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { buildReceiptBytesFromTemplate } from '@/pos/utils/printService';
import { emptyDocumentData } from '@/pages/settings/print-settings/types/data';
import { createMockTemplate } from '@/pages/settings/print-settings/__tests__/fixtures/templates';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import type { PrintTemplate, DocTypeCode } from '@/pages/settings/print-settings/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a Uint8Array to a hex string for readable test output */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

/** Check if a Uint8Array contains a byte subsequence */
function containsBytes(haystack: Uint8Array, needle: number[]): boolean {
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

/** Check if a Uint8Array contains an ASCII string */
function containsAscii(haystack: Uint8Array, text: string): boolean {
  return containsBytes(haystack, [...text].map(c => c.charCodeAt(0) & 0xFF));
}

// ─── Factories ──────────────────────────────────────────────────────────────

function makeData(overrides: Partial<UniversalDocumentData> = {}): UniversalDocumentData {
  return {
    ...emptyDocumentData(),
    ...overrides,
  } as UniversalDocumentData;
}

function makeTemplate(overrides: Partial<PrintTemplate> = {}): PrintTemplate {
  return createMockTemplate({
    show_header_section: true,
    show_doc_info_section: true,
    show_items_section: true,
    show_totals_section: true,
    show_payments_section: true,
    show_footer_section: true,
    ...overrides,
  }) as PrintTemplate;
}

// ─── Baseline structural tests (must pass before AND after Stage 1) ─────────

describe('ThermalPrintPath — baseline structural', () => {

  it('starts with ESC/POS init sequence (ESC @, ESC t 16)', () => {
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), makeData());
    expect(bytes[0]).toBe(0x1B);   // ESC
    expect(bytes[1]).toBe(0x40);   // @
    expect(bytes.slice(2, 5)).toEqual(new Uint8Array([0x1B, 0x74, 0x10])); // ESC t 16
  });

  it('ends with GS V NUL (cut command)', () => {
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), makeData());
    const len = bytes.length;
    expect(bytes[len - 3]).toBe(0x1D);  // GS
    expect(bytes[len - 2]).toBe(0x56);  // V
    expect(bytes[len - 1]).toBe(0x00);  // NUL
  });

  it('contains company name in output', () => {
    const tpl = makeTemplate({ company_name_text: 'MaSocieteTest' });
    const data = makeData({
      company: { name: 'MaSocieteTest', address: null, phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, 'MaSocieteTest')).toBe(true);
  });

  it('contains doc number in output', () => {
    const docNumber = 'FV-2026-12345';
    const data = makeData({
      doc: { number: docNumber, date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, docNumber);
    expect(containsAscii(bytes, docNumber)).toBe(true);
  });

  it('contains product names in output', () => {
    const data = makeData({
      lines: [{
        rowNumber: 1, ref: 'REF001', barcode: null,
        name: 'ProduitAlpha', unit: 'pcs', quantity: 2,
        unitPriceHt: 100, unitPriceTtc: 119,
        tvaRate: 0.19, tvaPct: 19,
        discountPct: 0, discountAmt: 0,
        totalHt: 200, totalTva: 38, totalTtc: 238,
        lot: null, notes: null,
      }],
      totals: { totalHt: 200, totalTva: 38, totalTtc: 238, fiscalStamp: 0, totalDiscount: 0, paid: 238, change: 0, remaining: 0 },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-001');
    expect(containsAscii(bytes, 'ProduitAlpha')).toBe(true);
  });

  it('contains company NIF when provided', () => {
    const data = makeData({
      company: { name: 'Co', address: null, phone: null, nif: '123456789012345', rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: true }), data);
    expect(containsAscii(bytes, '123456789012345')).toBe(true);
  });

  it('contains footer thank-you text when show_thank_you is true', () => {
    const tpl = makeTemplate({ show_thank_you: true, thank_you_text: 'MerciInfini' });
    const bytes = buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'MerciInfini')).toBe(true);
  });

  it('omits footer thank-you text when show_thank_you is false', () => {
    const tpl = makeTemplate({ show_thank_you: false, thank_you_text: 'MerciInfini' });
    const bytes = buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'MerciInfini')).toBe(false);
  });

  it('contains QR ESC/POS sequence when show_qr is true', () => {
    const tpl = makeTemplate({ show_qr: true });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    // QR Model 2 select: GS ( k 04 00 31 41 32 00
    expect(containsBytes(bytes, [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])).toBe(true);
  });

  it('omits QR sequence when show_qr is false', () => {
    const tpl = makeTemplate({ show_qr: false });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsBytes(bytes, [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])).toBe(false);
  });

  it('uses override_address when provided (resolver override)', () => {
    const tpl = makeTemplate({ show_address: true, override_address: '15 Rue Didouche Mourad' });
    const data = makeData({
      company: { name: 'Co', address: 'Old Address', phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, '15 Rue Didouche Mourad')).toBe(true);
  });

  it('includes party name when party is provided', () => {
    const data = makeData({
      party: { name: 'ClientX', phone: null, address: null },
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-001');
    expect(containsAscii(bytes, 'ClientX')).toBe(true);
  });

  it('produces deterministic output (same input → same bytes)', () => {
    const tpl = makeTemplate();
    const data = makeData();
    const a = buildReceiptBytesFromTemplate(tpl, data);
    const b = buildReceiptBytesFromTemplate(tpl, data);
    expect(a).toEqual(b);
  });

  it('has reasonable length (> 200 bytes for minimal receipt)', () => {
    const data = makeData({
      company: { name: 'A', address: 'B', phone: 'C', nif: 'D', rc: null, nis: null, article: null, logoUrl: null },
      doc: { number: 'FV-1', date: '2026-07-01', dueDate: null, time: '12:00', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-1');
    expect(bytes.length).toBeGreaterThan(200);
  });

  it('has reasonable length for receipt with items (> 400 bytes)', () => {
    const data = makeData({
      company: { name: 'Co', address: 'Addr', phone: '0550000000', nif: 'NIF123', rc: null, nis: null, article: null, logoUrl: null },
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      lines: [{
        rowNumber: 1, ref: 'R1', barcode: null,
        name: 'Item1', unit: 'pcs', quantity: 2,
        unitPriceHt: 500, unitPriceTtc: 595,
        tvaRate: 0.19, tvaPct: 19,
        discountPct: 0, discountAmt: 0,
        totalHt: 1000, totalTva: 190, totalTtc: 1190,
        lot: null, notes: null,
      }],
      totals: { totalHt: 1000, totalTva: 190, totalTtc: 1190, fiscalStamp: 0, totalDiscount: 0, paid: 1190, change: 0, remaining: 0 },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-001');
    expect(bytes.length).toBeGreaterThan(400);
  });
});

// ─── Section visibility gates (Stage 1 behavior) ──────────────────────────
// Each section is correctly gated by its show_*_section flag.
// When a section is OFF, its content does NOT appear in thermal output.

describe('ThermalPrintPath — section visibility gates (Stage 1)', () => {

  it('header is omitted when show_header_section is OFF', () => {
    const tpl = makeTemplate({
      show_header_section: false,
      company_name_text: 'HiddenHeaderSectionCo',
    });
    const data = makeData({
      company: { name: 'HiddenHeaderSectionCo', address: null, phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, 'HiddenHeaderSectionCo')).toBe(false);
  });

  it('doc info is omitted when show_doc_info_section is OFF', () => {
    const tpl = makeTemplate({ show_doc_info_section: false });
    const docNumber = 'SECRET-DOC-999';
    const data = makeData({
      party: { name: 'PartyZ', phone: null, address: null },
      doc: { number: docNumber, date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data, docNumber);
    expect(containsAscii(bytes, docNumber)).toBe(false);
  });

  it('items are omitted when show_items_section is OFF', () => {
    const tpl = makeTemplate({ show_items_section: false });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      lines: [{
        rowNumber: 1, ref: 'R1', barcode: null,
        name: 'HiddenItem', unit: 'pcs', quantity: 1,
        unitPriceHt: 100, unitPriceTtc: 119,
        tvaRate: 0.19, tvaPct: 19,
        discountPct: 0, discountAmt: 0,
        totalHt: 100, totalTva: 19, totalTtc: 119,
        lot: null, notes: null,
      }],
      totals: { totalHt: 100, totalTva: 19, totalTtc: 119, fiscalStamp: 0, totalDiscount: 0, paid: 119, change: 0, remaining: 0 },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsAscii(bytes, 'HiddenItem')).toBe(false);
  });

  it('totals are omitted when show_totals_section is OFF', () => {
    const tpl = makeTemplate({ show_totals_section: false });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      lines: [{
        rowNumber: 1, ref: 'R1', barcode: null,
        name: 'Item', unit: 'pcs', quantity: 1,
        unitPriceHt: 100, unitPriceTtc: 119,
        tvaRate: 0.19, tvaPct: 19,
        discountPct: 0, discountAmt: 0,
        totalHt: 100, totalTva: 19, totalTtc: 119,
        lot: null, notes: null,
      }],
      totals: { totalHt: 100, totalTva: 19, totalTtc: 119, fiscalStamp: 0, totalDiscount: 0, paid: 119, change: 0, remaining: 0 },
    });
    const bytes1 = buildReceiptBytesFromTemplate(makeTemplate({ show_totals_section: true }), data, 'FV-001');
    const bytes2 = buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(bytes2.length).toBeLessThan(bytes1.length);
  });

  it('footer is omitted when show_footer_section is OFF', () => {
    const tpl = makeTemplate({
      show_footer_section: false,
      show_thank_you: true,
      thank_you_text: 'FooterShouldNotAppear',
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'FooterShouldNotAppear')).toBe(false);
  });
});

// ─── Stage 2: Header / Company Info Settings ────────────────────────────────

const HEADER_CO = {
  name: 'Stage2Co', address: '15 Rue Test', phone: '0550123456',
  nif: 'NIF123456789', rc: 'RC00123', nis: 'NIS00999',
  article: '12-34', logoUrl: null,
};

function headerData(overrides = {}): UniversalDocumentData {
  return makeData({ company: { ...HEADER_CO, ...overrides } });
}

describe('ThermalPrintPath — company info visibility gates (Stage 2)', () => {

  it('shows company name by default, hides when show_company_name is OFF', () => {
    const base = { show_company_name: true, company_name_text: 'Stage2Co' };
    const on   = buildReceiptBytesFromTemplate(makeTemplate({ ...base }), headerData());
    const off  = buildReceiptBytesFromTemplate(makeTemplate({ ...base, show_company_name: false }), headerData());
    expect(containsAscii(on, 'Stage2Co')).toBe(true);
    expect(containsAscii(off, 'Stage2Co')).toBe(false);
  });

  it('shows address by default, hides when show_address is OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_address: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_address: false }), headerData());
    expect(containsAscii(on, '15 Rue Test')).toBe(true);
    expect(containsAscii(off, '15 Rue Test')).toBe(false);
  });

  it('shows phone by default, hides when show_phone is OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_phone: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_phone: false }), headerData());
    expect(containsAscii(on, '0550123456')).toBe(true);
    expect(containsAscii(off, '0550123456')).toBe(false);
  });

  it('shows tax ID (NIF) by default, hides when show_tax_id is OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: false }), headerData());
    expect(containsAscii(on, HEADER_CO.nif)).toBe(true);
    expect(containsAscii(off, HEADER_CO.nif)).toBe(false);
  });

  it('shows RC by default, hides when show_rc is OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_rc: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_rc: false }), headerData());
    expect(containsAscii(on, HEADER_CO.rc)).toBe(true);
    expect(containsAscii(off, HEADER_CO.rc)).toBe(false);
  });

  it('shows NIS when show_nis is ON, hides when OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_nis: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_nis: false }), headerData());
    expect(containsAscii(on, HEADER_CO.nis)).toBe(true);
    expect(containsAscii(off, HEADER_CO.nis)).toBe(false);
  });

  it('shows article when show_article is ON, hides when OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_article: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_article: false }), headerData());
    expect(containsAscii(on, HEADER_CO.article)).toBe(true);
    expect(containsAscii(off, HEADER_CO.article)).toBe(false);
  });
});

describe('ThermalPrintPath — company name formatting (Stage 2)', () => {

  it('respects company_name_bold: ON emits ESC E 1, OFF emits ESC E 0', () => {
    const boldOn  = buildReceiptBytesFromTemplate(makeTemplate({ company_name_bold: true  }), headerData());
    const boldOff = buildReceiptBytesFromTemplate(makeTemplate({ company_name_bold: false }), headerData());
    expect(containsBytes(boldOn,  [0x1B, 0x45, 0x01])).toBe(true);
    expect(containsBytes(boldOff, [0x1B, 0x45, 0x00])).toBe(true);
  });

  it('different company_name_size values produce different byte output', () => {
    const small = buildReceiptBytesFromTemplate(makeTemplate({ company_name_size: 8  }), headerData());
    const large = buildReceiptBytesFromTemplate(makeTemplate({ company_name_size: 30 }), headerData());
    expect(small).not.toEqual(large);
  });

  it('respects company_name_align: left→ESC a 0, center→ESC a 1, right→ESC a 2', () => {
    const left  = buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'left'   }), headerData());
    const center= buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'center' }), headerData());
    const right = buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'right'  }), headerData());
    expect(containsBytes(left,   [0x1B, 0x61, 0x00])).toBe(true);
    expect(containsBytes(center, [0x1B, 0x61, 0x01])).toBe(true);
    expect(containsBytes(right,  [0x1B, 0x61, 0x02])).toBe(true);
  });
});

describe('ThermalPrintPath — company info formatting (Stage 2)', () => {

  it('different company_info_size values produce different byte output', () => {
    const small = buildReceiptBytesFromTemplate(makeTemplate({ show_address: true, company_info_size: 6  }), headerData());
    const large = buildReceiptBytesFromTemplate(makeTemplate({ show_address: true, company_info_size: 16 }), headerData());
    expect(small).not.toEqual(large);
  });

  it('respects company_info_align on info fields', () => {
    const left  = buildReceiptBytesFromTemplate(makeTemplate({ company_info_align: 'left'   }), headerData());
    const right = buildReceiptBytesFromTemplate(makeTemplate({ company_info_align: 'right'  }), headerData());
    // Info fields use ESC a n before each info line
    expect(containsBytes(left,  [0x1B, 0x61, 0x00])).toBe(true);
    expect(containsBytes(right, [0x1B, 0x61, 0x02])).toBe(true);
  });
});
