import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';
import { runInvoiceOcr, parseInvoiceText } from '@/lib/invoiceOcr';
import type { OcrProgress, MatchTier, ProductMatchSuggestion } from '@/lib/invoiceOcr';
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
  matchTier?: MatchTier | null;
  suggestions?: ProductMatchSuggestion[];
}

interface DetectedTotals {
  ht: number | null;
  ttc: number | null;
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
  /** Re-open the camera capture modal to re-photograph the invoice. */
  onRequestCapture?: () => void;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Tier badge labels + colors used by the suggestion picker and match badges. */
const TIER_META: Record<MatchTier, { label: string; color: string }> = {
  exact: { label: 'تطابق تام', color: 'var(--green)' },
  fuzzy: { label: 'تشابه', color: 'var(--gold)' },
  price: { label: 'حسب السعر', color: 'var(--blue)' },
};

const fmtMoney = (n: number) =>
  n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** tesseract.js emits English status strings — map them to Arabic for the UI. */
const OCR_STATUS_LABELS: Record<string, string> = {
  'preparing image': 'تجهيز الصورة',
  'loading tesseract core': 'تحميل محرك القراءة',
  'initializing tesseract': 'تهيئة محرك القراءة',
  'loading language traineddata': 'تحميل ملفات اللغة',
  'initializing api': 'تهيئة واجهة القراءة',
  'recognizing text': 'قراءة النص',
};
const ocrStatusLabel = (s: string | null | undefined) => (s ? OCR_STATUS_LABELS[s] ?? s : '…');

export function InvoiceOcrModal({
  open, file, suppliers, products, needsParty, onClose, onApply, onRequestCapture,
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
  const [dragActive, setDragActive] = useState(false);
  const [totals, setTotals] = useState<DetectedTotals>({ ht: null, ttc: null, tvaRate: null });
  const nextKey = useRef(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The modal owns the image after the first `file` prop: drag & drop and
  // «تغيير الصورة» swap it in-place without the page needing to re-open.
  const [currentFile, setCurrentFile] = useState<File | null>(null);

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
    setDragActive(false);
    setCurrentFile(null);
    setTotals({ ht: null, ttc: null, tvaRate: null });
  }, []);

  const acceptFile = useCallback((f: File | null | undefined) => {
    if (f && f.type && f.type.startsWith('image/')) {
      setCurrentFile(f);
    } else if (f) {
      setPhase('idle');
      setError('الملف المحدد ليس صورة — اختر صورة فاتورة');
    }
  }, []);

  const pickImage = useCallback(() => fileInputRef.current?.click(), []);

  const runOcr = useCallback(async () => {
    if (!currentFile) return;
    setPhase('ocr');
    setProgress(null);
    setError(null);
    try {
      const text = await runInvoiceOcr(currentFile, {
        onProgress: (p) => setProgress(p),
      });
      const result = parseInvoiceText(text, { products, suppliers });
      setRawText(text);
      setDocumentDate(result.documentDate ?? todayKey());
      if (result.supplier) setSupplierId(String(result.supplier.id));
      setTotals({ ht: result.totalHt, ttc: result.totalTtc, tvaRate: result.tvaRate });
      setLines(result.lines.map((l) => ({
        key: nextKey.current++,
        raw: l.text,
        text: l.product?.name ?? l.text.replace(/\d[\d.,]*/g, ' ').replace(/\s+/g, ' ').trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice ?? 0,
        productId: l.product ? String(l.product.id) : '',
        tvaRate: l.product?.tvaRate ?? null,
        matchTier: l.matchTier ?? null,
        suggestions: l.suggestions ?? [],
      })));
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر قراءة الفاتورة');
      setPhase('idle');
    }
  }, [currentFile, products, suppliers]);

  useEffect(() => {
    if (open && file) setCurrentFile(file);
  }, [open, file]);

  useEffect(() => {
    if (open && currentFile) void runOcr();
  }, [open, currentFile, runOcr]);

  const thumbUrl = useMemo(() => (currentFile ? URL.createObjectURL(currentFile) : null), [currentFile]);
  useEffect(() => () => { if (thumbUrl) URL.revokeObjectURL(thumbUrl); }, [thumbUrl]);

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
      matchTier: null,
    });
  }, [products, updateLine]);

  const matchedCount = lines.filter((l) => l.productId).length;
  const canApply = lines.length > 0 && (!needsParty || supplierId !== '');

  /** Σ qty × unit price over the current editable lines (live reconciliation). */
  const linesTotal = useMemo(
    () => lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0),
    [lines],
  );

  /** True when the sum of lines agrees with the detected HT total (within tolerance). */
  const reconcileState = useMemo(() => {
    const ht = totals.ht;
    if (ht == null) return { state: 'unknown' as const, delta: 0 };
    const delta = Math.abs(linesTotal - ht);
    const tolerance = Math.max(0.5, Math.abs(ht) * 0.005);
    return { state: (delta <= tolerance ? 'ok' : 'mismatch') as 'ok' | 'mismatch', delta };
  }, [linesTotal, totals.ht]);

  const handleSuggestionPick = useCallback((key: number, suggestion: ProductMatchSuggestion) => {
    const product = products.find((p) => String(p.id) === String(suggestion.product.id)) ?? null;
    updateLine(key, {
      productId: product ? String(product.id) : String(suggestion.product.id),
      text: suggestion.product.name,
      tvaRate: product?.tva?.rate ?? suggestion.product.tvaRate ?? null,
      matchTier: suggestion.tier,
    });
  }, [products, updateLine]);

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
    <Modal open={open} onClose={handleClose} title="قراءة فاتورة المورد" size="xl" subtitle="يمكنك إسقاط صورة أخرى هنا أو إعادة التصوير في أي وقت">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        style={{ position: 'relative', minHeight: 200 }}
      >
        {dragActive && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'color-mix(in srgb, var(--em) 8%, transparent)', border: '2px dashed var(--em)', borderRadius: 'var(--r1)',
              pointerEvents: 'none', gap: 8,
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--em)', fontWeight: 600 }}><i className="ti ti-photo" /> أفلت الصورة هنا لقراءتها</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

      {phase === 'ocr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 8px', alignItems: 'center' }}>
          {currentFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {thumbUrl && (
                <img src={thumbUrl} alt="فاتورة المورد" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--b3)' }} />
              )}
              <span style={{ fontSize: 12, color: 'var(--t3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentFile.name}</span>
              <Button size="sm" variant="outline" onClick={pickImage}>تغيير الصورة</Button>
              {onRequestCapture && <Button size="sm" variant="outline" onClick={onRequestCapture}>إعادة التصوير</Button>}
            </div>
          )}
          <span className="ic" style={{ animation: 'spin 1s linear infinite', fontSize: 40, color: 'var(--em)' }}>
            <i className="ti ti-scan" />
          </span>
          <div style={{ fontSize: 14, color: 'var(--t2)' }}>
            {progress?.status === 'recognizing text' ? 'جارٍ قراءة النص…' : progress?.status === 'preparing image' ? 'جارٍ تجهيز الصورة…' : 'جارٍ تحميل محرك القراءة…'}
          </div>
          <div style={{ width: '70%', height: 8, background: 'var(--b2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--em)', borderRadius: 99, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>{ocrStatusLabel(progress?.status)} {progressPct}%</div>
          <Button size="sm" variant="outline" onClick={handleClose}>إلغاء</Button>
        </div>
      )}

      {phase === 'idle' && error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 8px', alignItems: 'center' }}>
          <span style={{ fontSize: 40, color: 'var(--red)' }}><i className="ti ti-alert-triangle" /></span>
          <div style={{ fontSize: 14, color: 'var(--t2)', textAlign: 'center' }}>{error}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" onClick={handleClose}>إغلاق</Button>
            <Button size="sm" variant="outline" onClick={pickImage}>تغيير الصورة</Button>
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
            <span style={{ width: 1, height: 16, background: 'var(--b3)' }} />
            {currentFile && thumbUrl && (
              <img src={thumbUrl} alt="فاتورة المورد" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--b3)' }} />
            )}
            <Button size="sm" variant="outline" onClick={pickImage}>تغيير الصورة</Button>
            {onRequestCapture && <Button size="sm" variant="outline" onClick={onRequestCapture}>إعادة التصوير</Button>}
          </div>
          {showRaw && (
            <pre style={{ maxHeight: 160, overflow: 'auto', background: 'var(--b1)', border: '1px solid var(--b2)', borderRadius: 'var(--r1)', padding: 10, fontSize: 11, color: 'var(--t3)', whiteSpace: 'pre-wrap' }}>
              {rawText}
            </pre>
          )}

          {/* الإجماليات المكتشفة + مطابقة مجموع الأسطر */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {totals.ht != null && (
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--embo)', color: 'var(--em)', fontWeight: 600 }}>
                HT: {fmtMoney(totals.ht)}
              </span>
            )}
            {totals.ttc != null && (
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--embo)', color: 'var(--em)', fontWeight: 600 }}>
                TTC: {fmtMoney(totals.ttc)}
              </span>
            )}
            {totals.tvaRate != null && (
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--b2)', color: 'var(--t3)' }}>
                TVA: {totals.tvaRate}%
              </span>
            )}
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--b2)', color: 'var(--t3)' }}>
              مجموع الأسطر: {fmtMoney(linesTotal)}
            </span>
          </div>

          {reconcileState.state === 'ok' && (
            <div style={{ fontSize: 12, color: 'var(--green)', padding: '6px 10px', background: 'var(--greenb)', borderRadius: 'var(--r1)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <i className="ti ti-circle-check" /> مجموع الأسطر ({fmtMoney(linesTotal)}) يطابق إجمالي HT المكتشف ({fmtMoney(totals.ht!)}).
            </div>
          )}
          {reconcileState.state === 'mismatch' && (
            <div style={{ fontSize: 12, color: 'var(--gold)', padding: '6px 10px', background: 'var(--goldb)', borderRadius: 'var(--r1)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <i className="ti ti-alert-triangle" /> مجموع الأسطر ({fmtMoney(linesTotal)}) لا يطابق إجمالي HT المكتشف ({fmtMoney(totals.ht!)}) — راجع الكميات والأسعار أدناه.
            </div>
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
                    const tier = l.matchTier ? TIER_META[l.matchTier] : null;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
                        <span style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {l.text || l.raw}
                          {tier && (
                            <span style={{ fontSize: 10, color: tier.color, border: `1px solid ${tier.color}`, borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>
                              {tier.label}
                            </span>
                          )}
                        </span>
                        {l.raw && l.raw !== (l.text || '') && (
                          <span style={{ fontSize: 10, color: 'var(--t4)', direction: 'ltr', textAlign: 'right' }}>{l.raw}</span>
                        )}
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
                        {!l.productId && l.suggestions && l.suggestions.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {l.suggestions.slice(0, 3).map((s) => {
                              const m = TIER_META[s.tier];
                              return (
                                <button
                                  key={String(s.product.id)}
                                  type="button"
                                  title={s.product.name}
                                  onClick={() => handleSuggestionPick(l.key, s)}
                                  style={{
                                    fontSize: 10, padding: '2px 8px', borderRadius: 99, cursor: 'pointer',
                                    border: `1px solid ${m.color}`, color: m.color, background: 'transparent',
                                    display: 'flex', gap: 4, alignItems: 'center',
                                  }}
                                >
                                  <i className="ti ti-plus" /> {s.product.name}
                                  <span style={{ opacity: 0.8 }}>({m.label})</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
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
      </div>
    </Modal>
  );
}

export default InvoiceOcrModal;
