// ════════════════════════════════════════════════════════════════════════════
// lib/invoiceOcr.ts — B.4 supplier-invoice OCR → FA prefill
//
// Pure, dependency-free parsing helpers + a lazy ppu-paddle-ocr runner.
// The runner MUST NOT run in unit tests: `runInvoiceOcr` short-circuits on the
// `window.__OCR_TEST_TEXT__` seam (set via Playwright addInitScript) and the
// OCR engine module itself is only loaded via dynamic import().
//
// Pure helpers used by the vitest suite directly (no DOM, no OCR engine):
//   parseNumber / extractDate / normalizeForMatch / matchSupplier / matchProduct
//   parseInvoiceText
// ════════════════════════════════════════════════════════════════════════════

export interface OcrProgress {
  status: string;
  progress: number;
}

/** which tier produced a product match (shown as a badge in the modal) */
export type MatchTier = 'exact' | 'fuzzy' | 'price';

export interface ProductMatchSuggestion {
  product: ProductLite;
  tier: MatchTier;
  /** higher = better (needle length for exact, Dice for fuzzy, 1−relDiff for price) */
  score: number;
}

/**
 * Detected invoice column layout (from the header row).
 * Real supplier invoices print a header like «Qty Désignation PU HT Total»;
 * knowing which columns exist lets the parser read qty from the qty column and
 * price from the PU column instead of assuming "first number / last number".
 */
/**
 * The ordered list of numeric/name column kinds declared by a table header,
 * e.g. «Designation Qty PackQty UnitPrice Total» → ['des','qty','pack','pu','total'].
 * Rows are mapped positionally against this template.
 */
export type ColumnKind = 'qty' | 'des' | 'pack' | 'pu' | 'total';

export interface ColumnLayout {
  headerIndex: number;
  headerText: string;
  hasQtyCol: boolean;
  /** qty column appears BEFORE the designation/name column */
  qtyBeforeName: boolean;
  /** ≥1 total-type column (HT / Total / Montant) appears after the PU column */
  trailingTotalCols: number;
  /** full ordered column kinds from the header (SSOT for row mapping) */
  columns: ColumnKind[];
}

/** One word recognized by the OCR engine, with its bounding box. */
export interface OcrWord {
  text: string;
  /** left edge of the word box, in image pixels */
  x: number;
  /** top edge of the word box, in image pixels */
  y: number;
  /** width of the word box, in image pixels */
  w: number;
  /** height of the word box, in image pixels */
  h: number;
  /** recognition confidence (0–1) */
  confidence: number;
}

/** One OCR text line with per-word geometry (engine line grouping, L→R). */
export interface OcrLine {
  words: OcrWord[];
  /** line text — words joined in reading order */
  text: string;
  /** top edge of the line, in image pixels */
  y: number;
}

/** A numeric column detected in the table: its kind + x anchor (image px center). */
export interface ColumnStripe {
  kind: ColumnKind;
  x: number;
}

export interface OcrLineCandidate {
  /** raw OCR line text (before product matching) */
  text: string;
  quantity: number;
  /** pack/carton quantity when the header declares a packQty column (e.g. «2 12 520» → qty 2, pack 12) */
  packQty?: number | null;
  unitPrice: number | null;
  product: ProductLite | null;
  /** matched product id (mirror of `product`) — handy for the UI */
  productId?: string | number | null;
  /** which tier produced the match (exact / fuzzy / price) */
  matchTier?: MatchTier | null;
  /** top suggested products when the line has no confident match */
  suggestions?: ProductMatchSuggestion[];
}

export interface ProductLite {
  id: string | number;
  name: string;
  ref?: string | null;
  barcode?: string | null;
  tvaRate?: number | null;
  /** catalog purchase price — used by the price-proximity matching tier */
  price?: number | string | null;
  /** Product objects passed straight from the API also expose these */
  purchase_price_ht?: number | string | null;
  current_cost_price?: number | string | null;
}

export interface SupplierLite {
  id: string | number;
  name: string;
  code?: string | null;
  phone?: string | null;
  email?: string | null;
  nif?: string | null;
  rc?: string | null;
}

export interface OcrInvoiceResult {
  rawText: string;
  /** ISO yyyy-mm-dd, null when not detected */
  documentDate: string | null;
  supplier: SupplierLite | null;
  /** raw OCR text where the supplier was matched (fallback name input) */
  supplierRaw: string | null;
  /** e.g. "FA-00123" from "FACTURE N° 00123" */
  reference: string | null;
  lines: OcrLineCandidate[];
  totalTtc: number | null;
  totalHt: number | null;
  tvaRate: number | null;
}

