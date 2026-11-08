// pages/portal/orders/types.ts

export interface CartEntry {
  product_id:   number;
  packaging_id: number | null;
  quantity:     number;
}
