import type { AlignOption, BorderStyle } from '../../../types';
import { COLOR_PRIMARY, TOTAL_TTC_FONT_SIZE } from '../constants';

export interface TotalsConfig {
  totalsFontSize: number;
  totalsBold: boolean;
  totalsAlign: AlignOption;
  showTotalHt: boolean;
  showTotalTva: boolean;
  showTvaBreakdown: boolean;
  showDiscountTotal: boolean;
  showFiscalStamp: boolean;
  showTotalTtc: boolean;
  totalTtcFontSize: number;
  totalTtcBold: boolean;
  totalTtcColor: string;
  totalBorderStyle: BorderStyle;
  showAmountInWords: boolean;
  showPaidAmount: boolean;
  showChange: boolean;
  showRemaining: boolean;
  showPrevBalance: boolean;
  showNewBalance: boolean;
}

export const INVOICE_TOTALS: TotalsConfig = {
  totalsFontSize: 10,
  totalsBold: true,
  totalsAlign: 'left',
  showTotalHt: true,
  showTotalTva: true,
  showTvaBreakdown: true,
  showDiscountTotal: true,
  showFiscalStamp: true,
  showTotalTtc: true,
  totalTtcFontSize: TOTAL_TTC_FONT_SIZE,
  totalTtcBold: true,
  totalTtcColor: COLOR_PRIMARY,
  totalBorderStyle: 'double',
  showAmountInWords: true,
  showPaidAmount: false,
  showChange: false,
  showRemaining: false,
  showPrevBalance: false,
  showNewBalance: false,
};

export const DELIVERY_TOTALS: TotalsConfig = {
  ...INVOICE_TOTALS,
};

export const DELIVERY_A5_TOTALS: TotalsConfig = {
  ...INVOICE_TOTALS,
  totalsFontSize: 9,
  totalTtcFontSize: 14,
  showTvaBreakdown: false,
  showFiscalStamp: false,
  showAmountInWords: false,
};

export const POS_RECEIPT_80MM_TOTALS: TotalsConfig = {
  ...INVOICE_TOTALS,
  totalsFontSize: 9,
  totalTtcFontSize: 14,
  showTotalHt: false,
  showTotalTva: false,
  showTvaBreakdown: false,
  showDiscountTotal: false,
  showFiscalStamp: false,
  showTotalTtc: true,
  totalTtcBold: true,
  showAmountInWords: false,
  showPaidAmount: true,
  showChange: true,
  showRemaining: false,
  showPrevBalance: true,
  showNewBalance: true,
};
