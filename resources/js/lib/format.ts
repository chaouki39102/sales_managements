// ════════════════════════════════════════════════════════════════════════════
// lib/format.ts — Canonical money / number / date formatters (SSOT)
//
// Every file that formats Algerian Dinar amounts MUST import from here.
// ════════════════════════════════════════════════════════════════════════════

const DZD = new Intl.NumberFormat('fr-DZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DZD_NO_DEC = new Intl.NumberFormat('fr-DZ', {
  maximumFractionDigits: 0,
});

/** Format a number as Algerian Dinar: 1 234,56 (with RTL LTR-mark for negatives) */
export function fmtDZD(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  const num = Number.isFinite(v as number) ? (v as number) : 0;
  const formatted = DZD.format(num);
  return formatted.startsWith('-') ? '\u200E' + formatted : formatted;
}

/** Format as DZD with currency suffix: 1 234,56 دج */
export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return DZD.format(v) + ' دج';
}

/** Format as DZD with sign and suffix: - 1 234,56 دج or 1 234,56 دج */
export function fmtMoneySigned(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return (v < 0 ? '- ' : '') + DZD.format(Math.abs(v)) + ' دج';
}

/** Short format: 1,2M or 12,3K or 1 234 */
export function fmtMoneyShort(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1).replace('.0', '') + 'K';
  return DZD_NO_DEC.format(v);
}

/** Format as DZD with دج suffix and dash for empty: 1 234,56 دج or — */
export function fmtMoneyOrDash(n: number | '' | null | undefined): string {
  if (n === '' || n === null || n === undefined) return '—';
  const v = Number(n);
  return Number.isFinite(v) ? DZD.format(v) + ' دج' : '—';
}

/** Date formatted as Arabic short: 25 جوان 2026 */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Date formatted as Arabic numeric: 25/08/2026 */
export function fmtDateNumeric(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}
