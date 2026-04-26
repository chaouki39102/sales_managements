// pos/components/Receipt.tsx
import React from 'react';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import Modal from '@/components/ui/Modal';

interface ReceiptProps {
  open:      boolean;
  items:     CartItem[];
  totals:    CartTotals;
  client:    Party | null;
  docNumber?: string;
  onClose:   () => void;
  onPrint:   () => void;
}

export default function Receipt({
  open, items, totals, client, docNumber, onClose, onPrint,
}: ReceiptProps) {
  const now = new Date().toLocaleDateString('fr-DZ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="معاينة الفاتورة"
      size="md"
      footer={
        <>
          <button className="btn" onClick={onClose}>إغلاق</button>
          <button className="btn btn-p" onClick={onPrint}>
            <span className="ic ic-xs"><i className="ti ti-printer" /></span>
            طباعة
          </button>
        </>
      }
    >
      <div className="receipt-wrap" id="invoice-preview">
        {/* Header */}
        <div className="receipt-head">
          <div>
            <div className="receipt-logo">مؤسسة النور للتجارة</div>
            <div className="receipt-meta">
              NIF: 001234567890123 | RC: 29/00-0012345B05<br />
              ورقلة — الجزائر | 029 71 23 45
            </div>
          </div>
          <div className="receipt-num">
            <div>{docNumber ?? 'مسودة'}</div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500, marginTop: 3 }}>
              التاريخ: {now}
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
              الزبون: {client?.name ?? 'عابر'}
            </div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '4px 6px', textAlign: 'right' }}>البيان</th>
              <th style={{ padding: '4px 6px', textAlign: 'center' }}>الكمية</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', direction: 'ltr' }}>سعر HT</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', direction: 'ltr' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 6px' }}>
                  {item.product_name}
                  {item.variant_name && <span style={{ color: '#64748b' }}> — {item.variant_name}</span>}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                  {item.quantity} {item.unit_symbol}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', direction: 'ltr' }}>
                  {item.unit_price_ht.toFixed(2)} دج
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', direction: 'ltr', fontWeight: 700 }}>
                  {item.total_ht.toFixed(2)} دج
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="receipt-totals">
          <div className="receipt-totals-inner">
            <div className="receipt-row">
              <span>المجموع HT</span>
              <span>{formatDZD(totals.total_ht)}</span>
            </div>
            <div className="receipt-row">
              <span>TVA</span>
              <span>{formatDZD(totals.total_tva)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="receipt-row" style={{ color: '#dc2626' }}>
                <span>خصم</span>
                <span>- {formatDZD(totals.total_discount)}</span>
              </div>
            )}
            {totals.fiscal_stamp > 0 && (
              <div className="receipt-row">
                <span>الطابع الجبائي</span>
                <span>{formatDZD(totals.fiscal_stamp)}</span>
              </div>
            )}
            <div className="receipt-grand">
              <span>الإجمالي TTC</span>
              <span>{formatDZD(totals.total_ttc + totals.fiscal_stamp)}</span>
            </div>
          </div>
        </div>

        <div className="receipt-foot">
          شكراً لتعاملكم معنا — يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري
        </div>
      </div>
    </Modal>
  );
}
