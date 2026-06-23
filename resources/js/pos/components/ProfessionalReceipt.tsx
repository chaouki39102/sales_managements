import React, { useState, useEffect } from 'react';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import { printThermal, isWebUsbSupported, getThermalAutoPrint, setThermalAutoPrint } from '../utils/printService';

interface ProfessionalReceiptProps {
  items: CartItem[]; totals: CartTotals; client: Party | null;
  docNumber?: string; onClose: () => void; onPrint: () => void; onNewSale: () => void;
}

export default function ProfessionalReceipt({
  items, totals, client, docNumber, onClose, onPrint, onNewSale,
}: ProfessionalReceiptProps) {
  const [thermalStatus, setThermalStatus] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(getThermalAutoPrint());
  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;

  useEffect(() => {
    if (!autoPrint || !isWebUsbSupported()) return;
    (async () => {
      setThermalStatus('جاري الطباعة التلقائية…');
      const res = await printThermal(items, totals, client, docNumber);
      setThermalStatus(res.ok ? '✓ تمت الطباعة' : `✗ ${res.message}`);
      setTimeout(() => setThermalStatus(null), 3000);
    })();
  }, []);
  const now = new Date();

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-receipt" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-receipt" style={{ marginLeft: 6 }} />
            إيصال البيع
            {docNumber && <span className="m-docnum"># {docNumber}</span>}
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>

        <div className="m-body" id="invoice-preview">
          <div className="receipt-wrap">
            <div className="receipt-header">
              <div className="rh-logo">🏪 نظام المبيعات</div>
              <div className="rh-meta">
                الجزائر — نظام ERP المتكامل<br />
                {now.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="rh-doc">
                <div className="rh-docnum">{docNumber ?? 'مسودة'}</div>
                <div className="rh-date">{now.toLocaleTimeString('ar-DZ')}</div>
                {client && <div className="rh-client"><i className="ti ti-user" /> {client.name}</div>}
              </div>
            </div>

            <div className="receipt-divider">المنتجات</div>

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th style={{ textAlign: 'center' }}>الكمية</th>
                  <th style={{ textAlign: 'center' }}>السعر</th>
                  <th style={{ textAlign: 'left' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="rt-name">{item.product_name}</div>
                      {item.discount_percentage > 0 && (
                        <div className="rt-variant">خصم {item.discount_percentage}%</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity} {item.unit_symbol}</td>
                    <td style={{ textAlign: 'center' }}>{formatDZD(item.unit_price_ht)}</td>
                    <td style={{ textAlign: 'left' }}>{formatDZD(item.total_ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-totals-wrap">
              <div className="receipt-totals-inner">
                <div className="rt-sum-row"><span>المجموع HT</span><span>{formatDZD(totals.total_ht)}</span></div>
                {totals.total_discount > 0 && <div className="rt-sum-row"><span>إجمالي الخصم</span><span>- {formatDZD(totals.total_discount)}</span></div>}
                <div className="rt-sum-row"><span>TVA</span><span>{formatDZD(totals.total_tva)}</span></div>
                {totals.fiscal_stamp > 0 && <div className="rt-sum-row"><span>طابع مالي</span><span>{formatDZD(totals.fiscal_stamp)}</span></div>}
                <div className="rt-grand-row"><span>الإجمالي TTC</span><strong>{formatDZD(totalTtcFinal)}</strong></div>
              </div>
            </div>

            <div className="receipt-footer">
              شكراً على تعاملكم معنا<br />
              نظام ERP الجزائر — {now.getFullYear()}
            </div>
          </div>
        </div>

        <div className="m-foot">
          <button className="btn btn-sm btn-p" onClick={onPrint}>
            <i className="ti ti-printer" /> طباعة
          </button>
          {isWebUsbSupported() && (
            <button
              className="btn btn-sm btn-thermal"
              onClick={async () => {
                setThermalStatus('جاري الاتصال بالطابعة…');
                const res = await printThermal(items, totals, client, docNumber);
                setThermalStatus(res.ok ? '✓ تمت الطباعة' : `✗ ${res.message}`);
                setTimeout(() => setThermalStatus(null), 3000);
              }}
            >
              <i className="ti ti-printer" /> طباعة حرارية
            </button>
          )}
          {thermalStatus && (
            <span className={`thermal-status ${thermalStatus.startsWith('✓') ? 'ok' : 'err'}`}>
              {thermalStatus}
            </span>
          )}
          {isWebUsbSupported() && (
            <label className="cb" style={{ fontSize: 11, cursor: 'pointer', margin: '0 8px' }}>
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => { setAutoPrint(e.target.checked); setThermalAutoPrint(e.target.checked); }}
              />
              {' '}طباعة تلقائية
            </label>
          )}
          <button className="btn btn-sm" onClick={onNewSale}>
            <i className="ti ti-plus" /> بيع جديد
          </button>
          <button className="btn btn-sm" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
