// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/StockTakePage.tsx — جرد المخزون بالكاميرا
// Camera barcode scan → show system stock → enter counted qty → create
// adjustment movements (IN when counted > system, OUT when counted < system).
// ════════════════════════════════════════════════════════════════════════════
import { useState, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { useActiveSlug } from '@/lib/store/appStore';
import { useQueryClient } from '@tanstack/react-query';
import { useInventoryMutations } from '@/lib/api/endpoints/inventory';
import { useWarehouses, useStockMovementTypes } from '@/lib/api/endpoints/lookups';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import type { Warehouse } from '@/lib/api/core/types';
import { fmt } from './inventoryTypes';
import { apiGet } from '@/lib/api/core/client';
import { toast } from 'sonner';

const BarcodeScannerModal = lazy(() => import('@/components/BarcodeScannerModal'));

// ─── Types ───────────────────────────────────────────────────────────────────
interface ScannedProduct {
  id: number;
  name: string;
  ref?: string | null;
  barcode?: string | null;
  current_stock: number;
  unit_name: string;
  cost_price: number;
}

interface SessionEntry {
  product_id: number;
  product_name: string;
  ref?: string | null;
  warehouse_id: number;
  warehouse_name: string;
  system_stock: number;
  counted: number;
  difference: number;
  movement_type: 'in' | 'out';
  created_at: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StockTakePage() {
  const slug = useActiveSlug();
  const { selectedYear } = useFiscalYear();
  const queryClient = useQueryClient();

  // Warehouse selector
  const { data: warehouses = [] } = useWarehouses();
  const defaultWh = useMemo(() => warehouses.find((w: Warehouse) => w.is_default) ?? warehouses[0], [warehouses]);
  const [warehouseId, setWarehouseId] = useState<number | ''>('');

  const effectiveWarehouseId = useMemo(() => {
    if (warehouseId !== '') return warehouseId;
    return defaultWh?.id ?? 0;
  }, [warehouseId, defaultWh]);

  const fiscalYearId = selectedYear?.id ?? 0;

  // Stock movement types — find in/out types
  const { data: movTypes = [] } = useStockMovementTypes();
  const inType = useMemo(() => movTypes.find(t => t.name === 'in' || t.direction === 'in'), [movTypes]);
  const outType = useMemo(() => movTypes.find(t => t.name === 'out' || t.direction === 'out'), [movTypes]);

  // Session state
  const [sessionLog, setSessionLog] = useState<SessionEntry[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Current scan state
  const [scanInput, setScanInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [systemStock, setSystemStock] = useState<number | null>(null);
  const [countedQty, setCountedQty] = useState('');
  const [resolving, setResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const countedRef = useRef<HTMLInputElement>(null);

  // Create mutation
  const { createMovement } = useInventoryMutations();

  // ─── Resolve barcode to product + stock ──────────────────────────────────
  const resolveBarcode = useCallback(async (code: string) => {
    if (!code.trim() || !slug || !effectiveWarehouseId) return;
    setResolving(true);
    setScannedProduct(null);
    setSystemStock(null);
    setCountedQty('');

    try {
      // Search products by barcode/ref
      const result = await apiGet<{ data: any[] }>('/products', {
        per_page: 5,
        include: 'unit',
        'filter[search]': code.trim(),
      });
      const products = Array.isArray(result) ? result : (result as any)?.data ?? [];

      // Exact match: barcode, ref, or id
      const match = products.find((p: any) =>
        String(p.barcode) === code.trim() ||
        String(p.ref) === code.trim() ||
        String(p.id) === code.trim()
      );

      if (!match) {
        toast.error('لم يتم العثور على منتج بهذا الباركود');
        setResolving(false);
        return;
      }

      // Fetch stock for this product in selected warehouse
      const stockResult = await apiGet<any>(`/inventory/stock-at`, {
        product_id: match.id,
        warehouse_id: effectiveWarehouseId,
        fiscal_year_id: fiscalYearId,
      });

      const stockData = Array.isArray(stockResult) ? stockResult : (stockResult as any)?.data ?? [];
      const stockRow = Array.isArray(stockData) ? stockData[0] : stockData;
      const currentStock = Number(stockRow?.current_stock ?? stockRow?.quantity ?? 0);

      setScannedProduct({
        id: match.id,
        name: match.name,
        ref: match.ref,
        barcode: match.barcode,
        current_stock: currentStock,
        unit_name: match.unit?.abbreviation ?? match.unit?.name ?? '',
        cost_price: Number(match.purchase_price_ht ?? match.current_cost_price ?? 0),
      });
      setSystemStock(currentStock);

      // Auto-focus counted quantity input
      setTimeout(() => countedRef.current?.focus(), 100);
    } catch (err) {
      console.error('Stock-take resolve error:', err);
      toast.error('خطأ في البحث عن المنتج');
    } finally {
      setResolving(false);
    }
  }, [slug, effectiveWarehouseId, fiscalYearId]);

  // ─── Manual barcode submit ───────────────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resolveBarcode(scanInput);
  };

  // ─── Camera scan callback ────────────────────────────────────────────────
  const handleCameraScan = (code: string) => {
    setScanInput(code);
    setScannerOpen(false);
    resolveBarcode(code);
  };

  // ─── Submit counted quantity → create movement ───────────────────────────
  const handleConfirmCount = async () => {
    if (!scannedProduct || systemStock === null || !effectiveWarehouseId || !fiscalYearId) return;

    const counted = parseFloat(countedQty);
    if (isNaN(counted) || counted < 0) {
      toast.error('أدخل كمية معدودة صحيحة');
      return;
    }

    const diff = counted - systemStock;
    if (diff === 0) {
      toast('الكمية المعدودة مطابقة للمخزون — لا حاجة لتعديل', { icon: '✅' });
      resetScan();
      return;
    }

    const isPositive = diff > 0;
    const typeId = isPositive ? inType?.id : outType?.id;
    if (!typeId) {
      toast.error('لم يتم العثور على نوع الحركة المناسب');
      return;
    }

    const today = new Date().toISOString().slice(0, 10) + ' ' + new Date().toTimeString().slice(0, 8);
    const wh = warehouses.find((w: Warehouse) => w.id === effectiveWarehouseId);

    try {
      await createMovement.mutateAsync({
        product_id: scannedProduct.id,
        warehouse_id: effectiveWarehouseId,
        fiscal_year_id: fiscalYearId,
        stock_movement_type_id: typeId,
        movement_date: today,
        quantity: Math.abs(diff),
        unit_price: scannedProduct.cost_price,
        cost_price: scannedProduct.cost_price,
        total_price: Math.abs(diff) * scannedProduct.cost_price,
        price_source: 'adjustment',
        is_validated: true,
        reason: isPositive
          ? `جرد: العدّ ${counted} — النظام ${systemStock} → فارق +${diff}`
          : `جرد: العدّ ${counted} — النظام ${systemStock} → فارق ${diff}`,
        notes: `جرد يدوي — ${isPositive ? 'إضافة' : 'خصم'} ${Math.abs(diff)} ${scannedProduct.unit_name}`,
      });

      // Add to session log
      setSessionLog(prev => [...prev, {
        product_id: scannedProduct.id,
        product_name: scannedProduct.name,
        ref: scannedProduct.ref,
        warehouse_id: effectiveWarehouseId,
        warehouse_name: wh?.name ?? '',
        system_stock: systemStock,
        counted,
        difference: diff,
        movement_type: isPositive ? 'in' : 'out',
        created_at: new Date().toLocaleTimeString('ar-DZ'),
      }]);

      // Invalidate stock queries
      if (slug) {
        queryClient.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
      }

      toast.success(isPositive
        ? `تم إضافة ${diff} ${scannedProduct.unit_name} — جرد`
        : `تم خصم ${Math.abs(diff)} ${scannedProduct.unit_name} — جرد`
      );

      resetScan();
    } catch (err: any) {
      toast.error(err?.message ?? 'خطأ في حفظ التسوية');
    }
  };

  // ─── Reset scan state ────────────────────────────────────────────────────
  const resetScan = () => {
    setScanInput('');
    setScannedProduct(null);
    setSystemStock(null);
    setCountedQty('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ─── Summary stats ───────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total_items: sessionLog.length,
    total_added: sessionLog.filter(e => e.movement_type === 'in').reduce((s, e) => s + e.difference, 0),
    total_removed: sessionLog.filter(e => e.movement_type === 'out').reduce((s, e) => s + Math.abs(e.difference), 0),
  }), [sessionLog]);

  const diff = scannedProduct && systemStock !== null && countedQty
    ? parseFloat(countedQty) - systemStock
    : null;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="page on" id="p-stock-take">
      {/* Header */}
      <div className="ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-clipboard-check" style={{ fontSize: 22, color: 'var(--em)' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>جرد المخزون بالكاميرا</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)' }}>
              امسح باركود المنتج → عدّ الكمية → أكّد التسوية
            </p>
          </div>
        </div>
        {summary.total_items > 0 && (
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--t3)' }}>
            <span><strong style={{ color: 'var(--em)' }}>{summary.total_items}</strong> منتج</span>
            {summary.total_added > 0 && <span style={{ color: 'var(--em)' }}>+{fmt(summary.total_added)} وارد</span>}
            {summary.total_removed > 0 && <span style={{ color: 'var(--err)' }}>-{fmt(summary.total_removed)} صادر</span>}
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Warehouse selector ── */}
        <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <i className="ti ti-building-warehouse" style={{ marginInlineEnd: 4 }} />
            المستودع
          </label>
          <select
            value={effectiveWarehouseId}
            onChange={e => setWarehouseId(Number(e.target.value))}
            style={{
              flex: '1 1 200px', padding: '7px 10px', borderRadius: 6,
              border: '1px solid var(--brd)', fontSize: 13, background: 'var(--bg2)',
            }}
          >
            {warehouses.map((w: Warehouse) => (
              <option key={w.id} value={w.id}>{w.name}{w.is_default ? ' ★' : ''}</option>
            ))}
          </select>
        </div>

        {/* ── Scan input ── */}
        <form onSubmit={handleManualSubmit} className="card" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="btn btn-b"
            style={{ flex: '0 0 auto', padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <i className="ti ti-camera" />
            كاميرا
          </button>
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            placeholder="اكتب أو امسح الباركود / المرجع / اسم المنتج..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 6,
              border: '1px solid var(--brd)', fontSize: 13, direction: 'rtl',
            }}
            autoFocus
          />
          <button type="submit" className="btn btn-p" style={{ padding: '8px 16px', fontSize: 13 }} disabled={resolving || !scanInput.trim()}>
            {resolving ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-search" />}
          </button>
        </form>

        {/* ── Scanned product card ── */}
        {scannedProduct && systemStock !== null && (
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Product info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 8, background: 'var(--em2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-package" style={{ fontSize: 20, color: 'var(--em)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{scannedProduct.name}</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', display: 'flex', gap: 10 }}>
                  {scannedProduct.ref && <span>مرجع: {scannedProduct.ref}</span>}
                  {scannedProduct.barcode && <span>باركود: {scannedProduct.barcode}</span>}
                </div>
              </div>
            </div>

            {/* System stock display */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px',
              background: 'var(--bg2)', borderRadius: 8, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>المخزون في النظام</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--em)' }}>
                  {fmt(systemStock)} <span style={{ fontSize: 12, fontWeight: 500 }}>{scannedProduct.unit_name}</span>
                </div>
              </div>
            </div>

            {/* Counted quantity input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                الكمية المعدودة
              </label>
              <input
                ref={countedRef}
                type="number"
                min="0"
                step="any"
                value={countedQty}
                onChange={e => setCountedQty(e.target.value)}
                placeholder="0"
                style={{
                  width: 120, padding: '8px 12px', borderRadius: 6,
                  border: '2px solid var(--brd)', fontSize: 15, fontWeight: 700,
                  textAlign: 'center', direction: 'ltr',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (diff !== null && diff !== 0) handleConfirmCount();
                  }
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>{scannedProduct.unit_name}</span>

              {/* Difference badge */}
              {diff !== null && diff !== 0 && (
                <span style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: diff > 0 ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
                  color: diff > 0 ? 'var(--em)' : 'var(--err)',
                }}>
                  {diff > 0 ? `+${fmt(diff)}` : fmt(diff)} {diff > 0 ? 'إضافة' : 'خصم'}
                </span>
              )}
              {diff !== null && diff === 0 && (
                <span style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: 'rgba(16,185,129,.12)', color: 'var(--em)',
                }}>
                  ✅ مطابق
                </span>
              )}
            </div>

            {/* Confirm button */}
            <button
              className="btn btn-p"
              onClick={handleConfirmCount}
              disabled={createMovement.isPending || !countedQty || diff === null || diff === 0}
              style={{
                padding: '10px 20px', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {createMovement.isPending
                ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
                : <><i className="ti ti-check" /> تأكيد التسوية</>
              }
            </button>
          </div>
        )}

        {/* ── Session log ── */}
        {sessionLog.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '10px 14px', fontWeight: 700, fontSize: 13,
              background: 'var(--bg2)', borderBottom: '1px solid var(--brd)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ti ti-list" /> سجل الجرد ({sessionLog.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)', textAlign: 'right' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>المنتج</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>المستودع</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>النظام</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>العدّ</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>الفارق</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>النوع</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionLog.map((entry, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--brd)' }}>
                      <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {entry.product_name}
                        {entry.ref && <span style={{ color: 'var(--t3)', marginInlineStart: 4 }}>({entry.ref})</span>}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--t3)' }}>{entry.warehouse_name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{fmt(entry.system_stock)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{fmt(entry.counted)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: entry.difference > 0 ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
                          color: entry.difference > 0 ? 'var(--em)' : 'var(--err)',
                        }}>
                          {entry.difference > 0 ? `+${fmt(entry.difference)}` : fmt(entry.difference)}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: entry.movement_type === 'in' ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
                          color: entry.movement_type === 'in' ? 'var(--em)' : 'var(--err)',
                        }}>
                          {entry.movement_type === 'in' ? 'وارد' : 'صادر'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--t3)' }}>{entry.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Camera scanner modal */}
      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScannerModal
            open={scannerOpen}
            onScan={handleCameraScan}
            onClose={() => setScannerOpen(false)}
            title="مسح باركود المنتج للجرد"
            hint="صوّب الكاميرا على باركود المنتج لمعرفة رصيد النظام والعدّ"
          />
        </Suspense>
      )}
    </div>
  );
}
