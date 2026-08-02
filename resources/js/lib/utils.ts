// resources/js/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'DZD'): string {
  const formatted = new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency,
  }).format(amount);
  return formatted.startsWith('-') ? '\u200E' + formatted : formatted;
}

export function formatDate(date: string | Date, locale = 'ar-DZ'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale = 'ar-DZ'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'حدث خطأ غير متوقع';
}

// ─── إضافة الدوال المستخدمة في FinancePage و DebtsPage ──────────────────────

/**
 * تنسيق الأرقام بدون رمز العملة (للجداول و KPIs)
 */
export function fmtNumber(n: number): string {
  return n.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * تنسيق التاريخ بصيغة مختصرة (يوم/شهر/سنة)
 */
export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-DZ');
}

/**
 * Convert an API date string to the LOCAL calendar date key "YYYY-MM-DD".
 *
 * The backend serializes `date`-cast fields as UTC ISO timestamps
 * (e.g. "2026-08-01T23:00:00.000000Z" for Aug 2 local in Africa/Algiers).
 * Sending that raw string back for a date field makes the backend date-cast
 * read the PREVIOUS local day — which broke the stock check (same-day
 * movements excluded → false "متاح (0)") and silently shifted document dates.
 * Always convert API dates to a local YYYY-MM-DD before re-sending them.
 */
export function toLocalDateKey(date?: string | null): string {
  if (!date) return '';
  const normalized = /\.\d{6}Z$/.test(date) ? date.slice(0, 19) + 'Z' : date;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return date.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