// ─── Arabic digit + accent normalization ─────────────────────────────────────

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeDigits(s: string): string {
  return String(s ?? '')
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

// ─── Numbers (French/Arabic decimal conventions) ─────────────────────────────

/**
 * Parse an amount that may use French or Arabic decimal notation:
 *   1 520.00 / 1.520,00 / 1,520.00 / 1520 / 1.520  (thousands) → number
 * Handles Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) and currency tokens (دج / DA / DZD).
 * Returns null when nothing numeric is found.
 */
export function parseNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = normalizeDigits(String(raw))
    .trim()
    .replace(/[^0-9.,\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;
  s = s.replace(/^-+$/, '');
  s = s.replace(/\.$/, '');
  if (!/\d/.test(s)) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  const lastSep = hasDot || hasComma
    ? (s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',')
    : null;

  let intPart = s;
  let fracPart = '';
  if (lastSep) {
    const idx = s.lastIndexOf(lastSep);
    const before = s.slice(0, idx);
    const after = s.slice(idx + 1).trim();
    if (/^\d{1,2}$/.test(after) && /\d/.test(before)) {
      intPart = before;
      fracPart = after;
    } else {
      intPart = s.replace(/[.,]/g, '');
    }
  }
  const intDigits = intPart.replace(/[.,\s]/g, '');
  if (!/^\d+$/.test(intDigits)) return null;
  const n = fracPart ? parseFloat(`${intDigits}.${fracPart}`) : parseInt(intDigits, 10);
  return Number.isFinite(n) ? n : null;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');

function validYmd(y: number, m: number, d: number): boolean {
  if (y < 2000 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

/**
 * Extract a date from OCR text. Accepts yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy,
 * d/m/yy (yy → 20xx). Returns ISO `yyyy-mm-dd` or null.
 */
export function extractDate(text: string | null | undefined): string | null {
  if (!text) return null;
  const s = normalizeDigits(String(text));
  // ISO first
  let m = s.match(/(?:^|[^\d])(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:[^\d]|$)/);
  if (m) {
    const [y, mo, d] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
    if (validYmd(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  // dd/mm/yyyy (or dd.mm.yyyy, dd-mm-yyyy, d/m/yy)
  m = s.match(/(?:^|[^\d])(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[^\d]|$)/);
  if (m) {
    const [d, mo, yRaw] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
    const y = yRaw < 100 ? 2000 + yRaw : yRaw;
    if (validYmd(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  return null;
}

// ─── Name matching (Arabic-insensitive) ──────────────────────────────────────

export function normalizeForMatch(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')   // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[èéêë]/g, 'e')
    .replace(/[àáâä]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ûü]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const supplierCandidateFields = (s: SupplierLite): Array<string | null | undefined> => [
  s.name, s.code, s.phone, s.email, s.nif, s.rc,
];

/**
 * Longest-substring match of a supplier against an OCR line. The LONGEST
 * needle wins so "SARL ALIMENTS" does not shadow "SARL ALIMENTS BOULANGE".
 * Returns null when no candidate appears.
 */
export function matchSupplier(
  text: string,
  suppliers: SupplierLite[],
): SupplierLite | null {
  const hay = normalizeForMatch(text);
  if (!hay) return null;
  let best: { s: SupplierLite; score: number } | null = null;
  for (const s of suppliers) {
    for (const f of supplierCandidateFields(s)) {
      const needle = normalizeForMatch(f);
      if (needle.length < 2) continue;
      if (hay.includes(needle) && (!best || needle.length > best.score)) {
        best = { s, score: needle.length };
      }
    }
  }
  return best?.s ?? null;
}

/**
 * Longest-substring match of a product against a line's "name part".
 * Tries barcode (min 4 chars) then ref then name — the longest hit wins.
 * When the exact tiers fail, falls back to:
 *   • fuzzy name similarity (token Dice coefficient) for near/OCR-noisy names
 *   • price proximity (`unitPrice` vs the catalog purchase price) — supplier
 *     invoice unit prices usually land within 10% of the catalog purchase cost,
 *     so an unrelated-but-exact-price product is still a useful suggestion
 *     (the human confirms in the modal before the line is used).
 */
export const PRICE_MATCH_TOLERANCE = 0.10;
/** fuzzy tiers accept scores at/above this (both token and char Dice) */
export const DICE_MIN_SCORE = 0.5;

/** Remove every digit (Latin, Arabic-Indic, Persian) from a string. */
export function stripDigits(s: string): string {
  return s.replace(/[\d٠-٩۰-۹]/g, '');
}

/** Sørensen–Dice over character bigrams of two space-removed strings. */
export function charDice(a: string, b: string): number {
  const x = a.replace(/\s+/g, '');
  const y = b.replace(/\s+/g, '');
  if (!x.length || !y.length) return 0;
  const bigrams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i + 1 < s.length; i++) {
      const g = s.slice(i, i + 2);
      set.set(g, (set.get(g) ?? 0) + 1);
    }
    return set;
  };
  const ma = bigrams(x);
  const mb = bigrams(y);
  let inter = 0;
  for (const [g, v] of ma) inter += Math.min(v, mb.get(g) ?? 0);
  return (2 * inter) / (x.length - 1 + y.length - 1);
}

export function effectiveProductPrice(p: ProductLite): number {
  const raw = p.purchase_price_ht ?? p.current_cost_price ?? p.price ?? 0;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Sørensen–Dice similarity on normalized tokens (multiset-aware). */
export function diceTokens(a: string, b: string): number {
  const ta = a.split(/\s+/).filter(Boolean);
  const tb = b.split(/\s+/).filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const count = (t: string[]) => {
    const m = new Map<string, number>();
    for (const x of t) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const ma = count(ta);
  const mb = count(tb);
  let inter = 0;
  for (const [k, v] of ma) inter += Math.min(v, mb.get(k) ?? 0);
  return (2 * inter) / (ta.length + tb.length);
}

/**
 * Rank candidate products for an OCR line, best first, tier-major:
 * exact (barcode/ref/name substring, longest needle first) → fuzzy (token/char
 * Dice, ≥ DICE_MIN_SCORE, best first) → price proximity (≤ PRICE_MATCH_TOLERANCE,
 * closest first). `matchProduct` is `ranked[0]`; the modal's suggestion picker
 * shows the top entries with their tier badge.
 */
export function rankProductCandidates(
  namePart: string,
  products: ProductLite[],
  unitPrice?: number | null,
): ProductMatchSuggestion[] {
  const hay = normalizeForMatch(namePart);
  if (!hay) return [];

  const exact: ProductMatchSuggestion[] = [];
  const fuzzy: ProductMatchSuggestion[] = [];
  const price: ProductMatchSuggestion[] = [];

  // Tier 1 — exact substring (barcode → ref → name), longest needle wins
  for (const p of products) {
    let score = 0;
    const barcode = normalizeForMatch(p.barcode);
    if (barcode.length >= 4 && hay.includes(barcode)) score = Math.max(score, barcode.length);
    const ref = normalizeForMatch(p.ref);
    if (ref.length >= 2 && hay.includes(ref)) score = Math.max(score, ref.length);
    const name = normalizeForMatch(p.name);
    if (name.length >= 2 && hay.includes(name)) score = Math.max(score, name.length);
    if (score > 0) exact.push({ product: p, tier: 'exact', score });
  }
  exact.sort((a, b) => b.score - a.score);

  // Tier 2 — fuzzy name similarity (handles OCR noise / word order / dropped
  // sizes like "2كلغ"). Digits are stripped from BOTH sides so a size the OCR
  // misread or dropped never penalizes the score; the best of token-level and
  // character-bigram Dice wins (bigrams survive one-letter OCR variants).
  const strippedHay = stripDigits(hay);
  const tokens = strippedHay.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    for (const p of products) {
      const pname = stripDigits(normalizeForMatch(p.name));
      const d = Math.max(diceTokens(strippedHay, pname), charDice(strippedHay, pname));
      if (d >= DICE_MIN_SCORE) fuzzy.push({ product: p, tier: 'fuzzy', score: d });
    }
    fuzzy.sort((a, b) => b.score - a.score);
  }

  // Tier 3 — price proximity (unitPrice vs catalog purchase price)
  if (unitPrice != null && Number.isFinite(unitPrice) && unitPrice > 0) {
    for (const p of products) {
      const pp = effectiveProductPrice(p);
      if (pp <= 0) continue;
      const diff = Math.abs(unitPrice - pp) / pp;
      if (diff <= PRICE_MATCH_TOLERANCE) price.push({ product: p, tier: 'price', score: 1 - diff });
    }
    price.sort((a, b) => b.score - a.score);
  }

  // Tier-major merge so the top suggestion always preserves matchProduct's
  // precedence (exact > fuzzy > price) while still offering cross-tier options.
  const TIER_ORDER = { exact: 0, fuzzy: 1, price: 2 } as const;
  return [...exact, ...fuzzy, ...price]
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.score - a.score)
    .slice(0, 3);
}

/** Top-ranked match (best suggestion) or null when nothing qualifies. */
export function matchProduct(
  namePart: string,
  products: ProductLite[],
  unitPrice?: number | null,
): ProductLite | null {
  return rankProductCandidates(namePart, products, unitPrice)[0]?.product ?? null;
}

// ─── Column-layout detection ─────────────────────────────────────────────────

/** Header token patterns, matched against single cleaned tokens. */
const COL_QTY_RE = /^(qty|qte|qt|quantite|quantity|qnt|كمي|كمية|الكمية|الكميه)$/;
const COL_PACK_RE = /^(pack|packqty|packquanti|qtypack|qtepack|pqt|pqtte|colis|carton|cartonqty|qtecarton|qtcarton|caisse|caisseqty|العبوه|العبوات|عدد العبوه|عدد العبوات|كميه العبوه|كميه العبوات|بالعبوه|بالعبوهات|كرتون)$/;
const COL_DES_RE = /^(designation|article|libelle|produit|product|nom|name|item|description|desc|بيان|البيان)$/;
const COL_PU_RE = /^(pu|puht|prix|prixunitaire|prixht|unitprice|unitpriceht|price|الوحدة|الوحده|سعر)$/;
const COL_TOTAL_RE = /^(total|tot|totalht|totalttc|montant|montantht|montantttc|ht|ttc|net|netht|amount|subtotal|المجموع|الاجمالي|المبلغ|الصافي)$/;

function tokenColumnKind(tok: string): ColumnKind | null {
  // normalizeForMatch folds accents («Désignation»→designation, «Qté»→qte)
  // and collapses separators («P.U»→pu, «unit_price»→unitprice).
  const clean = normalizeForMatch(tok).replace(/\s+/g, '');
  if (!clean) return null;
  if (COL_QTY_RE.test(clean)) return 'qty';
  if (COL_PACK_RE.test(clean)) return 'pack';
  if (COL_DES_RE.test(clean)) return 'des';
  if (COL_PU_RE.test(clean)) return 'pu';
  if (COL_TOTAL_RE.test(clean)) return 'total';
  return null;
}

/** Kinds of a header line, in order (null for tokens matching no column). */
function headerTokenKinds(header: string): (ColumnKind | null)[] {
  return header.split(/\s+/).map(tokenColumnKind);
}

function headerKinds(header: string): ColumnKind[] {
  return headerTokenKinds(header).filter((k): k is ColumnKind => k !== null);
}

/**
 * Only look for the table header among the first lines of the invoice —
 * a footer or totals block must never be mistaken for it.
 */
export const COL_HEADER_MAX_INDEX = 15;

/**
 * Detect the line-table header (e.g. «Qty Désignation PU HT Total»,
 * «الكمية البيان سعر الوحدة الإجمالي»). Knowing which columns exist lets the
 * parser read qty from the qty column and price from the PU column instead of
 * assuming "first number / last number".
 */
export function detectColumnLayout(lines: string[]): ColumnLayout | null {
  for (let i = 0; i < Math.min(lines.length, COL_HEADER_MAX_INDEX); i++) {
    const kinds = headerKinds(lines[i]);
    if (!kinds.includes('des')) continue;
    if (!(kinds.includes('qty') || kinds.includes('pu') || kinds.includes('total'))) continue;
    let trailingTotalCols = 0;
    const puIdx = kinds.indexOf('pu');
    for (let k = puIdx + 1; k < kinds.length; k++) {
      if (kinds[k] === 'total') trailingTotalCols++;
    }
    return {
      headerIndex: i,
      headerText: lines[i],
      hasQtyCol: kinds.includes('qty') || kinds.includes('pack'),
      qtyBeforeName: kinds.some((k) => k === 'qty' || k === 'pack') && kinds.indexOf('qty') < kinds.indexOf('des'),
      trailingTotalCols,
      columns: kinds,
    };
  }
  return null;
}

// ─── Line parsing ────────────────────────────────────────────────────────────

export interface RowColumnAssignment {
  quantity: number | null;
  packQty: number | null;
  unitPrice: number | null;
}

/**
 * Assign a product line's standalone numbers to the columns declared by the
 * table header. Real invoices print many columns («designation qty packQty
 * unitprice total»); mapping by COLUMN POSITION — not "first number / last
 * number" — keeps qty in the qty column and price in the unit-price column
 * even when a packQty column sits between them (the classic bug: «2 12 520.00»
 * read qty 12 / price 520 instead of qty 2 / pack 12 / price 520).
 *
 * Strategy: the header's numeric columns are `[qty?, pack?, pu]` followed by
 * `total...` columns. Each candidate hypothesis says "the last `tr` numbers are
 * line totals, the rest fill the non-total columns from both ends". The
 * hypothesis whose qty × [pack ×] unitPrice matches the first trailing total
 * (smallest relative diff) wins; when a total column is declared but the row
 * carries none, a fixed penalty ranks a "no total" row below any plausible
 * total reading — and identical scores keep the larger `tr` (more numbers read
 * as totals, mirroring the real line structure).
 */
export function assignRowColumns(nums: number[], columns: ColumnKind[]): RowColumnAssignment {
  const result: RowColumnAssignment = { quantity: null, packQty: null, unitPrice: null };
  const nonTotal = columns.filter((c): c is Exclude<ColumnKind, 'des' | 'total'> => c === 'qty' || c === 'pack' || c === 'pu');
  const totalCount = columns.filter((c) => c === 'total').length;
  if (!nonTotal.length || !nums.length) return result;

  const hasQtyCol = nonTotal.some((c) => c === 'qty' || c === 'pack');
  const maxTr = Math.min(totalCount, nums.length);
  let best: { quantity: number | null; packQty: number | null; unitPrice: number | null; score: number } | null = null;

  for (let tr = maxTr; tr >= 0; tr--) {
    const lead = nums.slice(0, nums.length - tr);
    const tails = nums.slice(nums.length - tr);
    if (lead.length > nonTotal.length) continue;

    const vals = endsFill(lead, nonTotal);
    const quantity = vals.get('qty') ?? null;
    const packQty = vals.get('pack') ?? null;
    const unitPrice = vals.get('pu') ?? null;
    const qtyForScoring = quantity ?? 1;

    let score = Infinity;
    if (tails.length >= 1) {
      const T = tails[0];
      const candidates = [
        unitPrice !== null ? qtyForScoring * unitPrice : NaN,
        quantity !== null && packQty !== null && unitPrice !== null ? quantity * packQty * unitPrice : NaN,
      ].filter((n) => Number.isFinite(n) && n > 0);
      if (candidates.length) score = Math.min(...candidates.map((n) => Math.abs(n - T) / Math.max(Math.abs(T), 1)));
    } else if (totalCount > 0) {
      score = 0.5; // header declares totals, this row has none — last resort
    } else if (lead.length === nonTotal.length) {
      score = 0;
    }

    if (score < (best?.score ?? Infinity)) {
      best = { quantity, packQty, unitPrice, score };
    }
  }

  if (best) {
    result.quantity = best.quantity;
    result.packQty = best.packQty;
    result.unitPrice = best.unitPrice;
    // A price-only row under a qty-declaring header still means "qty 1".
    if (result.quantity === null && result.unitPrice !== null && !hasQtyCol) result.quantity = 1;
  }
  return result;
}

/**
 * Fit `lead` numbers into the header's ordered non-total columns. Full rows map
 * left-to-right 1:1; a missing middle cell (blank packQty) pins the numbers to
 * BOTH ends — leftmost numbers belong to the left columns (qty) and rightmost
 * to the right columns (pu), so «2 520.00» under [qty,pack,pu] reads qty 2 / pu
 * 520, never pack 520 / pu null.
 */
function endsFill(lead: number[], cols: string[]): Map<string, number> {
  const vals = new Map<string, number>();
  const n = lead.length;
  const m = cols.length;
  if (n === m) {
    for (let i = 0; i < m; i++) vals.set(cols[i], lead[i]);
  } else if (n === 1) {
    vals.set(cols[m - 1], lead[0]); // a lone number after the name is the price
  } else if (n > 1) {
    const leftCount = Math.ceil(n / 2);
    for (let i = 0; i < Math.min(leftCount, m); i++) vals.set(cols[i], lead[i]);
    for (let j = 0; j < n - leftCount; j++) vals.set(cols[m - 1 - j], lead[n - 1 - j]);
  }
  return vals;
}

// ─── Geometric column reading (word boxes) ───────────────────────────────────

/** canonical reference width the box coordinates are normalized to */
const COL_REF_W = 1600;
/** canonical px — two word centers closer than this belong to one column band */
const COL_CLUSTER_TOL = 48;
/** image px — nearest-stripe assignment tolerance floor */
const COL_ASSIGN_TOL_FLOOR = 40;

function wordCx(w: OcrWord): number {
  return w.x + w.w / 2;
}

/** standalone numeric token (mirrors extractProductNumberTokens) */
function isNumericWord(text: string): boolean {
  return /^[\d.,]+$/.test(String(text ?? '').trim());
}

/** scale so the widest word's right edge maps to COL_REF_W */
function colScale(lines: OcrLine[]): number {
  let pageW = 0;
  for (const l of lines) for (const w of l.words) pageW = Math.max(pageW, w.x + w.w);
  if (pageW < 100) return 1;
  return COL_REF_W / pageW;
}

/**
 * Anchor every numeric column at its header word's x-center (occurrence-aware:
 * «HT Total» maps to the two 'total' columns). Returns nulls for columns whose
 * header word was not recognized.
 */
function headerColumnAnchors(header: OcrLine, numericKinds: ColumnKind[], s: number): (number | null)[] {
  const occ = new Map<ColumnKind, number>();
  const anchors: (number | null)[] = numericKinds.map(() => null);
  const occurrenceIndex = (kind: ColumnKind, o: number): number => {
    let seen = 0;
    for (let i = 0; i < numericKinds.length; i++) {
      if (numericKinds[i] === kind) {
        if (seen === o) return i;
        seen++;
      }
    }
    return -1;
  };
  for (const word of header.words) {
    const kind = tokenColumnKind(word.text);
    if (!kind || kind === 'des') continue;
    const o = occ.get(kind) ?? 0;
    occ.set(kind, o + 1);
    const idx = occurrenceIndex(kind, o);
    if (idx >= 0 && anchors[idx] === null) anchors[idx] = wordCx(word) * s;
  }
  return anchors;
}

/** numeric word centers (canonical) of the table body, minus header/totals/contact lines */
function dataNumericCenters(lines: OcrLine[], headerIndex: number, s: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === headerIndex) continue;
    const text = lines[i].text;
    if (TOTAL_KEYWORDS.test(text)) continue;
    if (extractDate(text)) continue;
    if (SKIP_KEYWORDS.test(text)) continue;
    for (const w of lines[i].words) if (isNumericWord(w.text)) out.push(wordCx(w) * s);
  }
  return out;
}

/** adaptive cluster of sorted values into bands (band = mean of its members) */
function clusterBands(values: number[], tol: number): number[] {
  const xs = [...values].sort((a, b) => a - b);
  if (!xs.length) return [];
  const bands: number[] = [];
  let start = xs[0];
  let prev = xs[0];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - prev > tol) {
      bands.push((start + prev) / 2);
      start = xs[i];
    }
    prev = xs[i];
  }
  bands.push((start + prev) / 2);
  return bands;
}

/**
 * Detect the horizontal column stripes of the table from word geometry.
 * Primary: every numeric column is anchored at its own header word. When the
 * header words are merged/misread, the table body's numeric words are clustered
 * into column bands (extra left bands — line numbers — are dropped).
 */
export function detectColumnStripes(lines: OcrLine[], layout: ColumnLayout): ColumnStripe[] | null {
  const numericKinds = layout.columns.filter((c): c is ColumnKind => c !== 'des');
  if (!numericKinds.length) return null;
  const header = lines[layout.headerIndex];
  if (!header?.words?.length) return null;
  const s = colScale(lines);

  const anchors = headerColumnAnchors(header, numericKinds, s);
  if (anchors.every((a) => a != null)) {
    return numericKinds.map((kind, i) => ({ kind, x: (anchors[i] as number) / s }));
  }

  const centers = dataNumericCenters(lines, layout.headerIndex, s);
  if (!centers.length) return null;
  let bands = clusterBands(centers, COL_CLUSTER_TOL);
  if (bands.length > numericKinds.length) bands = bands.slice(bands.length - numericKinds.length);
  if (bands.length !== numericKinds.length) return null;
  return numericKinds.map((kind, i) => ({ kind, x: bands[i] / s }));
}

/**
 * Read a product line's numbers from the detected column stripes: each numeric
 * word is snapped to the nearest stripe (within tolerance), so a qty in the qty
 * band, a pack qty in the pack band and a price in the PU band are read even
 * when the columns are far apart or a middle cell is blank.
 */
export function assignRowColumnsGeometric(row: OcrLine, stripes: ColumnStripe[]): RowColumnAssignment {
  const result: RowColumnAssignment = { quantity: null, packQty: null, unitPrice: null };
  const nums = row.words.filter((w) => isNumericWord(w.text));
  if (!nums.length || !stripes.length) return result;

  const sorted = [...stripes].sort((a, b) => a.x - b.x);
  let minGap = Infinity;
  for (let i = 1; i < sorted.length; i++) minGap = Math.min(minGap, sorted[i].x - sorted[i - 1].x);
  const tol =
    sorted.length === 1
      ? Infinity
      : Math.max(COL_ASSIGN_TOL_FLOOR, (Number.isFinite(minGap) ? minGap : 0) * 0.5);

  const pick = (kind: ColumnKind): number | null => {
    const stripe = sorted.find((st) => st.kind === kind);
    if (!stripe) return null;
    let best: { n: number; d: number } | null = null;
    for (const w of nums) {
      const d = Math.abs(wordCx(w) - stripe.x);
      if (d > tol) continue;
      const n = parseNumber(w.text);
      if (n === null) continue;
      if (!best || d < best.d) best = { n, d };
    }
    return best?.n ?? null;
  };

  result.quantity = pick('qty');
  result.packQty = pick('pack');
  result.unitPrice = pick('pu');
  return result;
}

/** Extract every numeric token from a line (used for qty/price + totals). */
function extractNumberTokens(line: string): number[] {
  const tokens: number[] = [];
  const sep = line.replace(/[^0-9.,]/g, ' ');
  for (const tok of sep.split(/[^0-9.,]+/)) {
    if (!tok) continue;
    const n = parseNumber(tok);
    if (n !== null) tokens.push(n);
  }
  return tokens;
}

/**
 * Pure-numeric tokens only. A product's SIZE number is glued to its unit
 * («عسل 1كلغ», «1kg», «1L») — it is part of the NAME, never the qty/price
 * column. So qty/price must come from standalone number tokens only:
 * «عسل 1كلغ 2 500.00» → qty 2, price 500 (not qty 1).
 */
function extractProductNumberTokens(line: string): number[] {
  const tokens: number[] = [];
  for (const part of line.split(/\s+/)) {
    if (!part || !/^[\d.,]+$/.test(part)) continue;
    const n = parseNumber(part);
    if (n !== null) tokens.push(n);
  }
  return tokens;
}

function stripIndex(line: string): string {
  return line.replace(/^\s*(\d{1,2})[.)]\s*/, '');
}

/**
 * Extract the product-name part of a line: everything left after numeric
 * tokens, stray separators and index remnants are removed. Sizes glued to the
 * name («1كلغ», «1L», «2kg») are themselves removed here so the name-only
 * search never has to match a size digit the OCR dropped — the number-intact
 * line is searched as a fallback in the caller.
 */
export function productNamePart(working: string): string {
  const numRe = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{1,2}|\d+)/g;
  let namePart = working.replace(numRe, ' ').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  namePart = namePart.replace(/^[.)\-]\s*/, '');
  return namePart;
}

function stripMultiplier(line: string): { rest: string; qty: number | null; price: number | null } {
  const m = line.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/);
  if (m) {
    const qty = parseNumber(m[1]);
    const price = parseNumber(m[2]);
    const rest = line.replace(m[0], ' ');
    return { rest, qty, price };
  }
  return { rest: line, qty: null, price: null };
}

/** Header/total keywords that must never be treated as product lines. */
const SKIP_KEYWORDS =
  /facture|factur|date\b|تاريخ|t[eé]l[eé]|t[eé]l\b|هاتف|adresse|adr\b|عنوان|nif\b|nis\b|rc\b|رقم التعريف|fax\b|فاكس|iban\b|rib\b|email|email|r[eé]gime|mode de paiement|way of payment/i;

const TOTAL_KEYWORDS =
  /total|ttc\b|ht\b|t\.v\.a|tva|المجموع|الإجمالي|الاجمالي|مجموع|الضريبة|ضريبة|prix total/i;

const SUPPLIER_LINE_PREFIXES = /^(fournisseur|vendeur|مورد|المورد|بائع|الزبون|زبون|client|buyer|supplier)\s*[:|\-]?\s*/i;

/** Numbers in an OCR line that look like a product-line index (≤ 99). */
function looksLikeIndex(line: string): boolean {
  const m = line.match(/^(\d{1,2})[.)]/);
  if (!m) return false;
  return parseInt(m[1], 10) <= 99;
}

export interface ParseContext {
  products?: ProductLite[];
  suppliers?: SupplierLite[];
}

/**
 * Parse full OCR invoice text into a structured prefill result.
 * Robust on purpose: any line that does not clearly match a header/total rule
 * is surfaced as a candidate line (human confirms in the modal).
 *
 * Accepts either plain text (engine `result.text`) or the structured line list
 * with word boxes (`OcrLine[]`, from `runInvoiceOcr`) — boxes enable the
 * geometric column reader, which snaps each number to the column band whose
 * x-anchor it is nearest to instead of relying on token position.
 */
export function parseInvoiceText(input: string | OcrLine[], ctx: ParseContext = {}): OcrInvoiceResult {
  const products = ctx.products ?? [];
  const suppliers = ctx.suppliers ?? [];
  // Structured input (words + boxes) enables the geometric column reader; plain
  // strings use the text-only positional path. The index alignment between
  // `lines[i]` and `structured[i]` is preserved (no empty-line filtering).
  const structured = typeof input === 'string' ? null : input;
  const rawText = structured
    ? structured.map((l) => l.text).join('\n')
    : String(input ?? '');
  const result: OcrInvoiceResult = {
    rawText,
    documentDate: null,
    supplier: null,
    supplierRaw: null,
    reference: null,
    lines: [],
    totalTtc: null,
    totalHt: null,
    tvaRate: null,
  };

  const lines = structured
    ? structured.map((l) => l.text.trim())
    : rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Detect the line-table header («Qty Désignation PU HT Total») so qty/price
  // are read from the right columns and the header itself is never a product line.
  const layout = detectColumnLayout(lines);
  const stripes = layout && structured ? detectColumnStripes(structured, layout) : null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rowOcr = structured ? structured[i] : null;
    if (layout && i === layout.headerIndex) continue;

    const date = extractDate(line);
    if (date) {
      if (!result.documentDate) result.documentDate = date;
      continue;
    }

    const supplierMatch = matchSupplier(line, suppliers);
    if (supplierMatch) {
      // FIRST supplier hit wins — a later weak phone/NIF match must never
      // overwrite a strong name match from the invoice header.
      if (!result.supplier) {
        result.supplier = supplierMatch;
        result.supplierRaw = line;
      }
      continue;
    }
    const supPrefix = line.match(SUPPLIER_LINE_PREFIXES);
    if (supPrefix && !TOTAL_KEYWORDS.test(line) && !/\d/.test(line.replace(/\s/g, ''))) {
      const rest = line.replace(SUPPLIER_LINE_PREFIXES, '').trim();
      if (rest && rest.length >= 2) {
        if (!result.supplier) result.supplierRaw = rest;
      }
      continue;
    }

    // FACTURE N° 00123 / فاتورة رقم 123
    const refMatch = line.match(
      /^\s*(facture|factur|فاتورة|رقم|رفم)[\s:°#]*n?[°o]?\s*[:#-]?\s*([\w\-/]+)\s*$/i,
    );
    if (refMatch) {
      if (!result.reference) result.reference = refMatch[2];
      continue;
    }

    // Totals / TVA lines
    if (TOTAL_KEYWORDS.test(line)) {
      const nums = extractNumberTokens(line);
      if (nums.length === 0) continue;
      const last = nums[nums.length - 1];
      if (/%|٪/.test(line) && /tva|ضريبة|t\.v\.a/i.test(line)) {
        // «TVA 19% : 475.95» — the RATE is the first number on a % line.
        result.tvaRate = nums[0];
      } else if (/\bht\b|مجموع ال|الإجمالي|الاجمالي|المجموع/i.test(line) && !/ttc|مجموع شامل/i.test(line)) {
        result.totalHt = last;
      } else {
        result.totalTtc = last;
      }
      continue;
    }

    if (SKIP_KEYWORDS.test(line)) continue;

    // Product line
    let working = line;
    let qty: number | null = null;
    let price: number | null = null;
    let packQty: number | null = null;

    // Explicit "3 x 520.00"
    const mult = stripMultiplier(working);
    if (mult.qty !== null && mult.price !== null) {
      qty = mult.qty;
      price = mult.price;
      working = mult.rest;
    }

    if (looksLikeIndex(working)) working = stripIndex(working);
    working = working.replace(/\s+/g, ' ').trim();

    const nums = extractProductNumberTokens(working);
    if (qty === null || price === null) {
      if (layout?.columns?.length) {
        // Column-driven mapping: qty/price read from their declared columns.
        // With word geometry (structured OCR) each number is snapped to the
        // column stripe whose x-anchor it is nearest to; without boxes the
        // text-positional heuristic is used, and a failed geometric mapping
        // falls back to it as well.
        let mapped: RowColumnAssignment;
        if (rowOcr && stripes?.length) {
          mapped = assignRowColumnsGeometric(rowOcr, stripes);
          if (mapped.quantity === null && mapped.packQty === null && mapped.unitPrice === null) {
            mapped = assignRowColumns(nums, layout.columns);
          }
        } else {
          mapped = assignRowColumns(nums, layout.columns);
        }
        packQty = mapped.packQty;
        if (qty === null && mapped.quantity !== null) qty = mapped.quantity;
        if (price === null && mapped.unitPrice !== null) price = mapped.unitPrice;
        if (qty === null && price === null && nums.length === 0) continue;
        if (qty === null) qty = 1;
      } else if (nums.length >= 2) {
        // Reached only when NO table header was detected (a detected layout
        // always takes the column-driven branch above, which handles trailing
        // totals internally via assignRowColumns): classic first/last heuristic.
        qty = qty ?? nums[0];
        price = price ?? nums[nums.length - 1];
      } else if (nums.length === 1) {
        price = price ?? nums[0];
        qty = qty ?? 1;
      } else {
        continue; // no numbers → company/header line
      }
    }

    if (qty !== null && qty <= 0) qty = 1;

    const namePart = productNamePart(working);
    let ranked = rankProductCandidates(namePart, products, price);
    let winner = ranked[0] ?? null;
    if (!winner) {
      ranked = rankProductCandidates(working, products, price);
      winner = ranked[0] ?? null;
    }

    result.lines.push({
      text: line,
      quantity: qty ?? 1,
      unitPrice: price,
      packQty,
      product: winner?.product ?? null,
      productId: winner?.product?.id ?? null,
      matchTier: winner?.tier ?? null,
      suggestions: ranked,
    });
  }

  return result;
}

// ─── OCR runner (lazy ppu-paddle-ocr) ────────────────────────────────────────

declare global {
  interface Window {
    __OCR_TEST_TEXT__?: string;
  }
}

export const OCR_MAX_DIM = 2400;
export const OCR_MAX_BYTES = 30 * 1024 * 1024;

/**
 * Downscale target for OCR input. Photos from a phone camera are typically
 * 3000–4000px wide — the OCR engine is dramatically slower on those for no gain.
 * Anything already ≤ maxDim keeps its size.
 */
export function computeOcrScale(width: number, height: number, maxDim = OCR_MAX_DIM): number {
  const longest = Math.max(width || 0, height || 0);
  if (longest <= 0) return 1;
  return Math.min(1, maxDim / longest);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('تعذر قراءة الصورة')); };
    img.src = url;
  });
}

