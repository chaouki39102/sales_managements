/**
 * The ONLY layer that resolves a canonical field ID to a value.
 *
 * Every renderer (UniversalPreview, ESC/POS, future PDF) calls
 * `printFieldResolver.resolve("customer.name", data, template)` instead of
 * accessing `data.party?.name` directly.
 *
 * This guarantees that:
 *   - The same field ID produces the same value everywhere
 *   - Template overrides (e.g. company_name_text) are automatically applied
 *   - Computed fields (item.tvaPct, item.index) are derived consistently
 */

import type { UniversalDocumentData, DocumentLine } from '../types/data';
import type { PrintTemplate } from '../types';
import { printFieldRegistry, type PrintFieldDefinition } from './PrintFieldRegistry';
import { numberToArabicWords } from '../utils';

function getByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc: any, key: string) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

class PrintFieldResolver {
  getField(id: string): PrintFieldDefinition | undefined {
    return printFieldRegistry.get(id);
  }

  getFieldBySettingKey(key: string): PrintFieldDefinition | undefined {
    return printFieldRegistry.getBySettingKey(key);
  }

  /**
   * Resolve a document-level field against UniversalDocumentData.
   * Automatically applies template overrides and computed fields.
   */
  resolve(
    fieldId: string,
    data: UniversalDocumentData,
    template?: PrintTemplate | null,
  ): any {
    const def = this.getField(fieldId);
    if (!def) return undefined;

    // 1) Template override (e.g. company_name_text overrides company.name)
    if (template && def.overrideTemplatePath) {
      const override = getByPath(template, def.overrideTemplatePath);
      if (override !== undefined && override !== null && override !== '') {
        return override;
      }
    }

    // 2) Footer/static fields — values come from template, not data
    if (fieldId === 'footer.thankYou') {
      return template?.thank_you_text ?? '';
    }
    if (fieldId === 'footer.returnsPolicy') {
      return template?.returns_policy_text ?? '';
    }
    if (fieldId === 'footer.bankDetails') {
      return template?.bank_details_text ?? '';
    }
    if (fieldId === 'signature.cashier' || fieldId === 'signature.client' || fieldId === 'signature.stamp') {
      return true; // boolean — visibility is controlled by the setting, not value
    }

    // 3) Computed fields
    if (fieldId === 'totals.amountInWords') {
      const total = data.totals?.totalTtc ?? 0;
      return numberToArabicWords(total);
    }

    // 3.5) Datetime composition — when the template's «إظهار الوقت» (show_time)
    // toggle is ON, the date field carries "date time" so EVERY consumer
    // (built-in doc-info rows, header info, and custom doc_info_rows layouts)
    // renders datetime without appending doc.time manually.
    if (fieldId === 'document.date') {
      const date = getByPath(data, def.sourcePath);
      if (!date || !template?.show_time) return date;
      const time = getByPath(data, 'doc.time');
      return time ? `${date} ${time}` : date;
    }

    // 4) Simple data path
    return getByPath(data, def.sourcePath);
  }

  /**
   * Resolve an item-level field against a single DocumentLine.
   * Handles computed item fields like item.index, item.tvaPct.
   */
  resolveItemField(
    fieldId: string,
    line: DocumentLine,
    lineIndex: number,
  ): any {
    const def = this.getField(fieldId);
    if (!def) return undefined;

    // Computed item fields
    if (fieldId === 'item.index') return lineIndex + 1;
    if (fieldId === 'item.tvaPct') return Math.round((line.tvaRate ?? 0) * 100);
    if (fieldId === 'item.discountAmt') return (line.totalHt ?? 0) * ((line.discountPct ?? 0) / 100);

    // Relative path for repeating fields
    if (def.relativePath && def.relativePath !== '_index') {
      return getByPath(line, def.relativePath);
    }

    // Fallback for absolute paths
    return getByPath(line, def.sourcePath);
  }

  /**
   * Check if a field should be visible.
   * Uses the template's show_* setting (if mapped) and also checks the
   * data contains a value for the field.
   */
  isVisible(fieldId: string, template: Record<string, any>): boolean {
    const def = this.getField(fieldId);
    if (!def) return false;

    if (def.settingKey) {
      const setting = template[def.settingKey];
      if (setting === false) return false;
    }

    return true;
  }

  getItemColumns(template: Record<string, any>): ColumnDefinition[] {
    const order: string[] = template.col_order ?? ['name', 'quantity', 'price', 'total'];
    const headers: Record<string, string> = template.col_headers ?? {};
    const widths: Record<string, number> = template.col_widths ?? {};
    const aligns: Record<string, string> = template.col_aligns ?? {};
    const show: Record<string, boolean> = template.col_show ?? {};

    const FIELD_MAP: Record<string, string> = {
      rowNumber: 'item.index',
      name:      'item.name',
      ref:       'item.code',
      barcode:   'item.barcode',
      unit:      'item.unit',
      quantity:  'item.quantity',
      price:     'item.price',
      discount:  'item.discount',
      tva:       'item.tva',
      total:     'item.total',
    };

    return order
      .filter(col => show[col] !== false)
      .map(col => {
        const fieldId = FIELD_MAP[col] ?? col;
        const def = this.getField(fieldId);
        return {
          id: fieldId,
          label: headers[col] ?? def?.label ?? col,
          width: widths[col] ?? 10,
          align: (aligns[col] as 'left' | 'center' | 'right') ?? def?.align ?? 'right',
          visible: show[col] !== false,
        };
      });
  }
}

export interface ColumnDefinition {
  id: string;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
  visible: boolean;
}

export const printFieldResolver = new PrintFieldResolver();
