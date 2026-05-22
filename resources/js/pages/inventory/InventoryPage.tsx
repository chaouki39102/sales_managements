// pages/inventory/InventoryPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery }          from '@tanstack/react-query';
import { useWarehouses, useFamilies } from '@/lib/api/endpoints/lookups';
import {
  useInventoryProducts,
  useLowStockProducts,
  useStockSummary,
  useInventoryMutations,
  type InventoryProduct,
  type StockMovementCreateInput,
} from '@/lib/api/endpoints/inventory';
import { useModal }    from '@/hooks/useModal';
import PageHeader      from '@/components/ui/PageHeader';
import Card            from '@/components/ui/Card';
import Badge           from '@/components/ui/Badge';
import Button          from '@/components/ui/Button';
import Modal           from '@/components/ui/Modal';
import KpiCard         from '@/components/ui/KpiCard';
import ProgressBar     from '@/components/ui/ProgressBar';
import AlertBar        from '@/components/ui/AlertBar';

export default function InventoryPage() {
  const [search,      setSearch]   = useState('');
  const [familyId,    setFamily]   = useState<number | null>(null);
  const [warehouseId, setWarehouse]= useState<number | null>(null);
  const [status,      setStatus]   = useState<'low' | 'out' | 'ok' | ''>('');
  const [page,        setPage]     = useState(1);

  const stockIn  = useModal();
  const stockOut = useModal();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: summary }    = useStockSummary();
  const { data: lowStock }   = useLowStockProducts();
  const { data: families }   = useFamilies();
  const { data: warehouses } = useWarehouses();

  const { data, isLoading } = useInventoryProducts({
    search:      search   || undefined,
    family_id:   familyId ?? undefined,
    warehouse_id:warehouseId ?? undefined,
    status:      status   || undefined,
    page,
    per_page:    20,
  });

  const products = data?.data ?? [];
  const meta     = data?.meta;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const outOfStock  = summary?.out_of_stock  ?? 0;
  const lowStockCnt = summary?.low_stock     ?? 0;
  const totalValue  = summary?.total_value   ?? 0;
  const totalProds  = summary?.total_products ?? 0;

  return (
    <div className="page on" id="p-inventory">

      <PageHeader
        title="إدارة المخزون"
        subtitle={`تتبع الكميات والقيمة — ${warehouses?.[0]?.name ?? 'المستودع الرئيسي'}`}
        actions={
          <>
            <Button variant="primary" size="sm" icon={<i className="ti ti-download"/>}
              onClick={stockIn.openModal}>إدخال مخزون</Button>
            <Button variant="warning" size="sm" icon={<i className="ti ti-upload"/>}
              onClick={stockOut.openModal}>إخراج</Button>
            <Button size="sm" icon={<i className="ti ti-clipboard-list"/>}>طلب شراء</Button>
            <Button size="sm" icon={<i className="ti ti-table-export"/>}>تصدير</Button>
          </>
        }
      />

      {/* تحذيرات المخزون */}
      {(outOfStock > 0 || lowStockCnt > 0) && (
        <AlertBar variant="red">
          <strong>تحذير!</strong>{' '}
          {outOfStock  > 0 && `${outOfStock} منتج نفد تماماً`}
          {outOfStock  > 0 && lowStockCnt > 0 && ' و'}
          {lowStockCnt > 0 && `${lowStockCnt} منتج بالحد الأدنى`}
          . يُنصح بالطلب الفوري.
        </AlertBar>
      )}

      {/* KPIs */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-coin"
          label="قيمة المخزون الكلي"
          value={totalValue.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
          unit="دج" sub="بسعر التكلفة الحالي" />
        <KpiCard variant="red"    icon="ti-alert-circle"
          label="منتجات نفدت"
          value={outOfStock}   sub="تحتاج طلب عاجل" />
        <KpiCard variant="gold"   icon="ti-alert-triangle"
          label="منتجات منخفضة"
          value={lowStockCnt}  sub="دون الحد الأدنى" />
        <KpiCard variant="blue"   icon="ti-package"
          label="إجمالي الأصناف"
          value={meta?.total ?? totalProds}
          sub={`${products.filter(p => p.current_stock > 0).length} متوفر`} />
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input type="text" placeholder="ابحث باسم المنتج أو الرمز..."
            style={{ width: '100%' }}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select style={{ width: 130 }}
          onChange={e => { setFamily(e.target.value ? Number(e.target.value) : null); setPage(1); }}>
          <option value="">كل الفئات</option>
          {families?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select style={{ width: 140 }}
          onChange={e => { setWarehouse(e.target.value ? Number(e.target.value) : null); setPage(1); }}>
          <option value="">كل المستودعات</option>
          {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select style={{ width: 140 }}
          onChange={e => { setStatus(e.target.value as any); setPage(1); }}>
          <option value="">كل الحالات</option>
          <option value="ok">جيد</option>
          <option value="low">منخفض</option>
          <option value="out">نفد</option>
        </select>
      </div>

      {/* Table */}
      <Card noHeader style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الفئة</th>
                <th>الكمية الحالية</th>
                <th>الحد الأدنى</th>
                <th>سعر التكلفة</th>
                <th>سعر البيع HT</th>
                <th>الهامش</th>
                <th>القيمة الإجمالية</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
                    جاري التحميل...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
                    لا توجد منتجات
                  </td>
                </tr>
              ) : products.map(p => <ProductRow key={p.id} product={p} onStockIn={stockIn.openModal} />)}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
            <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <i className="ti ti-chevron-right"/>
            </Button>
            <span style={{ fontSize: 12, color: 'var(--t3)', alignSelf: 'center' }}>
              {page} / {meta.last_page}
            </span>
            <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
              <i className="ti ti-chevron-left"/>
            </Button>
          </div>
        )}
      </Card>

      {/* Modals */}
      <StockMovementModal
        open={stockIn.open}
        onClose={stockIn.closeModal}
        type="in"
        products={products}
      />
      <StockMovementModal
        open={stockOut.open}
        onClose={stockOut.closeModal}
        type="out"
        products={products}
      />
    </div>
  );
}

