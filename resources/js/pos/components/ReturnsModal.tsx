import { useState, useCallback, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { CommercialDocument, CommercialDocumentLine } from '@/types';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { posSessionApi } from '@/lib/api/endpoints/posSession';
import { apiPost } from '@/lib/api/core/client';
import { formatDZD } from '../utils/calculations';
import { useNotification } from '@/hooks/useNotification';

interface ReturnsModalProps {
  sessionId: number | null;
  onClose: () => void;
  onDone: () => void;
}

interface SelectedLine {
  line: CommercialDocumentLine;
  qty: number;
}

export default function ReturnsModal({ sessionId, onClose, onDone }: ReturnsModalProps) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [doc, setDoc] = useState<CommercialDocument | null>(null);
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const notify = useNotification();

  const allSelected = doc?.lines ? selected.length === doc.lines.length : false;

  const totalReturn = useMemo(() => {
    if (selected.length === 0) return 0;
    return selected.reduce((acc, s) => {
      const ht = s.qty * s.line.unit_price_ht;
      const tva = ht * (s.line.tva_rate / 100);
      return acc + ht + tva;
    }, 0);
  }, [selected]);

  const handleSearch = useCallback(async () => {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setDoc(null);
    setSelected([]);
    try {
      const res = await documentsApi.list({
        'filter[search]': q,
        per_page: 5,
      } as any);
      const found = Array.isArray(res) ? res : res.data ?? [];
      if (found.length === 0) {
        notify.error('لا توجد فاتورة بهذا الرقم');
        setDoc(null);
        return;
      }
      const foundDoc = found[0] as CommercialDocument;
      setLoadingDoc(true);
      try {
        const full = await documentsApi.show(foundDoc.id);
        setDoc(full);
        setSelected([]);
        setReason('');
      } catch {
        notify.error('فشل تحميل تفاصيل الفاتورة');
        setDoc(null);
      }
      setLoadingDoc(false);
    } catch {
      notify.error('فشل البحث عن الفاتورة');
    }
    setSearching(false);
  }, [search]);

  const toggleLine = useCallback((line: CommercialDocumentLine) => {
    setSelected(prev => {
      const exists = prev.find(s => s.line.id === line.id);
      if (exists) return prev.filter(s => s.line.id !== line.id);
      return [...prev, { line, qty: Math.max(0, line.quantity - line.returned_quantity) }];
    });
  }, []);

  const updateReturnQty = useCallback((lineId: number, qty: number) => {
    setSelected(prev => prev.map(s =>
      s.line.id === lineId ? { ...s, qty: Math.min(Math.max(0, qty), s.line.quantity - s.line.returned_quantity) } : s
    ));
  }, []);

  const selectAll = useCallback(() => {
    if (!doc?.lines) return;
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(doc.lines
        .filter(line => line.returned_quantity < line.quantity)
        .map(line => ({ line, qty: Math.max(0, line.quantity - line.returned_quantity) }))
      );
    }
  }, [doc, allSelected]);

  const handleCreateReturn = useCallback(async () => {
    if (!doc) { notify.error('اختر فاتورة أولاً'); return; }
    if (selected.length === 0) { notify.error('اختر أصنافاً للإرجاع'); return; }

    setCreating(true);
    try {
      await apiPost(`/documents/${doc.id}/return`, {
        reason: reason || 'مرتجع من نقطة البيع',
        lines: selected.map(s => ({ line_id: s.line.id, quantity: s.qty })),
      });

      if (sessionId) {
        const totalHt = selected.reduce((acc, s) => acc + s.qty * s.line.unit_price_ht, 0);
        const totalTva = selected.reduce((acc, s) => {
          const ht = s.qty * s.line.unit_price_ht;
          return acc + ht * (s.line.tva_rate / 100);
        }, 0);
        try {
          await posSessionApi.increment(sessionId, {
            invoice_total: totalHt + totalTva,
            total_ht: totalHt,
            total_tva: totalTva,
            total_fiscal_stamp: 0,
            total_discount: 0,
            is_return: true,
          });
        } catch {
          console.warn('فشل تحديث جلسة البيع');
        }
      }

      notify.success('تم إنشاء المرتجع بنجاح');
      onDone();
    } catch (e: any) {
      notify.error(e?.message ?? 'فشل إنشاء المرتجع');
    }
    setCreating(false);
  }, [doc, reason, selected, sessionId, onDone]);

  return (
    <Modal
      open
      onClose={onClose}
      title={<><i className="ti ti-receipt-refund ml-2" /> مرتجع مبيعات</>}
      size="lg"
      footer={
        <div className="ret-footer">
          <span className="ret-footer-total">
            {selected.length > 0 && `إجمالي المرتجع: ${formatDZD(totalReturn)} دج`}
          </span>
          <div className="flex gap-8">
            <Button onClick={onClose}>إلغاء</Button>
            <Button variant="primary" onClick={handleCreateReturn} disabled={!doc || selected.length === 0} loading={creating}>
              تأكيد المرتجع
            </Button>
          </div>
        </div>
      }
    >
      <div className="si-modal-body">
        <div className="ret-search">
          <div className="flex gap-8 mb-4">
            <input
              type="text"
              className="inp flex-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="رقم الفاتورة..."
              autoFocus
            />
            <Button onClick={handleSearch} disabled={searching} loading={searching}>
              بحث
            </Button>
          </div>
        </div>

        {loadingDoc && (
          <div className="ta-c py-8">
            <span className="text-t3">جاري تحميل تفاصيل الفاتورة...</span>
          </div>
        )}

        {doc && !loadingDoc && (
          <div className="ret-doc">
            <div className="ret-doc-hd">
              <div>
                <strong>الفاتورة: {doc.document_number}</strong>
                <span className="ret-doc-meta">
                  {doc.document_date} — {doc.party?.name} — {formatDZD(doc.total_ttc)} دج
                </span>
              </div>
              <Button size="xs" onClick={selectAll}>
                {allSelected ? 'إلغاء الكل' : 'إرجاع كامل'}
              </Button>
            </div>

            <div className="ret-reason">
              <input
                type="text"
                className="inp w-full"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="سبب الإرجاع (اختياري)"
              />
            </div>

            <div className="ret-lines">
              {doc.lines?.map(line => {
                const sel = selected.find(s => s.line.id === line.id);
                const fullyReturned = line.returned_quantity >= line.quantity;
                return (
                  <div key={line.id} className={`ret-line ${sel ? 'ret-line-sel' : ''} ${fullyReturned ? 'ret-line-disabled' : ''}`}>
                    <label className="ret-line-lbl">
                      <input
                        type="checkbox"
                        checked={!!sel}
                        disabled={fullyReturned}
                        onChange={() => toggleLine(line)}
                      />
                      <span className="ret-line-name">{line.description || line.product?.name || line.product?.ref || `#${line.product_id}`}</span>
                      <span className="ret-line-qty">الكمية: {line.quantity}</span>
                      <span className="ret-line-amt">{formatDZD(line.total_ht)}</span>
                    </label>
                    {fullyReturned && <span className="ret-line-done">تم إرجاعه كاملاً</span>}
                    {sel && !fullyReturned && (
                      <div className="ret-line-qty-inp">
                        <span>كمية الإرجاع:</span>
                        <input
                          type="number"
                          className="inp ret-inp-w"
                          value={sel.qty}
                          min={1}
                          max={line.quantity}
                          onChange={e => updateReturnQty(line.id, parseInt(e.target.value) || 0)}
                        />
                        <span className="text-sm text-t4">/ {line.quantity}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selected.length > 0 && (
              <div className="ret-summary">
                <span>{selected.length} صنف</span>
                <span className="ret-summary-total">{formatDZD(totalReturn)} دج</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
