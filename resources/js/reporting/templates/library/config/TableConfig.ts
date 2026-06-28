import type { ColumnKey, AlignOption, BorderStyle, FontFamily } from '../../../core/domain/PrintTemplate';
import {
  TABLE_HEADER_BG, TABLE_HEADER_COLOR, TABLE_ROW_ALT,
  COLUMN_REF_WIDTH, COLUMN_NAME_WIDTH, COLUMN_QTY_WIDTH,
  COLUMN_PRICE_WIDTH, COLUMN_TVA_WIDTH, COLUMN_TOTAL_WIDTH,
  COLOR_PRIMARY,
} from '../constants';

export interface TableConfig {
  columnOrder: ColumnKey[];
  columnShow: Partial<Record<ColumnKey, boolean>>;
  columnWidths: Partial<Record<ColumnKey, number>>;
  columnHeaders: Partial<Record<ColumnKey, string>>;
  columnAligns: Partial<Record<ColumnKey, AlignOption>>;
  itemsFontSize: number;
  itemsFontFamily: FontFamily;
  showColHeader: boolean;
  tableHeaderBold: boolean;
  tableHeaderBg: boolean;
  tableHeaderColor: string;
  tableBorderStyle: BorderStyle;
  alternatingRows: boolean;
  alternatingColor: string;
  priceDisplay: 'ht' | 'ttc';
}

export const INVOICE_COLUMNS: TableConfig = {
  columnOrder: ['ref', 'name', 'quantity', 'price', 'tva', 'total'],
  columnShow: { ref: true, name: true, quantity: true, price: true, tva: true, total: true },
  columnWidths: { ref: COLUMN_REF_WIDTH, name: COLUMN_NAME_WIDTH, quantity: COLUMN_QTY_WIDTH, price: COLUMN_PRICE_WIDTH, tva: COLUMN_TVA_WIDTH, total: COLUMN_TOTAL_WIDTH },
  columnHeaders: { ref: 'م', name: 'البيان', quantity: 'الكمية', price: 'س.و.ح', tva: '%TVA', total: 'المبلغ' },
  columnAligns: { ref: 'center', name: 'right', quantity: 'center', price: 'center', tva: 'center', total: 'center' },
  itemsFontSize: 9,
  itemsFontFamily: 'tajawal',
  showColHeader: true,
  tableHeaderBold: true,
  tableHeaderBg: true,
  tableHeaderColor: COLOR_PRIMARY,
  tableBorderStyle: 'solid',
  alternatingRows: true,
  alternatingColor: TABLE_ROW_ALT,
  priceDisplay: 'ht',
};

export const DELIVERY_COLUMNS: TableConfig = {
  ...INVOICE_COLUMNS,
  columnOrder: ['ref', 'name', 'quantity', 'price', 'tva', 'total'],
  columnHeaders: { ref: 'م', name: 'البيان', quantity: 'الكمية', price: 'س.و.ح', tva: '%TVA', total: 'المبلغ' },
};

export const DELIVERY_A5_COLUMNS: TableConfig = {
  ...INVOICE_COLUMNS,
  columnOrder: ['ref', 'name', 'quantity', 'price', 'total'],
  columnShow: { ref: true, name: true, quantity: true, price: true, total: true },
  columnWidths: { ref: 8, name: 32, quantity: 14, price: 20, total: 22 },
  columnHeaders: { ref: 'م', name: 'البيان', quantity: 'الكمية', price: 'س.و.ح', total: 'المبلغ' },
  columnAligns: { ref: 'center', name: 'right', quantity: 'center', price: 'center', total: 'center' },
  itemsFontSize: 8,
};
