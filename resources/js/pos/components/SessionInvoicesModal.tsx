import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CommercialDocument } from '@/lib/api/core/types';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { formatDZD } from '@/pos/utils/calculations';

interface Props {
  session:    PosSession;
  onClose:    () => void;
  onOpen:     (docId: number) => void;
}

export default function SessionInvoicesModal({ session, onClose, onOpen }: Props) {
  const [docs, setDocs] = useState<CommercialDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const openedDate = session.opened_at?.slice(0, 10);
  const today      = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    documentsApi.list({
      include: 'party',
      per_page: 200,
      sort: '-document_date',
      'filter[created_at]': `${openedDate},${today}`,
      'filter[warehouse_id]': session.warehouse?.id,
      'filter[user_id]': session.user?.id,
    }).then((res: any) => {
      if (cancelled) return;
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setDocs(list as CommercialDocument[]);
    }).catch(() => {
      if (!cancelled) setDocs([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [session.opened_at, session.warehouse?.id, session.user?.id, openedDate, today]);

  const handleRowClick = useCallback((doc: CommercialDocument) => {
    onOpen(doc.id);
  }, [onOpen]);

  const totals = useMemo(() => {
    let ttc = 0, paid = 0, remaining = 0;
    for (const doc of docs) {
      ttc       += Number(doc.total_ttc ?? 0);
      paid      += Number(doc.paid_amount ?? doc.amount_paid ?? 0);
      remaining += Number(doc.remaining_amount ?? doc.amount_remaining ?? 0);
    }
    return { ttc, paid, remaining };
  }, [docs]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-receipt" style={{ marginLeft: 6 }} />
            فواتير الجلسة
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
              <i className="ti ti-loader" style={{ fontSize: 24 }} />
              <div style={{ marginTop: 8 }}>جاري تحميل الفواتير...</div>
            </div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
              <i className="ti ti-receipt-off" style={{ fontSize: 32 }} />
              <div style={{ marginTop: 8 }}>لا توجد فواتير في هذه الجلسة</div>
            </div>
          ) : (
            <table className="tbl tbl-sm si-modal-tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>رقم الفاتورة</th>
                  <th className="si-col-client">العميل</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <tr
                    key={doc.id}
                    onClick={() => handleRowClick(doc)}
                    style={{ cursor: 'pointer' }}
                    className="si-row"
                  >
                    <td>{i + 1}</td>
                    <td><strong>{doc.document_number}</strong></td>
                    <td className="si-col-client">{doc.party?.name ?? <span style={{ color: 'var(--t4)' }}>—</span>}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{doc.document_date?.slice(0, 16).replace('T', ' ')}</td>
                    <td style={{ fontWeight: 600, color: 'var(--p)' }}>{formatDZD(doc.total_ttc)}</td>
                    <td style={{ color: 'var(--g)' }}>{formatDZD(doc.paid_amount ?? doc.amount_paid ?? 0)}</td>
                    <td style={{ fontWeight: 600, color: Number(doc.remaining_amount ?? doc.amount_remaining ?? 0) > 0 ? 'var(--r)' : 'var(--t4)' }}>
                      {formatDZD(doc.remaining_amount ?? doc.amount_remaining ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--b3)' }}>
                  <td colSpan={4} style={{ textAlign: 'left' }}>المجموع</td>
                  <td style={{ color: 'var(--p)' }}>{formatDZD(totals.ttc)}</td>
                  <td style={{ color: 'var(--g)' }}>{formatDZD(totals.paid)}</td>
                  <td style={{ color: totals.remaining > 0 ? 'var(--r)' : 'var(--t4)' }}>{formatDZD(totals.remaining)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <div className="m-foot">
          <span style={{ fontSize: 12, color: 'var(--t4)' }}>
            انقر على فاتورة لفتحها في السلة
          </span>
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
