import { formulaEngine, type ExpressionFunction, type ExpressionValue } from './FormulaEngine';

// ─── Helper ──────────────────────────────────────────────────────────────────

function toNum(v: ExpressionValue): number {
  return typeof v === 'number' ? v : Number(v) || 0;
}

function toStr(v: ExpressionValue): string {
  return v == null ? '' : String(v);
}

function toDate(v: ExpressionValue): Date | null {
  if (v instanceof Date) return v;
  const s = toStr(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isArray(v: ExpressionValue): boolean {
  return Array.isArray(v);
}

function isNumArr(v: ExpressionValue): v is number[] {
  return Array.isArray(v) && v.every(x => typeof x === 'number');
}

// ─── Financial Functions ─────────────────────────────────────────────────────

const PMT: ExpressionFunction = ([rate, nper, pvArg, fvArg, typeArg]) => {
  const r = toNum(rate) / 100;
  const n = toNum(nper);
  const pv = toNum(pvArg);
  const fv = fvArg != null ? toNum(fvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  if (r === 0) return -(pv + fv) / n;
  const pvif = Math.pow(1 + r, n);
  return -(r * pv * pvif + fv * r / (pvif - 1)) / (pvif - 1) / (1 + r * type);
};

const NPER: ExpressionFunction = ([rate, pmtArg, pvArg, fvArg, typeArg]) => {
  const r = toNum(rate) / 100;
  const pmt = toNum(pmtArg);
  const pv = toNum(pvArg);
  const fv = fvArg != null ? toNum(fvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  if (r === 0) return -(pv + fv) / pmt;
  const num = pmt * (1 + r * type) - fv * r;
  const den = pmt * (1 + r * type) + pv * r;
  return Math.log(num / den) / Math.log(1 + r);
};

const RATE: ExpressionFunction = ([nper, pmtArg, pvArg, fvArg, typeArg, guessArg]) => {
  const n = toNum(nper);
  const pmt = toNum(pmtArg);
  const pv = toNum(pvArg);
  const fv = fvArg != null ? toNum(fvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  let guess = guessArg != null ? toNum(guessArg) : 0.1;
  for (let i = 0; i < 100; i++) {
    const y = pmt * (1 + guess * type) * (Math.pow(1 + guess, n) - 1) / guess + pv * Math.pow(1 + guess, n) + fv;
    const dy = pmt * (1 + guess * type) * (n * Math.pow(1 + guess, n - 1) / guess - (Math.pow(1 + guess, n) - 1) / (guess * guess)) + pv * n * Math.pow(1 + guess, n - 1);
    if (Math.abs(dy) < 1e-12) break;
    const newGuess = guess - y / dy;
    if (Math.abs(newGuess - guess) < 1e-10) return newGuess;
    guess = newGuess;
  }
  return guess;
};

const FV: ExpressionFunction = ([rate, nper, pmtArg, pvArg, typeArg]) => {
  const r = toNum(rate) / 100;
  const n = toNum(nper);
  const pmt = toNum(pmtArg);
  const pv = pvArg != null ? toNum(pvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  if (r === 0) return -(pv + pmt * n);
  const pvif = Math.pow(1 + r, n);
  return -pv * pvif - pmt * (1 + r * type) * (pvif - 1) / r;
};

const PV: ExpressionFunction = ([rate, nper, pmtArg, fvArg, typeArg]) => {
  const r = toNum(rate) / 100;
  const n = toNum(nper);
  const pmt = toNum(pmtArg);
  const fv = fvArg != null ? toNum(fvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  if (r === 0) return -(fv + pmt * n);
  const pvif = Math.pow(1 + r, n);
  return -(fv / pvif + pmt * (1 + r * type) * (1 / r - 1 / (r * pvif)));
};

const NPV: ExpressionFunction = ([rate, ...values]) => {
  const r = toNum(rate) / 100;
  let result = 0;
  for (let i = 0; i < values.length; i++) {
    result += toNum(values[i]) / Math.pow(1 + r, i + 1);
  }
  return result;
};

const IRR: ExpressionFunction = ([...values]) => {
  const vals = values.map(toNum);
  let guess = 0.1;
  for (let i = 0; i < 1000; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let j = 0; j < vals.length; j++) {
      npv += vals[j] / Math.pow(1 + guess, j);
      dnpv -= j * vals[j] / Math.pow(1 + guess, j + 1);
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const newGuess = guess - npv / dnpv;
    if (Math.abs(newGuess - guess) < 1e-10) return newGuess;
    guess = newGuess;
  }
  return guess;
};

// ─── Date Functions ──────────────────────────────────────────────────────────

const DATEDIF: ExpressionFunction = ([start, end, unit]) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return null;
  const u = toStr(unit).toUpperCase();
  const ms = e.getTime() - s.getTime();
  const years = e.getFullYear() - s.getFullYear();
  const months = years * 12 + (e.getMonth() - s.getMonth());
  const days = Math.floor(ms / 86400000);
  if (u === 'Y') return years;
  if (u === 'M') return months;
  if (u === 'D') return days;
  if (u === 'MD') {
    return e.getDate() - s.getDate();
  }
  if (u === 'YM') return months % 12;
  if (u === 'YD') {
    const s2 = new Date(e.getFullYear(), s.getMonth(), s.getDate());
    return Math.floor((e.getTime() - s2.getTime()) / 86400000);
  }
  return days;
};

const EOMONTH: ExpressionFunction = ([date, months]) => {
  const d = toDate(date);
  if (!d) return null;
  const m = Math.floor(toNum(months));
  d.setMonth(d.getMonth() + m + 1, 0);
  return d.toISOString().slice(0, 10);
};

const WORKDAY: ExpressionFunction = ([start, days]) => {
  const d = toDate(start);
  if (!d) return null;
  let n = Math.floor(toNum(days));
  const dir = n >= 0 ? 1 : -1;
  while (n !== 0) {
    d.setDate(d.getDate() + dir);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 5) n -= dir;
  }
  return d.toISOString().slice(0, 10);
};

const NETWORKDAYS: ExpressionFunction = ([start, end]) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return null;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 5) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const WEEKNUM: ExpressionFunction = ([date]) => {
  const d = toDate(date);
  if (!d) return null;
  const s = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - s.getTime() + (s.getTimezoneOffset() - d.getTimezoneOffset()) * 60000;
  return Math.ceil((diff / 86400000 + s.getDay() + 1) / 7);
};

const ISOWEEKNUM: ExpressionFunction = ([date]) => {
  const d = toDate(date);
  if (!d) return null;
  const temp = new Date(d.valueOf());
  temp.setDate(temp.getDate() + 3 - (temp.getDay() + 6) % 7);
  const s = new Date(temp.getFullYear(), 0, 1);
  return 1 + Math.round(((temp.getTime() - s.getTime()) / 86400000 - 3 + (s.getDay() + 6) % 7) / 7);
};

const QUARTER: ExpressionFunction = ([date]) => {
  const d = toDate(date);
  if (!d) return null;
  return Math.floor(d.getMonth() / 3) + 1;
};

const YEARFRAC: ExpressionFunction = ([start, end]) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return null;
  return (e.getTime() - s.getTime()) / 365.25 / 86400000;
};

const EDATE: ExpressionFunction = ([date, months]) => {
  const d = toDate(date);
  if (!d) return null;
  d.setMonth(d.getMonth() + Math.floor(toNum(months)));
  return d.toISOString().slice(0, 10);
};

// ─── Array Functions ─────────────────────────────────────────────────────────

const FILTER: ExpressionFunction = ([arr, cond]) => {
  if (!isArray(arr)) return [];
  const condVal = (cond as ExpressionValue);
  if (typeof condVal === 'function') {
    return (arr as ExpressionValue[]).filter((item: any) => condVal(item));
  }
  return (arr as ExpressionValue[]).filter(() => isTruthy(condVal));
};

const SORT: ExpressionFunction = ([arr, direction]) => {
  if (!isArray(arr)) return [];
  const dir = toStr(direction).toLowerCase() === 'desc' ? -1 : 1;
  return [...(arr as ExpressionValue[])].sort((a, b) => {
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
    return String(a).localeCompare(String(b)) * dir;
  });
};

const UNIQUE: ExpressionFunction = ([arr]) => {
  if (!isArray(arr)) return [];
  return [...new Set(arr as ExpressionValue[])];
};

const FLATTEN: ExpressionFunction = ([arr]) => {
  if (!isArray(arr)) return [];
  const result: ExpressionValue[] = [];
  function flatten(v: ExpressionValue): void {
    if (Array.isArray(v)) v.forEach(flatten);
    else result.push(v);
  }
  (arr as ExpressionValue[]).forEach(flatten);
  return result;
};

const ARRAY: ExpressionFunction = ([...args]) => args;

const RANGE: ExpressionFunction = ([start, end, stepParam]) => {
  const s = Math.floor(toNum(start));
  const e = Math.floor(toNum(end));
  const step = stepParam != null ? Math.max(1, Math.floor(toNum(stepParam))) : 1;
  const result: number[] = [];
  for (let i = s; i <= e; i += step) result.push(i);
  return result;
};

function isTruthy(val: ExpressionValue): boolean {
  if (val === null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  return val !== '';
}

// ─── Window Functions ────────────────────────────────────────────────────────

const ROW_NUMBER: ExpressionFunction = ([_arr, sortField]) => { return null; };

const RANK: ExpressionFunction = ([arr, value, order]) => {
  if (!isNumArr(arr)) return null;
  const desc = toStr(order).toLowerCase() === 'desc';
  const sorted = [...arr].sort((a, b) => desc ? b - a : a - b);
  const idx = sorted.indexOf(toNum(value));
  return idx >= 0 ? idx + 1 : null;
};

const DENSE_RANK: ExpressionFunction = ([arr, value, order]) => {
  if (!isNumArr(arr)) return null;
  const desc = toStr(order).toLowerCase() === 'desc';
  const uniq = [...new Set(arr)].sort((a, b) => desc ? b - a : a - b);
  const idx = uniq.indexOf(toNum(value));
  return idx >= 0 ? idx + 1 : null;
};

const NTILE: ExpressionFunction = ([arr, n]) => {
  if (!isArray(arr) || !n) return [];
  const numTiles = Math.max(1, Math.floor(toNum(n)));
  const len = (arr as ExpressionValue[]).length;
  const perTile = Math.ceil(len / numTiles);
  return (arr as ExpressionValue[]).map((_, i) => Math.min(Math.floor(i / perTile) + 1, numTiles));
};

const LAG: ExpressionFunction = ([arr, offsetParam]) => {
  if (!isArray(arr)) return null;
  return null;
};

const LEAD: ExpressionFunction = ([arr, offsetParam]) => {
  if (!isArray(arr)) return null;
  return null;
};

const FIRST_VALUE: ExpressionFunction = ([arr]) => {
  return isArray(arr) ? (arr as ExpressionValue[])[0] ?? null : null;
};

const LAST_VALUE: ExpressionFunction = ([arr]) => {
  return isArray(arr) ? (arr as ExpressionValue[])[(arr as ExpressionValue[]).length - 1] ?? null : null;
};

const SUM_OVER: ExpressionFunction = ([..._args]) => null;
const AVG_OVER: ExpressionFunction = ([..._args]) => null;

// ─── Aggregation Extensions ──────────────────────────────────────────────────

const MEDIAN: ExpressionFunction = ([arr]) => {
  if (!isNumArr(arr) || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const MODE: ExpressionFunction = ([arr]) => {
  if (!isNumArr(arr) || arr.length === 0) return null;
  const freq = new Map<number, number>();
  for (const n of arr) freq.set(n, (freq.get(n) ?? 0) + 1);
  let maxFreq = 0;
  let mode = arr[0];
  for (const [n, f] of freq) {
    if (f > maxFreq) { maxFreq = f; mode = n; }
  }
  return mode;
};

const STDDEV: ExpressionFunction = ([arr]) => {
  if (!isNumArr(arr) || arr.length < 2) return null;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
};

const VARIANCE: ExpressionFunction = ([arr]) => {
  if (!isNumArr(arr) || arr.length < 2) return null;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
};

const PRODUCT: ExpressionFunction = ([...args]) => {
  const nums = args.filter((v): v is number => typeof v === 'number');
  return nums.length > 0 ? nums.reduce((p, v) => p * v, 1) : 0;
};

const COUNTIF: ExpressionFunction = ([arr, predicate]) => {
  if (!isArray(arr)) return 0;
  let count = 0;
  for (const item of (arr as ExpressionValue[])) {
    if (typeof predicate === 'number') {
      if (item === predicate) count++;
    } else if (typeof predicate === 'string') {
      if (String(item).includes(predicate)) count++;
    } else if (predicate === true) {
      if (isTruthy(item)) count++;
    }
  }
  return count;
};

const SUMIF: ExpressionFunction = ([arr, predicate, sumArr]) => {
  const items = isArray(arr) ? (arr as ExpressionValue[]) : [];
  const sums = sumArr != null && isArray(sumArr) ? (sumArr as ExpressionValue[]) : null;
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    let match = false;
    if (typeof predicate === 'number') match = items[i] === predicate;
    else if (typeof predicate === 'string') match = String(items[i]).includes(predicate);
    else if (predicate === true) match = isTruthy(items[i]);
    if (match) total += toNum(sums ? (sums[i] ?? items[i]) : items[i]);
  }
  return total;
};

const AVERAGEIF: ExpressionFunction = ([arr, predicate, avgArr]) => {
  const items = isArray(arr) ? (arr as ExpressionValue[]) : [];
  const avgs = avgArr != null && isArray(avgArr) ? (avgArr as ExpressionValue[]) : null;
  let total = 0;
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    let match = false;
    if (typeof predicate === 'number') match = items[i] === predicate;
    else if (typeof predicate === 'string') match = String(items[i]).includes(predicate);
    else if (predicate === true) match = isTruthy(items[i]);
    if (match) { total += toNum(avgs ? (avgs[i] ?? items[i]) : items[i]); count++; }
  }
  return count > 0 ? total / count : 0;
};

// ─── Lookup Functions ────────────────────────────────────────────────────────

const VLOOKUP: ExpressionFunction = ([lookup, range, colIndex, exactMatch]) => {
  if (!isArray(range)) return null;
  const rows = range as ExpressionValue[];
  const col = Math.floor(toNum(colIndex)) - 1;
  const exact = exactMatch == null || isTruthy(exactMatch);
  for (const row of rows) {
    if (isArray(row)) {
      const r = row as ExpressionValue[];
      if (exact ? r[0] === lookup : String(r[0]).toLowerCase().includes(String(lookup).toLowerCase())) {
        return r[col] ?? null;
      }
    }
  }
  return null;
};

const HLOOKUP: ExpressionFunction = ([lookup, range, rowIndex, exactMatch]) => {
  if (!isArray(range)) return null;
  const cols = range as ExpressionValue[];
  const row = Math.floor(toNum(rowIndex)) - 1;
  const exact = exactMatch == null || isTruthy(exactMatch);
  for (const col of cols) {
    if (isArray(col)) {
      const c = col as ExpressionValue[];
      if (exact ? c[0] === lookup : String(c[0]).toLowerCase().includes(String(lookup).toLowerCase())) {
        return c[row] ?? null;
      }
    }
  }
  return null;
};

const INDEX: ExpressionFunction = ([arr, row, col]) => {
  if (!isArray(arr)) return null;
  const rows = arr as ExpressionValue[];
  const r = Math.floor(toNum(row)) - 1;
  if (col != null) {
    const c = Math.floor(toNum(col)) - 1;
    const item = rows[r];
    return isArray(item) ? (item as ExpressionValue[])[c] ?? null : null;
  }
  return rows[r] ?? null;
};

const MATCH: ExpressionFunction = ([lookup, arr, matchType]) => {
  if (!isArray(arr)) return null;
  const items = arr as ExpressionValue[];
  const mt = matchType != null ? Math.floor(toNum(matchType)) : 0;
  for (let i = 0; i < items.length; i++) {
    if (mt === 0 && items[i] === lookup) return i + 1;
    if (mt === 1 && typeof items[i] === 'number' && typeof lookup === 'number' && items[i] <= lookup) return i + 1;
    if (mt === -1 && typeof items[i] === 'number' && typeof lookup === 'number' && items[i] >= lookup) return i + 1;
  }
  return null;
};

const CHOOSE: ExpressionFunction = ([index, ...values]) => {
  const idx = Math.floor(toNum(index)) - 1;
  return values[idx] ?? null;
};

// ─── Register all advanced functions ─────────────────────────────────────────

export function registerAdvancedFunctions(): void {
  // Financial
  formulaEngine.registerFunction('PMT', PMT);
  formulaEngine.registerFunction('NPER', NPER);
  formulaEngine.registerFunction('RATE', RATE);
  formulaEngine.registerFunction('FV', FV);
  formulaEngine.registerFunction('PV', PV);
  formulaEngine.registerFunction('NPV', NPV);
  formulaEngine.registerFunction('IRR', IRR);

  // Date
  formulaEngine.registerFunction('DATEDIF', DATEDIF);
  formulaEngine.registerFunction('EOMONTH', EOMONTH);
  formulaEngine.registerFunction('WORKDAY', WORKDAY);
  formulaEngine.registerFunction('NETWORKDAYS', NETWORKDAYS);
  formulaEngine.registerFunction('WEEKNUM', WEEKNUM);
  formulaEngine.registerFunction('ISOWEEKNUM', ISOWEEKNUM);
  formulaEngine.registerFunction('QUARTER', QUARTER);
  formulaEngine.registerFunction('YEARFRAC', YEARFRAC);
  formulaEngine.registerFunction('EDATE', EDATE);

  // Array
  formulaEngine.registerFunction('FILTER', FILTER);
  formulaEngine.registerFunction('SORT', SORT);
  formulaEngine.registerFunction('UNIQUE', UNIQUE);
  formulaEngine.registerFunction('FLATTEN', FLATTEN);
  formulaEngine.registerFunction('ARRAY', ARRAY);
  formulaEngine.registerFunction('RANGE', RANGE);

  // Window
  formulaEngine.registerFunction('ROW_NUMBER', ROW_NUMBER);
  formulaEngine.registerFunction('RANK', RANK);
  formulaEngine.registerFunction('DENSE_RANK', DENSE_RANK);
  formulaEngine.registerFunction('NTILE', NTILE);
  formulaEngine.registerFunction('LAG', LAG);
  formulaEngine.registerFunction('LEAD', LEAD);
  formulaEngine.registerFunction('FIRST_VALUE', FIRST_VALUE);
  formulaEngine.registerFunction('LAST_VALUE', LAST_VALUE);
  formulaEngine.registerFunction('SUM_OVER', SUM_OVER);
  formulaEngine.registerFunction('AVG_OVER', AVG_OVER);

  // Aggregation extensions
  formulaEngine.registerFunction('MEDIAN', MEDIAN);
  formulaEngine.registerFunction('MODE', MODE);
  formulaEngine.registerFunction('STDDEV', STDDEV);
  formulaEngine.registerFunction('VARIANCE', VARIANCE);
  formulaEngine.registerFunction('PRODUCT', PRODUCT);
  formulaEngine.registerFunction('COUNTIF', COUNTIF);
  formulaEngine.registerFunction('SUMIF', SUMIF);
  formulaEngine.registerFunction('AVERAGEIF', AVERAGEIF);

  // Lookup
  formulaEngine.registerFunction('VLOOKUP', VLOOKUP);
  formulaEngine.registerFunction('HLOOKUP', HLOOKUP);
  formulaEngine.registerFunction('INDEX', INDEX);
  formulaEngine.registerFunction('MATCH', MATCH);
  formulaEngine.registerFunction('CHOOSE', CHOOSE);
}
