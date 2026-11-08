// pages/documents/quick-sale/quickSale.types.ts
// أنواع البيع السريع (QuickSaleModal)

export interface Product {
  id: number;
  name: string;
  ref?: string | null;
  default_selling_price_ht?: number | null;
  tva?: { id: number; rate: number } | null;
  unit?: { id: number; symbol: string } | null;
  manages_stock?: boolean;
  current_stock?: number | null;
}

export interface PaymentMode {
  id: number;
  name: string;
  code: string;
}

export interface TreasuryAccount {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
}

export interface QuickLine {
  product_id: string;
  quantity: number;
  price: number;
  tva_rate: number;
  _product?: Product;
}

export interface SuccessState {
  document_number: string;
  net_to_pay: number;
  paid: number;
  remaining: number;
  offline: boolean;
}

export interface QuickSaleTotals {
  ht: number;
  tva: number;
  ttc: number;
  stamp: number;
  netPay: number;
}

export interface QuickPaymentState {
  enabled: boolean;
  payment_mode_id: string;
  treasury_account_id: string;
  amount: number;
  reference: string;
  payment_date: string;
}
