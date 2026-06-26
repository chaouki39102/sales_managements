// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalReceipt.tsx
//
// ✅ إصلاحات:
//   1. بيانات الشركة تُقرأ من activeCompany (لا بيانات ثابتة)
//   2. receiptFooter و receiptHeader2 من usePOSSettings
//   3. receiptShowQr: إظهار QR code برقم الفاتورة
//   4. printCopies: طباعة نسخ متعددة
//   5. priceDisplayMode: الأسعار HT أو TTC
// ════════════════════════════════════════════════════════════════════════════

import React, { useRef } from 'react';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD }      from '@/pos/utils/calculations';
import { useActiveCompany } from '@/lib/store/appStore';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';

interface ProfessionalReceiptProps {
  items:      CartItem[];
  totals:     CartTotals;
  client:     Party | null;
  docNumber?: string;
  settings:   POSSettings;
  onClose:    () => void;
  onPrint:    () => void;
  onNewSale:  () => void;
}

export default function ProfessionalReceipt({
  items, totals, client, docNumber, settings, onClose, onPrint, onNewSale,
}: ProfessionalReceiptProps) {
  const printRef    = useRef<HTMLDivElement>(null);
  const activeCompany = useActiveCompany();
  const now           = new Date();

  // ✅ بيانات الشركة من activeCompany — لا بيانات ثابتة
  const companyName = settings.receiptCompanyName ?? activeCompany?.name ?? 'نظام المبيعات';
  const companyNif  = activeCompany?.nif  ?? '';
  const companyNis  = activeCompany?.nis  ?? '';
  const companyRc   = activeCompany?.rc   ?? '';
  const companyPhone = activeCompany?.phone ?? '';
  const companyAddress = activeCompany?.address ?? '';

  const grandTotal = totals.total_ttc + totals.fiscal_stamp;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      const copies = settings.printCopies ?? 1;
      for (let i = 0; i < copies; i++) window.print();
    }
  };

  // QR code بسيط عبر api.qrserver.com
  const qrUrl = docNumber
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(docNumber)}`
    : null;

  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-md"
        style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">
              <i className="ti ti-receipt" style={{ color: 'var(--em)', marginLeft: 7 }} />
              معاينة الإيصال
            </div>
            {docNumber && (
              <div className="m-sub">رقم الفاتورة: {docNumber}</div>
            )}
          </div>
          <button className="m-x" onClick={onClose} type="button">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Print area */}
        <div
          className="m-body"
          style={{ flex: 1, overflowY: 'auto', padding: 16 }}
          id="pos-receipt-print"
          ref={printRef}
        >
          <div className="receipt-wrap">

            {/* Company header */}
            <div className="receipt-head">
              <div style={{ flex: 1 }}>
                <div className="receipt-logo">{companyName}</div>
                <div className="receipt-meta">
                  {companyAddress && <>{companyAddress}<br /></>}
                  {settings.receiptHeader2 && <>{settings.receiptHeader2}<br /></>}
                  {companyNif  && <>NIF: {companyNif}<br /></>}
                  {companyRc   && <>RC: {companyRc}<br /></>}
                  {companyNis  && <>NIS: {companyNis}<br /></>}
                  {companyPhone && <>📞 {companyPhone}</>}
                </div>
              </div>

              {/* QR code */}
              {settings.receiptShowQr && qrUrl && (
                <div style={{ flexShrink: 0, marginRight: 12 }}>
                  <img
                    src={qrUrl}
                    alt="QR"
                    width={80}
                    height={80}
                    style={{ display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="receipt-num" style={{ textAlign: 'left', minWidth: 120 }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--em)' }}>
                  {docNumber ?? 'مسودة'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  {now.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {now.toLocaleTimeString('ar-DZ')}
                </div>
                {client && (
                  <div style={{ fontSize: 11, color: '#334155', marginTop: 4, fontWeight: 700 }}>
                    <i className="ti ti-user" /> {client.name}
                  </div>
                )}
              </div>
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 10 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700 }}>البيان</th>
                  <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>الكمية</th>
                  <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>
                    السعر {settings.priceDisplayMode === 'ht' ? 'HT' : 'TTC'}
                  </th>
                  <th style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 700 }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const unitPrice = settings.priceDisplayMode === 'ht'
                    ? item.unit_price_ht
                    : item.unit_price_ht * (1 + item.tva_rate / 100);
                  const lineTotal = settings.priceDisplayMode === 'ht'
                    ? item.total_ht
                    : item.total_ttc;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '5px 6px' }}>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        {item.variant_name && (
                          <div style={{ fontSize: 10.5, color: '#64748b' }}>{item.variant_name}</div>
                        )}
                        {item.discount_percentage > 0 && (
                          <div style={{ fontSize: 10.5, color: '#d42b2b' }}>
                            خصم {item.discount_percentage.toFixed(1)}%
                          </div>
                        )}
                        {item.tva_rate > 0 && (
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>TVA {item.tva_rate}%</div>
                        )}
                      </td>
                      <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                        {item.quantity} {item.unit_symbol ?? 'قطعة'}
                      </td>
                      <td style={{ padding: '5px 6px', textAlign: 'center', direction: 'ltr' }}>
                        {formatDZD(unitPrice)}
                      </td>
                      <td style={{ padding: '5px 6px', textAlign: 'left', direction: 'ltr', fontWeight: 700 }}>
                        {formatDZD(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="receipt-totals">
              <div className="receipt-totals-inner">
                <div className="receipt-row">
                  <span>المجموع HT</span>
                  <span style={{ direction: 'ltr' }}>{formatDZD(totals.total_ht)}</span>
                </div>
                {totals.total_discount > 0 && (
                  <div className="receipt-row" style={{ color: '#d42b2b' }}>
                    <span>إجمالي الخصومات</span>
                    <span style={{ direction: 'ltr' }}>- {formatDZD(totals.total_discount)}</span>
                  </div>
                )}
                <div className="receipt-row">
                  <span>TVA</span>
                  <span style={{ direction: 'ltr' }}>{formatDZD(totals.total_tva)}</span>
                </div>
                {totals.fiscal_stamp > 0 && (
                  <div className="receipt-row">
                    <span>الطابع الجبائي</span>
                    <span style={{ direction: 'ltr' }}>{formatDZD(totals.fiscal_stamp)}</span>
                  </div>
                )}
                <div className="receipt-grand">
                  <span>الإجمالي TTC</span>
                  <span style={{ direction: 'ltr' }}>{formatDZD(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Footer message */}
            <div className="receipt-foot">
              {settings.receiptFooter || 'شكراً لتعاملكم معنا'}
              <div style={{ marginTop: 4, fontSize: 9, color: '#cbd5e1' }}>
                يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="m-foot">
          <button className="btn btn-p" onClick={onNewSale} type="button">
            <i className="ti ti-plus" /> بيع جديد
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose} type="button">إغلاق</button>
          <button className="btn btn-p" onClick={handlePrint} type="button">
            <i className="ti ti-printer" />
            طباعة
            {(settings.printCopies ?? 1) > 1 && (
              <span style={{ fontSize: 10, opacity: 0.8, marginRight: 4 }}>
                ({settings.printCopies} نسخ)
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