/**
 * Validate + preprocess an image before OCR. Decodes it, downscales the
 * longest side to ≤ `OCR_MAX_DIM` and re-encodes to JPEG 0.92 — a 4000px
 * phone photo becomes ≤2400px, cutting OCR time while keeping accuracy.
 * Returns the original `File` when nothing needs to change (already small
 * JPEG), otherwise a processed `File`. Throws a clear Arabic error for
 * non-images, oversized files and undecodable images.
 */
export async function prepareOcrFile(file: File): Promise<File> {
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('الملف المحدد ليس صورة — اختر صورة فاتورة');
  }
  if (file.size > OCR_MAX_BYTES) {
    throw new Error('الصورة كبيرة جداً (الحد الأقصى 30MB) — اختر صورة أصغر');
  }
  const img = await loadImage(file);
  const scale = computeOcrScale(img.naturalWidth, img.naturalHeight);
  if (scale === 1 && file.type === 'image/jpeg') return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

/**
 * Run OCR on a captured image and return the recognized text — or, when the
 * engine exposes word geometry, the structured line list (`OcrLine[]`) that
 * enables the geometric column reader (see `parseInvoiceText`).
 * - Test seam: when `window.__OCR_TEST_TEXT__` is set it is returned verbatim
 *   (no OCR engine import, no preprocessing) — used by Playwright.
 * - Otherwise the image is preprocessed (downscale + JPEG re-encode, see
 *   `prepareOcrFile`) then lazy-imports `ppu-paddle-ocr` (PP-OCRv6 running on
 *   onnxruntime-web in the browser). The multilingual V6 model covers Arabic +
 *   Latin + digits in one engine, so `lang` is accepted for API-compatibility
 *   but ignored. `V6_SMALL_MODEL` (vs the tiny default) reads invoices more
 *   reliably at a modest speed cost, and `spaceRecovery` restores inter-word
 *   gaps so Latin column headers («Unit Price») are not glued together. Models
 *   + wasm are fetched on first use (needs connectivity) and cached by the
 *   service worker (`ocr-models-cache`, see vite.config.js); progress is
 *   reported via synthetic milestones because the engine exposes no per-stage
 *   logger.
 */
