// Arabic amount-in-words for invoices («أوقفت هذه الفاتورة على مبلغ …»).
//
// The previous version only handled amounts below 10 000: for 18 609.60 it
// looked up `units[18]` and printed «undefined آلاف وست مئة وتسعة», and it
// ignored centimes and the currency. This one covers up to 999 billion, adds
// the currency name and the centimes.

const UNITS = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مئة', 'مئتان', 'ثلاث مئة', 'أربع مئة', 'خمس مئة', 'ست مئة', 'سبع مئة', 'ثمان مئة', 'تسع مئة'];

/** 0..999 → words ('' for 0). */
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const t = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(HUNDREDS[h]);
  if (t > 0) {
    if (t < 10) parts.push(UNITS[t]);
    else if (t < 20) parts.push(TEENS[t - 10]);
    else {
      const u = t % 10;
      const tens = TENS[Math.floor(t / 10)];
      parts.push(u > 0 ? `${UNITS[u]} و${tens}` : tens);
    }
  }
  return parts.join(' و');
}

/** One scale group (thousands, millions, …) with Arabic number agreement. */
function scaleGroup(n: number, one: string, two: string, plural: string): string {
  if (n === 0) return '';
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${below1000(n)} ${plural}`;
  return `${below1000(n)} ${one}`;
}

/** Integer part → Arabic words. */
export function integerToArabicWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'صفر';
  const billions = Math.floor(n / 1e9); n %= 1e9;
  const millions = Math.floor(n / 1e6); n %= 1e6;
  const thousands = Math.floor(n / 1e3); n %= 1e3;
  const parts = [
    scaleGroup(billions, 'مليار', 'ملياران', 'مليارات'),
    scaleGroup(millions, 'مليون', 'مليونان', 'ملايين'),
    scaleGroup(thousands, 'ألف', 'ألفان', 'آلاف'),
    below1000(n),
  ].filter(Boolean);
  return parts.join(' و');
}

const CURRENCY_NAMES: Record<string, { main: string; sub: string }> = {
  DZD: { main: 'دينار جزائري', sub: 'سنتيم' },
  EUR: { main: 'يورو', sub: 'سنت' },
  USD: { main: 'دولار أمريكي', sub: 'سنت' },
};

/**
 * Amount → Arabic words with currency and centimes, e.g.
 * 18609.60 → «ثمانية عشر ألف وست مئة وتسعة دينار جزائري وستون سنتيم».
 * Pass `currencyCode: null` to get the bare number words.
 */
export function numberToArabicWords(n: number, currencyCode: string | null = 'DZD'): string {
  const value = Number.isFinite(n) ? Math.abs(n) : 0;
  const cents = Math.round((value - Math.floor(value)) * 100) % 100;
  const whole = Math.floor(value + (Math.round((value - Math.floor(value)) * 100) === 100 ? 1 : 0));
  const words = integerToArabicWords(whole);
  if (!currencyCode) return words;
  const cur = CURRENCY_NAMES[currencyCode] ?? { main: currencyCode, sub: '' };
  let out = `${words} ${cur.main}`;
  if (cents > 0) out += cur.sub ? ` و${below1000(cents)} ${cur.sub}` : ` و${below1000(cents)}/100`;
  return out;
}
