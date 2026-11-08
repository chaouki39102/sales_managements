// pages/invoices/components/InvoiceDetailTotals.tsx
// قسم الإجماليات في نافذة تفاصيل الفاتورة
import type { CommercialDocument } from "@/types";

interface InvoiceDetailTotalsProps {
    invoice: CommercialDocument;
    bal: CommercialDocument["balance_data"];
    fmt: (n: number) => string;
}

export default function InvoiceDetailTotals({ invoice, bal, fmt }: InvoiceDetailTotalsProps) {
    return (
        <div className="flex items-stretch gap-6 mb-4">
            <div className="flex gap-6 flex-1">
                {(invoice.total_discount > 0 || (invoice.fiscal_stamp ?? 0) > 0) && (
                    <div className="flex-1 p-10 rounded-lg bg-3">
                        <div className="text-xs text-t4 font-bold mb-6">التخفيضات</div>
                        {invoice.total_discount > 0 && (
                            <div className="sr">
                                <span className="sr-l">الخصم</span>
                                <span className="sr-v text-red">-{fmt(invoice.total_discount)} دج</span>
                            </div>
                        )}
                        {(invoice.fiscal_stamp ?? 0) > 0 && (
                            <div className="sr">
                                <span className="sr-l">الطابع الجبائي</span>
                                <span className="sr-v">{fmt(invoice.fiscal_stamp ?? 0)} دج</span>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1 p-10 rounded-lg bg-3">
                    <div className="text-xs text-t4 font-bold mb-6">الرصيد</div>
                    <div className="sr">
                        <span className="sr-l">المدفوع</span>
                        <span className="sr-v text-em">{fmt(invoice.paid_amount)} دج</span>
                    </div>
                    <div className="sr">
                        <span className="sr-l">المتبقي</span>
                        <span className="sr-v font-bold" style={invoice.remaining_amount > 0 ? { color: 'var(--red)' } : {}}>
                            {fmt(invoice.remaining_amount)} دج
                        </span>
                    </div>
                    {bal && (
                        <div className="pt-6 mt-6 border-t border-b3">
                            <div className="sr">
                                <span className="sr-l">الرصيد السابق</span>
                                <span className="sr-v">{fmt(bal.previous_balance)} دج</span>
                            </div>
                            <div className="sr">
                                <span className="sr-l">الرصيد الجديد</span>
                                <span className="sr-v font-bold">{fmt(bal.new_balance)} دج</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-10 rounded-lg bg-3 flex flex-col items-center justify-center" style={{ minWidth: 200 }}>
                <div className="text-xs text-t4 font-bold mb-6">الإجمالي</div>
                <div className="text-3xl font-black text-em">{fmt(invoice.total_ttc)}</div>
                <div className="text-xs text-t4 mt-2">دينار جزائري</div>
                <div className="w-full mt-6 pt-6 border-t border-b3">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-t4">HT</span>
                        <span className="font-bold">{fmt(invoice.total_ht)} دج</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-t4">TVA</span>
                        <span className="font-bold">{fmt(invoice.total_tva)} دج</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
