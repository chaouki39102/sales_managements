import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortField, setSortField] = useState<string>('document_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const listRef = useRef<HTMLTableSectionElement>(null);

  const openedDate = session.opened_at?.slice(0, 10);
  const today      = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    documentsApi.list({
      include: 'party',
      per_page: 200,
      sort: '-created_at',
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

  const sorted = useMemo(() => {
    const list = [...docs];
    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'document_number': va = a.document_number; vb = b.document_number; break;
        case 'client':          va = a.party?.name ?? ''; vb = b.party?.name ?? ''; break;
        case 'document_date':   va = a.document_date ?? ''; vb = b.document_date ?? ''; break;
        case 'total_ttc':       va = Number(a.total_ttc ?? 0); vb = Number(b.total_ttc ?? 0); break;
        case 'paid_amount':     va = Number(a.paid_amount ?? 0); vb = Number(b.paid_amount ?? 0); break;
        case 'remaining_amount':va = Number(a.remaining_amount ?? 0); vb = Number(b.remaining_amount ?? 0); break;
        default:                va = a.document_date ?? ''; vb = b.document_date ?? '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [docs, sortField, sortDir]);

  // أعد تعيين التحديد بعد الترتيب
  useEffect(() => {
    setSelectedIndex(0);
  }, [sorted.length]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedIndex]);

  const toggleSort = useCallback((field: string) => {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  }, []);

  function sortIcon(field: string): string {
    if (sortField !== field) return 'ti ti-arrows-sort';
    return sortDir === 'asc' ? 'ti ti-sort-ascending' : 'ti ti-sort-descending';
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, docs.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (sorted.length === 0) return;
      const selected = sorted[selectedIndex];
      if (!selected) return;
      e.preventDefault();
      onOpen(selected.id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [sorted, selectedIndex, onOpen, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleKeyDown]);

  const handleRowClick = useCallback((doc: CommercialDocument) => {
    onOpen(doc.id);
  }, [onOpen]);

  const totals = useMemo(() => {
    let ttc = 0, paid = 0, remaining = 0;
    for (const doc of sorted) {
      ttc       += Number(doc.total_ttc ?? 0);
      paid      += Number(doc.paid_amount ?? 0);
      remaining += Number(doc.remaining_amount ?? 0);
    }
    return { ttc, paid, remaining };
  }, [sorted]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-receipt ml-2" />
            فواتير الجلسة
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body si-modal-body">
          {loading ? (
            <div className="si-empty si-empty-lg">
              <i className="ti ti-loader" />
              <div>جاري تحميل الفواتير...</div>
            </div>
          ) : docs.length === 0 ? (
            <div className="si-empty si-empty-sm">
              <i className="ti ti-receipt-off" />
              <div>لا توجد فواتير في هذه الجلسة</div>
            </div>
          ) : (
            <table className="tbl tbl-sm si-modal-tbl w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="si-th-sort" onClick={() => toggleSort('document_number')}>
                    <i className={`${sortIcon('document_number')} si-sort-ic`} /> رقم الفاتورة
                  </th>
                  <th className="si-col-client">العميل</th>
                  <th className="si-th-sort" onClick={() => toggleSort('document_date')}>
                    <i className={`${sortIcon('document_date')} si-sort-ic`} /> التاريخ
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('total_ttc')}>
                    <i className={`${sortIcon('total_ttc')} si-sort-ic`} /> الإجمالي
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('paid_amount')}>
                    <i className={`${sortIcon('paid_amount')} si-sort-ic`} /> المدفوع
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('remaining_amount')}>
                    <i className={`${sortIcon('remaining_amount')} si-sort-ic`} /> المتبقي
                  </th>
                </tr>
              </thead>
              <tbody ref={listRef}>
                {sorted.map((doc, i) => (
                  <tr
                    key={doc.id}
                    onClick={() => handleRowClick(doc)}
                    className={`si-row cursor-pointer${i === selectedIndex ? ' si-row-sel' : ''}`}
                  >
                    <td>{i + 1}</td>
                    <td><strong>{doc.document_number}</strong></td>
                    <td className="si-col-client">{doc.party?.name ?? <span className="si-null">—</span>}</td>
                    <td className="si-date-cell">{doc.created_at?.slice(0, 16).replace('T', ' ') ?? doc.document_date?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="si-ttc-cell">{formatDZD(doc.total_ttc)}</td>
                    <td className="si-paid-cell">{formatDZD(doc.paid_amount ?? 0)}</td>
                    <td className={`si-remain-cell ${Number(doc.remaining_amount ?? 0) > 0 ? 'si-remain-pos' : 'si-remain-neg'}`}>
                      {formatDZD(doc.remaining_amount ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="si-foot-row">
                  <td colSpan={4} className="text-left">المجموع</td>
                  <td className="si-ttc-cell">{formatDZD(totals.ttc)}</td>
                  <td className="si-paid-cell">{formatDZD(totals.paid)}</td>
                  <td className={totals.remaining > 0 ? 'si-remain-pos' : 'si-remain-neg'}>{formatDZD(totals.remaining)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <div className="m-foot">
          <span className="si-foot-hint">
            ↑↓ للتنقل · Enter لفتح الفاتورة · Esc للإغلاق
          </span>
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
