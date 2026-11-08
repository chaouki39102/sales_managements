// pages/invoices/components/newInvoice.types.ts
export interface NewInvoiceLine {
    description: string;
    quantity: number;
    unit_price_ht: number;
    tva_rate: number;
    discount_percentage: number;
}
