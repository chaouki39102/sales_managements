import { describe, it, expect } from 'vitest';
import { buildReceiptBytesFromTemplate } from '@/pos/utils/printService';
import { emptyDocumentData } from '@/pages/settings/print-settings/types/data';
import { createMockTemplate } from '@/pages/settings/print-settings/__tests__/fixtures/templates';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';

function _toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

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

function containsAscii(haystack: Uint8Array, text: string): boolean {
  return containsBytes(haystack, [...text].map(c => c.charCodeAt(0) & 0xFF));
}

function makeData(overrides: Partial<UniversalDocumentData> = {}): UniversalDocumentData {
  return { ...emptyDocumentData(), ...overrides } as UniversalDocumentData;
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

describe('ThermalPrintPath — baseline structural', () => {

  it('starts with ESC/POS init sequence (ESC @, ESC t 16)', async () => {
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate(), makeData());
    expect(bytes[0]).toBe(0x1B);
    expect(bytes[1]).toBe(0x40);
    expect(bytes.slice(2, 5)).toEqual(new Uint8Array([0x1B, 0x74, 0x10]));
  });

  it('ends with GS V NUL (cut command)', async () => {
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate(), makeData());
    const len = bytes.length;
    expect(bytes[len - 3]).toBe(0x1D);
    expect(bytes[len - 2]).toBe(0x56);
    expect(bytes[len - 1]).toBe(0x00);
  });

  it('contains company name in output', async () => {
    const tpl = makeTemplate({ company_name_text: 'MaSocieteTest' });
    const data = makeData({
      company: { name: 'MaSocieteTest', address: null, phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, 'MaSocieteTest')).toBe(true);
  });

  it('contains doc number in output', async () => {
    const docNumber = 'FV-2026-12345';
    const data = makeData({
      doc: { number: docNumber, date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate(), data, docNumber);
    expect(containsAscii(bytes, docNumber)).toBe(true);
  });

  it('contains product names in output', async () => {
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
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-001');
    expect(containsAscii(bytes, 'ProduitAlpha')).toBe(true);
  });

  it('contains company NIF when provided', async () => {
    const data = makeData({
      company: { name: 'Co', address: null, phone: null, nif: '123456789012345', rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: true }), data);
    expect(containsAscii(bytes, '123456789012345')).toBe(true);
  });

  it('contains footer thank-you text when show_thank_you is true', async () => {
    const tpl = makeTemplate({ show_thank_you: true, thank_you_text: 'MerciInfini' });
    const bytes = await buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'MerciInfini')).toBe(true);
  });

  it('omits footer thank-you text when show_thank_you is false', async () => {
    const tpl = makeTemplate({ show_thank_you: false, thank_you_text: 'MerciInfini' });
    const bytes = await buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'MerciInfini')).toBe(false);
  });

  it('contains QR ESC/POS sequence when show_qr is true', async () => {
    const tpl = makeTemplate({ show_qr: true });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsBytes(bytes, [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])).toBe(true);
  });

  it('omits QR sequence when show_qr is false', async () => {
    const tpl = makeTemplate({ show_qr: false });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsBytes(bytes, [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])).toBe(false);
  });

  it('uses override_address when provided (resolver override)', async () => {
    const tpl = makeTemplate({ show_address: true, override_address: '15 Rue Didouche Mourad' });
    const data = makeData({
      company: { name: 'Co', address: 'Old Address', phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, '15 Rue Didouche Mourad')).toBe(true);
  });

  it('includes party name when party is provided and show_client is ON', async () => {
    const data = makeData({
      party: { name: 'ClientX', phone: null, address: null },
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate({ show_client: true }), data, 'FV-001');
    expect(containsAscii(bytes, 'ClientX')).toBe(true);
  });

  it('produces deterministic output (same input → same bytes)', async () => {
    const tpl = makeTemplate();
    const data = makeData();
    const a = await buildReceiptBytesFromTemplate(tpl, data);
    const b = await buildReceiptBytesFromTemplate(tpl, data);
    expect(a).toEqual(b);
  });

  it('has reasonable length (> 200 bytes for minimal receipt)', async () => {
    const data = makeData({
      company: { name: 'A', address: 'B', phone: 'C', nif: 'D', rc: null, nis: null, article: null, logoUrl: null },
      doc: { number: 'FV-1', date: '2026-07-01', dueDate: null, time: '12:00', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-1');
    expect(bytes.length).toBeGreaterThan(200);
  });

  it('has reasonable length for receipt with items (> 400 bytes)', async () => {
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
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-001');
    expect(bytes.length).toBeGreaterThan(400);
  });
});

describe('ThermalPrintPath — section visibility gates', () => {

  it('header is omitted when show_header_section is OFF', async () => {
    const tpl = makeTemplate({
      show_header_section: false,
      company_name_text: 'HiddenHeaderSectionCo',
    });
    const data = makeData({
      company: { name: 'HiddenHeaderSectionCo', address: null, phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, 'HiddenHeaderSectionCo')).toBe(false);
  });

  it('doc info is omitted when show_doc_info_section is OFF', async () => {
    const tpl = makeTemplate({ show_doc_info_section: false, show_barcode: false });
    const docNumber = 'SECRET-DOC-999';
    const data = makeData({
      party: { name: 'PartyZ', phone: null, address: null },
      doc: { number: docNumber, date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data, docNumber);
    expect(containsAscii(bytes, docNumber)).toBe(false);
  });

  it('items are omitted when show_items_section is OFF', async () => {
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
    const bytes = await buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsAscii(bytes, 'HiddenItem')).toBe(false);
  });

  it('totals are omitted when show_totals_section is OFF', async () => {
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
    const bytes1 = await buildReceiptBytesFromTemplate(makeTemplate({ show_totals_section: true }), data, 'FV-001');
    const bytes2 = await buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(bytes2.length).toBeLessThan(bytes1.length);
  });

  it('footer is omitted when show_footer_section is OFF', async () => {
    const tpl = makeTemplate({
      show_footer_section: false,
      show_thank_you: true,
      thank_you_text: 'FooterShouldNotAppear',
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'FooterShouldNotAppear')).toBe(false);
  });
});

const HEADER_CO = {
  name: 'Stage2Co', address: '15 Rue Test', phone: '0550123456',
  nif: 'NIF123456789', rc: 'RC00123', nis: 'NIS00999',
  article: '12-34', logoUrl: null,
};

function headerData(overrides = {}): UniversalDocumentData {
  return makeData({ company: { ...HEADER_CO, ...overrides } });
}

describe('ThermalPrintPath — company info visibility gates', () => {

  it('shows company name by default, hides when show_company_name is OFF', async () => {
    const base = { show_company_name: true, company_name_text: 'Stage2Co' };
    const on   = await buildReceiptBytesFromTemplate(makeTemplate({ ...base }), headerData());
    const off  = await buildReceiptBytesFromTemplate(makeTemplate({ ...base, show_company_name: false }), headerData());
    expect(containsAscii(on, 'Stage2Co')).toBe(true);
    expect(containsAscii(off, 'Stage2Co')).toBe(false);
  });

  it('shows address by default, hides when show_address is OFF', async () => {
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_address: true  }), headerData());
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_address: false }), headerData());
    expect(containsAscii(on, '15 Rue Test')).toBe(true);
    expect(containsAscii(off, '15 Rue Test')).toBe(false);
  });

  it('shows phone by default, hides when show_phone is OFF', async () => {
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_phone: true  }), headerData());
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_phone: false }), headerData());
    expect(containsAscii(on, '0550123456')).toBe(true);
    expect(containsAscii(off, '0550123456')).toBe(false);
  });

  it('shows tax ID (NIF) by default, hides when show_tax_id is OFF', async () => {
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: true  }), headerData());
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: false }), headerData());
    expect(containsAscii(on, HEADER_CO.nif)).toBe(true);
    expect(containsAscii(off, HEADER_CO.nif)).toBe(false);
  });

  it('shows RC by default, hides when show_rc is OFF', async () => {
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_rc: true  }), headerData());
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_rc: false }), headerData());
    expect(containsAscii(on, HEADER_CO.rc)).toBe(true);
    expect(containsAscii(off, HEADER_CO.rc)).toBe(false);
  });

  it('shows NIS when show_nis is ON, hides when OFF', async () => {
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_nis: true  }), headerData());
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_nis: false }), headerData());
    expect(containsAscii(on, HEADER_CO.nis)).toBe(true);
    expect(containsAscii(off, HEADER_CO.nis)).toBe(false);
  });

  it('shows article when show_article is ON, hides when OFF', async () => {
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_article: true  }), headerData());
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_article: false }), headerData());
    expect(containsAscii(on, HEADER_CO.article)).toBe(true);
    expect(containsAscii(off, HEADER_CO.article)).toBe(false);
  });
});

