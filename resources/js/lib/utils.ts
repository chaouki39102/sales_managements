// resources/js/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'DZD'): string {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency,
  }).format(amount);
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
