import type { ColumnKey, AlignOption, BorderStyle, FontFamily } from '../../types';
import {
  TABLE_ROW_ALT,
  COLUMN_REF_WIDTH, COLUMN_NAME_WIDTH, COLUMN_QTY_WIDTH,
  COLUMN_PRICE_WIDTH, COLUMN_TVA_WIDTH, COLUMN_TOTAL_WIDTH,
  COLOR_PRIMARY, COLOR_MUTED,
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
  tableHeaderBg: string;
  tableHeaderColor: string;
  tableHeaderRadius: number;
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
  tableHeaderBg: '#f5f5f5',
  tableHeaderColor: COLOR_PRIMARY,
  tableHeaderRadius: 6,
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

export const POS_RECEIPT_80MM_COLUMNS: TableConfig = {
  ...INVOICE_COLUMNS,
  columnOrder: ['name', 'quantity', 'total'],
  columnShow: { ref: false, name: true, quantity: true, price: false, tva: false, total: true },
  columnWidths: { name: 44, quantity: 16, total: 24 },
  columnHeaders: { name: 'البيان', quantity: 'الكمية', total: 'المبلغ' },
  columnAligns: { name: 'right', quantity: 'center', total: 'right' },
  itemsFontSize: 8,
  showColHeader: true,
  tableHeaderBold: false,
  tableHeaderBg: 'transparent',
  tableHeaderColor: COLOR_MUTED,
  tableHeaderRadius: 0,
  tableBorderStyle: 'none',
  alternatingRows: false,
  priceDisplay: 'ttc',
};
