import { describe, it, expect } from 'vitest';
import {
  normalizeDigits, parseNumber, extractDate, normalizeForMatch,
  matchSupplier, matchProduct, parseInvoiceText,
} from '../invoiceOcr';
import type { ProductLite, SupplierLite } from '../invoiceOcr';

// B.4 — pure OCR-parsing helpers (no DOM, no tesseract).

describe('normalizeDigits', () => {
  it('converts Arabic-Indic and Persian digits to Latin', () => {
    expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(normalizeDigits('۱٤٦')).toBe('146');
  });
  it('leaves Latin text untouched', () => {
    expect(normalizeDigits('ABC 123')).toBe('ABC 123');
  });
});

describe('parseNumber', () => {
  it.each([
    ['1.520,00', 1520],      // French decimal convention
    ['1,520.00', 1520],      // English convention
    ['1.520', 1520],         // thousands separator (no fraction)
    ['1 520.00', 1520],      // space thousands
    ['1520', 1520],
    ['120.00', 120],
    ['١٥٢٠', 1520],          // Arabic-Indic digits
    ['1.520,00 دج', 1520],   // currency token stripped
  ])('parses %j → %d', (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected);
  });

  it.each([
    ['non numeric', null],
    ['', null],
    [null, null],
    [undefined, null],
    ['---', null],
  ])('returns null for %j', (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected);
  });
});

describe('extractDate', () => {
  it.each([
    ['2026-08-12', '2026-08-12'],   // ISO
    ['2026/08/12', '2026-08-12'],
    ['12/08/2026', '2026-08-12'],   // dd/mm/yyyy
    ['12-08-2026', '2026-08-12'],
    ['5/3/26', '2026-03-05'],       // d/m/yy → 20xx
    ['Date: 12/08/2026', '2026-08-12'],
  ])('extracts %j → %j', (raw, expected) => {
    expect(extractDate(raw)).toBe(expected);
  });

  it.each([
    ['32/13/2026', null],   // invalid day/month
    ['garbage', null],
    ['', null],
    [null, null],
  ])('returns null for %j', (raw, expected) => {
    expect(extractDate(raw)).toBe(expected);
  });
});

describe('normalizeForMatch', () => {
  it('strips tashkeel and tatweel, normalizes Arabic letter variants', () => {
    expect(normalizeForMatch('بِسْم الله')).toBe('بسم الله');
    expect(normalizeForMatch('أحمد إبراهيم آدم')).toBe('احمد ابراهيم ادم');
    expect(normalizeForMatch('إلى')).toBe('الي');
    expect(normalizeForMatch('قضية')).toBe('قضيه');
  });
  it('folds accented Latin letters and collapses punctuation', () => {
    expect(normalizeForMatch('Café déjà-vu')).toBe('cafe deja vu');
  });
});

const SUPPLIERS: SupplierLite[] = [
  { id: 1, name: 'SARL ALIMENTS' },
  { id: 2, name: 'SARL ALIMENTS BOULANGE', nif: '099917000123456' },
  { id: 3, name: 'Épicerie Centrale', phone: '021 44 55 66' },
];

describe('matchSupplier', () => {
  it('prefers the LONGEST needle (no shadowing by a prefix name)', () => {
    expect(matchSupplier('SARL ALIMENTS BOULANGE - NIF 099917000123456', SUPPLIERS)?.id).toBe(2);
  });
  it('matches via NIF and phone fields, not only the name', () => {
    expect(matchSupplier('NIF: 099917000123456', SUPPLIERS)?.id).toBe(2);
    expect(matchSupplier('Tél: 021 44 55 66', SUPPLIERS)?.id).toBe(3);
  });
  it('returns null when no candidate appears', () => {
    expect(matchSupplier('Produits Divers SARL', SUPPLIERS)).toBeNull();
  });
});

const PRODUCTS: ProductLite[] = [
  { id: 1, name: 'Lait L\'Étoile 1L' },
  { id: 2, name: 'Sucre Blanc 1kg', barcode: '6130410837123' },
  { id: 3, name: 'Huile de Table 5L' },
];

describe('matchProduct', () => {
  it('matches a barcode first (numeric, min 4 chars)', () => {
    expect(matchProduct('6130410837123', PRODUCTS)?.id).toBe(2);
  });
  it('matches by normalized name and prefers the longest hit', () => {
    expect(matchProduct('Lait L\'Étoile 1L', PRODUCTS)?.id).toBe(1);
    const partial: ProductLite[] = [
      { id: 1, name: 'Lait' },
      { id: 2, name: 'Lait Étoile' },
    ];
    expect(matchProduct('Lait Étoile', partial)?.id).toBe(2);
  });
  it('returns null for unrelated text', () => {
    expect(matchProduct('Condiments assortis', PRODUCTS)).toBeNull();
  });
});

const FA_OCR = [
  'SARL ALIMENTS BOULANGE',
  'NIF: 099917000123456',
  'Adresse: 15 Rue des Oliviers, Alger',
  'Tél: 021 44 55 66',
  '',
  'FACTURE N° FA-2026-0045',
  'Date: 12/08/2026',
  '',
  'Qty Désignation PU HT Total',
  '1 Lait L\'Étoile 1L 120.00',
  '3 x Sucre Blanc 1kg 95.00',
  '2 x Huile de Table 5L 1050.00',
  '',
  'Total HT: 2505.00',
  'TVA 19%: 475.95',
  'Total TTC: 2980.95',
].join('\n');

describe('parseInvoiceText', () => {
  it('extracts date, supplier, reference and totals from a supplier FA', () => {
    const r = parseInvoiceText(FA_OCR, { suppliers: SUPPLIERS, products: PRODUCTS });
    expect(r.documentDate).toBe('2026-08-12');
    expect(r.supplier?.id).toBe(2);
    expect(r.reference).toBe('FA-2026-0045');
    expect(r.totalHt).toBe(2505);
    expect(r.tvaRate).toBe(19);   // the RATE, not the 475.95 amount
    expect(r.totalTtc).toBe(2980.95);
  });

  it('parses lines with qty/unit-price and matches products by name (incl. sizes)', () => {
    const r = parseInvoiceText(FA_OCR, { suppliers: SUPPLIERS, products: PRODUCTS });
    expect(r.lines).toHaveLength(3);
    const [lait, sucre, huile] = r.lines;
    expect(lait.product?.id).toBe(1);
    expect(lait.quantity).toBe(1);
    expect(lait.unitPrice).toBe(120);
    expect(sucre.product?.id).toBe(2);   // matched via number-intact text («1kg»)
    expect(sucre.quantity).toBe(3);
    expect(sucre.unitPrice).toBe(95);
    expect(huile.product?.id).toBe(3);   // «5L» size present
    expect(huile.quantity).toBe(2);
    expect(huile.unitPrice).toBe(1050);
  });

  it('never treats header/contact lines as product lines', () => {
    const r = parseInvoiceText(FA_OCR, { suppliers: SUPPLIERS, products: PRODUCTS });
    expect(r.lines.every((l) => l.product !== null)).toBe(true);
  });

  it('drops a pure-text company line when there is no supplier list', () => {
    const r = parseInvoiceText('SARL ALIMENTS BOULANGE\nBureau de vente', { products: PRODUCTS });
    expect(r.lines).toHaveLength(0);
    expect(r.supplier).toBeNull();
  });

  it('returns an empty result for empty input', () => {
    const r = parseInvoiceText('');
    expect(r.documentDate).toBeNull();
    expect(r.supplier).toBeNull();
    expect(r.lines).toEqual([]);
    expect(r.totalTtc).toBeNull();
  });
});