// ── ProductRow ────────────────────────────────────────────────────────────────

function ProductRow({ product: p, onStockIn }: {
  product: InventoryProduct;
  onStockIn: () => void;
}) {
  const stock    = p.current_stock  ?? 0;
  const minStock = p.min_stock_alert ?? 0;
  const isOOS    = p.manages_stock && stock <= 0;
  const isLow    = p.manages_stock && stock > 0 && minStock > 0 && stock <= minStock;

  const costPrice = p.current_cost_price ?? p.purchase_price_ht ?? 0;
  const sellHt    = p.purchase_price_ht  ?? 0; // سيُستبدل بـ default_selling_price لاحقاً
  const margin    = sellHt > 0 && costPrice > 0
    ? ((sellHt - costPrice) / sellHt * 100) : 0;
  const totalVal  = stock * costPrice;
  const pct       = minStock > 0 ? Math.min(100, (stock / (minStock * 2)) * 100) : 100;

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'var(--emb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: 'var(--em)', flexShrink: 0,
          }}>
            <i className="ti ti-package"/>
          </div>
          <div>
            <div className="s">{p.name}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
              {p.ref ?? '—'}
            </div>
          </div>
        </div>
      </td>
      <td>
        <Badge variant="warning" noDot>{p.family?.name ?? '—'}</Badge>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{
              fontWeight: 800,
              color: isOOS ? 'var(--red)' : isLow ? 'var(--gold)' : 'var(--t1)',
            }}>
              {p.manages_stock ? stock : '∞'}
            </div>
            {p.manages_stock && (
              <div style={{ marginTop: 3 }}>
                <ProgressBar
                  value={pct}
                  color={isOOS ? 'var(--red)' : isLow ? 'var(--gold)' : 'var(--em)'}
                  height={3}
                />
              </div>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--t4)' }}>
            {p.unit?.symbol ?? 'قطعة'}
          </span>
        </div>
      </td>
      <td className="m" style={{ color: 'var(--t4)' }}>
        {minStock > 0 ? minStock : '—'}
      </td>
      <td className="m">{costPrice.toFixed(2)} دج</td>
      <td className="e">{sellHt.toFixed(2)} دج</td>
      <td style={{
        color: margin > 20 ? 'var(--em)' : margin > 0 ? 'var(--gold)' : 'var(--red)',
        fontWeight: 700,
      }}>
        {margin > 0 ? `+${margin.toFixed(1)}%` : '—'}
      </td>
      <td className="m">
        {totalVal > 0
          ? totalVal.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' دج'
          : '—'}
      </td>
      <td>
        <Badge variant={isOOS ? 'danger' : isLow ? 'warning' : 'success'}>
          {isOOS ? 'نفد' : isLow ? 'منخفض' : 'جيد'}
        </Badge>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 3 }}>
          <Button size="xs" variant="primary" icon={<i className="ti ti-plus"/>}
            onClick={onStockIn} title="إدخال مخزون" />
          <Button size="xs" icon={<i className="ti ti-history"/>} title="سجل الحركات" />
        </div>
      </td>
    </tr>
  );
}