describe('ThermalPrintPath — company name formatting', () => {

  it('respects company_name_bold: ON emits ESC E 1, OFF emits ESC E 0', async () => {
    const boldOn  = await buildReceiptBytesFromTemplate(makeTemplate({ company_name_bold: true  }), headerData());
    const boldOff = await buildReceiptBytesFromTemplate(makeTemplate({ company_name_bold: false }), headerData());
    expect(containsBytes(boldOn,  [0x1B, 0x45, 0x01])).toBe(true);
    expect(containsBytes(boldOff, [0x1B, 0x45, 0x00])).toBe(true);
  });

  it('different company_name_size values produce different byte output', async () => {
    const small = await buildReceiptBytesFromTemplate(makeTemplate({ company_name_size: 8  }), headerData());
    const large = await buildReceiptBytesFromTemplate(makeTemplate({ company_name_size: 30 }), headerData());
    expect(small).not.toEqual(large);
  });

  it('respects company_name_align: left→ESC a 0, center→ESC a 1, right→ESC a 2', async () => {
    const left   = await buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'left'   }), headerData());
    const center = await buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'center' }), headerData());
    const right  = await buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'right'  }), headerData());
    expect(containsBytes(left,   [0x1B, 0x61, 0x00])).toBe(true);
    expect(containsBytes(center, [0x1B, 0x61, 0x01])).toBe(true);
    expect(containsBytes(right,  [0x1B, 0x61, 0x02])).toBe(true);
  });
});

