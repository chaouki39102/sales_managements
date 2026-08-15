// ════════════════════════════════════════════════════════════════════════════
// lib/invoiceOcr.ts — B.4 supplier-invoice OCR → FA prefill
//
// Pure, dependency-free parsing helpers + a lazy tesseract.js runner.
// The runner MUST NOT run in unit tests: `runInvoiceOcr` short-circuits on the
// `window.__OCR_TEST_TEXT__` seam (set via Playwright addInitScript) and the
// tesseract module itself is only loaded via dynamic import().
//
// Pure helpers used by the vitest suite directly (no DOM, no tesseract):
//   parseNumber / extractDate / normalizeForMatch / matchSupplier / matchProduct
//   parseInvoiceText
// ════════════════════════════════════════════════════════════════════════════

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrLineCandidate {
  /** raw OCR line text (before product matching) */
  text: string;
  quantity: number;
  unitPrice: number | null;
  product: ProductLite | null;
}

export interface ProductLite {
  id: string | number;
  name: string;
  ref?: string | null;
  barcode?: string | null;
  tvaRate?: number | null;
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
 */
export function matchProduct(
  namePart: string,
  products: ProductLite[],
): ProductLite | null {
  const hay = normalizeForMatch(namePart);
  if (!hay) return null;
  let best: { p: ProductLite; score: number } | null = null;
  for (const p of products) {
    const barcode = normalizeForMatch(p.barcode);
    if (barcode.length >= 4 && hay.includes(barcode) && (!best || barcode.length > best.score)) {
      best = { p, score: barcode.length };
    }
    const ref = normalizeForMatch(p.ref);
    if (ref.length >= 2 && hay.includes(ref) && (!best || ref.length > best.score)) {
      best = { p, score: ref.length };
    }
    const name = normalizeForMatch(p.name);
    if (name.length >= 2 && hay.includes(name) && (!best || name.length > best.score)) {
      best = { p, score: name.length };
    }
  }
  return best?.p ?? null;
}

// ─── Line parsing ────────────────────────────────────────────────────────────

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

function stripIndex(line: string): string {
  return line.replace(/^\s*(\d{1,2})[.)]\s*/, '');
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
 */
export function parseInvoiceText(text: string, ctx: ParseContext = {}): OcrInvoiceResult {
  const products = ctx.products ?? [];
  const suppliers = ctx.suppliers ?? [];
  const rawText = String(text ?? '');
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

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
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

    // Explicit "3 x 520.00"
    const mult = stripMultiplier(working);
    if (mult.qty !== null && mult.price !== null) {
      qty = mult.qty;
      price = mult.price;
      working = mult.rest;
    }

    if (looksLikeIndex(working)) working = stripIndex(working);
    working = working.replace(/\s+/g, ' ').trim();

    const nums = extractNumberTokens(working);
    if (qty === null || price === null) {
      if (nums.length >= 2) {
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

    // Name part = line minus its numeric tokens
    let namePart = working;
    const numRe = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{1,2}|\d+)/g;
    namePart = namePart.replace(numRe, ' ').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
    // also strip stray index remnants
    namePart = namePart.replace(/^[.)\-]\s*/, '');

    const product = matchProduct(namePart, products) ?? matchProduct(working, products);

    result.lines.push({
      text: line,
      quantity: qty ?? 1,
      unitPrice: price,
      product,
    });
  }

  return result;
}

// ─── OCR runner (lazy tesseract) ─────────────────────────────────────────────

declare global {
  interface Window {
    __OCR_TEST_TEXT__?: string;
  }
}

/**
 * Run OCR on a captured image and return the raw recognized text.
 * - Test seam: when `window.__OCR_TEST_TEXT__` is set it is returned verbatim
 *   (no tesseract import, no worker) — used by Playwright.
 * - Otherwise lazy-imports tesseract.js, creates a worker with `ara+eng`
 *   traineddata (loaded from the CDN on first use — needs connectivity),
 *   reports progress via onProgress, and terminates the worker afterwards.
 */
export async function runInvoiceOcr(
  file: File,
  opts: { lang?: string; onProgress?: (p: OcrProgress) => void } = {},
): Promise<string> {
  if (typeof window !== 'undefined' && window.__OCR_TEST_TEXT__) {
    return window.__OCR_TEST_TEXT__;
  }
  const Tesseract = await import('tesseract.js');
  const worker = await Tesseract.createWorker(opts.lang ?? 'ara+eng', 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m && m.status && opts.onProgress) {
        opts.onProgress({ status: m.status, progress: m.progress ?? 0 });
      }
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
