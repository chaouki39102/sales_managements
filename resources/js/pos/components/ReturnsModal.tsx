import { useState, useCallback } from 'react';
import type { CommercialDocument, CommercialDocumentLine, DocumentType } from '@/types';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { formatDZD } from '../utils/calculations';
import { toast } from 'sonner';

interface ReturnsModalProps {
  documentTypes: DocumentType[];
  defaultWarehouseId: number | null;
  fiscalYearId: number | undefined;
  onClose: () => void;
  onDone: () => void;
}

interface SelectedLine {
  line: CommercialDocumentLine;
  qty: number;
}

export default function ReturnsModal({
  documentTypes, defaultWarehouseId, fiscalYearId, onClose, onDone,
}: ReturnsModalProps) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [doc, setDoc] = useState<CommercialDocument | null>(null);
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [creating, setCreating] = useState(false);

  const avcType = documentTypes.find(t => t.code === 'AVC');

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await documentsApi.list({
        search: search.trim(),
        include: 'lines,lines.product_variant,party',
        per_page: 5,
        'filter[fiscal_year_id]': fiscalYearId,
      } as any);
      const found = Array.isArray(res) ? res : res.data ?? [];
      if (found.length === 0) {
        toast.error('لا توجد فاتورة بهذا الرقم');
        setDoc(null);
      } else {
        setDoc(found[0] as CommercialDocument);
        setSelected([]);
      }
    } catch {
      toast.error('فشل البحث عن الفاتورة');
    }
    setSearching(false);
  }, [search]);

  const toggleLine = useCallback((line: CommercialDocumentLine) => {
    setSelected(prev => {
      const exists = prev.find(s => s.line.id === line.id);
      if (exists) return prev.filter(s => s.line.id !== line.id);
      return [...prev, { line, qty: line.quantity }];
    });
  }, []);

  const updateReturnQty = useCallback((lineId: number, qty: number) => {
    setSelected(prev => prev.map(s =>
      s.line.id === lineId ? { ...s, qty: Math.min(Math.max(0, qty), s.line.quantity) } : s
    ));
  }, []);

  const handleCreateReturn = useCallback(async () => {
    if (!avcType || !doc || !defaultWarehouseId || !fiscalYearId) {
      toast.error('بيانات غير مكتملة لإنشاء المرتجع');
      return;
    }
    if (selected.length === 0) {
      toast.error('اختر أصنافاً للإرجاع');
      return;
    }
    setCreating(true);
    try {
      await documentsApi.create({
        document_type_id: avcType.id,
        warehouse_id: defaultWarehouseId,
        fiscal_year_id: fiscalYearId,
        document_date: new Date().toISOString().split('T')[0],
        party_id: doc.party?.id ?? null,
        notes: `مرتجع من الفاتورة رقم ${doc.document_number}`,
        lines: selected.map(s => ({
          product_id: s.line.product_id ?? 0,
          description: s.line.description ?? undefined,
          quantity: -Math.abs(s.qty),
          unit_price_ht: s.line.unit_price_ht,
          discount_percentage: s.line.discount_percentage,
          tva_rate: s.line.tva_rate,
          packaging_id: (s.line as any).packaging_id ?? null,
        })),
      });
      toast.success('تم إنشاء المرتجع بنجاح');
      onDone();
    } catch {
      toast.error('فشل إنشاء المرتجع');
    }
    setCreating(false);
  }, [avcType, doc, defaultWarehouseId, fiscalYearId, selected, onDone]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-receipt-refund ml-2" />
            مرتجع مبيعات
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body si-modal-body">
          <div className="ret-search">
            <div className="flex gap-8 mb-4">
              <input
                type="text"
                className="inp flex-1"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="رقم الفاتورة..."
              />
              <button className="btn btn-p" onClick={handleSearch} disabled={searching}>
                {searching ? '...' : 'بحث'}
              </button>
            </div>
          </div>

          {doc && (
            <div className="ret-doc">
              <div className="ret-doc-hd">
                <strong>الفاتورة: {doc.document_number}</strong>
                <span className="ret-doc-meta">
                  {doc.party?.name} — {formatDZD(doc.total_ttc)}
                </span>
              </div>
              <div className="ret-lines">
                {doc.lines?.map(line => {
                  const sel = selected.find(s => s.line.id === line.id);
                  return (
                    <div key={line.id} className={`ret-line ${sel ? 'ret-line-sel' : ''}`}>
                      <label className="ret-line-lbl">
                        <input
                          type="checkbox"
                          checked={!!sel}
                          onChange={() => toggleLine(line)}
                        />
                        <span className="ret-line-name">{line.description ?? `صنف #${line.product_variant_id}`}</span>
                        <span className="ret-line-qty">الكمية: {line.quantity}</span>
                        <span className="ret-line-amt">{formatDZD(line.total_ht)}</span>
                      </label>
                      {sel && (
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
            </div>
          )}
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleCreateReturn}
            disabled={!doc || selected.length === 0 || creating || !avcType}
          >
            {creating ? 'جاري الإنشاء...' : 'إنشاء المرتجع'}
          </button>
        </div>
      </div>
    </div>
  );
}
