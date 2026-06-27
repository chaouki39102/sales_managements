// ════════════════════════════════════════════════════════════════════════════
// reporting/data/CalculatedFieldService.ts
//
// Layer 2 — depends on UniversalDocumentData types. Pure TypeScript.
// Computes derived field values that are not directly in the API response:
// balance movements, profit/margin, running totals, amount in words, etc.
//
// Design notes:
//   - profit uses a simplified calculation: for each line, totalHt - totalTva.
//     This is the gross margin assuming cost ≈ Tva (i.e. cost = unitPriceHt ×
//     tvaRate × qty). Real profit requires cost price from inventory, which
//     is not yet present in UniversalDocumentData.
//   - amountInWords is a stub returning a description string. A full Arabic
//     number-to-words converter can be plugged in later.
// ════════════════════════════════════════════════════════════════════════════

import type { ExpressionValue } from '../core/engines/FormulaEngine';
import type { UniversalDocumentData } from './UniversalDocumentData';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CalculatedField {
  /** Unique identifier for this field (used as key in data.computed) */
  id: string;
  /** Human-readable label in Arabic */
  label: string;
  /** Compute function — returns a single ExpressionValue */
  compute: (data: UniversalDocumentData) => ExpressionValue;
  /**
   * List of field paths this computed field depends on.
   * Used for cache invalidation in the formula engine.
   */
  dependencies: string[];
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class CalculatedFieldService {
  private readonly fields = new Map<string, CalculatedField>();

  constructor() {
    this.registerDefaults();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  register(field: CalculatedField): void {
    this.fields.set(field.id, field);
  }

  registerMany(fields: CalculatedField[]): void {
    for (const field of fields) {
      this.register(field);
    }
  }

  computeAll(data: UniversalDocumentData): Record<string, ExpressionValue> {
    const results: Record<string, ExpressionValue> = {};
    for (const [id, field] of this.fields) {
      try {
        results[id] = field.compute(data);
      } catch {
        results[id] = null;
      }
    }
    return results;
  }

  computeOne(id: string, data: UniversalDocumentData): ExpressionValue | null {
    const field = this.fields.get(id);
    if (!field) return null;
    try {
      return field.compute(data);
    } catch {
      return null;
    }
  }

  list(): CalculatedField[] {
    return Array.from(this.fields.values());
  }

  get(id: string): CalculatedField | undefined {
    return this.fields.get(id);
  }

  // ── Default field registrations ─────────────────────────────────────────────

  private registerDefaults(): void {
    // 1. Movement — balance movement = current - previous
    this.register({
      id: 'movement',
      label: 'حركة الرصيد',
      compute: (data) => {
        if (!data.balance) return null;
        return data.balance.current - data.balance.previous;
      },
      dependencies: ['balance.current', 'balance.previous'],
    });

    // 2. Amount in words (stub)
    this.register({
      id: 'amountInWords',
      label: 'المبلغ كتابة',
      compute: (data) => {
        const total = data.totals.totalTtc;
        return `مبلغ ${total} دينار جزائري فقط`;
      },
      dependencies: ['totals.totalTtc'],
    });

    // 3. Profit — simplified: per line totalHt - totalTva
    this.register({
      id: 'profit',
      label: 'الربح المقدر',
      compute: (data) => {
        return data.lines.reduce((sum, line) => {
          return sum + (line.totalHt - line.totalTva);
        }, 0);
      },
      dependencies: ['lines.*.totalHt', 'lines.*.totalTva'],
    });

    // 4. Profit margin — profit / totalHt * 100
    this.register({
      id: 'profitMargin',
      label: 'هامش الربح',
      compute: (data) => {
        const totalHt = data.totals.totalHt;
        if (totalHt === 0) return null;
        const profit = data.lines.reduce((sum, line) => {
          return sum + (line.totalHt - line.totalTva);
        }, 0);
        return (profit / totalHt) * 100;
      },
      dependencies: ['profit', 'totals.totalHt'],
    });

    // 5. Running total — cumulative sum of totalTtc across lines
    this.register({
      id: 'runningTotal',
      label: 'المجموع التراكمي',
      compute: (data) => {
        return data.lines.reduce((sum, line) => sum + line.totalTtc, 0);
      },
      dependencies: ['lines.*.totalTtc'],
    });

    // 6. Line count
    this.register({
      id: 'lineCount',
      label: 'عدد الأسطر',
      compute: (data) => data.lines.length,
      dependencies: ['lines'],
    });

    // 7. Item count — sum of quantities
    this.register({
      id: 'itemCount',
      label: 'عدد المواد',
      compute: (data) => {
        return data.lines.reduce((sum, line) => sum + line.quantity, 0);
      },
      dependencies: ['lines.*.quantity'],
    });

    // 8. Average line total — average of line TTC totals
    this.register({
      id: 'averageLineTotal',
      label: 'متوسط السطر',
      compute: (data) => {
        const lines = data.lines;
        if (lines.length === 0) return 0;
        const total = lines.reduce((sum, line) => sum + line.totalTtc, 0);
        return total / lines.length;
      },
      dependencies: ['lines.*.totalTtc', 'lines'],
    });
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

export const calculatedFieldService = new CalculatedFieldService();