export async function runInvoiceOcr(
  file: File,
  opts: { lang?: string; onProgress?: (p: OcrProgress) => void } = {},
): Promise<string | OcrLine[]> {
  if (typeof window !== 'undefined' && window.__OCR_TEST_TEXT__) {
    return window.__OCR_TEST_TEXT__;
  }
  const report = (status: string, progress: number) => opts.onProgress?.({ status, progress });
  report('preparing image', 0);
  const prepared = await prepareOcrFile(file);
  const { PaddleOcrService, V6_SMALL_MODEL } = await import('ppu-paddle-ocr/web');
  const service = new PaddleOcrService({
    model: V6_SMALL_MODEL,
    // spaceRecovery restores inter-word gaps so Latin headers are not glued;
    // charactersDictionary defaults to [] and is replaced by the model's dict
    // during initialize().
    recognition: { spaceRecovery: true, charactersDictionary: [] },
  });
  report('loading ocr model', 0.2);
  try {
    await service.initialize();
    report('recognizing text', 0.6);
    const buffer = await prepared.arrayBuffer();
    const result = (await service.recognize(buffer)) as unknown as EngineOcrResultLike;
    report('done', 1);
    return toOcrLines(result.lines);
  } finally {
    await service.destroy();
  }
}

/** Structural view of the engine's grouped recognition result. */
interface EngineOcrResultLike {
  text: string;
  lines: OcrWordLike[][];
}

/** Structural view of a single recognized word (engine box shape). */
interface OcrWordLike {
  text: string;
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
}

/**
 * Map the engine's grouped word lines (L→R reading order, y ascending) onto
 * the `OcrLine` shape consumed by the geometric parser.
 */
function toOcrLines(lines: OcrWordLike[][]): OcrLine[] {
  return (lines ?? [])
    .map((words) => {
      const ws = (words ?? [])
        .filter((w) => typeof w?.text === 'string' && w.box)
        .map((w) => ({
          text: w.text,
          x: Number(w.box.x) || 0,
          y: Number(w.box.y) || 0,
          w: Number(w.box.width) || 0,
          h: Number(w.box.height) || 0,
          confidence: typeof w.confidence === 'number' ? w.confidence : 0,
        }));
      return ws;
    })
    .filter((ws) => ws.length)
    .map((ws) => ({
      words: ws,
      text: ws.map((w) => w.text).join(' '),
      y: Math.min(...ws.map((w) => w.y)),
    }));
}
