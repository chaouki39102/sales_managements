import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';
import { runInvoiceOcr, parseInvoiceText } from '@/lib/invoiceOcr';
import type { OcrProgress } from '@/lib/invoiceOcr';
import type { Party, Product } from '../types/document.types';

export interface OcrApplyPayload {
  documentDate: string;
  partyId: string;
  lines: Array<{
    product_id?: string;
    description: string;
    quantity: number;
    unit_price_ht: number;
    tva_rate?: number;
  }>;
}

interface EditableLine {
  key: number;
  raw: string;
  text: string;
  quantity: number;
  unitPrice: number;
  productId: string;
  tvaRate: number | null;
}

interface InvoiceOcrModalProps {
  open: boolean;
  file: File | null;
  suppliers: Party[];
  products: Product[];
  needsParty: boolean;
  onClose: () => void;
  onApply: (payload: OcrApplyPayload) => void;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export function InvoiceOcrModal({
  open, file, suppliers, products, needsParty, onClose, onApply,
}: InvoiceOcrModalProps) {
  const [phase, setPhase] = useState<'idle' | 'ocr' | 'preview'>('idle');
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [documentDate, setDocumentDate] = useState(todayKey());
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const nextKey = useRef(1);

  const reset = useCallback(() => {
    setPhase('idle');
    setProgress(null);
    setError(null);
    setRawText('');
    setSupplierId('');
    setDocumentDate(todayKey());
    setLines([]);
    setSupplierSearch('');
    setProductSearch('');
    setShowRaw(false);
  }, []);

  const runOcr = useCallback(async () => {
    if (!file) return;
    setPhase('ocr');
    setProgress(null);
    setError(null);
    try {
      const text = await runInvoiceOcr(file, {
        onProgress: (p) => setProgress(p),
      });
      const result = parseInvoiceText(text, { products, suppliers });
      setRawText(text);
      setDocumentDate(result.documentDate ?? todayKey());
      if (result.supplier) setSupplierId(String(result.supplier.id));
      setLines(result.lines.map((l) => ({
        key: nextKey.current++,
        raw: l.text,
        text: l.product?.name ?? l.text.replace(/\d[\d.,]*/g, ' ').replace(/\s+/g, ' ').trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice ?? 0,
        productId: l.product ? String(l.product.id) : '',
        tvaRate: l.product?.tvaRate ?? null,
      })));
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر قراءة الفاتورة');
      setPhase('idle');
    }
  }, [file, products, suppliers]);

  useEffect(() => {
    if (open && file) void runOcr();
  }, [open, file, runOcr]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      s.name.toLowerCase().includes(q)
      || (s.code ?? '').toLowerCase().includes(q)
      || (s.phone ?? '').toLowerCase().includes(q),
    );
  }, [suppliers, supplierSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = q
      ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.ref ?? '').toLowerCase().includes(q))
      : products;
    return list.slice(0, 400);
  }, [products, productSearch]);

  const updateLine = useCallback((key: number, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const handleProductPick = useCallback((key: number, pid: string) => {
    const product = products.find((p) => String(p.id) === pid) ?? null;
    updateLine(key, {
      productId: pid,
      text: product?.name ?? '',
      tvaRate: product?.tva?.rate ?? null,
    });
  }, [products, updateLine]);

  const matchedCount = lines.filter((l) => l.productId).length;
  const canApply = lines.length > 0 && (!needsParty || supplierId !== '');

  const handleApply = useCallback(() => {
    if (!canApply) return;
    onApply({
      documentDate,
      partyId: supplierId,
      lines: lines.map((l) => ({
        product_id: l.productId || undefined,
        description: l.text || l.raw,
        quantity: l.quantity,
        unit_price_ht: l.unitPrice,
        tva_rate: l.productId ? (l.tvaRate ?? undefined) : undefined,
      })),
    });
    reset();
    onClose();
  }, [canApply, documentDate, supplierId, lines, onApply, onClose, reset]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const progressPct = progress?.progress != null ? Math.round(progress.progress * 100) : 0;

  return (
    <Modal open={open} onClose={handleClose} title="قراءة فاتورة المورد" size="xl">
      {phase === 'ocr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 8px', alignItems: 'center' }}>
          <span className="ic" style={{ animation: 'spin 1s linear infinite', fontSize: 40, color: 'var(--em)' }}>
            <i className="ti ti-scan" />
          </span>
          <div style={{ fontSize: 14, color: 'var(--t2)' }}>
            {progress?.status === 'recognizing text' ? 'جارٍ قراءة النص…' : 'جارٍ تحميل محرك القراءة…'}
          </div>
          <div style={{ width: '70%', height: 8, background: 'var(--b2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--em)', borderRadius: 99, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>{progress?.status ?? '…'} {progressPct}%</div>
          <Button size="sm" variant="outline" onClick={handleClose}>إلغاء</Button>
        </div>
      )}

      {phase === 'idle' && error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 8px', alignItems: 'center' }}>
          <span style={{ fontSize: 40, color: 'var(--red)' }}><i className="ti ti-alert-triangle" /></span>
          <div style={{ fontSize: 14, color: 'var(--t2)', textAlign: 'center' }}>{error}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" onClick={handleClose}>إغلاق</Button>
            <Button size="sm" variant="primary" onClick={() => void runOcr()}>إعادة المحاولة</Button>
          </div>
        </div>
      )}

      {phase === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--em)' }}><i className="ti ti-scan" /> تمت القراءة — تحقق من البيانات أدناه قبل الإضافة</span>
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              style={{ color: 'var(--b5)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {showRaw ? 'إخفاء النص الخام' : 'عرض النص الخام'}
            </button>
          </div>
          {showRaw && (
            <pre style={{ maxHeight: 160, overflow: 'auto', background: 'var(--b1)', border: '1px solid var(--b2)', borderRadius: 'var(--r1)', padding: 10, fontSize: 11, color: 'var(--t3)', whiteSpace: 'pre-wrap' }}>
              {rawText}
            </pre>
          )}

          {/* المورد */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--t3)' }}>
                المورد {needsParty && <span style={{ color: 'var(--red)' }}>*</span>}
              </label>
              <input
                type="search"
                placeholder="ابحث عن المورد…"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                style={{ padding: '6px 8px', fontSize: 13, border: '1px solid var(--b3)', borderRadius: 'var(--r1)', background: 'var(--bg)' }}
              />
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                style={{ padding: '7px 8px', fontSize: 13, border: '1px solid var(--b3)', borderRadius: 'var(--r1)', background: 'var(--bg)' }}
              >
                <option value="">— اختر المورد —</option>
                {filteredSuppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}{s.code ? ` (${s.code})` : ''}
                  </option>
                ))}
              </select>
              {!supplierId && suppliers.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--red)' }}>لا يوجد موردون — أضف مورداً أولاً.</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--t3)' }}>تاريخ الفاتورة</label>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                style={{ padding: '7px 8px', fontSize: 13, border: '1px solid var(--b3)', borderRadius: 'var(--r1)', background: 'var(--bg)' }}
              />
            </div>
          </div>

          {/* الأسطر */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>الأسطر المكتشفة: {lines.length}</span>
            <span style={{ fontSize: 12, color: 'var(--green)' }}>{matchedCount} بمطابقة منتج</span>
            <input
              type="search"
              placeholder="تصفية المنتجات…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{ flex: 1, minWidth: 160, padding: '5px 8px', fontSize: 12, border: '1px solid var(--b3)', borderRadius: 'var(--r1)', background: 'var(--bg)' }}
            />
          </div>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            <SimpleTable
              columns={[
                {
                  key: '_i', label: '#',
                  render: (_v, row) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{(row as unknown as EditableLine).key}</span>,
                },
                {
                  key: 'text', label: 'المنتج',
                  render: (_v, row) => {
                    const l = row as unknown as EditableLine;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                        <span style={{ fontSize: 13 }}>{l.text || l.raw}</span>
                        <select
                          value={l.productId}
                          onChange={(e) => handleProductPick(l.key, e.target.value)}
                          style={{ padding: '4px 6px', fontSize: 12, border: '1px solid var(--b3)', borderRadius: 'var(--r1)', background: 'var(--bg)' }}
                        >
                          <option value="">بدون مطابقة (سطر نصي)</option>
                          {filteredProducts.map((p) => (
                            <option key={p.id} value={String(p.id)}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  },
                },
                {
                  key: 'quantity', label: 'الكمية',
                  render: (_v, row) => {
                    const l = row as unknown as EditableLine;
                    return (
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, { quantity: parseFloat(e.target.value) || 0 })}
                        style={{ width: 80, padding: '4px 6px', fontSize: 13, border: '1px solid var(--b3)', borderRadius: 'var(--r1)', background: 'var(--bg)' }}
                      />
                    );
                  },
                },
                {
                  key: 'unitPrice', label: 'سعر الوحدة HT',
                  render: (_v, row) => {
                    const l = row as unknown as EditableLine;
                    return (
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={l.unitPrice}
                        onChange={(e) => updateLine(l.key, { unitPrice: parseFloat(e.target.value) || 0 })}
                        style={{ width: 100, padding: '4px 6px', fontSize: 13, border: '1px solid var(--b3)', borderRadius: 'var(--r1)', background: 'var(--bg)' }}
                      />
                    );
                  },
                },
                {
                  key: 'tvaRate', label: 'TVA %',
                  render: (_v, row) => {
                    const l = row as unknown as EditableLine;
                    return <span style={{ fontSize: 12, color: 'var(--t3)' }}>{l.tvaRate != null ? `${l.tvaRate}%` : 'افتراضي'}</span>;
                  },
                },
                {
                  key: '_del', label: '',
                  render: (_v, row) => {
                    const l = row as unknown as EditableLine;
                    return (
                      <button
                        type="button"
                        title="حذف السطر"
                        onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                        style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    );
                  },
                },
              ]}
              data={lines.map((l) => ({ ...l, _i: l.key })) as unknown as Record<string, unknown>[]}
              rowKey="_i"
            />
          </div>

          {!canApply && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 10px', background: 'var(--redb)', borderRadius: 'var(--r1)' }}>
              {lines.length === 0 ? 'لم يُعثر على أي سطر. أعد التصوير أو أكمل الإدخال يدوياً.' : 'يجب اختيار المورد قبل الإضافة.'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="outline" onClick={handleClose}>إلغاء</Button>
            <Button size="sm" variant="primary" icon={<i className="ti ti-plus" />} disabled={!canApply} onClick={handleApply}>
              إضافة {lines.length} سطر
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default InvoiceOcrModal;