// ── StockMovementModal ────────────────────────────────────────────────────────

function StockMovementModal({ open, onClose, type, products }: {
  open:     boolean;
  onClose:  () => void;
  type:     'in' | 'out';
  products: InventoryProduct[];
}) {
  const [productId,  setProductId]  = useState('');
  const [warehouseId,setWarehouseId]= useState('');
  const [qty,        setQty]        = useState('');
  const [price,      setPrice]      = useState('');
  const [notes,      setNotes]      = useState('');

  const { data: warehouses } = useWarehouses();
  const { createMovement }   = useInventoryMutations();

  const handleSubmit = () => {
    if (!productId || !warehouseId || !qty) return;

    createMovement.mutate({
      product_id:             Number(productId),
      warehouse_id:           Number(warehouseId),
      fiscal_year_id:         0, // سيُحدَّد من السياق في الـ Backend
      stock_movement_type_id: type === 'in' ? 1 : 2, // يجب جلبه من stock_movement_types
      movement_date:          new Date().toISOString().split('T')[0],
      quantity:               Number(qty),
      unit_price:             price ? Number(price) : 0,
      notes:                  notes || null,
    }, {
      onSuccess: () => {
        onClose();
        setProductId(''); setWarehouseId('');
        setQty(''); setPrice(''); setNotes('');
      },
    });
  };

  return (
    <Modal
      open={open} onClose={onClose} size="sm"
      title={type === 'in' ? 'إدخال مخزون' : 'إخراج مخزون'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button
            variant={type === 'in' ? 'primary' : 'warning'}
            icon={<i className={`ti ${type === 'in' ? 'ti-download' : 'ti-upload'}`}/>}
            onClick={handleSubmit}
            disabled={!productId || !warehouseId || !qty || createMovement.isPending}
          >
            {createMovement.isPending ? 'جاري...' : 'تأكيد'}
          </Button>
        </>
      }
    >
      <div className="fgrid">
        <div className="fg s2">
          <label className="req">المنتج</label>
          <select value={productId} onChange={e => setProductId(e.target.value)}>
            <option value="">— اختر منتجاً —</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.manages_stock ? ` (مخزون: ${p.current_stock ?? 0})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="fg s2">
          <label className="req">المستودع</label>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            <option value="">— اختر مستودعاً —</option>
            {warehouses?.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label className="req">الكمية</label>
          <input
            type="number" value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="0" min={0.001} inputMode="decimal"
          />
        </div>
        {type === 'in' && (
          <div className="fg">
            <label>سعر الشراء HT</label>
            <div className="inp-row">
              <input
                type="number" value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
              />
              <div className="inp-suf">دج</div>
            </div>
          </div>
        )}
        <div className="fg s2">
          <label>ملاحظة</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="سبب الحركة..."
          />
        </div>
      </div>
    </Modal>
  );
}
