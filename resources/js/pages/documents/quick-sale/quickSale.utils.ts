// pages/documents/quick-sale/quickSale.utils.ts
import type { QuickLine } from './quickSale.types';

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function defaultDocDate(selectedYear?: { start_date?: string; end_date?: string }): string {
  const d = today();
  if (selectedYear?.start_date && selectedYear?.end_date) {
    const s = selectedYear.start_date.substring(0, 10);
    const e = selectedYear.end_date.substring(0, 10);
    if (d >= s && d <= e) return d;
    return e;
  }
  return d;
}

export function extractList(d: unknown): unknown[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (typeof d === 'object' && d !== null) {
    const arr = (d as Record<string, unknown>).data;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

export function calcLine(l: QuickLine) {
  const ht = l.price * l.quantity;
  const tva = ht * (l.tva_rate / 100);
  return { ht, tva, ttc: ht + tva };
}