describe('ThermalPrintPath — company info formatting', () => {

  it('different company_info_size values produce different byte output', async () => {
    const small = await buildReceiptBytesFromTemplate(makeTemplate({ show_address: true, company_info_size: 6  }), headerData());
    const large = await buildReceiptBytesFromTemplate(makeTemplate({ show_address: true, company_info_size: 16 }), headerData());
    expect(small).not.toEqual(large);
  });

  it('respects company_info_align on info fields', async () => {
    const left  = await buildReceiptBytesFromTemplate(makeTemplate({ company_info_align: 'left'   }), headerData());
    const right = await buildReceiptBytesFromTemplate(makeTemplate({ company_info_align: 'right'  }), headerData());
    expect(containsBytes(left,  [0x1B, 0x61, 0x00])).toBe(true);
    expect(containsBytes(right, [0x1B, 0x61, 0x02])).toBe(true);
  });
});

describe('ThermalPrintPath — document title settings', () => {

  it('shows title_text in output', async () => {
    const tpl = makeTemplate({ title_text: 'BonLivraison' });
    const bytes = await buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'BonLivraison')).toBe(true);
  });

  it('different title_size values produce different byte output', async () => {
    const small = await buildReceiptBytesFromTemplate(makeTemplate({ title_text: 'Title', title_size: 8 }), makeData());
    const large = await buildReceiptBytesFromTemplate(makeTemplate({ title_text: 'Title', title_size: 24 }), makeData());
    expect(small).not.toEqual(large);
  });

  it('respects title_bold setting', async () => {
    const boldOn  = await buildReceiptBytesFromTemplate(makeTemplate({ title_text: 'Title', title_bold: true  }), makeData());
    const boldOff = await buildReceiptBytesFromTemplate(makeTemplate({ title_text: 'Title', title_bold: false }), makeData());
    expect(containsBytes(boldOn,  [0x1B, 0x45, 0x01])).toBe(true);
    expect(containsBytes(boldOff, [0x1B, 0x45, 0x00])).toBe(true);
  });
});

