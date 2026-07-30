import type { BorderStyle } from '../../types';

export interface FooterConfig {
  footerLine1: string;
  footerLine2: string;
  footerLine3: string;
  footerSeparator: BorderStyle;
  showThankYou: boolean;
  thankYouText: string;
  thankYouSize: number;
  showReturnsPolicy: boolean;
  returnsPolicyText: string;
  showBarcode: boolean;
  showQr: boolean;
  showCashierSignature: boolean;
  showClientSignature: boolean;
  showStamp: boolean;
}

export const INVOICE_FOOTER: FooterConfig = {
  footerLine1: 'البضاعة المباعة لا ترد ولا تستبدل',
  footerLine2: 'للاستفسار اتصل على: 0550 00 00 00',
  footerLine3: '',
  footerSeparator: 'solid',
  showThankYou: true,
  thankYouText: 'شكراً لتعاملكم',
  thankYouSize: 11,
  showReturnsPolicy: true,
  returnsPolicyText: 'البضاعة المباعة لا ترد ولا تستبدل',
  showBarcode: true,
  showQr: true,
  showCashierSignature: true,
  showClientSignature: true,
  showStamp: true,
};

export const DELIVERY_FOOTER: FooterConfig = {
  ...INVOICE_FOOTER,
  footerLine1: 'البضاعة المسلمة لا ترد ولا تستبدل',
  footerLine2: 'التوقيع: إمضاء المخزن / إمضاء الزبون',
  showReturnsPolicy: true,
  returnsPolicyText: 'البضاعة المسلمة لا ترد ولا تستبدل',
};

export const DELIVERY_A5_FOOTER: FooterConfig = {
  ...DELIVERY_FOOTER,
  footerLine1: 'البضاعة المسلمة لا ترد ولا تستبدل',
  footerLine2: '',
  thankYouSize: 10,
};

export const POS_RECEIPT_80MM_FOOTER: FooterConfig = {
  ...INVOICE_FOOTER,
  footerLine1: 'البضاعة المباعة لا ترد ولا تستبدل',
  footerLine2: '',
  footerLine3: '',
  footerSeparator: 'none',
  showThankYou: true,
  thankYouText: 'شكراً لتعاملكم',
  thankYouSize: 10,
  showReturnsPolicy: true,
  returnsPolicyText: 'البضاعة المباعة لا ترد ولا تستبدل',
  showBarcode: true,
  showQr: true,
  showCashierSignature: false,
  showClientSignature: false,
  showStamp: false,
};
