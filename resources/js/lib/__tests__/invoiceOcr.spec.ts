import { describe, it, expect } from 'vitest';
import {
  normalizeDigits, parseNumber, extractDate, normalizeForMatch,
  matchSupplier, matchProduct, parseInvoiceText, computeOcrScale,
  diceTokens, effectiveProductPrice, stripDigits, charDice,
  rankProductCandidates, detectColumnLayout,
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

describe('matchProduct — fuzzy name fallback', () => {
  const CAT = [
    { id: 1, name: 'Cafe Au Lait 1L' },
    { id: 2, name: 'Sucre Blanc 1kg' },
  ];

  it('matches an OCR-noisy name via token Dice similarity', () => {
    expect(matchProduct('CAFÉ AU LAIT 1L', CAT)?.id).toBe(1);
  });
  it('matches when a word is inserted by OCR but the overlap stays high', () => {
    expect(matchProduct('Sucre le Blanc', CAT)?.id).toBe(2);
  });
  it('rejects unrelated multi-token text', () => {
    expect(matchProduct('Produits Divers SARL', CAT)).toBeNull();
  });
});

describe('matchProduct — price fallback', () => {
  const CAT = [
    { id: 9, name: 'Huile en Vrac', purchase_price_ht: 450 },
    { id: 10, name: 'Sucre en Vrac', purchase_price_ht: 95 },
  ];

  it('matches by price when the name does not appear at all', () => {
    expect(matchProduct('Bidon 5L 2 x 450.00', CAT, 450)?.id).toBe(9);
  });
  it('accepts a unit price within tolerance (string price field)', () => {
    expect(matchProduct('Bidon', CAT, 461)?.id).toBe(9);
    expect(effectiveProductPrice({ id: 9, name: 'x', purchase_price_ht: '450' })).toBe(450);
  });
  it('rejects a unit price outside tolerance', () => {
    expect(matchProduct('Bidon', CAT, 520)).toBeNull();
  });
  it('prefers a name match over a price match', () => {
    const mixed = [
      { id: 11, name: 'Lait Étoile', purchase_price_ht: 999 },
      { id: 12, name: 'Huile Légère', purchase_price_ht: 95 },
    ];
    expect(matchProduct('Lait Étoile', mixed, 95)?.id).toBe(11);
  });
});

describe('matchProduct — digit-insensitive Arabic names', () => {
  const AR = [{ id: 7, name: 'عسيلو مرجان 2كلغ' }];

  it('matches when OCR drops the size digit (2كلغ) and flips a letter', () => {
    expect(matchProduct('عسيلة مرجان', AR)?.id).toBe(7);
  });
  it('matches the full name when the size survives OCR', () => {
    expect(matchProduct('عسيلو مرجان 2كلغ', AR)?.id).toBe(7);
  });
  it('keeps digits while comparing at the char level (bigram Dice)', () => {
    expect(charDice('عسيلة مرجان', 'عسيلو مرجان كلغ')).toBeGreaterThanOrEqual(0.5);
  });
});

describe('stripDigits', () => {
  it('removes Latin, Arabic-Indic and Persian digits', () => {
    expect(stripDigits('عسيلو 2كلغ ٠٥٠٠ ۴۵۶').trim()).toBe('عسيلو كلغ');
    expect(stripDigits('ABC123')).toBe('ABC');
  });
});

describe('diceTokens', () => {
  it('computes Sørensen–Dice similarity over normalized tokens', () => {
    expect(diceTokens('a b c', 'a b d')).toBeCloseTo(2 * 2 / (3 + 3), 6);
    expect(diceTokens('a b', 'a b')).toBe(1);
    expect(diceTokens('a b', 'c d')).toBe(0);
    expect(diceTokens('', 'a')).toBe(0);
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

describe('detectColumnLayout', () => {
  it('detects a qty-before-name header with trailing total columns', () => {
    const layout = detectColumnLayout(['Qty Désignation PU HT Total']);
    expect(layout).not.toBeNull();
    expect(layout!.hasQtyCol).toBe(true);
    expect(layout!.qtyBeforeName).toBe(true);
    expect(layout!.trailingTotalCols).toBe(2);
    expect(layout!.headerIndex).toBe(0);
  });
  it('detects a name-first qty-after header (Désignation Qté PU)', () => {
    const layout = detectColumnLayout(['Désignation Qté PU']);
    expect(layout!.hasQtyCol).toBe(true);
    expect(layout!.qtyBeforeName).toBe(false);
    expect(layout!.trailingTotalCols).toBe(0);
  });
  it('detects a no-qty header (Désignation PU HT)', () => {
    const layout = detectColumnLayout(['Désignation PU HT']);
    expect(layout!.hasQtyCol).toBe(false);
    expect(layout!.trailingTotalCols).toBe(1);
  });
  it('detects an Arabic header', () => {
    const layout = detectColumnLayout(['الكمية البيان سعر الوحدة الإجمالي']);
    expect(layout).not.toBeNull();
    expect(layout!.hasQtyCol).toBe(true);
    expect(layout!.qtyBeforeName).toBe(true);
  });
  it('ignores the footer / totals block (not a table header)', () => {
    const layout = detectColumnLayout(['Total HT: 2505.00', 'TVA 19%: 475.95', 'Total TTC: 2980.95']);
    expect(layout).toBeNull();
  });
  it('returns null when there is no recognizable header', () => {
    expect(detectColumnLayout(['SARL ALIMENTS BOULANGE', 'Facture N° FA-0001'])).toBeNull();
  });
});

describe('parseInvoiceText — layout-aware columns', () => {
  const HONEY = [{ id: 20, name: 'عسل 1كلغ' }];

  it('reads qty from the qty column and price from the PU column (French header)', () => {
    const r = parseInvoiceText('Qty Désignation PU HT Total\n2 عسل 1كلغ 500.00 1000.00', { products: HONEY });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(2);
    expect(r.lines[0].unitPrice).toBe(500);   // PU, not the line total 1000
  });

  it('reads qty from a qty-after-name column (Désignation Qté PU)', () => {
    const r = parseInvoiceText('Désignation Qté PU\nعسل 1كلغ 2 500.00', { products: HONEY });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(2);
    expect(r.lines[0].unitPrice).toBe(500);
  });

  it('treats the first number as the unit price when there is no qty column (Désignation PU HT)', () => {
    const r = parseInvoiceText('Désignation PU HT\nعسل 1كلغ 500.00 1000.00', { products: HONEY });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(1);
    expect(r.lines[0].unitPrice).toBe(500);
  });

  it('never treats the header row itself as a product line', () => {
    const r = parseInvoiceText('Qty Désignation PU HT Total\n2 عسل 1كلغ 500.00 1000.00', { products: HONEY });
    expect(r.lines).toHaveLength(1);
  });
});

describe('rankProductCandidates', () => {
  const CAT = [
    { id: 1, name: 'Lait L\'Étoile 1L' },
    { id: 2, name: 'Sucre Blanc 1kg', barcode: '6130410837123' },
    { id: 3, name: 'Huile de Table 5L' },
  ];

  it('ranks exact matches first, longest needle first', () => {
    const partial: ProductLite[] = [
      { id: 1, name: 'Lait' },
      { id: 2, name: 'Lait Étoile' },
    ];
    const ranked = rankProductCandidates('Lait Étoile', partial);
    expect(ranked[0].product.id).toBe(2);
    expect(ranked[0].tier).toBe('exact');
  });

  it('returns up to 3 suggestions with exact first and price tier following', () => {
    const mixed: ProductLite[] = [
      { id: 11, name: 'Lait Étoile', purchase_price_ht: 999 },
      { id: 12, name: 'Huile Légère', purchase_price_ht: 95 },
    ];
    const ranked = rankProductCandidates('Lait Étoile', mixed, 95);
    expect(ranked.length).toBeLessThanOrEqual(3);
    expect(ranked[0].product.id).toBe(11);   // exact name hit beats price
    expect(ranked[0].tier).toBe('exact');
    expect(ranked.map((r) => r.product.id)).toContain(12);  // price tier still offered
  });

  it('exposes the tier on each suggestion', () => {
    const ranked = rankProductCandidates('6130410837123', CAT);
    expect(ranked[0].tier).toBe('exact');
    const fuzzy = rankProductCandidates('CAFÉ AU LAIT', [{ id: 5, name: 'Cafe Au Lait 1L' }]);
    expect(fuzzy[0].tier).toBe('fuzzy');
    const price = rankProductCandidates('Bidon', [{ id: 9, name: 'Huile en Vrac', purchase_price_ht: 450 }], 450);
    expect(price[0].tier).toBe('price');
  });
});

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

  it('reads qty from the qty column, not the size glued to the name', () => {
    const HONEY = [{ id: 20, name: 'عسل 1كلغ' }];
    const r = parseInvoiceText('عسل 1كلغ 2 500.00', { products: HONEY });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(2);      // the qty column, NOT the «1» from 1كلغ
    expect(r.lines[0].unitPrice).toBe(500);
    expect(r.lines[0].product?.id).toBe(20);  // still matched to «عسل 1كلغ»
  });

  it('reads qty first when the qty column precedes the name', () => {
    const HONEY = [{ id: 20, name: 'عسل 1كلغ' }];
    const r = parseInvoiceText('2 عسل 1كلغ 500.00', { products: HONEY });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(2);
    expect(r.lines[0].unitPrice).toBe(500);
  });

  it('returns an empty result for empty input', () => {
    const r = parseInvoiceText('');
    expect(r.documentDate).toBeNull();
    expect(r.supplier).toBeNull();
    expect(r.lines).toEqual([]);
    expect(r.totalTtc).toBeNull();
  });
});

describe('computeOcrScale', () => {
  it('keeps images already ≤ 1600px unchanged', () => {
    expect(computeOcrScale(1200, 900)).toBe(1);
    expect(computeOcrScale(1600, 1600)).toBe(1);
    expect(computeOcrScale(800, 1600)).toBe(1);
  });
  it('downscales the longest side of a phone photo to 1600px', () => {
    expect(computeOcrScale(4000, 3000)).toBeCloseTo(0.4, 6);
    expect(computeOcrScale(3000, 4000)).toBeCloseTo(0.4, 6);
  });
  it('preserves aspect ratio via the longest side', () => {
    expect(computeOcrScale(3200, 1600)).toBeCloseTo(0.5, 6);
    expect(computeOcrScale(1600, 3200)).toBeCloseTo(0.5, 6);
  });
  it('honours a custom max dimension', () => {
    expect(computeOcrScale(4000, 3000, 2000)).toBeCloseTo(0.5, 6);
  });
  it('is a no-op for empty/zero dimensions', () => {
    expect(computeOcrScale(0, 0)).toBe(1);
    expect(computeOcrScale(1200, 0)).toBe(1);
  });
});
