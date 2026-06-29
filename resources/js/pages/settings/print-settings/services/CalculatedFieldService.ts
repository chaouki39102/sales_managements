// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// reporting/data/CalculatedFieldService.ts
//
// Layer 2 â€” depends on UniversalDocumentData types. Pure TypeScript.
// Computes derived field values that are not directly in the API response:
// balance movements, profit/margin, running totals, amount in words, etc.
//
// Design notes:
//   - profit uses a simplified calculation: for each line, totalHt - totalTva.
//     This is the gross margin assuming cost â‰ˆ Tva (i.e. cost = unitPriceHt أ—
//     tvaRate أ— qty). Real profit requires cost price from inventory, which
//     is not yet present in UniversalDocumentData.
//   - amountInWords is a stub returning a description string. A full Arabic
//     number-to-words converter can be plugged in later.
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

import type { ExpressionValue } from './engines/FormulaEngine';
import type { UniversalDocumentData } from '../types/data/UniversalDocumentData';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CalculatedField {
  /** Unique identifier for this field (used as key in data.computed) */
  id: string;
  /** Human-readable label in Arabic */
  label: string;
  /** Compute function â€” returns a single ExpressionValue */
  compute: (data: UniversalDocumentData) => ExpressionValue;
  /**
   * List of field paths this computed field depends on.
   * Used for cache invalidation in the formula engine.
   */
  dependencies: string[];
}

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class CalculatedFieldService {
  private readonly fields = new Map<string, CalculatedField>();

  constructor() {
    this.registerDefaults();
  }

  // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Default field registrations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private registerDefaults(): void {
    // 1. Movement â€” balance movement = current - previous
    this.register({
      id: 'movement',
      label: 'ط­ط±ظƒط© ط§ظ„ط±طµظٹط¯',
      compute: (data) => {
        if (!data.balance) return null;
        return data.balance.current - data.balance.previous;
      },
      dependencies: ['balance.current', 'balance.previous'],
    });

    // 2. Amount in words (stub)
    this.register({
      id: 'amountInWords',
      label: 'ط§ظ„ظ…ط¨ظ„ط؛ ظƒطھط§ط¨ط©',
      compute: (data) => {
        const total = data.totals.totalTtc;
        return `ظ…ط¨ظ„ط؛ ${total} ط¯ظٹظ†ط§ط± ط¬ط²ط§ط¦ط±ظٹ ظپظ‚ط·`;
      },
      dependencies: ['totals.totalTtc'],
    });

    // 3. Profit â€” simplified: per line totalHt - totalTva
    this.register({
      id: 'profit',
      label: 'ط§ظ„ط±ط¨ط­ ط§ظ„ظ…ظ‚ط¯ط±',
      compute: (data) => {
        return data.lines.reduce((sum, line) => {
          return sum + (line.totalHt - line.totalTva);
        }, 0);
      },
      dependencies: ['lines.*.totalHt', 'lines.*.totalTva'],
    });

    // 4. Profit margin â€” profit / totalHt * 100
    this.register({
      id: 'profitMargin',
      label: 'ظ‡ط§ظ…ط´ ط§ظ„ط±ط¨ط­',
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

    // 5. Running total â€” cumulative sum of totalTtc across lines
    this.register({
      id: 'runningTotal',
      label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط§ظ„طھط±ط§ظƒظ…ظٹ',
      compute: (data) => {
        return data.lines.reduce((sum, line) => sum + line.totalTtc, 0);
      },
      dependencies: ['lines.*.totalTtc'],
    });

    // 6. Line count
    this.register({
      id: 'lineCount',
      label: 'ط¹ط¯ط¯ ط§ظ„ط£ط³ط·ط±',
      compute: (data) => data.lines.length,
      dependencies: ['lines'],
    });

    // 7. Item count â€” sum of quantities
    this.register({
      id: 'itemCount',
      label: 'ط¹ط¯ط¯ ط§ظ„ظ…ظˆط§ط¯',
      compute: (data) => {
        return data.lines.reduce((sum, line) => sum + line.quantity, 0);
      },
      dependencies: ['lines.*.quantity'],
    });

    // 8. Average line total â€” average of line TTC totals
    this.register({
      id: 'averageLineTotal',
      label: 'ظ…طھظˆط³ط· ط§ظ„ط³ط·ط±',
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

// â”€â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const calculatedFieldService = new CalculatedFieldService();