describe('ThermalPrintPath — doc info settings', () => {

  it('hides doc number when show_doc_number is OFF', async () => {
    const tpl = makeTemplate({ show_doc_number: false, show_barcode: false });
    const data = makeData({
      doc: { number: 'FV-SECRET', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data, 'FV-SECRET');
    expect(containsAscii(bytes, 'FV-SECRET')).toBe(false);
  });

  it('hides date when show_date is OFF', async () => {
    const tpl = makeTemplate({ show_date: false });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-12-25', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsAscii(bytes, '2026-12-25')).toBe(false);
  });

  it('shows client phone when show_client_phone is ON', async () => {
    const tpl = makeTemplate({ show_client_phone: true });
    const data = makeData({
      party: { name: 'Client', phone: '0770123456', address: null },
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = await buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsAscii(bytes, '0770123456')).toBe(true);
  });
});

describe('ThermalPrintPath — totals settings', () => {

  it('shows total_ht label when show_total_ht is ON, hides when OFF', async () => {
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      totals: { totalHt: 500, totalTva: 95, totalTtc: 595, fiscalStamp: 0, totalDiscount: 0, paid: 595, change: 0, remaining: 0 },
    });
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_total_ht: true  }), data, 'FV-001');
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_total_ht: false }), data, 'FV-001');
    expect(containsAscii(on, 'HT:')).toBe(true);
    expect(containsAscii(off, 'HT:')).toBe(false);
  });

  it('shows fiscal stamp when show_fiscal_stamp is ON', async () => {
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      totals: { totalHt: 10000, totalTva: 1900, totalTtc: 11900, fiscalStamp: 119, totalDiscount: 0, paid: 11900, change: 0, remaining: 0 },
    });
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate({ show_fiscal_stamp: true }), data, 'FV-001');
    expect(containsAscii(bytes, '119')).toBe(true);
  });

  it('shows discount total when show_discount_total is ON and discount > 0', async () => {
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      totals: { totalHt: 1000, totalTva: 190, totalTtc: 1190, fiscalStamp: 0, totalDiscount: 100, paid: 1190, change: 0, remaining: 0 },
    });
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate({ show_discount_total: true }), data, 'FV-001');
    expect(containsAscii(bytes, '100')).toBe(true);
  });

  it('shows tva breakdown when show_tva_breakdown is ON', async () => {
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      totals: { totalHt: 1000, totalTva: 190, totalTtc: 1190, fiscalStamp: 0, totalDiscount: 0, paid: 1190, change: 0, remaining: 0 },
      taxBreakdown: [{ rate: 0.19, base: 1000, tva: 190 }],
    });
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate({ show_tva_breakdown: true }), data, 'FV-001');
    expect(containsAscii(bytes, '19')).toBe(true);
  });
});

describe('ThermalPrintPath — balance section', () => {

  it('shows previous balance when show_prev_balance is ON, shorter when OFF', async () => {
    const data = makeData({
      balance: { previous: 500, current: 619 },
      totals: { totalHt: 100, totalTva: 19, totalTtc: 119, fiscalStamp: 0, totalDiscount: 0, paid: 119, change: 0, remaining: 0 },
    });
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_prev_balance: true, show_new_balance: true }), data);
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_prev_balance: false, show_new_balance: true }), data);
    expect(on.length).toBeGreaterThan(off.length);
  });

  it('shows new balance when show_new_balance is ON, shorter when OFF', async () => {
    const data = makeData({
      balance: { previous: 500, current: 619 },
      totals: { totalHt: 100, totalTva: 19, totalTtc: 119, fiscalStamp: 0, totalDiscount: 0, paid: 119, change: 0, remaining: 0 },
    });
    const on  = await buildReceiptBytesFromTemplate(makeTemplate({ show_new_balance: true, show_prev_balance: true }), data);
    const off = await buildReceiptBytesFromTemplate(makeTemplate({ show_new_balance: false, show_prev_balance: true }), data);
    expect(on.length).toBeGreaterThan(off.length);
  });
});

describe('ThermalPrintPath — payments section', () => {

  it('shows payments when show_payments_section is ON and payments exist', async () => {
    const data = makeData({
      payments: [{ method: 'Cash', amount: 500, reference: null }],
      totals: { totalHt: 400, totalTva: 76, totalTtc: 476, fiscalStamp: 0, totalDiscount: 0, paid: 500, change: 24, remaining: 0 },
    });
    const bytes = await buildReceiptBytesFromTemplate(makeTemplate({ show_payments_section: true }), data);
    expect(containsAscii(bytes, 'Cash')).toBe(true);
  });
});

describe('ThermalPrintPath — signatures section', () => {

  it('shows cashier signature line when show_cashier_signature is ON', async () => {
    const tpl = makeTemplate({ show_cashier_signature: true });
    const bytes = await buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, '______')).toBe(true);
  });
});
